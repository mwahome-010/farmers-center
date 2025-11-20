document.addEventListener('DOMContentLoaded', function() {
    /* Create mobile menu toggle button */
    const header = document.querySelector('header');
    const navContainer = document.querySelector('.nav-container');
    
    if (!header || !navContainer) return;

    let toggleBtn = document.querySelector('.mobile-menu-toggle');
    
    if (!toggleBtn) {
        toggleBtn = document.createElement('button');
        toggleBtn.className = 'mobile-menu-toggle';
        toggleBtn.setAttribute('aria-label', 'Toggle mobile menu');
        toggleBtn.setAttribute('aria-expanded', 'false');
        toggleBtn.innerHTML = `
            <span></span>
            <span></span>
            <span></span>
        `;
        
        header.insertBefore(toggleBtn, navContainer);
    }

    toggleBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        const isActive = navContainer.classList.toggle('active');
        toggleBtn.classList.toggle('active');
        toggleBtn.setAttribute('aria-expanded', isActive);
        
        if (isActive) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
    });

    const navLinks = document.querySelectorAll('.nav-bar a');
    navLinks.forEach(link => {
        link.addEventListener('click', function() {
            navContainer.classList.remove('active');
            toggleBtn.classList.remove('active');
            toggleBtn.setAttribute('aria-expanded', 'false');
            document.body.style.overflow = '';
        });
    });

    document.addEventListener('click', function(e) {
        if (navContainer.classList.contains('active') && 
            !navContainer.contains(e.target) && 
            !toggleBtn.contains(e.target)) {
            navContainer.classList.remove('active');
            toggleBtn.classList.remove('active');
            toggleBtn.setAttribute('aria-expanded', 'false');
            document.body.style.overflow = '';
        }
    });

    let resizeTimer;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function() {
            if (window.innerWidth > 968 && navContainer.classList.contains('active')) {
                navContainer.classList.remove('active');
                toggleBtn.classList.remove('active');
                toggleBtn.setAttribute('aria-expanded', 'false');
                document.body.style.overflow = '';
            }
        }, 250);
    });
});

export default {};