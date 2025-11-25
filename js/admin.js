import auth from "./auth.js";
import { API_BASE_URL } from "./config.js";

let currentTab = "users";
let allUsers = [];
let allPosts = [];
let allDiseases = [];
let allGuides = [];
let allContactMessages = [];

document.addEventListener("DOMContentLoaded", async function () {
    await auth.waitForAuth();

    const user = auth.getCurrentUser();

    if (!user || user.role !== 'admin') {
        showNoAccess();
        return;
    }

    await initAdminPanel();

    window.addEventListener("auth:changed", () => {
        const updatedUser = auth.getCurrentUser();
        if (!updatedUser || updatedUser.role !== 'admin') {
            showNoAccess();
        }
    });
});

function showNoAccess() {
    const container = document.getElementById("adminContainer");
    container.innerHTML = `
        <div class="no-access">
            <h2>🔒 Access Denied</h2>
            <p>You need administrator privileges to access this page.</p>
            <button onclick="window.location.href='/'" style="margin-top: 16px; padding: 10px 20px; background: hsl(140, 62%, 42%); color: white; border: none; border-radius: 8px; cursor: pointer;">
                Go to Home
            </button>
        </div>
    `;
}

async function initAdminPanel() {
    const container = document.getElementById("adminContainer");

    container.innerHTML = `
    <div class="admin-header">
        <h1>🛡️ Admin Dashboard</h1>
        <p>Manage users, posts, diseases, and guides</p>
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
            <h3>Unanswered Posts</h3>
            <div class="stat-value" id="statUnanswered">-</div>
        </div>
        <div class="stat-card">
            <h3>Active Users (7d)</h3>
            <div class="stat-value" id="statActive7d">-</div>
        </div>
        <div class="stat-card">
            <h3>Active Users (30d)</h3>
            <div class="stat-value" id="statActive30d">-</div>
        </div>
        <div class="stat-card">
            <h3>7-Day Retention</h3>
            <div class="stat-value" id="statRetention7d">-</div>
            <p style="font-size: 0.75em; color: hsl(0, 0%, 20%); margin-top: 4px;">Users active in last 7d</p>
        </div>
        <div class="stat-card">
            <h3>30-Day Retention</h3>
            <div class="stat-value" id="statRetention30d">-</div>
            <p style="font-size: 0.75em; color: hsl(0, 0%, 20%); margin-top: 4px;">Users active in last 30d</p>
        </div>
    </div>


    <div class="admin-tabs">
            <button class="admin-tab active" data-tab="users">Users</button>
            <button class="admin-tab" data-tab="posts">Posts</button>
            <button class="admin-tab" data-tab="guides">Guides</button>
            <button class="admin-tab" data-tab="diseases">Diseases</button>
            <button class="admin-tab" data-tab="messages">
                Messages
                <span class="message-badge" id="unreadBadge" style="display: none;">0</span>
            </button>
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

    <div class="admin-panel" id="guidesPanel">
        <div class="search-filter">
            <input type="text" id="guideSearch" placeholder="Search guides...">
            <button class="admin-btn view" id="addGuideBtn">+ Add Guide</button>
        </div>
        <div id="guidesTable"></div>
    </div>

    <div class="admin-panel" id="diseasesPanel">
        <div class="search-filter">
            <input type="text" id="diseaseSearch" placeholder="Search diseases...">
            <button class="admin-btn view" id="addDiseaseBtn">+ Add Disease</button>
        </div>
        <div id="diseasesTable"></div>
    </div>

    <div class="admin-panel" id="messagesPanel">
        <div class="search-filter">
            <input type="text" id="messageSearch" placeholder="Search messages...">
            <button class="admin-btn danger" id="deleteAllReadBtn">Delete All Read</button>
        </div>
        <div id="messagesTable"></div>
    </div>
    
    `;

    setupTabHandlers();
    await loadStats();
    await loadUsers();
    await loadPosts();
    await loadDiseases();
    await loadGuides();
    await loadContactMessages();
}

function setupTabHandlers() {
    const tabs = document.querySelectorAll(".admin-tab");
    tabs.forEach((tab) => {
        tab.addEventListener("click", () => {
            const tabName = tab.getAttribute("data-tab");
            switchTab(tabName);
        });
    });

    const userSearch = document.getElementById("userSearch");
    if (userSearch) {
        userSearch.addEventListener(
            "input",
            debounce((e) => {
                filterUsers(e.target.value);
            }, 300)
        );
    }

    const postSearch = document.getElementById("postSearch");
    if (postSearch) {
        postSearch.addEventListener(
            "input",
            debounce((e) => {
                filterPosts(e.target.value);
            }, 300)
        );
    }

    const diseaseSearch = document.getElementById("diseaseSearch");
    if (diseaseSearch) {
        diseaseSearch.addEventListener(
            "input",
            debounce((e) => {
                filterDiseases(e.target.value);
            }, 300)
        );
    }

    const guideSearch = document.getElementById("guideSearch");
    if (guideSearch) {
        guideSearch.addEventListener(
            "input",
            debounce((e) => {
                filterGuides(e.target.value);
            }, 300)
        );
    }

    const addDiseaseBtn = document.getElementById("addDiseaseBtn");
    if (addDiseaseBtn) {
        addDiseaseBtn.addEventListener("click", () => showDiseaseModal());
    }

    const addGuideBtn = document.getElementById("addGuideBtn");
    if (addGuideBtn) {
        addGuideBtn.addEventListener("click", () => showGuideModal());
    }

    const messageSearch = document.getElementById("messageSearch");
    if (messageSearch) {
        messageSearch.addEventListener(
            "input",
            debounce((e) => {
                filterMessages(e.target.value);
            }, 300)
        );
    }

    const deleteAllReadBtn = document.getElementById("deleteAllReadBtn");
    if (deleteAllReadBtn) {
        deleteAllReadBtn.addEventListener("click", () => deleteAllReadMessages());
    }
}

function switchTab(tabName) {
    document
        .querySelectorAll(".admin-tab")
        .forEach((t) => t.classList.remove("active"));
    document
        .querySelectorAll(".admin-panel")
        .forEach((p) => p.classList.remove("active"));

    const selectedTab = document.querySelector(
        `.admin-tab[data-tab="${tabName}"]`
    );
    const selectedPanel = document.getElementById(`${tabName}Panel`);

    if (selectedTab) selectedTab.classList.add("active");
    if (selectedPanel) selectedPanel.classList.add("active");

    currentTab = tabName;

    if (tabName === 'messages' && allContactMessages.length === 0) {
    loadContactMessages();
}
}

async function loadStats() {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/stats`, {
            credentials: 'include'
        });

        if (!response.ok) {
            console.error('Stats response not OK:', response.status);
            return;
        }

        const data = await response.json();

        if (data.success && data.stats) {
            document.getElementById('statUsers').textContent = data.stats.totalUsers || 0;
            document.getElementById('statPosts').textContent = data.stats.totalPosts || 0;
            document.getElementById('statUnanswered').textContent = data.stats.unansweredPosts || 0;
            document.getElementById('statActive7d').textContent = data.stats.activeUsers7d || 0;
            document.getElementById('statActive30d').textContent = data.stats.activeUsers30d || 0;

            document.getElementById('statRetention7d').textContent =
                data.stats.retentionRate7d === 'N/A' ? 'N/A' : `${data.stats.retentionRate7d}%`;
            document.getElementById('statRetention30d').textContent =
                data.stats.retentionRate30d === 'N/A' ? 'N/A' : `${data.stats.retentionRate30d}%`;
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

async function loadDiseases() {
    try {
        const response = await fetch(`${API_BASE_URL}/diseases`, {
            credentials: "include",
        });

        const data = await response.json();

        if (data.success) {
            allDiseases = data.diseases;
            renderDiseases(allDiseases);
        }
    } catch (error) {
        console.error("Error loading diseases:", error);
    }
}

function renderDiseases(diseases) {
    const container = document.getElementById("diseasesTable");

    if (diseases.length === 0) {
        container.innerHTML =
            '<p style="text-align: center; padding: 20px;">No diseases found.</p>';
        return;
    }

    container.innerHTML = `
        <table class="admin-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Causes</th>
                    <th>Image</th>
                    <th>Created By</th>
                    <th>Created</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${diseases
            .map(
                (disease) => `
                    <tr>
                        <td>${disease.id}</td>
                        <td><strong>${escapeHTML(disease.name)}</strong></td>
                        <td>${disease.causes
                        ? escapeHTML(disease.causes)
                        : '<em style="color: hsl(0, 0%, 50%);">-</em>'
                    }</td>
                        <td>
                            ${disease.image_path
                        ? `<img src="${disease.image_path
                        }" alt="${escapeHTML(
                            disease.name
                        )}" style="max-width: 60px; max-height: 60px; object-fit: cover; border-radius: 4px;">`
                        : '<em style="color:hsl(0, 0%, 50%);">No image</em>'
                    }
                        </td>
                        <td>${disease.created_by_username ||
                    '<em style="color: hsl(0, 0%, 50%);">System</em>'
                    }</td>
                        <td>${formatDate(disease.created_at)}</td>
                        <td>
                            <button class="admin-btn view" onclick="showDiseaseModal(${disease.id
                    })">
                                Edit
                            </button>
                            <button class="admin-btn delete" onclick="deleteDisease(${disease.id
                    }, '${escapeHTML(disease.name)}')">
                                Delete
                            </button>
                        </td>
                    </tr>
                `
            )
            .join("")}
            </tbody>
        </table>
    `;
}

function filterDiseases(searchTerm) {
    const filtered = allDiseases.filter(
        (disease) =>
            disease.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (disease.causes &&
                disease.causes.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    renderDiseases(filtered);
}

function showDiseaseModal(diseaseId = null) {
    const isEdit = diseaseId !== null;
    const disease = isEdit ? allDiseases.find((d) => d.id === diseaseId) : null;

    const existingModal = document.getElementById("diseaseModal");
    if (existingModal) existingModal.remove();

    const modal = document.createElement("div");
    modal.id = "diseaseModal";
    modal.className = "admin-modal open";
    modal.innerHTML = `
        <div class="admin-modal-content">
            <div class="admin-modal-header">
                <div class="admin-modal-title">${isEdit ? "Edit" : "Add"
        } Disease</div>
                <button class="admin-modal-close" type="button" onclick="closeDiseaseModal()" aria-label="Close modal">×</button>
            </div>
            <div class="admin-modal-body">
                <form id="diseaseForm" class="admin-form" enctype="multipart/form-data">
                    <div class="admin-form-grid">
                        <label class="admin-field">
                            <span>Name *</span>
                            <input type="text" id="diseaseName" value="${isEdit ? escapeHTML(disease.name) : ""
        }" required>
                        </label>
                        <label class="admin-field">
                            <span>Caused By</span>
                            <input type="text" id="diseaseCauses" value="${isEdit && disease.causes
            ? escapeHTML(disease.causes)
            : ""
        }">
                        </label>
                        <label class="admin-field">
                            <span>Affects</span>
                            <textarea id="diseaseAffects" rows="2" placeholder="Stem, leaves, etc.">${isEdit && disease.affects
            ? escapeHTML(disease.affects)
            : ""
        }</textarea>
                        </label>
                        <label class="admin-field">
                            <span>Symptoms</span>
                            <textarea id="diseaseSymptoms" rows="3" placeholder="Visible signs, indicators">${isEdit && disease.symptoms
            ? escapeHTML(disease.symptoms)
            : ""
        }</textarea>
                        </label>
                        <label class="admin-field">
                            <span>Treatment</span>
                            <textarea id="diseaseTreatment" rows="3" placeholder="Recommended treatment plan">${isEdit && disease.treatment
            ? escapeHTML(disease.treatment)
            : ""
        }</textarea>
                        </label>
                        <label class="admin-field">
                            <span>Prevention</span>
                            <textarea id="diseasePrevention" rows="3" placeholder="Preventive actions or tips">${isEdit && disease.prevention
            ? escapeHTML(disease.prevention)
            : ""
        }</textarea>
                        </label>
                    </div>
                    <div class="admin-field">
                        <span>Image (Max 5MB)</span>
                        <input type="file" id="diseaseImage" accept="image/*">
                        <p class="admin-form-help">Upload image: JPG, PNG, or webp.</p>
                    </div>
                    ${isEdit && disease.image_path
            ? `
                        <div class="admin-form-preview">
                            <strong>Current image preview</strong>
                            <img src="${disease.image_path}" alt="${escapeHTML(
                disease.name
            )} image preview">
                        </div>
                    `
            : ""
        }
                    <div class="admin-error" id="diseaseError" style="display:none;"></div>
                    <div class="admin-modal-actions">
                        <button type="button" class="modal-btn secondary" onclick="closeDiseaseModal()">Cancel</button>
                        <button type="submit" class="modal-btn primary">
                            ${isEdit ? "Update Disease" : "Create Disease"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const form = document.getElementById("diseaseForm");
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        await saveDiseaseForm(diseaseId);
    });
}

async function saveDiseaseForm(diseaseId) {
    const formData = new FormData();
    formData.append("name", document.getElementById("diseaseName").value.trim());
    formData.append(
        "causes",
        document.getElementById("diseaseCauses").value.trim()
    );
    formData.append(
        "affects",
        document.getElementById("diseaseAffects").value.trim()
    );
    formData.append(
        "symptoms",
        document.getElementById("diseaseSymptoms").value.trim()
    );
    formData.append(
        "treatment",
        document.getElementById("diseaseTreatment").value.trim()
    );
    formData.append(
        "prevention",
        document.getElementById("diseasePrevention").value.trim()
    );

    const imageFile = document.getElementById("diseaseImage").files[0];
    if (imageFile) {
        formData.append("image", imageFile);
    }

    const errorDiv = document.getElementById("diseaseError");
    errorDiv.textContent = "";
    errorDiv.style.display = "none";

    try {
        const url = diseaseId
            ? `${API_BASE_URL}/diseases/${diseaseId}`
            : `${API_BASE_URL}/diseases`;

        const response = await fetch(url, {
            method: diseaseId ? "PUT" : "POST",
            credentials: "include",
            body: formData,
        });

        const data = await response.json();

        if (data.success) {
            closeDiseaseModal();
            await loadDiseases();
            await loadStats();
            alert(data.message);
        } else {
            errorDiv.textContent = data.error;
            errorDiv.style.display = data.error ? "block" : "none";
        }
    } catch (error) {
        console.error("Error saving disease:", error);
        errorDiv.textContent = "Failed to save disease";
        errorDiv.style.display = "block";
    }
}

window.closeDiseaseModal = function () {
    const modal = document.getElementById("diseaseModal");
    if (modal) modal.remove();
};

window.showDiseaseModal = showDiseaseModal;

window.deleteDisease = async function (diseaseId, name) {
    if (
        !confirm(
            `Are you sure you want to delete "${name}"?\n\nThis action cannot be undone!`
        )
    ) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/diseases/${diseaseId}`, {
            method: "DELETE",
            credentials: "include",
        });

        const data = await response.json();

        if (data.success) {
            await loadDiseases();
            await loadStats();
            alert("Disease deleted successfully");
        } else {
            alert(data.error || "Failed to delete disease");
        }
    } catch (error) {
        console.error("Error deleting disease:", error);
        alert("Failed to delete disease");
    }
};

// GUIDES MGT

async function loadGuides() {
    try {
        const response = await fetch(`${API_BASE_URL}/guides`, {
            credentials: "include",
        });

        const data = await response.json();

        if (data.success) {
            allGuides = data.guides;
            renderGuides(allGuides);
        }
    } catch (error) {
        console.error("Error loading guides:", error);
    }
}

function renderGuides(guides) {
    const container = document.getElementById("guidesTable");

    if (guides.length === 0) {
        container.innerHTML =
            '<p style="text-align: center; padding: 20px;">No guides found.</p>';
        return;
    }

    container.innerHTML = `
        <table class="admin-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Image</th>
                    <th>Created By</th>
                    <th>Created</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${guides
            .map(
                (guide) => `
                    <tr>
                        <td>${guide.id}</td>
                        <td><strong>${escapeHTML(guide.name)}</strong></td>
                        <td>
                            ${guide.image_path
                        ? `<img src="${guide.image_path
                        }" alt="${escapeHTML(
                            guide.name
                        )}" style="max-width: 60px; max-height: 60px; object-fit: cover; border-radius: 4px;">`
                        : '<em style="color: hsl(0, 0%, 50%);">No image</em>'
                    }
                        </td>
                        <td>${guide.created_by_username ||
                    '<em style="color: hsl(0, 0%, 50%);">System</em>'
                    }</td>
                        <td>${formatDate(guide.created_at)}</td>
                        <td>
                            <button class="admin-btn view" onclick="showGuideModal(${guide.id
                    })">
                                Edit
                            </button>
                            <button class="admin-btn delete" onclick="deleteGuide(${guide.id
                    }, '${escapeHTML(guide.name)}')">
                                Delete
                            </button>
                        </td>
                    </tr>
                `
            )
            .join("")}
            </tbody>
        </table>
    `;
}

function filterGuides(searchTerm) {
    const filtered = allGuides.filter((guide) =>
        guide.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    renderGuides(filtered);
}

function showGuideModal(guideId = null) {
    const isEdit = guideId !== null;
    const guide = isEdit ? allGuides.find((g) => g.id === guideId) : null;

    const existingModal = document.getElementById("guideModal");
    if (existingModal) existingModal.remove();

    const modal = document.createElement("div");
    modal.id = "guideModal";
    modal.className = "admin-modal open";
    modal.innerHTML = `
        <div class="admin-modal-content">
            <div class="admin-modal-header">
                <div class="admin-modal-title">${isEdit ? "Edit" : "Add"
        } Guide</div>
                <button class="admin-modal-close" type="button" onclick="closeGuideModal()" aria-label="Close modal">×</button>
            </div>
            <div class="admin-modal-body">
                <form id="guideFormAdmin" class="admin-form" enctype="multipart/form-data">
                    <div class="admin-form-grid">
                        <label class="admin-field">
                            <span>Name *</span>
                            <input type="text" id="guideName" value="${isEdit ? escapeHTML(guide.name) : ""
        }" required>
                        </label>
                        <label class="admin-field">
                            <span>Planting Suggestions</span>
                            <textarea id="guidePlanting" rows="4" placeholder="Soil requirements, planting schedule, spacing">${isEdit && guide.planting_suggestions
            ? escapeHTML(guide.planting_suggestions)
            : ""
        }</textarea>
                        </label>
                        <label class="admin-field">
                            <span>Care Instructions</span>
                            <textarea id="guideCare" rows="4" placeholder="Watering, fertilizing, pest control tips">${isEdit && guide.care_instructions
            ? escapeHTML(guide.care_instructions)
            : ""
        }</textarea>
                        </label>
                    </div>
                    <div class="admin-field">
                        <span>Image (Max 5MB)</span>
                        <input type="file" id="guideImage" accept="image/*">
                        <p class="admin-form-help">Upload image (JPG, PNG, or webp).</p>
                    </div>
                    ${isEdit && guide.image_path
            ? `
                        <div class="admin-form-preview">
                            <strong>Current image preview</strong>
                            <img src="${guide.image_path}" alt="${escapeHTML(
                guide.name
            )} image preview">
                        </div>
                    `
            : ""
        }
                    <div class="admin-error" id="guideError" style="display:none;"></div>
                    <div class="admin-modal-actions">
                        <button type="button" class="modal-btn secondary" onclick="closeGuideModal()">Cancel</button>
                        <button type="submit" class="modal-btn primary">
                            ${isEdit ? "Update Guide" : "Create Guide"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const form = document.getElementById("guideFormAdmin");
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        await saveGuideForm(guideId);
    });
}

async function saveGuideForm(guideId) {
    const formData = new FormData();
    formData.append("name", document.getElementById("guideName").value.trim());
    formData.append(
        "planting_suggestions",
        document.getElementById("guidePlanting").value.trim()
    );
    formData.append(
        "care_instructions",
        document.getElementById("guideCare").value.trim()
    );

    const imageFile = document.getElementById("guideImage").files[0];
    if (imageFile) {
        formData.append("image", imageFile);
    }

    const errorDiv = document.getElementById("guideError");
    errorDiv.textContent = "";
    errorDiv.style.display = "none";

    try {
        const url = guideId
            ? `${API_BASE_URL}/guides/${guideId}`
            : `${API_BASE_URL}/guides`;

        const response = await fetch(url, {
            method: guideId ? "PUT" : "POST",
            credentials: "include",
            body: formData,
        });

        const data = await response.json();

        if (data.success) {
            closeGuideModal();
            await loadGuides();
            await loadStats();
            alert(data.message);
        } else {
            errorDiv.textContent = data.error;
            errorDiv.style.display = data.error ? "block" : "none";
        }
    } catch (error) {
        console.error("Error saving guide:", error);
        errorDiv.textContent = "Failed to save guide";
        errorDiv.style.display = "block";
    }
}

window.closeGuideModal = function () {
    const modal = document.getElementById("guideModal");
    if (modal) modal.remove();
};

window.showGuideModal = showGuideModal;

window.deleteGuide = async function (guideId, name) {
    if (
        !confirm(
            `Are you sure you want to delete "${name}"?\n\nThis action cannot be undone!`
        )
    ) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/guides/${guideId}`, {
            method: "DELETE",
            credentials: "include",
        });

        const data = await response.json();

        if (data.success) {
            await loadGuides();
            await loadStats();
            alert("Guide deleted successfully");
        } else {
            alert(data.error || "Failed to delete guide");
        }
    } catch (error) {
        console.error("Error deleting guide:", error);
        alert("Failed to delete guide");
    }
};

async function loadContactMessages() {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/contact-messages`, {
            credentials: "include",
        });

        const data = await response.json();

        if (data.success) {
            allContactMessages = data.messages;
            renderContactMessages(allContactMessages);
            await updateUnreadBadge();
        }
    } catch (error) {
        console.error("Error loading contact messages:", error);
    }
}

async function updateUnreadBadge() {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/contact-messages/unread-count`, {
            credentials: "include",
        });

        const data = await response.json();

        if (data.success) {
            const badge = document.getElementById("unreadBadge");
            if (badge) {
                if (data.unreadCount > 0) {
                    badge.textContent = data.unreadCount;
                    badge.style.display = "inline-block";
                } else {
                    badge.style.display = "none";
                }
            }
        }
    } catch (error) {
        console.error("Error updating unread badge:", error);
    }
}

function renderContactMessages(messages) {
    const container = document.getElementById("messagesTable");

    if (messages.length === 0) {
        container.innerHTML =
            '<p style="text-align: center; padding: 20px;">No messages found.</p>';
        return;
    }

    container.innerHTML = `
        <table class="admin-table">
            <thead>
                <tr>
                    <th>Status</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Subject</th>
                    <th>Date</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${messages
                    .map(
                        (msg) => `
                    <tr class="${msg.read_status ? '' : 'unread-message'}">
                        <td>
                            <span class="admin-badge ${msg.read_status ? 'read' : 'unread'}">
                                ${msg.read_status ? 'Read' : 'New'}
                            </span>
                        </td>
                        <td><strong>${escapeHTML(msg.name)}</strong></td>
                        <td>${escapeHTML(msg.email)}</td>
                        <td>${escapeHTML(msg.subject)}</td>
                        <td>${formatDate(msg.created_at)}</td>
                        <td>
                            <button class="admin-btn view" onclick="viewMessage(${msg.id})">
                                View
                            </button>
                            ${!msg.read_status ? `
                                <button class="admin-btn mark-read" onclick="markAsRead(${msg.id})">
                                    Mark Read
                                </button>
                            ` : ''}
                            <button class="admin-btn delete" onclick="deleteMessage(${msg.id})">
                                Delete
                            </button>
                        </td>
                    </tr>
                `
                    )
                    .join("")}
            </tbody>
        </table>
    `;
}

function filterMessages(searchTerm) {
    const filtered = allContactMessages.filter(
        (msg) =>
            msg.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            msg.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            msg.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
            msg.message.toLowerCase().includes(searchTerm.toLowerCase())
    );
    renderContactMessages(filtered);
}

window.viewMessage = function (messageId) {
    const message = allContactMessages.find((m) => m.id === messageId);
    if (!message) return;

    showMessageModal(message);
};

function showMessageModal(message) {
    const existingModal = document.getElementById("messageModal");
    if (existingModal) existingModal.remove();

    const modal = document.createElement("div");
    modal.id = "messageModal";
    modal.className = "admin-modal open";
    modal.innerHTML = `
        <div class="admin-modal-content">
            <div class="admin-modal-header">
                <div class="admin-modal-title">Contact Message</div>
                <button class="admin-modal-close" type="button" onclick="closeMessageModal()" aria-label="Close modal">×</button>
            </div>
            <div class="admin-modal-body">
                <div class="message-details">
                    <div class="message-info">
                        <div class="info-row">
                            <strong>From:</strong> ${escapeHTML(message.name)} (${escapeHTML(message.email)})
                        </div>
                        <div class="info-row">
                            <strong>Subject:</strong> ${escapeHTML(message.subject)}
                        </div>
                        <div class="info-row">
                            <strong>Date:</strong> ${formatDate(message.created_at)}
                        </div>
                        <div class="info-row">
                            <strong>Status:</strong> 
                            <span class="admin-badge ${message.read_status ? 'read' : 'unread'}">
                                ${message.read_status ? 'Read' : 'Unread'}
                            </span>
                        </div>
                    </div>
                    <div class="message-body">
                        <strong>Message:</strong>
                        <p>${escapeHTML(message.message)}</p>
                    </div>
                    <div class="message-actions">
                        <a href="mailto:${escapeHTML(message.email)}?subject=Re: ${encodeURIComponent(message.subject)}" 
                           class="modal-btn primary" 
                           target="_blank">
                            Reply via Email
                        </a>
                        ${!message.read_status ? `
                            <button class="modal-btn secondary" onclick="markAsReadAndClose(${message.id})">
                                Mark as Read
                            </button>
                        ` : ''}
                        <button class="modal-btn danger" onclick="deleteMessageAndClose(${message.id})">
                            Delete
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Automatically mark as read when viewed
    if (!message.read_status) {
        markAsRead(message.id, false);
    }
}

window.closeMessageModal = function () {
    const modal = document.getElementById("messageModal");
    if (modal) modal.remove();
};

window.markAsRead = async function (messageId, reload = true) {
    try {
        const response = await fetch(
            `${API_BASE_URL}/admin/contact-messages/${messageId}/read`,
            {
                method: "PATCH",
                credentials: "include",
            }
        );

        const data = await response.json();

        if (data.success) {
            if (reload) {
                await loadContactMessages();
            } else {
                const msg = allContactMessages.find((m) => m.id === messageId);
                if (msg) msg.read_status = true;
                await updateUnreadBadge();
            }
        } else {
            alert(data.error || "Failed to mark message as read");
        }
    } catch (error) {
        console.error("Error marking message as read:", error);
        alert("Failed to mark message as read");
    }
};

window.markAsReadAndClose = async function (messageId) {
    await markAsRead(messageId);
    closeMessageModal();
};

window.deleteMessage = async function (messageId) {
    if (!confirm("Are you sure you want to delete this message?")) {
        return;
    }

    try {
        const response = await fetch(
            `${API_BASE_URL}/admin/contact-messages/${messageId}`,
            {
                method: "DELETE",
                credentials: "include",
            }
        );

        const data = await response.json();

        if (data.success) {
            await loadContactMessages();
            alert("Message deleted successfully");
        } else {
            alert(data.error || "Failed to delete message");
        }
    } catch (error) {
        console.error("Error deleting message:", error);
        alert("Failed to delete message");
    }
};

window.deleteMessageAndClose = async function (messageId) {
    closeMessageModal();
    await deleteMessage(messageId);
};

async function deleteAllReadMessages() {
    const readMessages = allContactMessages.filter((m) => m.read_status);

    if (readMessages.length === 0) {
        alert("No read messages to delete");
        return;
    }

    if (
        !confirm(
            `Are you sure you want to delete all ${readMessages.length} read messages? This action cannot be undone!`
        )
    ) {
        return;
    }

    try {
        let deletedCount = 0;
        for (const msg of readMessages) {
            const response = await fetch(
                `${API_BASE_URL}/admin/contact-messages/${msg.id}`,
                {
                    method: "DELETE",
                    credentials: "include",
                }
            );

            const data = await response.json();
            if (data.success) deletedCount++;
        }

        await loadContactMessages();
        alert(`Successfully deleted ${deletedCount} read messages`);
    } catch (error) {
        console.error("Error deleting messages:", error);
        alert("Failed to delete some messages");
    }
}

async function loadUsers() {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/users`, {
            credentials: "include",
        });

        const data = await response.json();

        if (data.success) {
            allUsers = data.users;
            renderUsers(allUsers);
        }
    } catch (error) {
        console.error("Error loading users:", error);
    }
}

function renderUsers(users) {
    const container = document.getElementById("usersTable");

    if (users.length === 0) {
        container.innerHTML =
            '<p style="text-align: center; padding: 20px;">No users found.</p>';
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
                ${users
            .map(
                (user) => `
                    <tr>
                        <td>${user.id}</td>
                        <td><strong>${escapeHTML(user.username)}</strong></td>
                        <td>${escapeHTML(user.email)}</td>
                        <td>
                            <span class="admin-badge ${user.role === 'admin' ? "admin" : "user"}">
                                ${user.role === 'admin' ? "Admin" : "User"}
                            </span>
                        </td>
                        <td>${user.post_count}</td>
                        <td>${user.comment_count}</td>
                        <td>${formatDate(user.created_at)}</td>
                        <td>
                            ${user.id !== currentUser.id
                        ? `
                                <button class="admin-btn delete" onclick="deleteUser(${user.id
                        }, '${escapeHTML(user.username)}')">
                                    Delete
                                </button>
                            `
                        : '<em style="color: hsl(0, 0%, 50%);">You</em>'
                    }
                        </td>
                    </tr>
                `
            )
            .join("")}
            </tbody>
        </table>
    `;
}

function filterUsers(searchTerm) {
    const filtered = allUsers.filter(
        (user) =>
            user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
    renderUsers(filtered);
}

async function loadPosts() {
    try {
        const response = await fetch(`${API_BASE_URL}/forum/posts`, {
            credentials: "include",
        });

        const data = await response.json();

        if (data.success) {
            allPosts = data.posts;
            renderPosts(allPosts);
        }
    } catch (error) {
        console.error("Error loading posts:", error);
    }
}

function renderPosts(posts) {
    const container = document.getElementById("postsTable");

    if (posts.length === 0) {
        container.innerHTML =
            '<p style="text-align: center; padding: 20px;">No posts found.</p>';
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
                ${posts
            .map(
                (post) => `
                    <tr>
                        <td>${post.id}</td>
                        <td>
                            <strong>${escapeHTML(post.title)}</strong>
                            ${post.image_path
                        ? '<span style="color: hsl(0, 0%, 50%);">📷</span>'
                        : ""
                    }
                        </td>
                        <td>${escapeHTML(post.username)}</td>
                        <td><span class="badge">${post.category_name
                    }</span></td>
                        <td>${post.comment_count}</td>
                        <td>${post.views}</td>
                        <td>${formatDate(post.created_at)}</td>
                        <td>
                            <button class="admin-btn view" onclick="window.location.href='forum.html#post-${post.id
                    }'">
                                View
                            </button>
                            <button class="admin-btn delete" onclick="deletePost(${post.id
                    }, '${escapeHTML(post.title)}')">
                                Delete
                            </button>
                        </td>
                    </tr>
                `
            )
            .join("")}
            </tbody>
        </table>
    `;
}

function filterPosts(searchTerm) {
    const filtered = allPosts.filter(
        (post) =>
            post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            post.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
            post.body.toLowerCase().includes(searchTerm.toLowerCase())
    );
    renderPosts(filtered);
}

window.deleteUser = function (userId, username) {
    showDeleteUserModal(userId, username);
};

window.deletePost = async function (postId, title) {
    if (
        !confirm(
            `Are you sure you want to delete the post "${title}"?\n\nThis will also delete all comments on this post.\n\nThis action cannot be undone!`
        )
    ) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/admin/posts/${postId}`, {
            method: "DELETE",
            credentials: "include",
        });

        const data = await response.json();

        if (data.success) {
            alert("Post deleted successfully");
            await loadPosts();
            await loadStats();
        } else {
            alert(data.error || "Failed to delete post");
        }
    } catch (error) {
        console.error("Error deleting post:", error);
        alert("Failed to delete post");
    }
};

function escapeHTML(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}

let deleteUserEscapeHandler = null;

function showDeleteUserModal(userId, username) {
    const existingModal = document.getElementById("deleteUserModal");
    if (existingModal) existingModal.remove();

    const modal = document.createElement("div");
    modal.id = "deleteUserModal";
    modal.className = "admin-modal open";
    modal.innerHTML = `
        <div class="admin-modal-content">
            <div class="admin-modal-header">
                <div class="admin-modal-title">Delete User</div>
                <button class="admin-modal-close" type="button" onclick="closeDeleteUserModal()" aria-label="Close modal">×</button>
            </div>
            <div class="admin-modal-body">
                <form id="deleteUserForm" class="admin-form" data-user-id="${userId}">
                    <div style="background: hsl(0, 62%, 96%); border: 1px solid hsl(0, 62%, 80%); border-radius: 12px; padding: 18px;">
                        <p style="color: hsl(0, 62%, 28%); font-weight: 600; margin-bottom: 8px;">⚠️ Warning: This action permanently removes ${escapeHTML(
        username
    )}.</p>
                        <p style="color: hsl(0, 62%, 24%); font-size: 0.92em; line-height: 1.5;">
                            Deleting this account will immediately and irreversibly remove:
                        </p>
                        <ul style="color: hsl(0, 62%, 24%); font-size: 0.92em; margin: 10px 0 0 24px; line-height: 1.5;">
                            <li>Their profile information and login access</li>
                            <li>All forum posts created by this user</li>
                            <li>All comments created by this user</li>
                            <li>Any images uploaded by this user</li>
                        </ul>
                    </div>
                    <div class="admin-field">
                        <span>Type <strong>DELETE</strong> to confirm</span>
                        <input type="text" id="deleteUserConfirmInput" placeholder="DELETE" autocomplete="off" required>
                    </div>
                    <div class="admin-error" id="deleteUserError" style="display:none;"></div>
                    <div class="admin-modal-actions">
                        <button type="button" class="modal-btn secondary" onclick="closeDeleteUserModal()">Cancel</button>
                        <button type="submit" class="modal-btn primary" id="deleteUserSubmitBtn" disabled>Delete User</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const confirmInput = document.getElementById("deleteUserConfirmInput");
    const submitBtn = document.getElementById("deleteUserSubmitBtn");
    const form = document.getElementById("deleteUserForm");

    confirmInput.addEventListener("input", () => {
        submitBtn.disabled = confirmInput.value.trim().toUpperCase() !== "DELETE";
    });

    modal.addEventListener("click", (e) => {
        if (e.target === modal) {
            closeDeleteUserModal();
        }
    });

    deleteUserEscapeHandler = (e) => {
        if (e.key === "Escape") {
            closeDeleteUserModal();
        }
    };
    document.addEventListener("keydown", deleteUserEscapeHandler);

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        await performDeleteUser(userId, username);
    });
}

async function performDeleteUser(userId, username) {
    const errorDiv = document.getElementById("deleteUserError");
    const submitBtn = document.getElementById("deleteUserSubmitBtn");

    if (!errorDiv || !submitBtn) return;

    errorDiv.textContent = "";
    errorDiv.style.display = "none";

    submitBtn.disabled = true;
    submitBtn.textContent = "Deleting...";

    try {
        const response = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
            method: "DELETE",
            credentials: "include",
        });

        const data = await response.json();

        if (data.success) {
            closeDeleteUserModal();
            alert(`User "${username}" deleted successfully`);
            await loadUsers();
            await loadStats();
            await loadPosts();
        } else {
            errorDiv.textContent = data.error || "Failed to delete user";
            errorDiv.style.display = "block";
            submitBtn.disabled = false;
            submitBtn.textContent = "Delete User";
        }
    } catch (error) {
        console.error("Error deleting user:", error);
        errorDiv.textContent = "Failed to delete user";
        errorDiv.style.display = "block";
        submitBtn.disabled = false;
        submitBtn.textContent = "Delete User";
    }
}

window.closeDeleteUserModal = function () {
    const modal = document.getElementById("deleteUserModal");
    if (modal) modal.remove();
    if (deleteUserEscapeHandler) {
        document.removeEventListener("keydown", deleteUserEscapeHandler);
        deleteUserEscapeHandler = null;
    }
};

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
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
