<?php
/**
 * Database Connection Manager
 * Provides database connection using environment variables
 */

require_once __DIR__ . '/env-loader.php';

class Database {
    private static $instance = null;
    private $connection;

    /**
     * Private constructor to prevent direct instantiation
     */
    private function __construct() {
        $this->connect();
    }

    /**
     * Get database instance (Singleton pattern)
     * @return Database
     */
    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /**
     * Establish database connection
     * @throws Exception if connection fails
     */
    private function connect() {
        try {
            $host = EnvLoader::required('DB_HOST');
            $user = EnvLoader::required('DB_USER');
            $pass = EnvLoader::get('DB_PASS', '');
            $name = EnvLoader::required('DB_NAME');

            // Create connection
            $this->connection = new mysqli($host, $user, $pass, $name);

            // Check connection
            if ($this->connection->connect_error) {
                throw new Exception("Database connection failed: " . $this->connection->connect_error);
            }

            // Set charset to UTF-8
            if (!$this->connection->set_charset("utf8mb4")) {
                throw new Exception("Error setting UTF-8 charset: " . $this->connection->error);
            }

        } catch (Exception $e) {
            error_log("Database connection error: " . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Get the mysqli connection object
     * @return mysqli
     */
    public function getConnection() {
        // Check if connection is still alive
        if (!$this->connection->ping()) {
            $this->connect();
        }
        return $this->connection;
    }

    /**
     * Execute a prepared statement with parameters
     * @param string $query SQL query with placeholders
     * @param array $params Parameters to bind
     * @param string $types Parameter types (i=integer, d=double, s=string, b=blob)
     * @return mysqli_stmt
     */
    public function prepare($query, $params = [], $types = '') {
        $stmt = $this->connection->prepare($query);

        if (!$stmt) {
            throw new Exception("Prepare failed: " . $this->connection->error);
        }

        if (!empty($params)) {
            if (empty($types)) {
                // Auto-detect types if not provided
                $types = $this->detectTypes($params);
            }
            $stmt->bind_param($types, ...$params);
        }

        return $stmt;
    }

    /**
     * Auto-detect parameter types
     * @param array $params
     * @return string
     */
    private function detectTypes($params) {
        $types = '';
        foreach ($params as $param) {
            if (is_int($param)) {
                $types .= 'i';
            } elseif (is_float($param)) {
                $types .= 'd';
            } else {
                $types .= 's';
            }
        }
        return $types;
    }

    /**
     * Execute a query and return the result
     * @param string $query SQL query
     * @return mysqli_result|bool
     */
    public function query($query) {
        $result = $this->connection->query($query);

        if ($result === false) {
            throw new Exception("Query failed: " . $this->connection->error);
        }

        return $result;
    }

    /**
     * Get the last inserted ID
     * @return int
     */
    public function getLastInsertId() {
        return $this->connection->insert_id;
    }

    /**
     * Begin transaction
     */
    public function beginTransaction() {
        $this->connection->begin_transaction();
    }

    /**
     * Commit transaction
     */
    public function commit() {
        $this->connection->commit();
    }

    /**
     * Rollback transaction
     */
    public function rollback() {
        $this->connection->rollback();
    }

    /**
     * Escape string for safe use in queries (use prepared statements instead when possible)
     * @param string $string
     * @return string
     */
    public function escape($string) {
        return $this->connection->real_escape_string($string);
    }

    /**
     * Prevent cloning of instance
     */
    private function __clone() {}

    /**
     * Close database connection
     */
    public function __destruct() {
        if ($this->connection) {
            $this->connection->close();
        }
    }
}

?>
