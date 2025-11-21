-- DCISM Aim Training Game - Game Sessions Schema
-- Migration: 002_game_sessions
-- Description: Creates game_sessions table for anti-cheat token verification

-- ============================================
-- Game Sessions Table
-- ============================================
CREATE TABLE IF NOT EXISTS game_sessions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    game_mode_id INT NOT NULL,
    session_token VARCHAR(64) UNIQUE NOT NULL,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME NULL,
    is_used BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (game_mode_id) REFERENCES game_modes(id) ON DELETE CASCADE,
    INDEX idx_session_token (session_token),
    INDEX idx_user_sessions (user_id, is_used),
    INDEX idx_cleanup (started_at, is_used)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Cleanup Event: Remove expired sessions (older than 30 minutes)
-- Run this periodically or enable MySQL Event Scheduler
-- ============================================
-- DELETE FROM game_sessions WHERE started_at < DATE_SUB(NOW(), INTERVAL 30 MINUTE);

-- ============================================
-- Migration Complete
-- ============================================
