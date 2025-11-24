import auth from './auth.js';
import { API_BASE_URL } from './config.js';

let userReportData = null;

async function fetchUserReport() {
    try {
        const response = await fetch(`${API_BASE_URL}/user/report`, {
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to fetch user report');
        }

        const data = await response.json();
        if (data.success) {
            userReportData = data.report;
            return data.report;
        } else {
            throw new Error(data.error || 'Failed to fetch user report');
        }
    } catch (error) {
        console.error('Error fetching user report:', error);
        throw error;
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatJoinDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function truncateText(text, maxLength = 100) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

function showAccountOverviewModal(reportData) {
    const existingModal = document.getElementById('accountOverviewModal');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.id = 'accountOverviewModal';
    modal.className = 'auth-modal open';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');

    const postsList = reportData.posts && reportData.posts.length > 0
        ? reportData.posts.map(post => `
            <div style="padding: 12px; background: hsl(140, 62%, 98%); border-left: 3px solid hsl(140, 62%, 42%); border-radius: 6px; margin-bottom: 10px;">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 6px;">
                    <h4 style="color: hsl(140, 62%, 20%); font-size: 1em; margin: 0;">${escapeHTML(post.title)}</h4>
                    <span style="background: hsl(140, 62%, 90%); color: hsl(140, 62%, 20%); padding: 2px 8px; border-radius: 12px; font-size: 0.75em; white-space: nowrap; margin-left: 8px;">${escapeHTML(post.category_name)}</span>
                </div>
                <p style="color: hsl(0, 0%, 30%); font-size: 0.9em; margin: 6px 0;">${escapeHTML(truncateText(post.body, 150))}</p>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
                    <span style="color: hsl(0, 0%, 40%); font-size: 0.85em;">${formatDate(post.created_at)}</span>
                    <div style="display: flex; gap: 12px; font-size: 0.85em; color: hsl(0, 0%, 40%);">
                        <span>👁️ ${post.views} views</span>
                        <span>💬 ${post.comment_count} comments</span>
                    </div>
                </div>
            </div>
        `).join('')
        : '<p style="text-align: center; color: hsl(0, 0%, 40%); padding: 20px;">No posts yet</p>';

    const commentsList = reportData.comments && reportData.comments.length > 0
        ? reportData.comments.map(comment => `
            <div style="padding: 12px; background: hsl(140, 62%, 98%); border-left: 3px solid hsl(140, 62%, 60%); border-radius: 6px; margin-bottom: 10px;">
                <p style="color: hsl(0, 0%, 20%); font-size: 0.95em; margin-bottom: 8px;">${escapeHTML(truncateText(comment.content, 150))}</p>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: hsl(0, 0%, 40%); font-size: 0.85em;">On: <strong>${escapeHTML(truncateText(comment.post_title, 50))}</strong></span>
                    <span style="color: hsl(0, 0%, 40%); font-size: 0.85em;">${formatDate(comment.created_at)}</span>
                </div>
            </div>
        `).join('')
        : '<p style="text-align: center; color: hsl(0, 0%, 40%); padding: 20px;">No comments yet</p>';

    modal.innerHTML = `
        <div class="auth-modal-content" style="max-width: 800px; max-height: 90vh; overflow-y: auto;">
            <div class="auth-modal-header" style="position: sticky; top: 0; background: white; z-index: 10; border-bottom: 2px solid hsl(140, 62%, 90%);">
                <div class="auth-modal-title" style="color: hsl(140, 62%, 20%);">Account Overview</div>
                <button class="auth-modal-close" id="accountOverviewClose" aria-label="Close" style="background: none; border: none; font-size: 1.8em; cursor: pointer; color: hsl(140, 62%, 20%); position: absolute; right: 8px; top: 4px;">×</button>
            </div>
            <div class="auth-modal-body" style="padding: 24px;">
                <!-- User Profile Section -->
                <div style="background: linear-gradient(135deg, hsl(140, 62%, 96%), hsl(140, 62%, 98%)); padding: 20px; border-radius: 12px; margin-bottom: 24px; border: 2px solid hsl(140, 62%, 85%);">
                    <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 16px;">
                        <div style="width: 64px; height: 64px; border-radius: 50%; background: hsl(140, 62%, 42%); color: white; display: flex; align-items: center; justify-content: center; font-size: 2em; font-weight: 700; border: 3px solid white; box-shadow: 0 4px 12px hsla(0, 0%, 0%, 0.15);">
                            ${reportData.user.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h3 style="color: hsl(140, 62%, 20%); margin: 0 0 4px 0; font-size: 1.4em;">${escapeHTML(reportData.user.username)}</h3>
                            <p style="color: hsl(0, 0%, 40%); margin: 0; font-size: 0.95em;">${escapeHTML(reportData.user.email)}</p>
                        </div>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-top: 16px;">
                        <div style="background: white; padding: 12px; border-radius: 8px; text-align: center; border: 1px solid hsl(140, 62%, 85%);">
                            <div style="font-size: 0.85em; color: hsl(0, 0%, 40%); margin-bottom: 4px;">Joined</div>
                            <div style="font-weight: 600; color: hsl(140, 62%, 20%); font-size: 0.95em;">${formatJoinDate(reportData.user.created_at)}</div>
                        </div>
                        <div style="background: white; padding: 12px; border-radius: 8px; text-align: center; border: 1px solid hsl(140, 62%, 85%);">
                            <div style="font-size: 0.85em; color: hsl(0, 0%, 40%); margin-bottom: 4px;">Total Posts</div>
                            <div style="font-weight: 700; color: hsl(140, 62%, 42%); font-size: 1.5em;">${reportData.stats.totalPosts}</div>
                        </div>
                        <div style="background: white; padding: 12px; border-radius: 8px; text-align: center; border: 1px solid hsl(140, 62%, 85%);">
                            <div style="font-size: 0.85em; color: hsl(0, 0%, 40%); margin-bottom: 4px;">Total Comments</div>
                            <div style="font-weight: 700; color: hsl(140, 62%, 42%); font-size: 1.5em;">${reportData.stats.totalComments}</div>
                        </div>
                        <div style="background: white; padding: 12px; border-radius: 8px; text-align: center; border: 1px solid hsl(140, 62%, 85%);">
                            <div style="font-size: 0.85em; color: hsl(0, 0%, 40%); margin-bottom: 4px;">Total Views</div>
                            <div style="font-weight: 700; color: hsl(140, 62%, 42%); font-size: 1.5em;">${reportData.stats.totalViews || 0}</div>
                        </div>
                    </div>
                </div>

                <!-- Tabs -->
                <div style="display: flex; gap: 8px; border-bottom: 2px solid hsl(140, 62%, 90%); margin-bottom: 20px;">
                    <button class="account-tab active" data-tab="posts" style="background: none; border: none; padding: 12px 20px; font-size: 1em; font-weight: 600; color: hsl(0, 0%, 40%); cursor: pointer; border-bottom: 3px solid transparent; transition: all 0.2s;">
                        Posts (${reportData.stats.totalPosts})
                    </button>
                    <button class="account-tab" data-tab="comments" style="background: none; border: none; padding: 12px 20px; font-size: 1em; font-weight: 600; color: hsl(0, 0%, 40%); cursor: pointer; border-bottom: 3px solid transparent; transition: all 0.2s;">
                        Comments (${reportData.stats.totalComments})
                    </button>
                </div>

                <!-- Tab Contents -->
                <div class="account-tab-content active" id="postsTab" style="animation: fadeIn 0.3s ease;">
                    <h4 style="color: hsl(140, 62%, 20%); margin-bottom: 16px; font-size: 1.1em;">Your Posts</h4>
                    <div style="max-height: 400px; overflow-y: auto; padding-right: 8px;">
                        ${postsList}
                    </div>
                </div>

                <div class="account-tab-content" id="commentsTab" style="display: none; animation: fadeIn 0.3s ease;">
                    <h4 style="color: hsl(140, 62%, 20%); margin-bottom: 16px; font-size: 1.1em;">Your Comments</h4>
                    <div style="max-height: 400px; overflow-y: auto; padding-right: 8px;">
                        ${commentsList}
                    </div>
                </div>

                <!-- Export Button -->
                <div style="margin-top: 24px; padding-top: 20px; border-top: 2px solid hsl(140, 62%, 90%); text-align: center;">
                    <button id="exportDataBtn" style="padding: 12px 32px; background: linear-gradient(135deg, hsl(140, 62%, 42%), hsl(140, 62%, 32%)); color: white; border: none; border-radius: 10px; font-size: 1em; font-weight: 600; cursor: pointer; box-shadow: 0 4px 12px hsla(140, 62%, 42%, 0.3); transition: transform 0.2s, box-shadow 0.2s;">
                        📄 Export Your Data (PDF)
                    </button>
                </div>
            </div>
        </div>
        <style>
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            .account-tab.active {
                color: hsl(140, 62%, 42%) !important;
                border-bottom-color: hsl(140, 62%, 42%) !important;
            }
            .account-tab:hover {
                background: hsl(140, 62%, 98%);
                color: hsl(140, 62%, 30%) !important;
            }
            #exportDataBtn:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 16px hsla(140, 62%, 42%, 0.4);
            }
            #exportDataBtn:active {
                transform: translateY(0);
            }
        </style>
    `;

    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';

    const tabs = modal.querySelectorAll('.account-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.getAttribute('data-tab');

            modal.querySelectorAll('.account-tab').forEach(t => t.classList.remove('active'));
            modal.querySelectorAll('.account-tab-content').forEach(c => {
                c.style.display = 'none';
                c.classList.remove('active');
            });

            tab.classList.add('active');
            const content = modal.querySelector(`#${tabName}Tab`);
            if (content) {
                content.style.display = 'block';
                content.classList.add('active');
            }
        });
    });

    // Close button
    const closeBtn = document.getElementById('accountOverviewClose');
    closeBtn.addEventListener('click', () => {
        modal.remove();
        document.body.style.overflow = '';
    });

    //Close on outside click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
            document.body.style.overflow = '';
        }
    });

    //Close on Escape key
    const escapeHandler = (e) => {
        if (e.key === 'Escape') {
            modal.remove();
            document.body.style.overflow = '';
            document.removeEventListener('keydown', escapeHandler);
        }
    };
    document.addEventListener('keydown', escapeHandler);

    const exportBtn = document.getElementById('exportDataBtn');
    exportBtn.addEventListener('click', () => exportToPDF(reportData));
}

function exportToPDF(reportData) {
    if (!window.html2pdf) {
        alert('PDF library not loaded. Please refresh the page and try again.');
        return;
    }

    const content = document.createElement('div');
    content.style.padding = '20px';
    content.style.maxWidth = '800px';
    content.style.fontFamily = 'Arial, sans-serif';

    const postsList = reportData.posts && reportData.posts.length > 0
        ? reportData.posts.map(post => `
            <div style="padding: 12px; background: hsla(147, 43%, 96%, 1.00); border-left: 3px solid hsla(98, 48%, 33%, 1.00); margin-bottom: 12px;">
                <h4 style="color: hsla(96, 57%, 20%, 1.00); margin: 0 0 6px 0;">${escapeHTML(post.title)}</h4>
                <p style="color: hsla(0, 0%, 30%, 1.00); font-size: 0.9em; margin: 6px 0;">${escapeHTML(post.body)}</p>
                <p style="color: hsla(0, 0%, 50%, 1.00); font-size: 0.85em; margin-top: 8px;">
                    Category: ${escapeHTML(post.category_name)} | 
                    Posted: ${formatDate(post.created_at)} | 
                    ${post.views} views | ${post.comment_count} comments
                </p>
            </div>
        `).join('')
        : '<p style="color: hsla(0, 0%, 60%, 1.00);">No posts</p>';

    const commentsList = reportData.comments && reportData.comments.length > 0
        ? reportData.comments.map(comment => `
            <div style="padding: 12px; background: hsla(147, 43%, 96%, 1.00); border-left: 3px solid hsla(96, 36%, 45%, 1.00); margin-bottom: 12px;">
                <p style="color: hsla(0, 0%, 20%, 1.00); margin: 0 0 8px 0;">${escapeHTML(comment.content)}</p>
                <p style="color: hsla(0, 0%, 50%, 1.00); font-size: 0.85em;">
                    On: <strong>${escapeHTML(comment.post_title)}</strong> | 
                    ${formatDate(comment.created_at)}
                </p>
            </div>
        `).join('')
        : '<p style="color: hsla(0, 0%, 60%, 1.00);">No comments</p>';

    content.innerHTML = `
        <div style="text-align: center; margin-bottom: 30px; border-bottom: 3px solid hsla(98, 48%, 33%, 1.00); padding-bottom: 20px;">
            <h1 style="color: hsla(96, 57%, 20%, 1.00); margin: 0 0 10px 0;">Account Activity Report</h1>
            <p style="color: hsla(0, 0%, 30%, 1.00); margin: 0;">Farmer's Center Platform</p>
        </div>

        <div style="background: linear-gradient(135deg, hsla(147, 43%, 96%, 1.00), #f8fcfa); padding: 20px; border-radius: 8px; margin-bottom: 24px; border: 2px solid #d4e9db;">
            <h2 style="color: hsla(96, 57%, 20%, 1.00); margin: 0 0 16px 0; font-size: 1.3em;">User Profile</h2>
            <div style="margin-bottom: 12px;">
                <strong style="color: hsla(0, 0%, 30%, 1.00);">Username:</strong> ${escapeHTML(reportData.user.username)}
            </div>
            <div style="margin-bottom: 12px;">
                <strong style="color: hsla(0, 0%, 30%, 1.00);">Email:</strong> ${escapeHTML(reportData.user.email)}
            </div>
            <div style="margin-bottom: 12px;">
                <strong style="color: hsla(0, 0%, 30%, 1.00);">Member Since:</strong> ${formatJoinDate(reportData.user.created_at)}
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 20px;">
                <div style="background: white; padding: 12px; text-align: center; border: 1px solid #d4e9db; border-radius: 6px;">
                    <div style="font-size: 0.85em; color: hsla(0, 0%, 40%, 1.00); margin-bottom: 4px;">Total Posts</div>
                    <div style="font-size: 1.5em; font-weight: bold; color: hsla(98, 48%, 33%, 1.00);">${reportData.stats.totalPosts}</div>
                </div>
                <div style="background: white; padding: 12px; text-align: center; border: 1px solid #d4e9db; border-radius: 6px;">
                    <div style="font-size: 0.85em; color: hsla(0, 0%, 40%, 1.00); margin-bottom: 4px;">Total Comments</div>
                    <div style="font-size: 1.5em; font-weight: bold; color: hsla(98, 48%, 33%, 1.00);">${reportData.stats.totalComments}</div>
                </div>
                <div style="background: white; padding: 12px; text-align: center; border: 1px solid #d4e9db; border-radius: 6px;">
                    <div style="font-size: 0.85em; color: hsla(0, 0%, 40%, 1.00); margin-bottom: 4px;">Total Views</div>
                    <div style="font-size: 1.5em; font-weight: bold; color: hsla(98, 48%, 33%, 1.00);">${reportData.stats.totalViews || 0}</div>
                </div>
            </div>
        </div>

        <div style="margin-bottom: 30px;">
            <h2 style="color: hsla(96, 57%, 20%, 1.00); margin: 0 0 16px 0; font-size: 1.3em; border-bottom: 2px solid hsla(140, 32%, 87%, 1.00); padding-bottom: 8px;">
                Your Posts (${reportData.stats.totalPosts})
            </h2>
            ${postsList}
        </div>

        <div style="margin-bottom: 30px;">
            <h2 style="color: #2d5016; margin: 0 0 16px 0; font-size: 1.3em; border-bottom: 2px solid hsla(140, 32%, 87%, 1.00); padding-bottom: 8px;">
                Your Comments (${reportData.stats.totalComments})
            </h2>
            ${commentsList}
        </div>

        <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid hsla(140, 32%, 87%, 1.00); text-align: center; color: hsla(0, 0%, 50%, 1.00); font-size: 0.9em;">
            <p>Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
            <p>© 2025 Farmer's Center. Empowering farmers with technology.</p>
        </div>
    `;

    const opt = {
        margin: 10,
        filename: `${reportData.user.username}-account-report.pdf`,
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    window.html2pdf().set(opt).from(content).save();
}

function init() {
    window.addEventListener('auth:menu', async (e) => {
        if (e.detail.action === 'account') {
            try {
                const reportData = await fetchUserReport();
                showAccountOverviewModal(reportData);
            } catch (error) {
                alert('Failed to load account overview. Please try again.');
                console.error('Account overview error:', error);
            }
        }
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

export default {
    fetchUserReport,
    showAccountOverviewModal,
    exportToPDF
};