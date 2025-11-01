const API_BASE_URL = 'http://localhost:3000/api';

let currentUser = null;
let authInitialized = false;

async function init() {
    if (authInitialized) return;
    authInitialized = true;


    await checkAuthStatus();


    setupModalHandlers();


    setupFormHandlers();


    setupLoginButtons();


    updateUI();
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
                error: 'Cannot connect to server. Please ensure the backend is running on http://localhost:3000' 
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
                error: `Server error (${response.status}). Please check if the backend is running.` 
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
                error: 'Cannot connect to server. Please ensure the backend is running on http://localhost:3000' 
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
    const loginBtns = document.querySelectorAll('.login-popup-btn');
    
    loginBtns.forEach(btn => {
        if (isLoggedIn()) {
            btn.textContent = currentUser ? `Logout (${currentUser.username})` : 'Logout';
        } else {
            btn.textContent = 'Login';
        }
    });
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
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

export default {
    register,
    login,
    logout,
    isLoggedIn,
    getCurrentUser,
    requireAuth,
    openModal,
    closeModal,
    checkAuthStatus,
    init
};

