<?php
/**
 * User Login Endpoint
 * POST /api/auth/login.php
 * Authenticates a user and creates a session
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
$rememberMe = isset($input['remember_me']) && $input['remember_me'] === true;

// Normalize username to lowercase
$username = normalizeUsername($username);

try {
    $db = Database::getInstance();
    $conn = $db->getConnection();

    // Get user by username
    $stmt = $conn->prepare("SELECT id, username, password_hash FROM users WHERE username = ?");
    $stmt->bind_param('s', $username);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        sendError('Invalid username or password', 401);
    }

    $user = $result->fetch_assoc();
    $stmt->close();

    // Verify password
    if (!password_verify($password, $user['password_hash'])) {
        sendError('Invalid username or password', 401);
    }

    // Start session
    startSession();

    // Set session lifetime based on remember_me
    if ($rememberMe) {
        // 30 days for remember me
        $lifetime = 2592000;
    } else {
        // 7 days default
        $lifetime = 604800;
    }

    // Update session cookie lifetime
    setcookie(
        session_name(),
        session_id(),
        time() + $lifetime,
        '/',
        '',
        false,
        true
    );

    // Store user data in session
    $_SESSION['user_id'] = $user['id'];
    $_SESSION['username'] = $user['username'];
    $_SESSION['login_time'] = time();

    // Update last_login in database
    $updateStmt = $conn->prepare("UPDATE users SET last_login = NOW() WHERE id = ?");
    $updateStmt->bind_param('i', $user['id']);
    $updateStmt->execute();
    $updateStmt->close();

    // Send success response
    sendSuccess([
        'user_id' => $user['id'],
        'username' => $user['username']
    ], 'Login successful');

} catch (Exception $e) {
    error_log('Login error: ' . $e->getMessage());
    sendError('An error occurred during login', 500);
}

?>
