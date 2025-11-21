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
