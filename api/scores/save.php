<?php
/**
 * Save Score Endpoint
 * POST /api/scores/save.php
 * Saves a game result and updates user statistics
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

if (!$input) {
    sendError('Invalid JSON input');
}

// Validate required fields
$missing = validateRequiredFields($input, [
    'game_mode_id',
    'score',
    'survival_time',
    'targets_hit',
    'targets_missed'
]);

if ($missing) {
    sendError('Missing required fields', 400, ['missing' => $missing]);
}

$userId = getCurrentUserId();
$gameModeId = (int)$input['game_mode_id'];
$score = (int)$input['score'];
$survivalTime = (int)$input['survival_time'];
$targetsHit = (int)$input['targets_hit'];
$targetsMissed = (int)$input['targets_missed'];
$currentStreak = isset($input['best_streak']) ? (int)$input['best_streak'] : 0;

// Calculate accuracy
$totalTargets = $targetsHit + $targetsMissed;
$accuracy = $totalTargets > 0 ? round(($targetsHit / $totalTargets) * 100, 2) : 0;

try {
    $db = Database::getInstance();
    $conn = $db->getConnection();

    // Check for duplicate submission (same user, mode, score, and time within last 5 seconds)
    $duplicateCheck = $conn->prepare("
        SELECT id FROM scores 
        WHERE user_id = ? 
        AND game_mode_id = ? 
        AND score = ? 
        AND survival_time = ? 
        AND created_at > DATE_SUB(NOW(), INTERVAL 5 SECOND)
        LIMIT 1
    ");
    $duplicateCheck->bind_param('iiii', $userId, $gameModeId, $score, $survivalTime);
    $duplicateCheck->execute();
    $duplicateResult = $duplicateCheck->get_result();
    
    if ($duplicateResult->num_rows > 0) {
        $duplicateCheck->close();
        sendError('Duplicate score submission detected. Please wait before submitting again.', 429);
    }
    $duplicateCheck->close();

    // Start transaction
    $conn->begin_transaction();

    // Insert score record
    $stmt = $conn->prepare("
        INSERT INTO scores (user_id, game_mode_id, score, survival_time, accuracy, targets_hit, targets_missed, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
    ");
    $stmt->bind_param('iiiddii', $userId, $gameModeId, $score, $survivalTime, $accuracy, $targetsHit, $targetsMissed);

    if (!$stmt->execute()) {
        throw new Exception('Failed to save score');
    }

    $scoreId = $conn->insert_id;
    $stmt->close();

    // Check if user_stats record exists
    $checkStmt = $conn->prepare("SELECT id, best_score, best_streak FROM user_stats WHERE user_id = ? AND game_mode_id = ?");
    $checkStmt->bind_param('ii', $userId, $gameModeId);
    $checkStmt->execute();
    $statsResult = $checkStmt->get_result();

    if ($statsResult->num_rows > 0) {
        // Update existing stats
        $stats = $statsResult->fetch_assoc();
        $currentBestScore = $stats['best_score'];
        $currentBestStreak = $stats['best_streak'];

        $updateStmt = $conn->prepare("
            UPDATE user_stats SET
                total_games = total_games + 1,
                total_targets_hit = total_targets_hit + ?,
                total_targets_missed = total_targets_missed + ?,
                best_score = GREATEST(best_score, ?),
                best_time = GREATEST(best_time, ?),
                total_playtime = total_playtime + ?,
                best_streak = GREATEST(best_streak, ?),
                last_played = NOW()
            WHERE user_id = ? AND game_mode_id = ?
        ");
        $updateStmt->bind_param('iiiiiiii', $targetsHit, $targetsMissed, $score, $survivalTime, $survivalTime, $currentStreak, $userId, $gameModeId);
        $updateStmt->execute();
        $updateStmt->close();

        $isNewBest = $score > $currentBestScore;
    } else {
        // Create new stats record
        $insertStmt = $conn->prepare("
            INSERT INTO user_stats (
                user_id, game_mode_id, total_games, total_targets_hit, total_targets_missed,
                best_score, best_time, total_playtime, best_streak, last_played
            ) VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, NOW())
        ");
        $insertStmt->bind_param('iiiiiiii', $userId, $gameModeId, $targetsHit, $targetsMissed, $score, $survivalTime, $survivalTime, $currentStreak);
        $insertStmt->execute();
        $insertStmt->close();

        $isNewBest = true;
    }

    $checkStmt->close();

    // Commit transaction
    $conn->commit();

    // Get user's rank for this game mode
    $rankQuery = "
        SELECT COUNT(*) + 1 as rank
        FROM (
            SELECT user_id, MAX(score) as max_score
            FROM scores
            WHERE game_mode_id = ?
            GROUP BY user_id
        ) as user_scores
        WHERE max_score > ?
    ";
    $rankStmt = $conn->prepare($rankQuery);
    $rankStmt->bind_param('ii', $gameModeId, $score);
    $rankStmt->execute();
    $rankResult = $rankStmt->get_result();
    $rankData = $rankResult->fetch_assoc();
    $rank = $rankData['rank'];
    $rankStmt->close();

    // Send success response
    sendSuccess([
        'score_id' => $scoreId,
        'is_new_best' => $isNewBest,
        'rank' => (int)$rank,
        'accuracy' => $accuracy
    ], 'Score saved successfully');

} catch (Exception $e) {
    // Rollback transaction on error
    if (isset($conn)) {
        $conn->rollback();
    }
    error_log('Save score error: ' . $e->getMessage());
    sendError('An error occurred while saving score', 500);
}

?>
