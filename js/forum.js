import auth from './auth.js';
import { API_BASE_URL } from './config.js';

let allPosts = [];
let currentFilters = { category: 'all', sort: 'newest', search: '' };
let replyHandlersWired = false;
let selectedImageFile = null;

document.addEventListener('DOMContentLoaded', async function () {
    const forumContainer = document.querySelector('.forum-container');
    if (!forumContainer) {
        return;
    }

    await auth.waitForAuth();

    await loadPosts();
    setupEventListeners();

    /* refresh page on login/logout */
    window.addEventListener('auth:changed', () => {
        loadPosts();
    });
});

async function loadPosts() {
    try {
        const params = new URLSearchParams(currentFilters);
        const response = await fetch(`${API_BASE_URL}/forum/posts?${params}`, {
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
    const container = document.querySelector('.forum-container');

    if (!container) {
        console.log('Forum container not found');
        return;
    }

    const existingItems = container.querySelectorAll('.post, .no-results');
    existingItems.forEach(el => el.remove());

    if (posts.length === 0) {
        const noResults = document.createElement('p');
        noResults.textContent = 'No posts found.';
        noResults.className = 'no-results';
        noResults.style.textAlign = 'center';
        noResults.style.padding = '20px';
        container.appendChild(noResults);
        return;
    }

    const fragment = document.createDocumentFragment();

    posts.forEach(post => {
        const postEl = createPostElement(post);
        fragment.appendChild(postEl);
    });

    container.appendChild(fragment);
}

function createPostElement(post) {
    const postDiv = document.createElement('div');
    postDiv.className = 'post';
    postDiv.setAttribute('data-category', post.category_name);
    postDiv.setAttribute('data-post-id', post.id);

    const timeAgo = getTimeAgo(new Date(post.created_at));
    const currentUser = auth.getCurrentUser();
    const isOwner = currentUser && currentUser.id === post.user_id;
    const isAdmin = currentUser && currentUser.isAdmin;
    const canDelete = isOwner || isAdmin;

    postDiv.innerHTML = `
        <div class="post-header">
            <div class="post-badges">
                <span class="badge">${capitalize(post.category_name)}</span>
                <span class="status">${capitalize(post.status)}</span>
            </div>
            ${canDelete ? `
                <button class="delete-post-btn" data-post-id="${post.id}" data-is-admin="${isAdmin}" title="${isAdmin ? 'Delete post (Admin)' : 'Delete post'}">
                    ×
                </button>
            ` : ''}
        </div>
        <h3>${escapeHTML(post.title)}</h3>
        <p class="post-meta">Posted by <strong>${escapeHTML(post.username)}</strong> · <span>${timeAgo}</span> · ${post.comment_count} comments</span></p>
        ${post.image_path ? `<img src="${post.image_path}" alt="Post image" style="max-width:100%;border-radius:8px;margin:6px 0;" />` : ''}
        <p>${escapeHTML(post.body)}</p>
        <div class="comments" data-post-id="${post.id}">
            <h4>Comments:</h4>
            <div class="comments-list"></div>
        </div>
    `;

    loadComments(post.id);

    return postDiv;
}

async function loadComments(postId) {
    try {
        const response = await fetch(`${API_BASE_URL}/forum/posts/${postId}`, {
            credentials: 'include'
        });

        const data = await response.json();

        if (data.success && data.comments) {
            const commentsContainer = document.querySelector(`.comments[data-post-id="${postId}"] .comments-list`);
            if (commentsContainer) {
                commentsContainer.innerHTML = '';
                data.comments.forEach(comment => {
                    const commentEl = createCommentElement(comment);
                    commentsContainer.appendChild(commentEl);
                });

                ensurePostReplyControls(postId);
                wireReplyHandlers();
            }
        }
    } catch (error) {
        console.error('Error loading comments:', error);
    }
}

function createCommentElement(comment) {
    const commentDiv = document.createElement('div');
    commentDiv.className = 'comment';
    commentDiv.setAttribute('data-comment-id', comment.id);

    const currentUser = auth.getCurrentUser();
    const isOwner = currentUser && currentUser.id === comment.user_id;
    const isAdmin = currentUser && currentUser.isAdmin;
    const canDelete = isOwner || isAdmin;

    commentDiv.innerHTML = `
        <div class="comment-header">
            <p><strong>${escapeHTML(comment.username)}:</strong> ${escapeHTML(comment.content)}</p>
            ${canDelete ? `
                <button class="delete-comment-btn" data-comment-id="${comment.id}" data-is-admin="${isAdmin}" title="${isAdmin ? 'Delete comment (Admin)' : 'Delete comment'}">
                    ×
                </button>
            ` : ''}
        </div>
    `;

    return commentDiv;
}

function ensurePostReplyControls(postId) {
    const commentsDiv = document.querySelector(`.comments[data-post-id="${postId}"]`);
    if (!commentsDiv || commentsDiv.querySelector('.post-reply-controls')) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'post-reply-controls';
    wrapper.innerHTML = `
        <div class="reply-actions">
            <button type="button" class="reply-btn-post">Reply</button>
        </div>
        <form class="reply-form-post is-hidden" data-post-id="${postId}">
            <textarea rows="2" placeholder="Write a reply to the post..." required></textarea>
            <div class="reply-actions">
                <button type="submit">Post</button>
                <button type="button" class="reply-cancel-post">Cancel</button>
            </div>
        </form>
    `;
    commentsDiv.appendChild(wrapper);
}

function setupEventListeners() {
    const searchInput = document.getElementById('forumSearch');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(function (e) {
            currentFilters.search = e.target.value;
            loadPosts();
        }, 500));
    }

    const categoryFilter = document.getElementById('forumCategoryFilter');
    if (categoryFilter) {
        categoryFilter.addEventListener('change', function (e) {
            currentFilters.category = e.target.value;
            loadPosts();
        });
    }

    const sortSelect = document.getElementById('forumSort');
    if (sortSelect) {
        sortSelect.addEventListener('change', function (e) {
            currentFilters.sort = e.target.value;
            loadPosts();
        });
    }

    const newPostBtn = document.getElementById('newPostBtn');
    const modal = document.getElementById('forumPostModal');
    const closeBtn = document.getElementById('forumPostModalClose');
    const cancelBtn = document.getElementById('newPostCancel');

    if (newPostBtn) {
        newPostBtn.addEventListener('click', function () {
            auth.requireAuth(openModal);
        });
    }

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
    if (modal) {
        modal.addEventListener('click', function (e) {
            if (e.target === modal) closeModal();
        });
    }

    const imageInput = document.getElementById('newPostImageFile');
    if (imageInput) {
        imageInput.addEventListener('change', function (e) {
            const file = e.target.files[0];
            if (file) {
                if (file.size > 5 * 1024 * 1024) {
                    alert('Image file size must be less than 5MB');
                    e.target.value = '';
                    selectedImageFile = null;
                    updateImagePreview(null);
                    return;
                }

                if (!file.type.match(/^image\/(jpeg|jpg|png|gif|webp)$/)) {
                    alert('Only JPEG, PNG, GIF, and WebP images are allowed');
                    e.target.value = '';
                    selectedImageFile = null;
                    updateImagePreview(null);
                    return;
                }

                selectedImageFile = file;
                updateImagePreview(file);
            } else {
                selectedImageFile = null;
                updateImagePreview(null);
            }
        });
    }

    const form = document.getElementById('newPostForm');
    if (form) {
        form.addEventListener('submit', handleNewPost);
    }

    document.addEventListener('click', async function (e) {
        const deletePostBtn = e.target.closest('.delete-post-btn');
        if (deletePostBtn) {
            const postId = deletePostBtn.getAttribute('data-post-id');
            const isAdmin = deletePostBtn.getAttribute('data-is-admin') === 'true';

            const confirmMsg = isAdmin
                ? 'Are you sure you want to delete this post as an admin? This will also delete all comments.'
                : 'Are you sure you want to delete this post? This will also delete all comments.';

            if (confirm(confirmMsg)) {
                await deletePost(postId, isAdmin);
            }
            return;
        }

        const deleteCommentBtn = e.target.closest('.delete-comment-btn');
        if (deleteCommentBtn) {
            const commentId = deleteCommentBtn.getAttribute('data-comment-id');
            const isAdmin = deleteCommentBtn.getAttribute('data-is-admin') === 'true';

            const confirmMsg = isAdmin
                ? 'Are you sure you want to delete this comment as an admin?'
                : 'Are you sure you want to delete this comment?';

            if (confirm(confirmMsg)) {
                await deleteComment(commentId, isAdmin);
            }
            return;
        }
    });
}

async function deletePost(postId, isAdmin = false) {
    try {
        const endpoint = isAdmin
            ? `${API_BASE_URL}/admin/posts/${postId}`
            : `${API_BASE_URL}/forum/posts/${postId}`;

        const response = await fetch(endpoint, {
            method: 'DELETE',
            credentials: 'include'
        });

        const data = await response.json();

        if (data.success) {
            const postElement = document.querySelector(`.post[data-post-id="${postId}"]`);
            if (postElement) {
                postElement.remove();
            }
            await loadPosts();
        } else {
            alert(data.error || 'Failed to delete post');
        }
    } catch (error) {
        console.error('Error deleting post:', error);
        alert('Failed to delete post');
    }
}

async function deleteComment(commentId, isAdmin = false) {
    try {
        const endpoint = isAdmin
            ? `${API_BASE_URL}/admin/comments/${commentId}`
            : `${API_BASE_URL}/forum/comments/${commentId}`;

        const response = await fetch(endpoint, {
            method: 'DELETE',
            credentials: 'include'
        });

        const data = await response.json();

        if (data.success) {
            const commentElement = document.querySelector(`.comment[data-comment-id="${commentId}"]`);
            if (commentElement) {
                commentElement.remove();
            }
            if (data.postId) {
                await loadComments(data.postId);
            }
        } else {
            alert(data.error || 'Failed to delete comment');
        }
    } catch (error) {
        console.error('Error deleting comment:', error);
        alert('Failed to delete comment');
    }
}

function updateImagePreview(file) {
    let previewContainer = document.querySelector('.image-preview-container');

    if (!previewContainer) {
        previewContainer = document.createElement('div');
        previewContainer.className = 'image-preview-container';
        const imageInput = document.getElementById('newPostImageFile');
        if (imageInput && imageInput.parentElement) {
            imageInput.parentElement.appendChild(previewContainer);
        }
    }

    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            previewContainer.innerHTML = `
                <div class="image-preview">
                    <img src="${e.target.result}" alt="Preview" style="max-width: 100%; max-height: 200px; border-radius: 8px; margin-top: 8px;">
                    <button type="button" class="remove-image-btn" onclick="removeImagePreview()">Remove</button>
                </div>
            `;
        };
        reader.readAsDataURL(file);
    } else {
        previewContainer.innerHTML = '';
    }
}

window.removeImagePreview = function () {
    selectedImageFile = null;
    const imageInput = document.getElementById('newPostImageFile');
    if (imageInput) {
        imageInput.value = '';
    }
    updateImagePreview(null);
};

function wireReplyHandlers() {
    if (replyHandlersWired) return;
    replyHandlersWired = true;

    document.addEventListener('click', function (e) {
        const replyBtn = e.target.closest('.reply-btn-post');
        if (replyBtn) {
            auth.requireAuth(function () {
                const form = replyBtn.closest('.post-reply-controls').querySelector('.reply-form-post');
                if (form) form.classList.toggle('is-hidden');
            });
            return;
        }

        const cancelBtn = e.target.closest('.reply-cancel-post');
        if (cancelBtn) {
            const form = cancelBtn.closest('.reply-form-post');
            if (form) form.classList.add('is-hidden');
            return;
        }
    });

    document.addEventListener('submit', async function (e) {
        const form = e.target.closest('.reply-form-post');
        if (!form) return;
        e.preventDefault();

        if (!auth.isLoggedIn()) {
            alert('You must be logged in to reply.');
            form.classList.add('is-hidden');
            auth.openModal();
            return;
        }

        const textarea = form.querySelector('textarea');
        const content = textarea.value.trim();
        if (!content) return;

        const postId = form.getAttribute('data-post-id');

        try {
            const response = await fetch(`${API_BASE_URL}/forum/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ post_id: postId, content })
            });

            const data = await response.json();

            if (data.success) {
                textarea.value = '';
                form.classList.add('is-hidden');
                await loadComments(postId);
            } else {
                alert(data.error || 'Failed to post comment');
            }
        } catch (error) {
            console.error('Error posting comment:', error);
            alert('Failed to post comment');
        }
    });
}

async function handleNewPost(e) {
    e.preventDefault();

    if (!auth.isLoggedIn()) {
        alert('You must be logged in to create a post.');
        closeModal();
        auth.openModal();
        return;
    }

    const title = document.getElementById('newPostTitle').value.trim();
    const category = document.getElementById('newPostCategory').value;
    const body = document.getElementById('newPostBody').value.trim();
    const imageInput = document.getElementById('newPostImageFile');

    if (!title || !body) return;

    try {
        const formData = new FormData();
        formData.append('title', title);
        formData.append('category', category);
        formData.append('body', body);

        if (imageInput && imageInput.files && imageInput.files[0]) {
            formData.append('image', imageInput.files[0]);
        }

        const response = await fetch(`${API_BASE_URL}/forum/posts`, {
            method: 'POST',
            credentials: 'include',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            closeModal();
            e.target.reset();
            selectedImageFile = null;
            updateImagePreview(null);
            await loadPosts();
        } else {
            alert(data.error || 'Failed to create post');
        }
    } catch (error) {
        console.error('Error creating post:', error);
        alert('Failed to create post');
    }
}

function openModal() {
    const modal = document.getElementById('forumPostModal');
    if (modal) {
        modal.classList.add('open');
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal() {
    const modal = document.getElementById('forumPostModal');
    if (modal) {
        modal.classList.remove('open');
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';

        const form = document.getElementById('newPostForm');
        if (form) form.reset();

        selectedImageFile = null;
        updateImagePreview(null);
    }
}

function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);

    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + ' years ago';

    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + ' months ago';

    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + ' days ago';

    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + ' hours ago';

    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + ' minutes ago';

    return 'just now';
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