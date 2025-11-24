-- Add username change cooldown column
ALTER TABLE users
ADD COLUMN last_username_change DATETIME DEFAULT NULL AFTER ban_reason;
