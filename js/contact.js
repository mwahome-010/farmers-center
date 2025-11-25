import { API_BASE_URL } from './config.js';

function setupContactForm() {
    const contactForm = document.getElementById('contactForm');
    const errorDiv = document.getElementById('contactError');
    const successDiv = document.getElementById('contactSuccess');

    if (!contactForm) return;

    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (errorDiv) errorDiv.textContent = '';
        if (successDiv) successDiv.textContent = '';

        const formData = {
            name: document.getElementById('contactName').value.trim(),
            email: document.getElementById('contactEmail').value.trim(),
            subject: document.getElementById('contactSubject').value.trim(),
            message: document.getElementById('contactMessage').value.trim()
        };

        if (!formData.subject || !formData.message) {
            if (errorDiv) errorDiv.textContent = 'Please fill the fields marked with a "*".';
            return;
        }

        const submitBtn = contactForm.querySelector('button[type="submit"]');
        const originalText = submitBtn ? submitBtn.textContent : 'Send Message';
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Sending...';
        }

        try {
            const response = await fetch(`${API_BASE_URL}/contact`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(formData)
            });

            let data;
            try {
                data = await response.json();
            } catch (jsonError) {
                console.error('JSON parse error:', jsonError);
                if (errorDiv) {
                    errorDiv.textContent = 'Server error. Please try again later.';
                }
                return;
            }

            if (response.ok && data.success) {
                if (successDiv) {
                    successDiv.textContent = 'Thank you! Your message has been sent successfully. We\'ll get back to you soon.';
                }
                contactForm.reset();
            } else {
                if (errorDiv) {
                    errorDiv.textContent = data.error || 'Failed to send message. Please try again.';
                }
            }
        } catch (error) {
            console.error('Contact form error:', error);
            if (errorDiv) {
                if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                    errorDiv.textContent = 'Cannot connect to server. Please check your connection and try again.';
                } else {
                    errorDiv.textContent = 'An error occurred. Please try again later.';
                }
            }
        } finally {
            // Re-enable submit button
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        }
    });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupContactForm);
} else {
    setupContactForm();
}

export default {
    setupContactForm
};

