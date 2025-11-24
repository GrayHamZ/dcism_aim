<?php
/**
 * Utility Functions
 * Common functions for API endpoints, JSON responses, and validation
 */

/**
 * Send JSON response and exit
 * @param array $data Response data
 * @param int $statusCode HTTP status code
 */
function sendJsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}

/**
 * Send success response
 * @param mixed $data Data to send
 * @param string $message Success message
 */
function sendSuccess($data = null, $message = 'Success') {
    $response = [
        'success' => true,
        'message' => $message
    ];

    if ($data !== null) {
        $response['data'] = $data;
    }

    sendJsonResponse($response, 200);
}

/**
 * Send error response
 * @param string $message Error message
 * @param int $statusCode HTTP status code
 * @param mixed $errors Additional error details
 */
function sendError($message, $statusCode = 400, $errors = null) {
    $response = [
        'success' => false,
        'message' => $message
    ];

    if ($errors !== null) {
        $response['errors'] = $errors;
    }

    sendJsonResponse($response, $statusCode);
}

/**
 * Get JSON input from request body
 * @return array|null
 */
function getJsonInput() {
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);

    if (json_last_error() !== JSON_ERROR_NONE) {
        return null;
    }

    return $data;
}

/**
 * Validate required fields in data
 * @param array $data Input data
 * @param array $requiredFields List of required field names
 * @return array|null Returns array of missing fields or null if all present
 */
function validateRequiredFields($data, $requiredFields) {
    $missing = [];

    foreach ($requiredFields as $field) {
        if (!isset($data[$field]) || trim($data[$field]) === '') {
            $missing[] = $field;
        }
    }

    return empty($missing) ? null : $missing;
}

/**
 * Validate username format
 * @param string $username
 * @return bool
 */
function validateUsername($username) {
    // 3-20 characters, alphanumeric + underscore only
    return preg_match('/^[a-zA-Z0-9_]{3,20}$/', $username);
}

/**
 * Validate password strength
 * @param string $password
 * @return array Returns ['valid' => bool, 'message' => string]
 */
function validatePassword($password) {
    // Minimum 8 characters, at least 1 letter and 1 number
    if (strlen($password) < 8) {
        return ['valid' => false, 'message' => 'Password must be at least 8 characters'];
    }

    if (!preg_match('/[a-zA-Z]/', $password)) {
        return ['valid' => false, 'message' => 'Password must contain at least one letter'];
    }

    if (!preg_match('/[0-9]/', $password)) {
        return ['valid' => false, 'message' => 'Password must contain at least one number'];
    }

    return ['valid' => true, 'message' => ''];
}

/**
 * Start session with custom settings
 */
function startSession() {
    if (session_status() === PHP_SESSION_NONE) {
        // Set session cookie parameters
        session_set_cookie_params([
            'lifetime' => 0,
            'path' => '/',
            'domain' => '',
            'secure' => false, // Set to true if using HTTPS
            'httponly' => true,
            'samesite' => 'Lax'
        ]);

        session_start();
    }
}

/**
 * Generate and store authentication token
 * @param int $userId
 * @return string|false Token on success, false on failure
 */
function generateToken($userId) {
    try {
        $db = Database::getInstance();
        $conn = $db->getConnection();
        
        // Generate secure random token
        $token = bin2hex(random_bytes(32));
        $expiresAt = date('Y-m-d H:i:s', strtotime('+30 days'));
        
        // Store in database
        $stmt = $conn->prepare("INSERT INTO user_tokens (user_id, token, expires_at) VALUES (?, ?, ?)");
        $stmt->bind_param('iss', $userId, $token, $expiresAt);
        
        if ($stmt->execute()) {
            $stmt->close();
            return $token;
        }
        
        $stmt->close();
        return false;
    } catch (Exception $e) {
        error_log('Token generation error: ' . $e->getMessage());
        return false;
    }
}

/**
 * Validate authentication token
 * @param string $token
 * @return int|false User ID on success, false on failure
 */
function validateToken($token) {
    try {
        $db = Database::getInstance();
        $conn = $db->getConnection();
        
        $stmt = $conn->prepare("SELECT user_id FROM user_tokens WHERE token = ? AND expires_at > NOW()");
        $stmt->bind_param('s', $token);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($row = $result->fetch_assoc()) {
            $stmt->close();
            return (int)$row['user_id'];
        }
        
        $stmt->close();
        return false;
    } catch (Exception $e) {
        error_log('Token validation error: ' . $e->getMessage());
        return false;
    }
}

/**
 * Check if user is authenticated (via Session or Token)
 * @return bool
 */
function isAuthenticated() {
    // Check for Bearer token first
    $headers = getallheaders();
    $authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : '';
    
    if (preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
        $token = $matches[1];
        $userId = validateToken($token);
        if ($userId) {
            // Set session for compatibility if needed, or just return true
            // For now, we'll rely on the token validation
            return true;
        }
    }

    startSession();
    return isset($_SESSION['user_id']) && isset($_SESSION['username']);
}

/**
 * Get current user ID from session or token
 * @return int|null
 */
function getCurrentUserId() {
    // Check for Bearer token first
    $headers = getallheaders();
    $authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : '';
    
    if (preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
        $token = $matches[1];
        $userId = validateToken($token);
        if ($userId) {
            return $userId;
        }
    }

    startSession();
    return $_SESSION['user_id'] ?? null;
}

/**
 * Get current username from session or database (via token)
 * @return string|null
 */
function getCurrentUsername() {
    // Check for Bearer token first
    $headers = getallheaders();
    $authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : '';
    
    if (preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
        $token = $matches[1];
        $userId = validateToken($token);
        if ($userId) {
            // Fetch username from DB
            try {
                $db = Database::getInstance();
                $conn = $db->getConnection();
                $stmt = $conn->prepare("SELECT username FROM users WHERE id = ?");
                $stmt->bind_param('i', $userId);
                $stmt->execute();
                $result = $stmt->get_result();
                if ($row = $result->fetch_assoc()) {
                    return $row['username'];
                }
            } catch (Exception $e) {
                return null;
            }
        }
    }

    startSession();
    return $_SESSION['username'] ?? null;
}

/**
 * Require authentication (send error if not authenticated)
 */
function requireAuth() {
    if (!isAuthenticated()) {
        sendError('Authentication required', 401);
    }
}

/**
 * Set CORS headers for API
 */
function setCorsHeaders() {
    // Get the origin from the request
    $origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';

    // List of allowed origins
    $allowedOrigins = [
        'http://localhost',
        'http://127.0.0.1',
        'http://localhost:80',
        'http://127.0.0.1:80'
    ];

    // Check if origin is allowed (also allow same-origin requests with no Origin header)
    if (empty($origin) || in_array($origin, $allowedOrigins) || strpos($origin, 'http://localhost') === 0) {
        // Set origin header (use specific origin for credentials support)
        if (!empty($origin)) {
            header('Access-Control-Allow-Origin: ' . $origin);
        }
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization');
        header('Access-Control-Allow-Credentials: true');
    }

    // Handle preflight requests
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit;
    }
}

/**
 * Sanitize string input
 * @param string $input
 * @return string
 */
function sanitizeInput($input) {
    return htmlspecialchars(strip_tags(trim($input)), ENT_QUOTES, 'UTF-8');
}

/**
 * Normalize username to lowercase
 * @param string $username
 * @return string
 */
function normalizeUsername($username) {
    return strtolower(trim($username));
}

/**
 * Format datetime for display
 * @param string $datetime
 * @return string
 */
function formatDateTime($datetime) {
    return date('Y-m-d H:i:s', strtotime($datetime));
}

/**
 * Format seconds to MM:SS
 * @param int $seconds
 * @return string
 */
function formatTime($seconds) {
    $minutes = floor($seconds / 60);
    $seconds = $seconds % 60;
    return sprintf('%02d:%02d', $minutes, $seconds);
}

?>
