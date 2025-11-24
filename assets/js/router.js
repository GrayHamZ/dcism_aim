/**
 * Router Module
 * Handles SPA routing and view rendering
 */

import auth from './auth.js';
import API from './api.js';
import Changelog from './changelog.js';

class Router {
    constructor() {
        this.routes = {};
        this.currentRoute = null;
        // Pagination state
        this.leaderboardState = {
            currentPage: 1,
            rowsPerPage: 25,
            totalPlayers: 0,
            currentModeId: 1
        };
        this.init();
    }

    init() {
        // Register routes
        this.register('/', () => this.renderHome());
        this.register('/play', () => this.renderPlay());
        this.register('/leaderboard', () => this.renderLeaderboard());
        this.register('/stats', () => this.renderStats());
        this.register('/changelog', () => this.renderChangelog());

        // Listen for hash changes
        window.addEventListener('hashchange', () => this.handleRoute());
        window.addEventListener('load', () => this.handleRoute());

        // Update active nav links
        this.updateNavLinks();
    }

    register(path, handler) {
        this.routes[path] = handler;
    }

    handleRoute() {
        const hash = window.location.hash.slice(1) || '/';
        const path = hash.split('?')[0];

        // Check if trying to navigate away from active game
        if (this.currentRoute === '/play' && path !== '/play' && window.Game && window.Game.isGameActive()) {
            const confirmLeave = confirm('You have an active game in progress. Leaving will end your current game. Are you sure?');
            if (!confirmLeave) {
                // Prevent navigation by restoring the hash
                window.location.hash = '#/play';
                return;
            } else {
                // Force end the game
                window.Game.isRunning = false;
                window.Game.setNavigationState(true);
                if (window.Game.animationId) {
                    cancelAnimationFrame(window.Game.animationId);
                    window.Game.animationId = null;
                }
                window.Game.clearPendingTimeouts();
            }
        }

        this.currentRoute = path;

        if (this.routes[path]) {
            this.routes[path]();
        } else {
            this.render404();
        }

        this.updateNavLinks();
        window.scrollTo(0, 0);
    }

    updateNavLinks() {
        document.querySelectorAll('.nav-link').forEach(link => {
            const route = link.getAttribute('data-route');
            if (route === this.currentRoute) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }

    async getChangelogSection() {
        return await Changelog.renderSection(5);
    }

    async renderHome() {
        const app = document.getElementById('app');
        const changelogSection = await this.getChangelogSection();

        app.innerHTML = `
            <div class="home-view">
                ${auth.user && auth.user.leaderboard_illegible ? `
                    <div class="warning-banner" style="background: rgba(255, 0, 0, 0.2); border: 1px solid var(--neon-magenta); padding: 1rem; margin-bottom: 2rem; border-radius: 8px;">
                        <h3 style="color: var(--neon-magenta); margin-top: 0;">⚠️ Account Restricted</h3>
                        <p>Your account is currently ineligible for the leaderboard.</p>
                        ${auth.user.ban_reason ? `<p><strong>Reason:</strong> ${auth.user.ban_reason}</p>` : ''}
                    </div>
                ` : ''}
                <h1>WELCOME TO DCISM AIM</h1>
                <button class="btn btn-primary" onclick="window.location.hash='#/play'" style="font-size: 1.2rem; padding: 1rem 2rem;">
                    Start AIMING
                </button>
                ${changelogSection}
            </div>
        `;

        // Update header version badge
        Changelog.updateHeaderVersion();
    }

    renderPlay() {
        const app = document.getElementById('app');
        app.innerHTML = `
            <div class="game-container">
                <h1 style="color: var(--neon-cyan); text-align: center; margin-bottom: 2rem;">Classic Mode</h1>

                <div class="game-header">
                    <div style="display: flex; gap: 3rem;">
                        <div class="game-stat">
                            <div class="game-stat-label">Score</div>
                            <div class="game-stat-value" id="scoreDisplay">0</div>
                        </div>
                        <div class="game-stat">
                            <div class="game-stat-label">Lives</div>
                            <div class="lives-display" id="livesDisplay">
                                <div class="life"></div>
                                <div class="life"></div>
                                <div class="life"></div>
                            </div>
                        </div>
                        <div class="game-stat">
                            <div class="game-stat-label">Time</div>
                            <div class="game-stat-value" id="timeDisplay">00:00</div>
                        </div>
                    </div>
                    <div class="game-stat">
                        <button id="soundToggle" class="sound-toggle" title="Toggle Sound Effects">
                            <svg id="soundOnIcon" class="sound-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                            </svg>
                            <svg id="soundOffIcon" class="sound-icon hidden" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                                <line x1="23" y1="9" x2="17" y2="15"></line>
                                <line x1="17" y1="9" x2="23" y2="15"></line>
                            </svg>
                        </button>
                    </div>
                </div>

                <canvas id="gameCanvas" width="1200" height="800"></canvas>

                <button id="startGameBtn" class="btn btn-primary" style="font-size: 1.1rem; padding: 0.8rem 2rem;">
                    Start Game
                </button>
            </div>
        `;

        // Initialize game after render (game.js will handle this)
        if (window.Game) {
            window.Game.init();
        }
    }

    async renderLeaderboard() {
        const app = document.getElementById('app');
        // Reset pagination state when entering leaderboard
        this.leaderboardState.currentPage = 1;

        app.innerHTML = `
            <div class="leaderboard-container">
                <div class="leaderboard-header">
                    <h1>Leaderboard</h1>
                    <div class="mode-tabs" id="modeTabs">
                        <div class="spinner"></div>
                    </div>
                </div>
                <div class="pagination-controls" id="paginationControls"></div>
                <div class="leaderboard-table">
                    <div class="spinner"></div>
                </div>
            </div>
        `;

        try {
            // Fetch game modes
            const modesResponse = await API.getGameModes();
            const gameModes = modesResponse.data;

            // Render mode tabs
            const modeTabsContainer = document.getElementById('modeTabs');
            modeTabsContainer.innerHTML = gameModes.map((mode, index) => `
                <div class="mode-tab ${index === 0 ? 'active' : ''} ${!mode.is_active ? 'disabled' : ''}"
                     data-mode-id="${mode.id}"
                     data-is-active="${mode.is_active}">
                    ${mode.display_name}
                </div>
            `).join('');

            // Load first active mode's leaderboard
            const firstActiveMode = gameModes.find(m => m.is_active);
            if (firstActiveMode) {
                this.leaderboardState.currentModeId = firstActiveMode.id;
                await this.loadLeaderboard(firstActiveMode.id);
            }

            // Add click listeners to tabs
            document.querySelectorAll('.mode-tab').forEach(tab => {
                tab.addEventListener('click', async (e) => {
                    const modeId = parseInt(e.target.getAttribute('data-mode-id'));
                    const isActive = e.target.getAttribute('data-is-active') === 'true';

                    if (!isActive) return; // Ignore disabled modes

                    // Update active tab
                    document.querySelectorAll('.mode-tab').forEach(t => t.classList.remove('active'));
                    e.target.classList.add('active');

                    // Reset to page 1 when switching modes
                    this.leaderboardState.currentPage = 1;
                    this.leaderboardState.currentModeId = modeId;

                    // Load leaderboard for selected mode
                    await this.loadLeaderboard(modeId);
                });
            });

        } catch (error) {
            console.error('Error loading game modes:', error);
            app.innerHTML = '<p class="error-message">Failed to load leaderboard</p>';
        }
    }

    async loadLeaderboard(gameModeId) {
        const container = document.querySelector('.leaderboard-table');
        container.innerHTML = '<div class="spinner"></div>';

        const { currentPage, rowsPerPage } = this.leaderboardState;
        const offset = (currentPage - 1) * rowsPerPage;

        try {
            const response = await API.getLeaderboard(gameModeId, rowsPerPage, offset);
            const { leaderboard, current_user_rank, total_players } = response.data;
            const currentUserId = auth.getUserId();

            // Update state
            this.leaderboardState.totalPlayers = total_players;
            const totalPages = Math.ceil(total_players / rowsPerPage);

            // Render pagination controls
            this.renderPaginationControls(totalPages, total_players);

            if (leaderboard.length === 0) {
                container.innerHTML = '<p style="text-align: center; padding: 2rem; color: var(--text-secondary);">No scores yet. Be the first to play!</p>';
                return;
            }

            container.innerHTML = `
                <table>
                    <thead>
                        <tr>
                            <th>Rank</th>
                            <th>Player</th>
                            <th>Score</th>
                            <th>Time</th>
                            <th>Accuracy</th>
                            <th>Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${leaderboard.map(entry => `
                            <tr class="${entry.user_id === currentUserId ? 'current-user' : ''}">
                                <td>
                                    ${entry.rank <= 3 ?
                    `<span class="rank-badge ${entry.rank === 1 ? 'gold' : entry.rank === 2 ? 'silver' : 'bronze'}">${entry.rank}</span>` :
                    entry.rank
                }
                                </td>
                                <td><strong>${entry.username}</strong></td>
                                <td>${entry.score}</td>
                                <td>${entry.survival_time_formatted}</td>
                                <td>${entry.accuracy ? entry.accuracy + '%' : 'N/A'}</td>
                                <td>${new Date(entry.date_achieved).toLocaleDateString()}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;

        } catch (error) {
            console.error('Error loading leaderboard:', error);
            container.innerHTML = '<p class="error-message">Failed to load leaderboard data</p>';
        }
    }

    renderPaginationControls(totalPages, totalPlayers) {
        const paginationContainer = document.getElementById('paginationControls');
        const { currentPage, rowsPerPage } = this.leaderboardState;

        if (totalPlayers === 0) {
            paginationContainer.innerHTML = '';
            return;
        }

        const startEntry = (currentPage - 1) * rowsPerPage + 1;
        const endEntry = Math.min(currentPage * rowsPerPage, totalPlayers);

        // Generate page numbers
        let pageNumbers = [];
        const maxVisiblePages = 5;

        if (totalPages <= maxVisiblePages) {
            pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);
        } else {
            if (currentPage <= 3) {
                pageNumbers = [1, 2, 3, 4, '...', totalPages];
            } else if (currentPage >= totalPages - 2) {
                pageNumbers = [1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
            } else {
                pageNumbers = [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
            }
        }

        paginationContainer.innerHTML = `
            <div class="pagination-wrapper">
                <div class="pagination-info">
                    <span>Showing ${startEntry}-${endEntry} of ${totalPlayers} players</span>
                </div>
                <div class="pagination-rows">
                    <label>Rows per page:</label>
                    <select id="rowsPerPageSelect">
                        <option value="10" ${rowsPerPage === 10 ? 'selected' : ''}>10</option>
                        <option value="25" ${rowsPerPage === 25 ? 'selected' : ''}>25</option>
                        <option value="50" ${rowsPerPage === 50 ? 'selected' : ''}>50</option>
                        <option value="100" ${rowsPerPage === 100 ? 'selected' : ''}>100</option>
                    </select>
                </div>
                <div class="pagination-nav">
                    <button class="pagination-btn" id="prevPage" ${currentPage === 1 ? 'disabled' : ''}>
                        &lt; Prev
                    </button>
                    <div class="pagination-pages">
                        ${pageNumbers.map(page =>
            page === '...'
                ? '<span class="pagination-ellipsis">...</span>'
                : `<button class="pagination-page ${page === currentPage ? 'active' : ''}" data-page="${page}">${page}</button>`
        ).join('')}
                    </div>
                    <button class="pagination-btn" id="nextPage" ${currentPage === totalPages ? 'disabled' : ''}>
                        Next &gt;
                    </button>
                </div>
            </div>
        `;

        // Add event listeners
        this.attachPaginationListeners(totalPages);
    }

    attachPaginationListeners(totalPages) {
        const rowsSelect = document.getElementById('rowsPerPageSelect');
        const prevBtn = document.getElementById('prevPage');
        const nextBtn = document.getElementById('nextPage');

        rowsSelect?.addEventListener('change', async (e) => {
            this.leaderboardState.rowsPerPage = parseInt(e.target.value);
            this.leaderboardState.currentPage = 1;
            await this.loadLeaderboard(this.leaderboardState.currentModeId);
        });

        prevBtn?.addEventListener('click', async () => {
            if (this.leaderboardState.currentPage > 1) {
                this.leaderboardState.currentPage--;
                await this.loadLeaderboard(this.leaderboardState.currentModeId);
            }
        });

        nextBtn?.addEventListener('click', async () => {
            if (this.leaderboardState.currentPage < totalPages) {
                this.leaderboardState.currentPage++;
                await this.loadLeaderboard(this.leaderboardState.currentModeId);
            }
        });

        document.querySelectorAll('.pagination-page').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const page = parseInt(e.target.getAttribute('data-page'));
                if (page !== this.leaderboardState.currentPage) {
                    this.leaderboardState.currentPage = page;
                    await this.loadLeaderboard(this.leaderboardState.currentModeId);
                }
            });
        });
    }

    async renderStats() {
        if (!auth.isAuthenticated()) {
            window.location.hash = '#/';
            auth.showLoginModal();
            return;
        }

        const app = document.getElementById('app');
        app.innerHTML = `
            <div class="stats-container">
                <div class="stats-header">
                    <h1>Player Statistics</h1>
                    <div style="display: flex; align-items: center; gap: 1rem; justify-content: center;">
                        <p style="color: var(--neon-green); font-size: 1.2rem; margin: 0;">${auth.getUsername()}</p>
                        <button id="changeUsernameBtn" class="btn btn-outline btn-sm" style="font-size: 0.8rem; padding: 0.2rem 0.5rem;">Change Username</button>
                    </div>
                </div>
                <div class="spinner"></div>
            </div>

            <!-- Change Username Modal -->
            <div id="changeUsernameModal" class="modal hidden">
                <div class="modal-overlay"></div>
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>Change Username</h2>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="changeUsernameForm">
                            <div class="form-group">
                                <label for="newUsername">New Username</label>
                                <input type="text" id="newUsername" name="new_username" required
                                       placeholder="3-20 characters (letters, numbers, _)">
                                <small>Only letters, numbers, and underscores allowed</small>
                            </div>
                            <div id="changeUsernameError" class="error-message hidden"></div>
                            <div id="changeUsernameSuccess" class="success-message hidden" style="color: var(--neon-green); margin-bottom: 1rem;"></div>
                            <button type="submit" class="btn btn-primary btn-block">Update Username</button>
                        </form>
                    </div>
                </div>
            </div>
        `;

        try {
            const response = await API.getUserStats(auth.getUserId(), 1);
            const { stats, rank, recent_games, user } = response.data;

            // Update auth user with fresh data (in case of status changes)
            if (user && auth.user && auth.user.user_id === user.id) {
                auth.user = { ...auth.user, ...user };
                // Ensure mapping matches login response structure if needed, 
                // but stats returns 'id' vs login 'user_id'. 
                // Let's be careful. Login returns { user_id, username, ... }
                // Stats returns { id, username, ... }
                // We need to map 'id' to 'user_id' to maintain consistency if we replace the whole object.
                // Or just update specific fields.
                auth.user.leaderboard_illegible = user.leaderboard_illegible;
                auth.user.ban_reason = user.ban_reason;
                auth.user.last_username_change = user.last_username_change;
                sessionStorage.setItem('user', JSON.stringify(auth.user));
            }

            const container = document.querySelector('.stats-container');
            container.innerHTML = `
                <div class="stats-header">
                    <h1>Player Statistics</h1>
                    <div style="display: flex; align-items: center; gap: 1rem; justify-content: center;">
                        <p style="color: var(--neon-green); font-size: 1.2rem; margin: 0;">${auth.getUsername()}</p>
                        ${(() => {
                    if (response.data.user.last_username_change) {
                        const lastChange = new Date(response.data.user.last_username_change);
                        const now = new Date();
                        const diffTime = Math.abs(now - lastChange);
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                        if (diffDays < 10) {
                            const remaining = 10 - diffDays;
                            return `<button class="btn btn-outline btn-sm" disabled style="font-size: 0.8rem; padding: 0.2rem 0.5rem; opacity: 0.5; cursor: not-allowed;">Available in ${remaining} days</button>`;
                        }
                    }
                    return `<button id="changeUsernameBtn" class="btn btn-outline btn-sm" style="font-size: 0.8rem; padding: 0.2rem 0.5rem;">Change Username</button>`;
                })()}
                    </div>
                </div>

                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-label">Best Score</div>
                        <div class="stat-value">${stats.best_score}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">Global Rank</div>
                        <div class="stat-value">#${rank}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">Games Played</div>
                        <div class="stat-value">${stats.total_games}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">Overall Accuracy</div>
                        <div class="stat-value">${stats.overall_accuracy}%</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">Best Time</div>
                        <div class="stat-value">${stats.best_time_formatted}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">Best Streak</div>
                        <div class="stat-value">${stats.best_streak}</div>
                    </div>
                </div>

                <div style="margin-top: 2rem;">
                    <h2 style="color: var(--neon-cyan); margin-bottom: 1rem;">Recent Games</h2>
                    ${recent_games.length > 0 ? `
                        <div class="leaderboard-table">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Score</th>
                                        <th>Time</th>
                                        <th>Accuracy</th>
                                        <th>Hits/Misses</th>
                                        <th>Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${recent_games.map(game => `
                                        <tr>
                                            <td><strong>${game.score}</strong></td>
                                            <td>${game.survival_time_formatted}</td>
                                            <td>${game.accuracy}%</td>
                                            <td>${game.targets_hit}/${game.targets_missed}</td>
                                            <td>${new Date(game.date).toLocaleDateString()}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    ` : '<p style="text-align: center; color: var(--text-secondary);">No games played yet</p>'}
                </div>
            `;

            // Attach listeners
            this.attachChangeUsernameListeners();

        } catch (error) {
            console.error('Error loading stats:', error);
            app.innerHTML = '<p class="error-message">Failed to load statistics</p>';
        }
    }

    attachChangeUsernameListeners() {
        const btn = document.getElementById('changeUsernameBtn');
        const modal = document.getElementById('changeUsernameModal');
        const form = document.getElementById('changeUsernameForm');
        const closeBtn = modal?.querySelector('.modal-close');
        const overlay = modal?.querySelector('.modal-overlay');

        if (btn && modal) {
            btn.addEventListener('click', () => {
                modal.classList.remove('hidden');
            });
        }

        const closeModal = () => {
            modal.classList.add('hidden');
            document.getElementById('changeUsernameError').classList.add('hidden');
            document.getElementById('changeUsernameSuccess').classList.add('hidden');
            form.reset();
        };

        if (closeBtn) closeBtn.addEventListener('click', closeModal);
        if (overlay) overlay.addEventListener('click', closeModal);

        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const newUsername = document.getElementById('newUsername').value.trim();
                const errorEl = document.getElementById('changeUsernameError');
                const successEl = document.getElementById('changeUsernameSuccess');

                errorEl.classList.add('hidden');
                successEl.classList.add('hidden');

                try {
                    const response = await API.changeUsername(newUsername);

                    if (response.success) {
                        successEl.textContent = 'Username updated successfully! Reloading...';
                        successEl.classList.remove('hidden');

                        // Update auth user object
                        auth.user.username = newUsername;
                        sessionStorage.setItem('user', JSON.stringify(auth.user));

                        setTimeout(() => {
                            closeModal();
                            this.renderStats(); // Re-render to show new name
                            auth.updateUI(); // Update navbar
                        }, 1500);
                    }
                } catch (error) {
                    errorEl.textContent = error.message;
                    errorEl.classList.remove('hidden');
                }
            });
        }
    }

    render404() {
        const app = document.getElementById('app');
        app.innerHTML = `
                < div class="home-view" >
                <h1 style="color: var(--neon-magenta);">404</h1>
                <p>Page not found</p>
                <button class="btn btn-primary" onclick="window.location.hash='#/'">Go Home</button>
            </div >
                `;
    }

    async renderChangelog() {
        const app = document.getElementById('app');
        const changelogPage = await Changelog.renderFullPage();
        app.innerHTML = changelogPage;
    }
}

// Create singleton instance
const router = new Router();

export default router;
