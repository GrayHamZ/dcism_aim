/**
 * API Module
 * Handles all API communication with the backend
 */

const API_BASE = '/DCISM_Aim/api';

class API {
    /**
     * Make API request
     * @param {string} endpoint - API endpoint path
     * @param {object} options - Fetch options
     * @returns {Promise<object>} - Response data
     */
    static async request(endpoint, options = {}) {
        try {
            const url = `${API_BASE}${endpoint}`;

            const defaultOptions = {
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'same-origin'
            };

            const response = await fetch(url, { ...defaultOptions, ...options });
            const data = await response.json();

            if (!data.success) {
                throw new Error(data.message || 'API request failed');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    /**
     * Authentication APIs
     */
    static async login(username, password, rememberMe = false) {
        return this.request('/auth/login.php', {
            method: 'POST',
            body: JSON.stringify({ username, password, remember_me: rememberMe })
        });
    }

    static async signup(username, password) {
        return this.request('/auth/signup.php', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
    }

    static async logout() {
        return this.request('/auth/logout.php', {
            method: 'POST'
        });
    }

    /**
     * Game Data APIs
     */
    static async getGameModes() {
        return this.request('/game-modes.php');
    }

    static async saveScore(gameData) {
        return this.request('/scores/save.php', {
            method: 'POST',
            body: JSON.stringify(gameData)
        });
    }

    static async getLeaderboard(gameModeId = 1, limit = 100, offset = 0) {
        return this.request(`/leaderboard.php?mode=${gameModeId}&limit=${limit}&offset=${offset}`);
    }

    static async getUserStats(userId = null, gameModeId = 1) {
        const params = userId ? `user_id=${userId}&mode=${gameModeId}` : `mode=${gameModeId}`;
        return this.request(`/user/stats.php?${params}`);
    }
}

export default API;
