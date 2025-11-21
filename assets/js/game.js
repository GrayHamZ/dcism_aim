/**
 * Game Engine Module
 * Handles Canvas rendering, target animation, and game logic
 */

import API from './api.js';
import auth from './auth.js';

class Game {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.isRunning = false;
        this.isPaused = false;

        // Game state
        this.score = 0;
        this.lives = 3;
        this.startTime = null;
        this.elapsedTime = 0;
        this.targetsHit = 0;
        this.targetsMissed = 0;
        this.currentStreak = 0;
        this.bestStreak = 0;

        // Target properties (from spec)
        this.targets = []; // Array to hold multiple active targets
        this.targetConfig = {
            initialDiameter: 15,
            maxDiameter: 75,
            growthDuration: 2000, // 2.0 seconds
            shrinkDuration: 2000,  // 2.0 seconds
            totalLifespan: 4000,  // 4.0 seconds
            spawnInterval: 400    // 0.5 seconds between spawns
        };
        this.spawnIntervalId = null; // Store interval ID for cleanup

        // Click spam prevention
        this.lastClickTime = 0;
        this.clickCooldown = 50; // 50ms cooldown

        // Animation
        this.animationId = null;
        this.lastFrameTime = 0;
        
        // Store timeout IDs for cleanup
        this.pendingTimeouts = [];
    }

    init() {
        this.canvas = document.getElementById('gameCanvas');
        if (!this.canvas) return;

        this.ctx = this.canvas.getContext('2d');

        // Make canvas responsive while maintaining aspect ratio
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());

        // Setup event listeners
        const startBtn = document.getElementById('startGameBtn');
        if (startBtn) {
            startBtn.addEventListener('click', () => this.startGame());
        }

        this.canvas.addEventListener('click', (e) => this.handleClick(e));

        // Draw initial canvas
        this.drawCanvas();
    }

    resizeCanvas() {
        // Keep 1200x800 aspect ratio but scale down if needed
        const maxWidth = Math.min(950, window.innerWidth - 80);
        const aspectRatio = 800 / 1200;
        const width = maxWidth;
        const height = width * aspectRatio;

        this.canvas.style.width = width + 'px';
        this.canvas.style.height = height + 'px';
    }

    startGame() {
        // Clear any pending timeouts from previous game
        this.clearPendingTimeouts();
        
        // Stop any running animation loop
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        
        // Reset game state
        this.score = 0;
        this.lives = 3;
        this.targetsHit = 0;
        this.targetsMissed = 0;
        this.currentStreak = 0;
        this.bestStreak = 0;
        this.startTime = Date.now();
        this.elapsedTime = 0;
        this.isRunning = true;
        this.targets = [];
        this.lastFrameTime = null;
        
        // Clear any existing spawn interval
        if (this.spawnIntervalId) {
            clearInterval(this.spawnIntervalId);
            this.spawnIntervalId = null;
        }

        // Update UI
        this.updateUI();

        // Hide start button
        const startBtn = document.getElementById('startGameBtn');
        if (startBtn) {
            startBtn.style.display = 'none';
        }

        // Disable navigation during game
        this.setNavigationState(false);

        // Spawn first target immediately
        this.spawnTarget();
        
        // Set up interval to spawn targets every 0.5 seconds
        this.spawnIntervalId = setInterval(() => {
            if (this.isRunning) {
                this.spawnTarget();
            }
        }, this.targetConfig.spawnInterval);

        // Start game loop with requestAnimationFrame (don't call gameLoop directly)
        this.animationId = requestAnimationFrame((ts) => this.gameLoop(ts));
    }
    
    clearPendingTimeouts() {
        // Clear all pending timeouts
        this.pendingTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
        this.pendingTimeouts = [];
    }

    gameLoop(timestamp = 0) {
        if (!this.isRunning) return;

        // Initialize lastFrameTime on first frame
        if (this.lastFrameTime === null) {
            this.lastFrameTime = timestamp;
            // Request next frame immediately, skip this frame to avoid deltaTime calculation
            this.animationId = requestAnimationFrame((ts) => this.gameLoop(ts));
            return;
        }

        const deltaTime = timestamp - this.lastFrameTime;
        this.lastFrameTime = timestamp;

        // Update elapsed time
        this.elapsedTime = Math.floor((Date.now() - this.startTime) / 1000);

        // Update all targets
        this.updateTargets(deltaTime);

        // Draw canvas
        this.drawCanvas();

        // Update UI
        this.updateUI();

        // Continue loop
        this.animationId = requestAnimationFrame((ts) => this.gameLoop(ts));
    }

    spawnTarget() {
        const canvasRect = this.canvas.getBoundingClientRect();
        const margin = this.targetConfig.maxDiameter;

        // Random position within canvas bounds
        const x = margin + Math.random() * (this.canvas.width - margin * 2);
        const y = margin + Math.random() * (this.canvas.height - margin * 2);

        const newTarget = {
            id: Date.now() + Math.random(), // Unique ID for each target
            x: x,
            y: y,
            currentDiameter: this.targetConfig.initialDiameter,
            age: 0,
            phase: 'growing', // 'growing' or 'shrinking'
            spawnTime: Date.now()
        };
        
        this.targets.push(newTarget);
    }

    updateTargets(deltaTime) {
        // Update all targets and check for expired ones
        for (let i = this.targets.length - 1; i >= 0; i--) {
            const target = this.targets[i];
            target.age += deltaTime;

            // Determine phase
            if (target.age < this.targetConfig.growthDuration) {
                target.phase = 'growing';
                // Linear growth
                const progress = target.age / this.targetConfig.growthDuration;
                target.currentDiameter = this.targetConfig.initialDiameter +
                    (this.targetConfig.maxDiameter - this.targetConfig.initialDiameter) * progress;
            } else if (target.age < this.targetConfig.totalLifespan) {
                target.phase = 'shrinking';
                // Linear shrink
                const shrinkAge = target.age - this.targetConfig.growthDuration;
                const progress = shrinkAge / this.targetConfig.shrinkDuration;
                target.currentDiameter = this.targetConfig.maxDiameter -
                    (this.targetConfig.maxDiameter - this.targetConfig.initialDiameter) * progress;
            } else {
                // Target expired (missed)
                this.handleTargetMissed(i);
                continue; // Skip to next target
            }
            
            // Ensure diameter never goes below minimum
            target.currentDiameter = Math.max(this.targetConfig.initialDiameter, target.currentDiameter);
        }
    }

    handleClick(event) {
        if (!this.isRunning || this.targets.length === 0) return;

        // Anti-spam protection
        const now = Date.now();
        if (now - this.lastClickTime < this.clickCooldown) {
            return;
        }
        this.lastClickTime = now;

        // Get click position relative to canvas
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;

        const clickX = (event.clientX - rect.left) * scaleX;
        const clickY = (event.clientY - rect.top) * scaleY;

        // Check all targets, from newest to oldest (reverse order for better UX)
        for (let i = this.targets.length - 1; i >= 0; i--) {
            const target = this.targets[i];
            const distance = Math.sqrt(
                Math.pow(clickX - target.x, 2) +
                Math.pow(clickY - target.y, 2)
            );

            const radius = target.currentDiameter / 2;

            if (distance <= radius) {
                this.handleTargetHit(i);
                break; // Only hit one target per click
            }
        }
        // Note: Clicks outside targets do NOT count as misses per spec
    }

    handleTargetHit(targetIndex) {
        this.score++;
        this.targetsHit++;
        this.currentStreak++;
        if (this.currentStreak > this.bestStreak) {
            this.bestStreak = this.currentStreak;
        }

        // Remove the hit target from array
        this.targets.splice(targetIndex, 1);
        // Note: No need to spawn immediately - interval handles spawning
    }

    handleTargetMissed(targetIndex) {
        this.lives--;
        this.targetsMissed++;
        this.currentStreak = 0;

        // Remove the expired target from array
        this.targets.splice(targetIndex, 1);

        // Check game over
        if (this.lives <= 0) {
            this.endGame();
            return;
        }
        // Note: No need to spawn immediately - interval handles spawning
    }

    async endGame() {
        this.isRunning = false;

        // Re-enable navigation
        this.setNavigationState(true);

        // Stop animation loop
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        
        // Stop spawn interval
        if (this.spawnIntervalId) {
            clearInterval(this.spawnIntervalId);
            this.spawnIntervalId = null;
        }
        
        // Clear any pending timeouts
        this.clearPendingTimeouts();

        // Calculate final stats
        const totalTargets = this.targetsHit + this.targetsMissed;
        const accuracy = totalTargets > 0 ? ((this.targetsHit / totalTargets) * 100).toFixed(2) : 0;

        // Show game over modal
        this.showGameOverModal(accuracy);

        // Save score if authenticated
        if (auth.isAuthenticated()) {
            try {
                const gameData = {
                    game_mode_id: 1, // Classic mode
                    score: this.score,
                    survival_time: this.elapsedTime,
                    targets_hit: this.targetsHit,
                    targets_missed: this.targetsMissed,
                    best_streak: this.bestStreak
                };

                const response = await API.saveScore(gameData);

                if (response.success) {
                    const { is_new_best, rank } = response.data;

                    // Update modal with rank info
                    const rankDisplay = document.getElementById('rankDisplay');
                    if (rankDisplay) {
                        rankDisplay.textContent = `Global Rank: #${rank}`;
                        rankDisplay.classList.remove('hidden');
                    }

                    const newBestDisplay = document.getElementById('newBestDisplay');
                    if (newBestDisplay && is_new_best) {
                        newBestDisplay.classList.remove('hidden');
                    }
                }
            } catch (error) {
                console.error('Error saving score:', error);
            }
        } else {
            // Guest mode: Save score to sessionStorage
            this.saveGuestScore(accuracy);

            // Show guest prompts
            const guestPrompt = document.getElementById('guestPrompt');
            if (guestPrompt) {
                guestPrompt.classList.remove('hidden');
            }

            const signupFromGameBtn = document.getElementById('signupFromGameBtn');
            if (signupFromGameBtn) {
                signupFromGameBtn.classList.remove('hidden');
                signupFromGameBtn.addEventListener('click', () => {
                    this.closeGameOverModal();
                    auth.showSignupModal();
                });
            }
        }
    }

    saveGuestScore(accuracy) {
        // Get existing guest scores
        let guestScores = [];
        const savedScores = sessionStorage.getItem('guestScores');
        if (savedScores) {
            guestScores = JSON.parse(savedScores);
        }

        // Add new score
        const gameScore = {
            score: this.score,
            survival_time: this.elapsedTime,
            accuracy: parseFloat(accuracy),
            targets_hit: this.targetsHit,
            targets_missed: this.targetsMissed,
            best_streak: this.bestStreak,
            date: new Date().toISOString()
        };

        guestScores.push(gameScore);

        // Keep only last 10 scores
        if (guestScores.length > 10) {
            guestScores = guestScores.slice(-10);
        }

        // Save to sessionStorage
        sessionStorage.setItem('guestScores', JSON.stringify(guestScores));
    }

    showGameOverModal(accuracy) {
        const modal = document.getElementById('gameOverModal');
        if (!modal) return;

        // Update stats
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('finalTime').textContent = this.formatTime(this.elapsedTime);
        document.getElementById('finalAccuracy').textContent = accuracy + '%';
        document.getElementById('targetsHitDisplay').textContent = this.targetsHit;
        document.getElementById('targetsMissedDisplay').textContent = this.targetsMissed;

        // Show modal
        modal.classList.remove('hidden');

        // Setup retry button
        const retryBtn = document.getElementById('retryBtn');
        if (retryBtn) {
            retryBtn.onclick = () => {
                this.closeGameOverModal();
                this.startGame();
            };
        }

        // Setup view stats button
        const viewStatsBtn = document.getElementById('viewStatsBtn');
        if (viewStatsBtn) {
            viewStatsBtn.onclick = () => {
                this.closeGameOverModal();
                window.location.hash = '#/stats';
            };
        }
    }

    closeGameOverModal() {
        const modal = document.getElementById('gameOverModal');
        if (modal) {
            modal.classList.add('hidden');
        }

        // Re-enable navigation
        this.setNavigationState(true);

        // Reset and show start button
        const startBtn = document.getElementById('startGameBtn');
        if (startBtn) {
            startBtn.style.display = 'block';
        }

        // Clear canvas
        this.drawCanvas();
    }

    drawCanvas() {
        // Clear canvas
        this.ctx.fillStyle = '#0d1117';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw all targets
        if (this.isRunning) {
            this.targets.forEach(target => {
                const radius = Math.max(0, target.currentDiameter / 2);
                
                // Only draw if radius is valid
                if (radius > 0) {
                    // Create gradient for neon effect
                    const gradient = this.ctx.createRadialGradient(
                        target.x, target.y, 0,
                        target.x, target.y, radius
                    );

                    if (target.phase === 'growing') {
                        gradient.addColorStop(0, '#00F5FF');
                        gradient.addColorStop(0.5, '#00D4FF');
                        gradient.addColorStop(1, 'rgba(0, 245, 255, 0.3)');
                    } else {
                        gradient.addColorStop(0, '#FF00FF');
                        gradient.addColorStop(0.5, '#FF10F0');
                        gradient.addColorStop(1, 'rgba(255, 0, 255, 0.3)');
                    }

                    // Draw outer glow
                    this.ctx.shadowBlur = 20;
                    this.ctx.shadowColor = target.phase === 'growing' ? '#00F5FF' : '#FF00FF';

                    // Draw target circle
                    this.ctx.beginPath();
                    this.ctx.arc(target.x, target.y, radius, 0, Math.PI * 2);
                    this.ctx.fillStyle = gradient;
                    this.ctx.fill();

                    // Draw center dot
                    this.ctx.shadowBlur = 0;
                    this.ctx.beginPath();
                    this.ctx.arc(target.x, target.y, 3, 0, Math.PI * 2);
                    this.ctx.fillStyle = '#ffffff';
                    this.ctx.fill();
                }
            });
        }
    }

    updateUI() {
        // Update score
        const scoreDisplay = document.getElementById('scoreDisplay');
        if (scoreDisplay) {
            scoreDisplay.textContent = this.score;
        }

        // Update time
        const timeDisplay = document.getElementById('timeDisplay');
        if (timeDisplay) {
            timeDisplay.textContent = this.formatTime(this.elapsedTime);
        }

        // Update lives
        const livesDisplay = document.getElementById('livesDisplay');
        if (livesDisplay) {
            const lifeElements = livesDisplay.querySelectorAll('.life');
            lifeElements.forEach((element, index) => {
                if (index < this.lives) {
                    element.classList.remove('lost');
                } else {
                    element.classList.add('lost');
                }
            });
        }
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    // Check if game is currently active
    isGameActive() {
        return this.isRunning;
    }

    // Disable navigation during active game
    setNavigationState(enabled) {
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            if (enabled) {
                link.classList.remove('disabled');
                link.style.pointerEvents = '';
                link.style.opacity = '';
            } else {
                // Only disable non-play links
                const route = link.getAttribute('data-route');
                if (route !== '/play') {
                    link.classList.add('disabled');
                    link.style.pointerEvents = 'none';
                    link.style.opacity = '0.5';
                }
            }
        });
    }
}

// Create singleton instance and expose globally
const game = new Game();
window.Game = game;

export default game;
