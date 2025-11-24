<?php
/**
 * User Logout Endpoint
 * POST /api/auth/logout.php
 * Destroys the user session
 */

require_once __DIR__ . '/../../config/utils.php';

// Set CORS headers
setCorsHeaders();

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError('Method not allowed', 405);
}

// Start session
startSession();

// Check if user is logged in
if (!isAuthenticated()) {
    sendError('Not logged in', 401);
}

// Get username before destroying session
$username = getCurrentUsername();

// Invalidate token if present
$headers = getallheaders();
$authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : '';

if (preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
    $token = $matches[1];
    require_once __DIR__ . '/../../config/database.php';
    try {
        $db = Database::getInstance();
        $conn = $db->getConnection();
        $stmt = $conn->prepare("DELETE FROM user_tokens WHERE token = ?");
        $stmt->bind_param('s', $token);
        $stmt->execute();
        $stmt->close();
    } catch (Exception $e) {
        // Ignore database errors on logout
    }
}

// Destroy session
session_unset();
session_destroy();

// Clear session cookie
if (isset($_COOKIE[session_name()])) {
    setcookie(session_name(), '', time() - 3600, '/');
}

// Send success response
sendSuccess(null, 'Logged out successfully');

?>
