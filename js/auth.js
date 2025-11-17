import { API_BASE_URL } from './config.js';

let authReadyPromise = null;
let authInitialized = false;
let currentUser = null;

async function init() {
    if (authInitialized) return authReadyPromise;
    authInitialized = true;

    authReadyPromise = (async () => {
        await checkAuthStatus();
        setupModalHandlers();
        setupFormHandlers();
        setupLoginButtons();
        updateUI();
    })();

    return authReadyPromise;
}

async function checkAuthStatus() {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/status`, {
            method: 'GET',
            credentials: 'include'
        });

        const data = await response.json();

        if (data.authenticated && data.user) {
            currentUser = data.user;
        } else {
            currentUser = null;
        }
    } catch (error) {
        console.error('Error checking auth status:', error);
        currentUser = null;
    }
}

async function register(username, email, password) {
    try {
        const response = await fetch(`${API_BASE_URL}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ username, email, password })
        });


        let data;
        try {
            data = await response.json();
        } catch (jsonError) {
            console.error('JSON parse error:', jsonError);
            return {
                success: false,
                error: `Server error (${response.status}). Please check if the backend is running.`
            };
        }

        if (response.ok && data.success) {
            currentUser = data.user;
            updateUI();
            return { success: true, message: data.message };
        } else {
            return { success: false, error: data.error || 'Registration failed' };
        }
    } catch (error) {
        console.error('Registration error:', error);


        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            return {
                success: false,
                error: `Cannot connect to server.`
            };
        }

        return {
            success: false,
            error: `Network error: ${error.message}. Please try again.`
        };
    }
}

async function login(username, password) {
    try {
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ username, password })
        });


        let data;
        try {
            data = await response.json();
        } catch (jsonError) {
            console.error('JSON parse error:', jsonError);
            return {
                success: false,
                error: `Server error (${response.status}).`
            };
        }

        if (response.ok && data.success) {
            currentUser = data.user;
            updateUI();
            return { success: true, message: data.message };
        } else {
            return { success: false, error: data.error || 'Login failed' };
        }
    } catch (error) {
        console.error('Login error:', error);


        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            return {
                success: false,
                error: `Cannot connect to server.`
            };
        }

        return {
            success: false,
            error: `Network error: ${error.message}. Please try again.`
        };
    }
}

async function logout() {
    try {
        const response = await fetch(`${API_BASE_URL}/logout`, {
            method: 'POST',
            credentials: 'include'
        });

        const data = await response.json();

        if (response.ok && data.success) {
            currentUser = null;
            updateUI();
            return { success: true, message: data.message };
        } else {
            return { success: false, error: data.error || 'Logout failed' };
        }
    } catch (error) {
        console.error('Logout error:', error);

        currentUser = null;
        updateUI();
        return { success: false, error: 'Network error during logout' };
    }
}

function setupModalHandlers() {
    const modal = document.getElementById('authModal');
    const closeBtn = document.getElementById('authModalClose');
    const loginBtns = document.querySelectorAll('.login-popup-btn');


    if (closeBtn) {
        closeBtn.addEventListener('click', closeModal);
    }


    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
    }


    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal && modal.classList.contains('open')) {
            closeModal();
        }
    });


    loginBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (isLoggedIn()) {


                if (confirm('Do you want to logout?')) {
                    logout();
                }
            } else {
                openModal();
            }
        });
    });


    const tabs = document.querySelectorAll('.auth-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.getAttribute('data-tab');
            switchTab(tabName);
        });
    });
}

function setupFormHandlers() {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');


    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const username = document.getElementById('loginUsername').value.trim();
            const password = document.getElementById('loginPassword').value;
            const errorDiv = document.getElementById('loginError');


            if (errorDiv) errorDiv.textContent = '';

            if (!username || !password) {
                if (errorDiv) errorDiv.textContent = 'Username and password are required';
                return;
            }


            const submitBtn = loginForm.querySelector('button[type="submit"]');
            const originalText = submitBtn ? submitBtn.textContent : 'Login';
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Logging in...';
            }

            const result = await login(username, password);

            if (result.success) {
                closeModal();
                loginForm.reset();
            } else {
                if (errorDiv) errorDiv.textContent = result.error || 'Login failed';
            }


            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        });
    }


    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const username = document.getElementById('registerUsername').value.trim();
            const email = document.getElementById('registerEmail').value.trim();
            const password = document.getElementById('registerPassword').value;
            const confirmPassword = document.getElementById('registerConfirmPassword').value;
            const errorDiv = document.getElementById('registerError');


            if (errorDiv) errorDiv.textContent = '';


            if (!username || !email || !password || !confirmPassword) {
                if (errorDiv) errorDiv.textContent = 'All fields are required';
                return;
            }

            if (username.length < 3) {
                if (errorDiv) errorDiv.textContent = 'Username must be at least 3 characters';
                return;
            }

            if (password.length < 6) {
                if (errorDiv) errorDiv.textContent = 'Password must be at least 6 characters';
                return;
            }

            if (password !== confirmPassword) {
                if (errorDiv) errorDiv.textContent = 'Passwords do not match';
                return;
            }


            const submitBtn = registerForm.querySelector('button[type="submit"]');
            const originalText = submitBtn ? submitBtn.textContent : 'Register';
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Registering...';
            }

            const result = await register(username, email, password);

            if (result.success) {
                closeModal();
                registerForm.reset();
            } else {
                if (errorDiv) errorDiv.textContent = result.error || 'Registration failed';
            }


            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        });
    }
}

function setupLoginButtons() {

}

function openModal(tab = 'login') {
    const modal = document.getElementById('authModal');
    if (modal) {
        switchTab(tab);
        modal.classList.add('open');
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal() {
    const modal = document.getElementById('authModal');
    if (modal) {
        modal.classList.remove('open');
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';


        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        if (loginForm) loginForm.reset();
        if (registerForm) registerForm.reset();


        const loginError = document.getElementById('loginError');
        const registerError = document.getElementById('registerError');
        if (loginError) loginError.textContent = '';
        if (registerError) registerError.textContent = '';
    }
}

function switchTab(tab) {
    const tabs = document.querySelectorAll('.auth-tab');
    const forms = document.querySelectorAll('.auth-form');
    const title = document.getElementById('authModalTitle');

    tabs.forEach(t => {
        if (t.getAttribute('data-tab') === tab) {
            t.classList.add('active');
        } else {
            t.classList.remove('active');
        }
    });

    forms.forEach(f => {
        if ((tab === 'login' && f.id === 'loginForm') ||
            (tab === 'register' && f.id === 'registerForm')) {
            f.classList.add('active');
        } else {
            f.classList.remove('active');
        }
    });

    if (title) {
        title.textContent = tab === 'login' ? 'Login' : 'Register';
    }
}

function updateUI() {
    if (isLoggedIn()) {
        renderUserControls();
    } else {
        renderLoginButtons();
    }

    dispatchAuthChanged();
}

function dispatchAuthChanged() {
    try {
        const event = new CustomEvent('auth:changed', { detail: { user: currentUser } });
        window.dispatchEvent(event);
    } catch (e) {
        console.log(e);
    }
}

function isLoggedIn() {
    return currentUser !== null;
}

function getCurrentUser() {
    return currentUser;
}

function requireAuth(callback) {
    if (isLoggedIn()) {
        if (typeof callback === 'function') {
            callback();
        }
    } else {
        openModal('login');
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        init().catch(err => console.error('Auth init failed:', err));
    });
} else {
    init().catch(err => console.error('Auth init failed:', err));
}

export function waitForAuth() {
    return authReadyPromise || init();
}

function renderUserControls() {
    const loginBtns = document.querySelectorAll('.login-popup-btn');
    loginBtns.forEach(btn => {
        const parent = btn.parentElement;
        if (!parent) return;
        const existing = parent.querySelector('.user-menu');
        if (existing) return;

        const initial = (currentUser && currentUser.username ? currentUser.username.charAt(0) : '?').toUpperCase();
        const isAdmin = currentUser && currentUser.isAdmin;

        const wrapper = document.createElement('div');
        wrapper.className = 'user-menu';
        wrapper.innerHTML = `
            <button type="button" class="user-avatar" aria-haspopup="true" aria-expanded="false" title="Account">
                <span class="avatar-initial">${initial}</span>
            </button>
            <div class="user-dropdown" role="menu" aria-hidden="true">
                ${isAdmin ? `
                    <button type="button" class="user-dropdown-item admin-item" data-action="admin-panel" role="menuitem">
                        🛡️ Admin Panel
                    </button>
                    <hr class="user-dropdown-sep" />
                ` : ''}
                <button type="button" class="user-dropdown-item" data-action="account" role="menuitem">Account overview</button>
                <button type="button" class="user-dropdown-item" data-action="change-username" role="menuitem">Change username</button>
                <hr class="user-dropdown-sep" />
                <button type="button" class="user-dropdown-item danger" data-action="delete-account" role="menuitem">Delete account</button>
                <hr class="user-dropdown-sep" />
                <button type="button" class="user-dropdown-item danger" data-action="logout" role="menuitem">Logout</button>
            </div>
        `;
        btn.replaceWith(wrapper);
    });

    ensureUserMenuHandlers();
}

function renderLoginButtons() {
    const menus = document.querySelectorAll('.user-menu');
    menus.forEach(menu => {
        const parent = menu.parentElement;
        if (!parent) return;
        const loginBtn = document.createElement('button');
        loginBtn.className = 'login-popup-btn';
        loginBtn.textContent = 'Login';
        loginBtn.type = 'button';
        loginBtn.addEventListener('click', () => {
            openModal('login');
        });
        parent.replaceChild(loginBtn, menu);
    });
}

let userMenuHandlersBound = false;

function ensureUserMenuHandlers() {
    if (userMenuHandlersBound) return;
    userMenuHandlersBound = true;

    document.addEventListener('click', async (e) => {
        const avatar = e.target.closest('.user-avatar');
        const menuRoot = avatar ? avatar.parentElement : e.target.closest('.user-menu');

        // Toggle dropdown on avatar click
        if (avatar && menuRoot) {
            e.preventDefault();
            const open = menuRoot.classList.toggle('open');
            const dropdown = menuRoot.querySelector('.user-dropdown');
            const btn = menuRoot.querySelector('.user-avatar');
            if (dropdown && btn) {
                dropdown.setAttribute('aria-hidden', String(!open));
                btn.setAttribute('aria-expanded', String(open));
            }
            return;
        }

        // Dropdown actions
        const item = e.target.closest('.user-dropdown-item');
        if (item) {
            const action = item.getAttribute('data-action');
            if (action === 'logout') {
                await logout();
            } else if (action === 'delete-account') {
                showDeleteAccountModal();
            } else if (action === 'account') {
                window.dispatchEvent(new CustomEvent('auth:menu', { detail: { action: 'account' } }));
            } else if (action === 'change-username') {
                window.dispatchEvent(new CustomEvent('auth:menu', { detail: { action: 'change-username' } }));
            } else if (action === 'admin-panel') {
                window.location.href = '/admin.html';
            }
            document.querySelectorAll('.user-menu.open').forEach(m => m.classList.remove('open'));
            return;
        }

        // Click outside closes
        document.querySelectorAll('.user-menu.open').forEach(m => {
            if (!e.target.closest('.user-menu')) {
                m.classList.remove('open');
            }
        });
    });
}

async function deleteAccount(password) {
    try {
        const response = await fetch(`${API_BASE_URL}/user/account`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ password })
        });

        let data;
        try {
            data = await response.json();
        } catch (jsonError) {
            console.error('JSON parse error:', jsonError);
            return {
                success: false,
                error: `Server error (${response.status}).`
            };
        }

        if (response.ok && data.success) {
            currentUser = null;
            updateUI();
            return { success: true, message: data.message };
        } else {
            return { success: false, error: data.error || 'Account deletion failed' };
        }
    } catch (error) {
        console.error('Account deletion error:', error);
        return {
            success: false,
            error: `Network error: ${error.message}. Please try again.`
        };
    }
}

function showDeleteAccountModal() {
    const existingModal = document.getElementById('deleteAccountModal');
    if (existingModal) {
        existingModal.remove();
    }

    const modal = document.createElement('div');
    modal.id = 'deleteAccountModal';
    modal.className = 'auth-modal open';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-hidden', 'false');

    modal.innerHTML = `
        <div class="auth-modal-content">
            <div class="auth-modal-header">
                <div class="auth-modal-title">Delete Account</div>
                <button class="auth-modal-close" id="deleteAccountClose" aria-label="Close">×</button>
            </div>
            <div class="auth-modal-body">
                <div style="background: hsl(0, 62%, 95%); border: 1px solid hsl(0, 62%, 75%); padding: 12px; border-radius: 8px; margin-bottom: 16px;">
                    <p style="color: hsl(0, 62%, 35%); font-weight: 600; margin-bottom: 8px;">⚠️ Warning: This action cannot be undone!</p>
                    <p style="color: hsl(0, 62%, 25%); font-size: 0.9em; line-height: 1.4;">
                        Deleting your account will permanently remove:
                    </p>
                    <ul style="color: hsl(0, 62%, 25%); font-size: 0.9em; margin: 8px 0 0 20px; line-height: 1.5;">
                        <li>Your profile information</li>
                        <li>All your forum posts</li>
                        <li>All your comments</li>
                        <li>All uploaded images</li>
                    </ul>
                </div>
                <form id="deleteAccountForm">
                    <label style="display: block; margin-bottom: 15px; font-weight: 500; color: hsl(146, 38%, 6%);">
                        Confirm your password to delete your account:
                        <input type="password" id="deleteAccountPassword" required style="display: block; width: 100%; margin-top: 5px; padding: 10px; border: 1px solid hsl(140, 62%, 80%); border-radius: 6px; font-size: 1em;">
                    </label>
                    <div class="auth-error" id="deleteAccountError"></div>
                    <div style="display: flex; gap: 10px; justify-content: flex-end;">
                        <button type="button" id="deleteAccountCancel" style="padding: 10px 20px; background: hsl(140, 62%, 96%); border: 1px solid hsl(140, 62%, 75%); border-radius: 6px; cursor: pointer; font-weight: 500;">
                            Cancel
                        </button>
                        <button type="submit" style="padding: 10px 20px; background: hsl(0, 62%, 51%); color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">
                            Delete Account
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';

    const closeBtn = document.getElementById('deleteAccountClose');
    const cancelBtn = document.getElementById('deleteAccountCancel');
    const form = document.getElementById('deleteAccountForm');

    const closeModal = () => {
        modal.remove();
        document.body.style.overflow = '';
    };

    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const password = document.getElementById('deleteAccountPassword').value;
        const errorDiv = document.getElementById('deleteAccountError');
        const submitBtn = form.querySelector('button[type="submit"]');

        errorDiv.textContent = '';

        if (!password) {
            errorDiv.textContent = 'Password is required';
            return;
        }

        if (!confirm('Are you absolutely sure? This action CANNOT be undone!')) {
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Deleting...';

        const result = await deleteAccount(password);

        if (result.success) {
            closeModal();
            alert('Your account has been deleted successfully.');
            window.location.href = '/';
        } else {
            errorDiv.textContent = result.error || 'Account deletion failed';
            submitBtn.disabled = false;
            submitBtn.textContent = 'Delete Account';
        }
    });
}

export default {
    register,
    login,
    logout,
    deleteAccount,
    isLoggedIn,
    getCurrentUser,
    requireAuth,
    openModal,
    closeModal,
    checkAuthStatus,
    init,
    waitForAuth,
    showDeleteAccountModal
};