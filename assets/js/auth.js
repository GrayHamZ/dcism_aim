/**
 * Authentication Module
 * Manages user authentication state and UI
 */

import API from './api.js';

class Auth {
    constructor() {
        this.user = null;
        this.init();
    }

    init() {
        // Check if user data exists in sessionStorage
        const savedUser = sessionStorage.getItem('user');
        if (savedUser) {
            this.user = JSON.parse(savedUser);
            this.updateUI();
        }

        this.setupEventListeners();
    }

    setupEventListeners() {
        // Login form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Signup form
        const signupForm = document.getElementById('signupForm');
        if (signupForm) {
            signupForm.addEventListener('submit', (e) => this.handleSignup(e));
        }

        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }

        // Modal triggers
        const loginBtn = document.getElementById('loginBtn');
        if (loginBtn) {
            loginBtn.addEventListener('click', () => this.showLoginModal());
        }

        const signupBtn = document.getElementById('signupBtn');
        if (signupBtn) {
            signupBtn.addEventListener('click', () => this.showSignupModal());
        }

        // Modal close buttons
        document.querySelectorAll('.modal-close, .modal-overlay').forEach(element => {
            element.addEventListener('click', (e) => {
                if (e.target.classList.contains('modal-close') || e.target.classList.contains('modal-overlay')) {
                    this.closeModals();
                }
            });
        });

        // Switch between login and signup
        const switchToSignup = document.getElementById('switchToSignup');
        if (switchToSignup) {
            switchToSignup.addEventListener('click', (e) => {
                e.preventDefault();
                this.closeModals();
                this.showSignupModal();
            });
        }

        const switchToLogin = document.getElementById('switchToLogin');
        if (switchToLogin) {
            switchToLogin.addEventListener('click', (e) => {
                e.preventDefault();
                this.closeModals();
                this.showLoginModal();
            });
        }
    }

    async handleLogin(e) {
        e.preventDefault();

        const form = e.target;
        const username = form.username.value.trim();
        const password = form.password.value;
        const rememberMe = form.remember_me.checked;

        const errorElement = document.getElementById('loginError');
        errorElement.classList.add('hidden');

        try {
            const response = await API.login(username, password, rememberMe);

            if (response.success) {
                this.user = response.data;
                sessionStorage.setItem('user', JSON.stringify(this.user));
                this.updateUI();
                this.closeModals();
                form.reset();

                // Redirect to home or stats
                window.location.hash = '#/stats';
            }
        } catch (error) {
            errorElement.textContent = error.message;
            errorElement.classList.remove('hidden');
        }
    }

    async handleSignup(e) {
        e.preventDefault();

        const form = e.target;
        const username = form.username.value.trim();
        const password = form.password.value;
        const passwordConfirm = form.password_confirm.value;

        const errorElement = document.getElementById('signupError');
        errorElement.classList.add('hidden');

        // Validate password match
        if (password !== passwordConfirm) {
            errorElement.textContent = 'Passwords do not match';
            errorElement.classList.remove('hidden');
            return;
        }

        try {
            const response = await API.signup(username, password);

            if (response.success) {
                this.user = response.data;
                sessionStorage.setItem('user', JSON.stringify(this.user));
                this.updateUI();
                this.closeModals();
                form.reset();

                // Redirect to home
                window.location.hash = '#/';
            }
        } catch (error) {
            errorElement.textContent = error.message;
            errorElement.classList.remove('hidden');
        }
    }

    async handleLogout() {
        try {
            await API.logout();
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            this.user = null;
            sessionStorage.removeItem('user');
            this.updateUI();
            window.location.hash = '#/';
        }
    }

    showLoginModal() {
        const modal = document.getElementById('loginModal');
        if (modal) {
            modal.classList.remove('hidden');
        }
    }

    showSignupModal() {
        const modal = document.getElementById('signupModal');
        if (modal) {
            modal.classList.remove('hidden');
        }
    }

    closeModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.add('hidden');
        });

        // Clear error messages
        document.querySelectorAll('.error-message').forEach(error => {
            error.classList.add('hidden');
            error.textContent = '';
        });
    }

    updateUI() {
        const isAuthenticated = this.isAuthenticated();

        // Update auth-only and guest-only elements
        document.querySelectorAll('.auth-only').forEach(element => {
            if (isAuthenticated) {
                element.classList.remove('hidden');
            } else {
                element.classList.add('hidden');
            }
        });

        document.querySelectorAll('.guest-only').forEach(element => {
            if (isAuthenticated) {
                element.classList.add('hidden');
            } else {
                element.classList.remove('hidden');
            }
        });

        // Update username display
        if (isAuthenticated) {
            const usernameDisplay = document.getElementById('usernameDisplay');
            if (usernameDisplay) {
                usernameDisplay.textContent = this.user.username;
            }
        }
    }

    isAuthenticated() {
        return this.user !== null;
    }

    getUser() {
        return this.user;
    }

    getUserId() {
        return this.user ? this.user.user_id : null;
    }

    getUsername() {
        return this.user ? this.user.username : null;
    }
}

// Create singleton instance
const auth = new Auth();

export default auth;
