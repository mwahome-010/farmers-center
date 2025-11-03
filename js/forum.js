import auth from './auth.js';

let allPosts = [];
let currentFilters = { category: 'all', sort: 'newest', search: '' };
let replyHandlersWired = false;

document.addEventListener('DOMContentLoaded', async function () {
    await auth.waitForAuth();
    
    await loadPosts();
    setupEventListeners();
});

async function loadPosts() {
    try {
        const params = new URLSearchParams(currentFilters);
        const response = await fetch(`http://localhost:3000/api/forum/posts?${params}`, {
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
    const existingItems = container.querySelectorAll('.post, .no-results');

    existingItems.forEach(item => item.remove());

    if (posts.length === 0) {
        const noResults = document.createElement('p');
        noResults.textContent = 'No posts found.';
        noResults.className = 'no-results';
        noResults.style.textAlign = 'center';
        noResults.style.padding = '20px';
        container.appendChild(noResults);
        return;
    }

    posts.forEach(post => {
        const postEl = createPostElement(post);
        container.appendChild(postEl);
    });
}

function createPostElement(post) {
    const postDiv = document.createElement('div');
    postDiv.className = 'post';
    postDiv.setAttribute('data-category', post.category_name);
    postDiv.setAttribute('data-post-id', post.id);

    const timeAgo = getTimeAgo(new Date(post.created_at));

    postDiv.innerHTML = `
        <div class="post-badges">
            <span class="badge">${capitalize(post.category_name)}</span>
            <span class="status">${capitalize(post.status)}</span>
        </div>
        <h3>${escapeHTML(post.title)}</h3>
        <p class="post-meta">Posted by <strong>${escapeHTML(post.username)}</strong> · <span>${timeAgo}</span> · <span class="counts">${post.views} views · ${post.comment_count} comments</span></p>
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
        const response = await fetch(`http://localhost:3000/api/forum/posts/${postId}`, {
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

    commentDiv.innerHTML = `
        <p><strong>${escapeHTML(comment.username)}:</strong> ${escapeHTML(comment.content)}</p>
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
            <button type="button" class="reply-btn-post">Reply to post</button>
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


    const form = document.getElementById('newPostForm');
    if (form) {
        form.addEventListener('submit', handleNewPost);
    }
}

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
            const response = await fetch('http://localhost:3000/api/forum/comments', {
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
        const response = await fetch('http://localhost:3000/api/forum/posts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ title, category, body })
        });

        const data = await response.json();

        if (data.success) {
            closeModal();
            e.target.reset();
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