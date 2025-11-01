class AuthSystem {
    constructor() {
        this.currentUser = null;
        this.sessionToken = null;
        this.init();
    }

    async init() {
        const savedToken = localStorage.getItem('sessionToken');
        if (savedToken) {
            this.sessionToken = savedToken;
            await this.verifySession();
        }

        this.initModal();
        this.updateUI();
    }

    async verifySession() {
        try {
            const response = await fetch('/api/auth/verify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ session_token: this.sessionToken })
            });

            if (response.ok) {
                const data = await response.json();
                this.currentUser = {
                    username: data.username,
                    email: data.email
                };
            } else {
                localStorage.removeItem('sessionToken');
                this.sessionToken = null;
                this.currentUser = null;
            }
        } catch (error) {
            console.error('Session verification failed:', error);
            localStorage.removeItem('sessionToken');
            this.sessionToken = null;
            this.currentUser = null;
        }
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

        if (!username || !password) {
            this.showError('loginError', 'Please fill in all fields');
            return;
        }

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (response.ok) {
                this.currentUser = {
                    username: data.username,
                    email: data.email
                };
                this.sessionToken = data.session_token;
                localStorage.setItem('sessionToken', data.session_token);
                
                this.closeModal();
                this.updateUI();
                this.showSuccessMessage(`Welcome back, ${data.username}!`);
            } else {
                this.showError('loginError', data.error || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showError('loginError', 'An error occurred. Please try again.');
        }
    }

    async handleRegister() {
        const username = document.getElementById('registerUsername').value.trim();
        const email = document.getElementById('registerEmail').value.trim();
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('registerConfirmPassword').value;

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

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, email, password })
            });

            const data = await response.json();

            if (response.ok) {
                this.currentUser = {
                    username: data.username,
                    email: data.email
                };
                this.sessionToken = data.session_token;
                localStorage.setItem('sessionToken', data.session_token);
                
                this.closeModal();
                this.updateUI();
                this.showSuccessMessage(`Account created! Welcome, ${username}!`);
            } else {
                this.showError('registerError', data.error || 'Registration failed');
            }
        } catch (error) {
            console.error('Registration error:', error);
            this.showError('registerError', 'An error occurred. Please try again.');
        }
    }

    async logout() {
        try {
            await fetch('/api/auth/logout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ session_token: this.sessionToken })
            });
        } catch (error) {
            console.error('Logout error:', error);
        }

        this.currentUser = null;
        this.sessionToken = null;
        localStorage.removeItem('sessionToken');
        this.updateUI();
        this.showSuccessMessage('Logged out successfully');
    }

    updateUI() {
        const loginBtn = document.querySelector('.login-popup-btn');
        const navBar = document.querySelector('.nav-bar');

        if (!navBar) return;

        const existingUserInfo = navBar.querySelector('.user-info');
        if (existingUserInfo) {
            existingUserInfo.remove();
        }

        if (this.currentUser) {
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
            if (loginBtn) {
                loginBtn.style.display = 'block';
            }
        }
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