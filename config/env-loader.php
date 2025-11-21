<?php
/**
 * Environment Variable Loader
 * Loads environment variables from .env file and makes them available via $_ENV
 */

class EnvLoader {
    private static $loaded = false;

    /**
     * Load environment variables from .env file
     * @param string $path Path to the .env file
     * @return bool True if successfully loaded
     */
    public static function load($path = null) {
        // Prevent multiple loads
        if (self::$loaded) {
            return true;
        }

        // Default to project root .env file
        if ($path === null) {
            $path = __DIR__ . '/../.env';
        }

        // Check if .env file exists
        if (!file_exists($path)) {
            error_log("Warning: .env file not found at: " . $path);
            return false;
        }

        // Read .env file
        $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);

        if ($lines === false) {
            error_log("Error: Could not read .env file at: " . $path);
            return false;
        }

        // Parse each line
        foreach ($lines as $line) {
            // Skip comments
            if (strpos(trim($line), '#') === 0) {
                continue;
            }

            // Parse KEY=VALUE format
            if (strpos($line, '=') !== false) {
                list($key, $value) = explode('=', $line, 2);

                $key = trim($key);
                $value = trim($value);

                // Remove quotes if present
                if (preg_match('/^(["\'])(.*)\1$/', $value, $matches)) {
                    $value = $matches[2];
                }

                // Set environment variable
                if (!empty($key)) {
                    $_ENV[$key] = $value;
                    putenv("$key=$value");
                }
            }
        }

        self::$loaded = true;
        return true;
    }

    /**
     * Get an environment variable value
     * @param string $key The environment variable name
     * @param mixed $default Default value if not found
     * @return mixed The environment variable value or default
     */
    public static function get($key, $default = null) {
        // Try $_ENV first
        if (isset($_ENV[$key])) {
            return $_ENV[$key];
        }

        // Try getenv()
        $value = getenv($key);
        if ($value !== false) {
            return $value;
        }

        return $default;
    }

    /**
     * Check if environment variable exists
     * @param string $key The environment variable name
     * @return bool
     */
    public static function has($key) {
        return isset($_ENV[$key]) || getenv($key) !== false;
    }

    /**
     * Get required environment variable (throws error if not found)
     * @param string $key The environment variable name
     * @return mixed The environment variable value
     * @throws Exception if variable not found
     */
    public static function required($key) {
        $value = self::get($key);

        if ($value === null) {
            throw new Exception("Required environment variable '$key' is not set");
        }

        return $value;
    }
}

// Auto-load .env file when this file is included
EnvLoader::load();

?>
