/**
 * Main Application Module
 * Initializes the application and ties all modules together
 */

import router from './router.js';
import auth from './auth.js';
import game from './game.js';

class App {
    constructor() {
        this.init();
    }

    init() {
        // Check screen size for mobile warning
        this.checkScreenSize();
        window.addEventListener('resize', () => this.checkScreenSize());

        // Initialize authentication
        auth.updateUI();

        console.log('DCISM Aim Trainer initialized');
    }

    checkScreenSize() {
        const mobileWarning = document.getElementById('mobileWarning');
        const mainContent = document.getElementById('app');
        const navbar = document.getElementById('navbar');

        // Check if screen is too small (less than 1024px width or portrait mobile)
        const isTooSmall = window.innerWidth < 1024;
        const isPortraitMobile = window.innerWidth < 768 && window.innerHeight > window.innerWidth;

        if (isTooSmall || isPortraitMobile) {
            mobileWarning.classList.remove('hidden');
            if (mainContent) mainContent.style.display = 'none';
            if (navbar) navbar.style.display = 'none';
        } else {
            mobileWarning.classList.add('hidden');
            if (mainContent) mainContent.style.display = 'block';
            if (navbar) navbar.style.display = 'block';
        }
    }
}

// Initialize application when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new App();
    });
} else {
    new App();
}

export default App;
