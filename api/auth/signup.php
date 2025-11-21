<?php
/**
 * User Signup Endpoint
 * POST /api/auth/signup.php
 * Creates a new user account
 */

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/utils.php';

// Set CORS headers
setCorsHeaders();

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError('Method not allowed', 405);
}

// Get JSON input
$input = getJsonInput();

if (!$input) {
    sendError('Invalid JSON input');
}

// Validate required fields
$missing = validateRequiredFields($input, ['username', 'password']);
if ($missing) {
    sendError('Missing required fields', 400, ['missing' => $missing]);
}

$username = sanitizeInput($input['username']);
$password = $input['password'];

// Validate username format
if (!validateUsername($username)) {
    sendError('Username must be 3-20 characters and contain only letters, numbers, and underscores');
}

// Validate password strength
$passwordValidation = validatePassword($password);
if (!$passwordValidation['valid']) {
    sendError($passwordValidation['message']);
}

// Normalize username to lowercase
$username = normalizeUsername($username);

try {
    $db = Database::getInstance();
    $conn = $db->getConnection();

    // Check if username already exists
    $stmt = $conn->prepare("SELECT id FROM users WHERE username = ?");
    $stmt->bind_param('s', $username);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        sendError('Username already exists');
    }

    $stmt->close();

    // Hash password
    $passwordHash = password_hash($password, PASSWORD_BCRYPT);

    // Insert new user
    $stmt = $conn->prepare("INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, NOW())");
    $stmt->bind_param('ss', $username, $passwordHash);

    if (!$stmt->execute()) {
        throw new Exception('Failed to create user');
    }

    $userId = $conn->insert_id;
    $stmt->close();

    // Start session and log user in
    startSession();
    $_SESSION['user_id'] = $userId;
    $_SESSION['username'] = $username;

    // Update last_login
    $updateStmt = $conn->prepare("UPDATE users SET last_login = NOW() WHERE id = ?");
    $updateStmt->bind_param('i', $userId);
    $updateStmt->execute();
    $updateStmt->close();

    // Send success response
    sendSuccess([
        'user_id' => $userId,
        'username' => $username
    ], 'Account created successfully');

} catch (Exception $e) {
    error_log('Signup error: ' . $e->getMessage());
    sendError('An error occurred during signup', 500);
}

?>
