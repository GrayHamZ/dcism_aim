-- Add user eligibility columns
ALTER TABLE users
ADD COLUMN leaderboard_illegible TINYINT(1) DEFAULT 0 AFTER last_login,
ADD COLUMN ban_reason VARCHAR(255) DEFAULT NULL AFTER leaderboard_illegible;
