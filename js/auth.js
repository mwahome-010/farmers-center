// Authentication System using localStorage

// Simple hash function for password storage (client-side only - NOT PRODUCTION READY)
// This provides minimal obfuscation but is NOT secure. Server-side auth is required for production.
async function simpleHash(str) {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

class AuthSystem {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    init() {
        // Check if user is already logged in
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
            this.currentUser = JSON.parse(savedUser);
        }
        
        // Initialize modal controls
        this.initModal();
        
        // Update UI based on auth state
        this.updateUI();
    }

    initModal() {
        const modal = document.getElementById('authModal');
        const openBtn = document.querySelector('.login-popup-btn');
        const closeBtn = document.getElementById('authModalClose');
        const tabs = document.querySelectorAll('.auth-tab');
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');

        if (openBtn) {
            openBtn.addEventListener('click', () => this.openModal());
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeModal());
        }

        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.closeModal();
            });
        }

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal && modal.classList.contains('open')) {
                this.closeModal();
            }
        });

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.getAttribute('data-tab');
                this.switchTab(tabName);
            });
        });

        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }

        if (registerForm) {
            registerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleRegister();
            });
        }
    }

    openModal() {
        const modal = document.getElementById('authModal');
        if (modal) {
            modal.classList.add('open');
            modal.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden';
        }
    }

    closeModal() {
        const modal = document.getElementById('authModal');
        if (modal) {
            modal.classList.remove('open');
            modal.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
            this.clearErrors();
            this.clearForms();
        }
    }

    switchTab(tabName) {
        const tabs = document.querySelectorAll('.auth-tab');
        const forms = document.querySelectorAll('.auth-form');
        const title = document.getElementById('authModalTitle');

        tabs.forEach(tab => {
            if (tab.getAttribute('data-tab') === tabName) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });

        forms.forEach(form => {
            if (form.id === tabName + 'Form') {
                form.classList.add('active');
            } else {
                form.classList.remove('active');
            }
        });

        if (title) {
            title.textContent = tabName.charAt(0).toUpperCase() + tabName.slice(1);
        }

        this.clearErrors();
    }

    async handleLogin() {
        const username = document.getElementById('loginUsername').value.trim();
        const password = document.getElementById('loginPassword').value;
        const errorEl = document.getElementById('loginError');

        if (!username || !password) {
            this.showError('loginError', 'Please fill in all fields');
            return;
        }

        // Get users from localStorage
        const users = this.getUsers();
        const user = users.find(u => u.username === username);

        if (!user) {
            this.showError('loginError', 'User not found');
            return;
        }

        // Hash password and compare
        const hashedPassword = await simpleHash(password);
        if (user.passwordHash !== hashedPassword) {
            this.showError('loginError', 'Incorrect password');
            return;
        }

        // Successful login
        this.currentUser = {
            username: user.username,
            email: user.email,
            loginTime: new Date().toISOString()
        };

        localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
        this.closeModal();
        this.updateUI();
        this.showSuccessMessage(`Welcome back, ${user.username}!`);
    }

    async handleRegister() {
        const username = document.getElementById('registerUsername').value.trim();
        const email = document.getElementById('registerEmail').value.trim();
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('registerConfirmPassword').value;

        // Validation
        if (!username || !email || !password || !confirmPassword) {
            this.showError('registerError', 'Please fill in all fields');
            return;
        }

        if (username.length < 3) {
            this.showError('registerError', 'Username must be at least 3 characters');
            return;
        }

        if (password.length < 6) {
            this.showError('registerError', 'Password must be at least 6 characters');
            return;
        }

        if (password !== confirmPassword) {
            this.showError('registerError', 'Passwords do not match');
            return;
        }

        // Check if user already exists
        const users = this.getUsers();
        if (users.find(u => u.username === username)) {
            this.showError('registerError', 'Username already exists');
            return;
        }

        if (users.find(u => u.email === email)) {
            this.showError('registerError', 'Email already registered');
            return;
        }

        // Hash password before storing
        const passwordHash = await simpleHash(password);

        // Register new user
        const newUser = {
            username,
            email,
            passwordHash,
            registeredAt: new Date().toISOString()
        };

        users.push(newUser);
        localStorage.setItem('users', JSON.stringify(users));

        // Auto login after registration
        this.currentUser = {
            username: newUser.username,
            email: newUser.email,
            loginTime: new Date().toISOString()
        };

        localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
        this.closeModal();
        this.updateUI();
        this.showSuccessMessage(`Account created! Welcome, ${username}!`);
    }

    logout() {
        this.currentUser = null;
        localStorage.removeItem('currentUser');
        this.updateUI();
        this.showSuccessMessage('Logged out successfully');
    }

    updateUI() {
        const loginBtn = document.querySelector('.login-popup-btn');
        const navBar = document.querySelector('.nav-bar');

        if (!navBar) return;

        // Remove existing user info if any
        const existingUserInfo = navBar.querySelector('.user-info');
        if (existingUserInfo) {
            existingUserInfo.remove();
        }

        if (this.currentUser) {
            // User is logged in - hide login button, show user info
            if (loginBtn) {
                loginBtn.style.display = 'none';
            }

            const userInfo = document.createElement('div');
            userInfo.className = 'user-info';
            userInfo.innerHTML = `
                <span class="username">${this.currentUser.username}</span>
                <button class="logout-btn">Logout</button>
            `;

            navBar.appendChild(userInfo);

            const logoutBtn = userInfo.querySelector('.logout-btn');
            logoutBtn.addEventListener('click', () => this.logout());
        } else {
            // User is logged out - show login button
            if (loginBtn) {
                loginBtn.style.display = 'block';
            }
        }
    }

    getUsers() {
        const users = localStorage.getItem('users');
        return users ? JSON.parse(users) : [];
    }

    showError(elementId, message) {
        const errorEl = document.getElementById(elementId);
        if (errorEl) {
            errorEl.textContent = message;
        }
    }

    clearErrors() {
        const errorElements = document.querySelectorAll('.auth-error');
        errorElements.forEach(el => el.textContent = '');
    }

    clearForms() {
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        if (loginForm) loginForm.reset();
        if (registerForm) registerForm.reset();
    }

    showSuccessMessage(message) {
        // Create a temporary success message
        const messageEl = document.createElement('div');
        messageEl.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            background: hsl(140, 62%, 39%);
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            z-index: 10000;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            animation: slideIn 0.3s ease-out;
        `;
        messageEl.textContent = message;
        document.body.appendChild(messageEl);

        setTimeout(() => {
            messageEl.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => messageEl.remove(), 300);
        }, 3000);
    }

    isLoggedIn() {
        return this.currentUser !== null;
    }

    getCurrentUser() {
        return this.currentUser;
    }

    requireAuth(callback) {
        if (this.isLoggedIn()) {
            callback();
        } else {
            this.openModal();
            this.showError('loginError', 'Please log in to continue');
        }
    }
}

const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

const auth = new AuthSystem();

export default auth;