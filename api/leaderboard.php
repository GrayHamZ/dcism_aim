<?php
/**
 * Leaderboard Endpoint
 * GET /api/leaderboard.php?mode={game_mode_id}&limit={limit}&offset={offset}
 * Returns top scores for a specific game mode
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/utils.php';

// Set CORS headers
setCorsHeaders();

// Only allow GET requests
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendError('Method not allowed', 405);
}

// Get query parameters
$gameModeId = isset($_GET['mode']) ? (int)$_GET['mode'] : 1; // Default to Classic mode
$limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 100; // Default to top 100
$offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;

// Validate limits
if ($limit > 100) {
    $limit = 100; // Maximum 100 entries
}

if ($limit < 1) {
    $limit = 25; // Minimum 25 entries
}

try {
    $db = Database::getInstance();
    $conn = $db->getConnection();

    // Get top scores with user info (best score per user)
    // Use subquery to get the actual row with the max score, not arbitrary values
    $query = "
        SELECT
            u.username,
            s.user_id,
            s.score as best_score,
            s.survival_time,
            s.accuracy,
            s.created_at
        FROM scores s
        INNER JOIN users u ON s.user_id = u.id
        WHERE s.game_mode_id = ?
        AND u.leaderboard_illegible = 0
        AND s.id = (
            SELECT s2.id
            FROM scores s2
            WHERE s2.user_id = s.user_id
            AND s2.game_mode_id = ?
            ORDER BY s2.score DESC, s2.created_at ASC
            LIMIT 1
        )
        ORDER BY best_score DESC, s.created_at ASC
        LIMIT ? OFFSET ?
    ";

    $stmt = $conn->prepare($query);
    $stmt->bind_param('iiii', $gameModeId, $gameModeId, $limit, $offset);
    $stmt->execute();
    $result = $stmt->get_result();

    $leaderboard = [];
    $rank = $offset + 1;

    while ($row = $result->fetch_assoc()) {
        $leaderboard[] = [
            'rank' => $rank++,
            'username' => $row['username'],
            'user_id' => (int)$row['user_id'],
            'score' => (int)$row['best_score'],
            'survival_time' => (int)$row['survival_time'],
            'survival_time_formatted' => formatTime($row['survival_time']),
            'accuracy' => $row['accuracy'] ? (float)$row['accuracy'] : null,
            'date_achieved' => $row['created_at']
        ];
    }

    $stmt->close();

    // Get total number of players for this game mode
    $countQuery = "
        SELECT COUNT(DISTINCT s.user_id) as total_players
        FROM scores s
        INNER JOIN users u ON s.user_id = u.id
        WHERE s.game_mode_id = ?
        AND u.leaderboard_illegible = 0
    ";

    $countStmt = $conn->prepare($countQuery);
    $countStmt->bind_param('i', $gameModeId);
    $countStmt->execute();
    $countResult = $countStmt->get_result();
    $countData = $countResult->fetch_assoc();
    $totalPlayers = (int)$countData['total_players'];
    $countStmt->close();

    // If user is authenticated, get their rank
    $currentUserRank = null;
    if (isAuthenticated()) {
        $userId = getCurrentUserId();

        $rankQuery = "
            SELECT COUNT(*) + 1 as rank
            FROM (
                SELECT s.user_id, MAX(s.score) as max_score
                FROM scores s
                INNER JOIN users u ON s.user_id = u.id
                WHERE s.game_mode_id = ?
                AND u.leaderboard_illegible = 0
                GROUP BY s.user_id
            ) as user_scores
            WHERE max_score > (
                SELECT MAX(score)
                FROM scores
                WHERE user_id = ? AND game_mode_id = ?
            )
        ";

        $rankStmt = $conn->prepare($rankQuery);
        $rankStmt->bind_param('iii', $gameModeId, $userId, $gameModeId);
        $rankStmt->execute();
        $rankResult = $rankStmt->get_result();
        $rankData = $rankResult->fetch_assoc();
        $currentUserRank = $rankData['rank'] ? (int)$rankData['rank'] : null;
        $rankStmt->close();
    }

    // Send success response
    sendSuccess([
        'game_mode_id' => $gameModeId,
        'leaderboard' => $leaderboard,
        'total_players' => $totalPlayers,
        'current_user_rank' => $currentUserRank,
        'limit' => $limit,
        'offset' => $offset
    ], 'Leaderboard retrieved successfully');

} catch (Exception $e) {
    error_log('Leaderboard error: ' . $e->getMessage());
    sendError('An error occurred while fetching leaderboard', 500);
}

?>
