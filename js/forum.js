import auth from './auth.js';

document.addEventListener('DOMContentLoaded', function () {
    // Toolbar placeholders (non-functional filters/search for now)
    var searchInput = document.getElementById('forumSearch');
    var categoryFilter = document.getElementById('forumCategoryFilter');
    var sortSelect = document.getElementById('forumSort');
    [searchInput, categoryFilter, sortSelect].filter(Boolean).forEach(function (el) {
        el.addEventListener('input', function () { /* future filtering */ });
        el.addEventListener('change', function () { /* future sorting */ });
    });

    // New Post
    var newPostBtn = document.getElementById('newPostBtn');
    var modal = document.getElementById('forumPostModal');
    var closeBtn = document.getElementById('forumPostModalClose');
    var cancelBtn = document.getElementById('newPostCancel');
    function openModal() {
        if (!modal) return;
        modal.classList.add('open');
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
    }
    function closeModal() {
        if (!modal) return;
        modal.classList.remove('open');
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    }
    // Require authentication before opening new post modal
    if (newPostBtn) newPostBtn.addEventListener('click', function () {
        auth.requireAuth(openModal);
    });
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
    if (modal) modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && modal && modal.classList.contains('open')) closeModal(); });

    var form = document.getElementById('newPostForm');
    if (form) form.addEventListener('submit', function (e) {
        e.preventDefault();

        // Re-validate authentication at submission time to prevent DOM manipulation bypass
        if (!auth.isLoggedIn()) {
            alert('You must be logged in to create a post.');
            closeModal();
            auth.openModal();
            return;
        }

        var title = document.getElementById('newPostTitle').value.trim();
        var category = document.getElementById('newPostCategory').value;
        var body = document.getElementById('newPostBody').value.trim();
        var imageInput = document.getElementById('newPostImageFile');
        var imageFile = imageInput && imageInput.files && imageInput.files[0] ? imageInput.files[0] : null;
        var imageUrl = imageFile ? URL.createObjectURL(imageFile) : '';
        if (!title || !body) return;
        var container = document.querySelector('.forum-container');
        var post = document.createElement('div');
        post.className = 'post';
        post.setAttribute('data-category', category);
        function escapeHTML(str) {
            return str
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        }
        var currentUser = auth.getCurrentUser();
        var username = currentUser ? currentUser.username : 'Anonymous';
        post.innerHTML = '\n\t\t\t\t<div class="post-badges">\n\t\t\t\t\t<span class="badge">' + category.charAt(0).toUpperCase() + category.slice(1) + '</span>\n\t\t\t\t\t<span class="status">Pending</span>\n\t\t\t\t</div>\n\t\t\t\t<h3>' + escapeHTML(title) + '</h3>\n\t\t\t\t<p class="post-meta">Posted by <strong>' + username + '</strong> · <span>just now</span> · <span class="counts">0 views · 0 comments</span></p>\n\t\t\t\t' + (imageUrl ? '<img src="' + imageUrl + '" alt="uploaded image" style="max-width:100%;border-radius:8px;margin:6px 0;" />' : '') + '\n\t\t\t\t<p>' + escapeHTML(body) + '</p>\n\t\t\t\t<div class="comments">\n\t\t\t\t\t<h4>Comments:</h4>\n\t\t\t\t</div>';
        if (container && container.appendChild) container.appendChild(post);

        if (imageUrl) {
            var img = post.querySelector('img[src="' + imageUrl + '"]');
            if (img) {
                img.addEventListener('load', function () {
                    URL.revokeObjectURL(imageUrl);
                });
            }
        }

        closeModal();
        form.reset();
        ensurePostReplyControls(post);
        wireReplySection(post);
    });

    function ensurePostReplyControls(scope) {
        var posts = scope.classList && scope.classList.contains('post') ? [scope] : scope.querySelectorAll('.post');
        posts.forEach(function (post) {
            var comments = post.querySelector('.comments');
            if (!comments) return;
            if (comments.querySelector('.post-reply-controls')) return;
            var wrapper = document.createElement('div');
            wrapper.className = 'post-reply-controls';
            wrapper.innerHTML = '\n\t\t\t\t<div class="reply-actions">\n\t\t\t\t\t<button type="button" class="reply-btn-post">Reply to post</button>\n\t\t\t\t</div>\n\t\t\t\t<form class="reply-form-post is-hidden">\n\t\t\t\t\t<textarea rows="2" placeholder="Write a reply to the post..."></textarea>\n\t\t\t\t\t<div class="reply-actions">\n\t\t\t\t\t\t<button type="submit">Post</button>\n\t\t\t\t\t\t<button type="button" class="reply-cancel-post">Cancel</button>\n\t\t\t\t\t</div>\n\t\t\t\t</form>';
            comments.appendChild(wrapper);
        });
    }

    function wireReplySection(root) {
        // post-level reply
        ensurePostReplyControls(root);
        root.querySelectorAll('.reply-btn-post').forEach(function (btn) {
            btn.addEventListener('click', function () {
                auth.requireAuth(function () {
                    var form = btn.closest('.post-reply-controls').querySelector('.reply-form-post');
                    if (!form) return;
                    form.classList.toggle('is-hidden');
                });
            });
        });
        root.querySelectorAll('.reply-cancel-post').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var form = btn.closest('.reply-form-post');
                if (form) form.classList.add('is-hidden');
            });
        });
        root.querySelectorAll('.reply-form-post').forEach(function (rf) {
            rf.addEventListener('submit', function (e) {
                e.preventDefault();

                // Re-validate authentication at submission time
                if (!auth.isLoggedIn()) {
                    alert('You must be logged in to reply.');
                    rf.classList.add('is-hidden');
                    auth.openModal();
                    return;
                }

                var textarea = rf.querySelector('textarea');
                var text = textarea ? textarea.value.trim() : '';
                if (!text) return;
                var currentUser = auth.getCurrentUser();
                var username = currentUser ? currentUser.username : 'Anonymous';
                var comment = document.createElement('div');
                comment.className = 'comment';
                comment.innerHTML = '<p><strong>' + username + ':</strong> ' + text.replace(/</g, '&lt;') + '</p>';
                var commentsContainer = rf.closest('.comments');
                if (commentsContainer) commentsContainer.appendChild(comment);
                textarea.value = '';
                rf.classList.add('is-hidden');
            });
        });

        root.querySelectorAll('.reply-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                auth.requireAuth(function () {
                    var form = btn.parentElement.querySelector('.reply-form');
                    if (!form) return;
                    form.classList.toggle('is-hidden');
                });
            });
        });
        root.querySelectorAll('.reply-cancel').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var form = btn.closest('.reply-form');
                if (form) form.classList.add('is-hidden');
            });
        });
        root.querySelectorAll('.reply-form').forEach(function (rf) {
            rf.addEventListener('submit', function (e) {
                e.preventDefault();

                // Re-validate authentication at submission time
                if (!auth.isLoggedIn()) {
                    alert('You must be logged in to reply.');
                    rf.classList.add('is-hidden');
                    auth.openModal();
                    return;
                }

                var textarea = rf.querySelector('textarea');
                var text = textarea ? textarea.value.trim() : '';
                if (!text) return;
                var currentUser = auth.getCurrentUser();
                var username = currentUser ? currentUser.username : 'Anonymous';
                var comment = document.createElement('div');
                comment.className = 'comment';
                comment.innerHTML = '<p><strong>' + username + ':</strong> ' + text.replace(/</g, '&lt;') + '</p>';
                rf.parentElement.parentElement.appendChild(comment);
                textarea.value = '';
                rf.classList.add('is-hidden');
            });
        });
    }
    wireReplySection(document);
});
export default {};