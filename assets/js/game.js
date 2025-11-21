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
        this.target = null;
        this.targetConfig = {
            initialDiameter: 15,
            maxDiameter: 75,
            growthDuration: 1200, // 1.2 seconds
            shrinkDuration: 800,  // 0.8 seconds
            totalLifespan: 2000,  // 2.0 seconds
            spawnDelay: 300       // 0.3 seconds after hit/miss
        };

        // Click spam prevention
        this.lastClickTime = 0;
        this.clickCooldown = 50; // 50ms cooldown

        // Animation
        this.animationId = null;
        this.lastFrameTime = 0;
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
        const maxWidth = Math.min(1200, window.innerWidth - 80);
        const aspectRatio = 800 / 1200;
        const width = maxWidth;
        const height = width * aspectRatio;

        this.canvas.style.width = width + 'px';
        this.canvas.style.height = height + 'px';
    }

    startGame() {
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
        this.target = null;

        // Update UI
        this.updateUI();

        // Hide start button
        const startBtn = document.getElementById('startGameBtn');
        if (startBtn) {
            startBtn.style.display = 'none';
        }

        // Spawn first target
        this.spawnTarget();

        // Start game loop
        this.gameLoop();
    }

    gameLoop(timestamp = 0) {
        if (!this.isRunning) return;

        const deltaTime = timestamp - this.lastFrameTime;
        this.lastFrameTime = timestamp;

        // Update elapsed time
        this.elapsedTime = Math.floor((Date.now() - this.startTime) / 1000);

        // Update target
        if (this.target) {
            this.updateTarget(deltaTime);
        }

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

        this.target = {
            x: x,
            y: y,
            currentDiameter: this.targetConfig.initialDiameter,
            age: 0,
            phase: 'growing', // 'growing' or 'shrinking'
            spawnTime: Date.now()
        };
    }

    updateTarget(deltaTime) {
        if (!this.target) return;

        this.target.age += deltaTime;

        // Determine phase
        if (this.target.age < this.targetConfig.growthDuration) {
            this.target.phase = 'growing';
            // Linear growth
            const progress = this.target.age / this.targetConfig.growthDuration;
            this.target.currentDiameter = this.targetConfig.initialDiameter +
                (this.targetConfig.maxDiameter - this.targetConfig.initialDiameter) * progress;
        } else if (this.target.age < this.targetConfig.totalLifespan) {
            this.target.phase = 'shrinking';
            // Linear shrink
            const shrinkAge = this.target.age - this.targetConfig.growthDuration;
            const progress = shrinkAge / this.targetConfig.shrinkDuration;
            this.target.currentDiameter = this.targetConfig.maxDiameter -
                (this.targetConfig.maxDiameter - this.targetConfig.initialDiameter) * progress;
        } else {
            // Target expired (missed)
            this.handleTargetMissed();
        }
    }

    handleClick(event) {
        if (!this.isRunning || !this.target) return;

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

        // Check if click is within target
        const distance = Math.sqrt(
            Math.pow(clickX - this.target.x, 2) +
            Math.pow(clickY - this.target.y, 2)
        );

        const radius = this.target.currentDiameter / 2;

        if (distance <= radius) {
            this.handleTargetHit();
        }
        // Note: Clicks outside target do NOT count as misses per spec
    }

    handleTargetHit() {
        this.score++;
        this.targetsHit++;
        this.currentStreak++;
        if (this.currentStreak > this.bestStreak) {
            this.bestStreak = this.currentStreak;
        }

        // Remove current target
        this.target = null;

        // Spawn new target after delay
        setTimeout(() => {
            if (this.isRunning) {
                this.spawnTarget();
            }
        }, this.targetConfig.spawnDelay);
    }

    handleTargetMissed() {
        this.lives--;
        this.targetsMissed++;
        this.currentStreak = 0;

        // Remove current target
        this.target = null;

        // Check game over
        if (this.lives <= 0) {
            this.endGame();
            return;
        }

        // Spawn new target after delay
        setTimeout(() => {
            if (this.isRunning) {
                this.spawnTarget();
            }
        }, this.targetConfig.spawnDelay);
    }

    async endGame() {
        this.isRunning = false;

        // Stop animation loop
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }

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

        // Draw target if exists
        if (this.target && this.isRunning) {
            const radius = this.target.currentDiameter / 2;

            // Create gradient for neon effect
            const gradient = this.ctx.createRadialGradient(
                this.target.x, this.target.y, 0,
                this.target.x, this.target.y, radius
            );

            if (this.target.phase === 'growing') {
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
            this.ctx.shadowColor = this.target.phase === 'growing' ? '#00F5FF' : '#FF00FF';

            // Draw target circle
            this.ctx.beginPath();
            this.ctx.arc(this.target.x, this.target.y, radius, 0, Math.PI * 2);
            this.ctx.fillStyle = gradient;
            this.ctx.fill();

            // Draw center dot
            this.ctx.shadowBlur = 0;
            this.ctx.beginPath();
            this.ctx.arc(this.target.x, this.target.y, 3, 0, Math.PI * 2);
            this.ctx.fillStyle = '#ffffff';
            this.ctx.fill();
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
}

// Create singleton instance and expose globally
const game = new Game();
window.Game = game;

export default game;
