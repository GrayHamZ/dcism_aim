<?php
/**
 * Change Username Endpoint
 * POST /api/user/change-username.php
 * Updates the authenticated user's username
 */

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/utils.php';

// Set CORS headers
setCorsHeaders();

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError('Method not allowed', 405);
}

// Check authentication
if (!isAuthenticated()) {
    sendError('Unauthorized', 401);
}

// Get JSON input
$input = getJsonInput();

if (!$input) {
    sendError('Invalid JSON input');
}

// Validate required fields
if (!isset($input['new_username'])) {
    sendError('Missing required field: new_username', 400);
}

$newUsername = sanitizeInput($input['new_username']);
$userId = getCurrentUserId();

// Validate username format
if (!preg_match('/^[a-zA-Z0-9_]{3,20}$/', $newUsername)) {
    sendError('Username must be 3-20 characters long and contain only letters, numbers, and underscores', 400);
}

// Profanity Check
$profanityList = require __DIR__ . '/../../config/profanity.php';
$normalizedUsername = strtolower($newUsername);

foreach ($profanityList as $word) {
    if (strpos($normalizedUsername, $word) !== false) {
        sendError('Username contains inappropriate language', 400);
    }
}

try {
    $db = Database::getInstance();
    $conn = $db->getConnection();

    // Check cooldown
    $cooldownStmt = $conn->prepare("SELECT last_username_change FROM users WHERE id = ?");
    $cooldownStmt->bind_param('i', $userId);
    $cooldownStmt->execute();
    $cooldownResult = $cooldownStmt->get_result();
    $user = $cooldownResult->fetch_assoc();
    $cooldownStmt->close();

    if ($user['last_username_change']) {
        $lastChange = new DateTime($user['last_username_change']);
        $now = new DateTime();
        $diff = $now->diff($lastChange);
        
        if ($diff->days < 10) {
            $remaining = 10 - $diff->days;
            sendError("You can change your username again in $remaining days", 403);
        }
    }

    // Check if username is already taken
    $stmt = $conn->prepare("SELECT id FROM users WHERE username = ? AND id != ?");
    $stmt->bind_param('si', $newUsername, $userId);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        sendError('Username is already taken', 409);
    }
    $stmt->close();

    // Update username and last_username_change
    $updateStmt = $conn->prepare("UPDATE users SET username = ?, last_username_change = NOW() WHERE id = ?");
    $updateStmt->bind_param('si', $newUsername, $userId);
    
    if ($updateStmt->execute()) {
        // Update session
        $_SESSION['username'] = $newUsername;
        
        sendSuccess([
            'username' => $newUsername
        ], 'Username updated successfully');
    } else {
        throw new Exception("Failed to update username");
    }
    $updateStmt->close();

} catch (Exception $e) {
    error_log('Change username error: ' . $e->getMessage());
    sendError('An error occurred while updating username', 500);
}
?>
