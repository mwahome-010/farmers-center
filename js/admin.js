import auth from './auth.js';

const API_BASE_URL = 'http://localhost:3000/api';

let currentTab = 'users';
let allUsers = [];
let allPosts = [];

document.addEventListener('DOMContentLoaded', async function () {
    await auth.waitForAuth();

    const user = auth.getCurrentUser();

    if (!user || !user.isAdmin) {
        showNoAccess();
        return;
    }

    await initAdminPanel();

    window.addEventListener('auth:changed', () => {
        const updatedUser = auth.getCurrentUser();
        if (!updatedUser || !updatedUser.isAdmin) {
            showNoAccess();
        }
    });
});

function showNoAccess() {
    const container = document.getElementById('adminContainer');
    container.innerHTML = `
        <div class="no-access">
            <h2>🔒 Access Denied</h2>
            <p>You need administrator privileges to access this page.</p>
            <button onclick="window.location.href='/'" style="margin-top: 16px; padding: 10px 20px; background: hsl(140, 62%, 39%); color: white; border: none; border-radius: 8px; cursor: pointer;">
                Go to Home
            </button>
        </div>
    `;
}

async function initAdminPanel() {
    const container = document.getElementById('adminContainer');

    container.innerHTML = `
        <div class="admin-header">
            <h1>🛡️ Admin Dashboard</h1>
            <p>Manage users, posts, and comments</p>
        </div>

        <div class="admin-stats" id="adminStats">
            <div class="stat-card">
                <h3>Total Users</h3>
                <div class="stat-value" id="statUsers">-</div>
            </div>
            <div class="stat-card">
                <h3>Total Posts</h3>
                <div class="stat-value" id="statPosts">-</div>
            </div>
            <div class="stat-card">
                <h3>Total Comments</h3>
                <div class="stat-value" id="statComments">-</div>
            </div>
        </div>

        <div class="admin-tabs">
            <button class="admin-tab active" data-tab="users">Users</button>
            <button class="admin-tab" data-tab="posts">Posts</button>
        </div>

        <div class="admin-panel active" id="usersPanel">
            <div class="search-filter">
                <input type="text" id="userSearch" placeholder="Search users...">
            </div>
            <div id="usersTable"></div>
        </div>

        <div class="admin-panel" id="postsPanel">
            <div class="search-filter">
                <input type="text" id="postSearch" placeholder="Search posts...">
            </div>
            <div id="postsTable"></div>
        </div>
    `;

    setupTabHandlers();
    await loadStats();
    await loadUsers();
    await loadPosts();
}

function setupTabHandlers() {
    const tabs = document.querySelectorAll('.admin-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.getAttribute('data-tab');
            switchTab(tabName);
        });
    });

    const userSearch = document.getElementById('userSearch');
    if (userSearch) {
        userSearch.addEventListener('input', debounce((e) => {
            filterUsers(e.target.value);
        }, 300));
    }

    const postSearch = document.getElementById('postSearch');
    if (postSearch) {
        postSearch.addEventListener('input', debounce((e) => {
            filterPosts(e.target.value);
        }, 300));
    }
}

function switchTab(tabName) {
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));

    const selectedTab = document.querySelector(`.admin-tab[data-tab="${tabName}"]`);
    const selectedPanel = document.getElementById(`${tabName}Panel`);

    if (selectedTab) selectedTab.classList.add('active');
    if (selectedPanel) selectedPanel.classList.add('active');

    currentTab = tabName;
}

async function loadStats() {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/stats`, {
            credentials: 'include'
        });

        const data = await response.json();

        if (data.success) {
            document.getElementById('statUsers').textContent = data.stats.totalUsers;
            document.getElementById('statPosts').textContent = data.stats.totalPosts;
            document.getElementById('statComments').textContent = data.stats.totalComments;
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

async function loadUsers() {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/users`, {
            credentials: 'include'
        });

        const data = await response.json();

        if (data.success) {
            allUsers = data.users;
            renderUsers(allUsers);
        }
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

function renderUsers(users) {
    const container = document.getElementById('usersTable');

    if (users.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 20px;">No users found.</p>';
        return;
    }

    const currentUser = auth.getCurrentUser();

    container.innerHTML = `
        <table class="admin-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Posts</th>
                    <th>Comments</th>
                    <th>Joined</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${users.map(user => `
                    <tr>
                        <td>${user.id}</td>
                        <td><strong>${escapeHTML(user.username)}</strong></td>
                        <td>${escapeHTML(user.email)}</td>
                        <td>
                            <span class="admin-badge ${user.is_admin ? 'admin' : 'user'}">
                                ${user.is_admin ? 'Admin' : 'User'}
                            </span>
                        </td>
                        <td>${user.post_count}</td>
                        <td>${user.comment_count}</td>
                        <td>${formatDate(user.created_at)}</td>
                        <td>
                            ${user.id !== currentUser.id ? `
                                <button class="admin-btn delete" onclick="deleteUser(${user.id}, '${escapeHTML(user.username)}')">
                                    Delete
                                </button>
                            ` : '<em style="color: #999;">You</em>'}
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function filterUsers(searchTerm) {
    const filtered = allUsers.filter(user =>
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
    renderUsers(filtered);
}

async function loadPosts() {
    try {
        const response = await fetch(`${API_BASE_URL}/forum/posts`, {
            credentials: 'include'
        });

        const data = await response.json();

        if (data.success) {
            allPosts = data.posts;
            renderPosts(allPosts);
        }
    } catch (error) {
        console.error('Error loading posts:', error);
    }
}

function renderPosts(posts) {
    const container = document.getElementById('postsTable');

    if (posts.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 20px;">No posts found.</p>';
        return;
    }

    container.innerHTML = `
        <table class="admin-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Title</th>
                    <th>Author</th>
                    <th>Category</th>
                    <th>Comments</th>
                    <th>Views</th>
                    <th>Created</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${posts.map(post => `
                    <tr>
                        <td>${post.id}</td>
                        <td>
                            <strong>${escapeHTML(post.title)}</strong>
                            ${post.image_path ? '<span style="color: #999;">📷</span>' : ''}
                        </td>
                        <td>${escapeHTML(post.username)}</td>
                        <td><span class="badge">${post.category_name}</span></td>
                        <td>${post.comment_count}</td>
                        <td>${post.views}</td>
                        <td>${formatDate(post.created_at)}</td>
                        <td>
                            <button class="admin-btn view" onclick="window.location.href='forum.html#post-${post.id}'">
                                View
                            </button>
                            <button class="admin-btn delete" onclick="deletePost(${post.id}, '${escapeHTML(post.title)}')">
                                Delete
                            </button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function filterPosts(searchTerm) {
    const filtered = allPosts.filter(post =>
        post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.body.toLowerCase().includes(searchTerm.toLowerCase())
    );
    renderPosts(filtered);
}

window.deleteUser = async function (userId, username) {
    if (!confirm(`Are you sure you want to delete user "${username}"?\n\nThis will permanently delete:\n- Their account\n- All their posts\n- All their comments\n- All uploaded images\n\nThis action cannot be undone!`)) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        const data = await response.json();

        if (data.success) {
            alert('User deleted successfully');
            await loadUsers();
            await loadStats();
            await loadPosts();
        } else {
            alert(data.error || 'Failed to delete user');
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        alert('Failed to delete user');
    }
};

window.deletePost = async function (postId, title) {
    if (!confirm(`Are you sure you want to delete the post "${title}"?\n\nThis will also delete all comments on this post.\n\nThis action cannot be undone!`)) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/admin/posts/${postId}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        const data = await response.json();

        if (data.success) {
            alert('Post deleted successfully');
            await loadPosts();
            await loadStats();
        } else {
            alert(data.error || 'Failed to delete post');
        }
    } catch (error) {
        console.error('Error deleting post:', error);
        alert('Failed to delete post');
    }
};

function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

export default {};