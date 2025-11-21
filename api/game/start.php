<?php
/**
 * Start Game Session Endpoint
 * POST /api/game/start.php
 * Creates a game session token that must be submitted with the score
 */

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/utils.php';

// Set CORS headers
setCorsHeaders();

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError('Method not allowed', 405);
}

// Require authentication
requireAuth();

// Get JSON input
$input = getJsonInput();

// Default to classic mode if not specified
$gameModeId = isset($input['game_mode_id']) ? (int)$input['game_mode_id'] : 1;

$userId = getCurrentUserId();

try {
    $db = Database::getInstance();
    $conn = $db->getConnection();

    // Verify game mode exists and is active
    $modeCheck = $conn->prepare("SELECT id FROM game_modes WHERE id = ? AND is_active = TRUE");
    $modeCheck->bind_param('i', $gameModeId);
    $modeCheck->execute();
    $modeResult = $modeCheck->get_result();

    if ($modeResult->num_rows === 0) {
        $modeCheck->close();
        sendError('Invalid or inactive game mode', 400);
    }
    $modeCheck->close();

    // Invalidate any unused sessions for this user (cleanup)
    $cleanupStmt = $conn->prepare("
        UPDATE game_sessions
        SET is_used = TRUE
        WHERE user_id = ? AND is_used = FALSE
    ");
    $cleanupStmt->bind_param('i', $userId);
    $cleanupStmt->execute();
    $cleanupStmt->close();

    // Generate unique session token
    $sessionToken = bin2hex(random_bytes(32));

    // Create new game session
    $stmt = $conn->prepare("
        INSERT INTO game_sessions (user_id, game_mode_id, session_token, started_at)
        VALUES (?, ?, ?, NOW())
    ");
    $stmt->bind_param('iis', $userId, $gameModeId, $sessionToken);

    if (!$stmt->execute()) {
        throw new Exception('Failed to create game session');
    }

    $sessionId = $conn->insert_id;
    $stmt->close();

    // Send success response with token
    sendSuccess([
        'session_token' => $sessionToken,
        'game_mode_id' => $gameModeId
    ], 'Game session started');

} catch (Exception $e) {
    error_log('Start game error: ' . $e->getMessage());
    sendError('An error occurred while starting game', 500);
}

?>
