<?php
/**
 * User Statistics Endpoint
 * GET /api/user/stats.php?user_id={id}&mode={game_mode_id}
 * Returns player statistics for a specific game mode
 */

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/utils.php';

// Set CORS headers
setCorsHeaders();

// Only allow GET requests
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendError('Method not allowed', 405);
}

// Get query parameters
$requestedUserId = isset($_GET['user_id']) ? (int)$_GET['user_id'] : null;
$gameModeId = isset($_GET['mode']) ? (int)$_GET['mode'] : 1; // Default to Classic mode

// If no user_id provided, use current authenticated user
if ($requestedUserId === null) {
    requireAuth();
    $userId = getCurrentUserId();
} else {
    $userId = $requestedUserId;
}

try {
    $db = Database::getInstance();
    $conn = $db->getConnection();

    // Get user info
    $userStmt = $conn->prepare("SELECT id, username, created_at, last_username_change, leaderboard_illegible, ban_reason FROM users WHERE id = ?");
    $userStmt->bind_param('i', $userId);
    $userStmt->execute();
    $userResult = $userStmt->get_result();

    if ($userResult->num_rows === 0) {
        sendError('User not found', 404);
    }

    $user = $userResult->fetch_assoc();
    $userStmt->close();

    // Get user statistics for the game mode
    $statsQuery = "
        SELECT
            total_games,
            total_targets_hit,
            total_targets_missed,
            best_score,
            best_time,
            total_playtime,
            best_streak,
            last_played
        FROM user_stats
        WHERE user_id = ? AND game_mode_id = ?
    ";

    $statsStmt = $conn->prepare($statsQuery);
    $statsStmt->bind_param('ii', $userId, $gameModeId);
    $statsStmt->execute();
    $statsResult = $statsStmt->get_result();

    if ($statsResult->num_rows > 0) {
        $stats = $statsResult->fetch_assoc();

        // Calculate overall accuracy
        $totalTargets = $stats['total_targets_hit'] + $stats['total_targets_missed'];
        $overallAccuracy = $totalTargets > 0 ? round(($stats['total_targets_hit'] / $totalTargets) * 100, 2) : 0;

        // Calculate average survival time
        $avgSurvivalTime = $stats['total_games'] > 0 ? round($stats['total_playtime'] / $stats['total_games']) : 0;

        $userStats = [
            'total_games' => (int)$stats['total_games'],
            'total_targets_hit' => (int)$stats['total_targets_hit'],
            'total_targets_missed' => (int)$stats['total_targets_missed'],
            'best_score' => (int)$stats['best_score'],
            'best_time' => (int)$stats['best_time'],
            'best_time_formatted' => formatTime($stats['best_time']),
            'total_playtime' => (int)$stats['total_playtime'],
            'total_playtime_formatted' => formatTime($stats['total_playtime']),
            'best_streak' => (int)$stats['best_streak'],
            'overall_accuracy' => $overallAccuracy,
            'avg_survival_time' => $avgSurvivalTime,
            'avg_survival_time_formatted' => formatTime($avgSurvivalTime),
            'last_played' => $stats['last_played']
        ];
    } else {
        // No stats yet for this game mode
        $userStats = [
            'total_games' => 0,
            'total_targets_hit' => 0,
            'total_targets_missed' => 0,
            'best_score' => 0,
            'best_time' => 0,
            'best_time_formatted' => '00:00',
            'total_playtime' => 0,
            'total_playtime_formatted' => '00:00',
            'best_streak' => 0,
            'overall_accuracy' => 0,
            'avg_survival_time' => 0,
            'avg_survival_time_formatted' => '00:00',
            'last_played' => null
        ];
    }

    $statsStmt->close();

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
    $rankStmt->bind_param('ii', $gameModeId, $userStats['best_score']);
    $rankStmt->execute();
    $rankResult = $rankStmt->get_result();
    $rankData = $rankResult->fetch_assoc();
    $rank = $rankData['rank'];
    $rankStmt->close();

    // Get recent games (last 10)
    $recentQuery = "
        SELECT
            score,
            survival_time,
            accuracy,
            targets_hit,
            targets_missed,
            created_at
        FROM scores
        WHERE user_id = ? AND game_mode_id = ?
        ORDER BY created_at DESC
        LIMIT 10
    ";

    $recentStmt = $conn->prepare($recentQuery);
    $recentStmt->bind_param('ii', $userId, $gameModeId);
    $recentStmt->execute();
    $recentResult = $recentStmt->get_result();

    $recentGames = [];
    while ($row = $recentResult->fetch_assoc()) {
        $recentGames[] = [
            'score' => (int)$row['score'],
            'survival_time' => (int)$row['survival_time'],
            'survival_time_formatted' => formatTime($row['survival_time']),
            'accuracy' => $row['accuracy'] ? (float)$row['accuracy'] : null,
            'targets_hit' => (int)$row['targets_hit'],
            'targets_missed' => (int)$row['targets_missed'],
            'date' => $row['created_at']
        ];
    }

    $recentStmt->close();

    // Send success response
    sendSuccess([
        'user' => [
            'id' => (int)$user['id'],
            'username' => $user['username'],
            'member_since' => $user['created_at'],
            'id' => (int)$user['id'],
            'username' => $user['username'],
            'member_since' => $user['created_at'],
            'last_username_change' => $user['last_username_change'],
            'leaderboard_illegible' => (bool)$user['leaderboard_illegible'],
            'ban_reason' => $user['ban_reason']
        ],
        'game_mode_id' => $gameModeId,
        'stats' => $userStats,
        'rank' => (int)$rank,
        'recent_games' => $recentGames
    ], 'User statistics retrieved successfully');

} catch (Exception $e) {
    error_log('User stats error: ' . $e->getMessage());
    sendError('An error occurred while fetching user statistics', 500);
}

?>
