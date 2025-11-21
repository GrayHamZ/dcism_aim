<?php
/**
 * Game Modes Endpoint
 * GET /api/game-modes.php
 * Returns list of all game modes (active and coming soon)
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/utils.php';

// Set CORS headers
setCorsHeaders();

// Only allow GET requests
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendError('Method not allowed', 405);
}

try {
    $db = Database::getInstance();
    $conn = $db->getConnection();

    // Get all game modes
    $query = "SELECT id, name, display_name, is_active, description FROM game_modes ORDER BY id ASC";
    $result = $conn->query($query);

    $gameModes = [];

    while ($row = $result->fetch_assoc()) {
        $gameModes[] = [
            'id' => (int)$row['id'],
            'name' => $row['name'],
            'display_name' => $row['display_name'],
            'is_active' => (bool)$row['is_active'],
            'description' => $row['description']
        ];
    }

    // Send success response
    sendSuccess($gameModes, 'Game modes retrieved successfully');

} catch (Exception $e) {
    error_log('Game modes error: ' . $e->getMessage());
    sendError('An error occurred while fetching game modes', 500);
}

?>
