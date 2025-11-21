-- DCISM Aim Training Game - Database Schema
-- Migration: 001_initial_schema
-- Description: Creates all required tables for the aim training game

-- Drop tables if they exist (for clean migration)
DROP TABLE IF EXISTS user_stats;
DROP TABLE IF EXISTS scores;
DROP TABLE IF EXISTS game_modes;
DROP TABLE IF EXISTS users;

-- ============================================
-- Users Table
-- ============================================
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(20) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME,
    INDEX idx_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Game Modes Table
-- ============================================
CREATE TABLE game_modes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Scores Table
-- ============================================
CREATE TABLE scores (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    game_mode_id INT NOT NULL,
    score INT NOT NULL,
    survival_time INT NOT NULL COMMENT 'seconds',
    accuracy DECIMAL(5,2) COMMENT 'percentage',
    targets_hit INT NOT NULL,
    targets_missed INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (game_mode_id) REFERENCES game_modes(id) ON DELETE CASCADE,
    INDEX idx_leaderboard (game_mode_id, score DESC, created_at ASC),
    INDEX idx_user_scores (user_id, game_mode_id, created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- User Statistics Table
-- ============================================
CREATE TABLE user_stats (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    game_mode_id INT NOT NULL,
    total_games INT DEFAULT 0,
    total_targets_hit INT DEFAULT 0,
    total_targets_missed INT DEFAULT 0,
    best_score INT DEFAULT 0,
    best_time INT DEFAULT 0 COMMENT 'seconds',
    total_playtime INT DEFAULT 0 COMMENT 'seconds',
    best_streak INT DEFAULT 0 COMMENT 'consecutive hits',
    last_played DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (game_mode_id) REFERENCES game_modes(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_mode (user_id, game_mode_id),
    INDEX idx_user_mode (user_id, game_mode_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Seed Data: Game Modes
-- ============================================
INSERT INTO game_modes (name, display_name, is_active, description) VALUES
('classic', 'Classic Mode', TRUE, 'Click targets before they disappear. 3 lives, increasing difficulty. Perfect for improving precision and reaction time.'),
('time_attack', 'Time Attack', FALSE, 'Score maximum points in 60 seconds. Fast-paced action with no life penalties.'),
('speed_run', 'Speed Run', FALSE, 'Hit 50 targets as fast as possible. Race against the clock for the best time.'),
('precision', 'Precision Mode', FALSE, 'Smaller targets, no life penalty. Pure accuracy test for expert aimers.'),
('endurance', 'Endurance Mode', FALSE, 'Survive as long as possible with increasing difficulty. How long can you last?');

-- ============================================
-- Migration Complete
-- ============================================
