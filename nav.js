/* =========================================
   POCONO AI, LLC - NAVIGATION LOGIC
   V106 - STABILITY & FOCUS PURGE
   ========================================= */

document.addEventListener('DOMContentLoaded', () => {

    const menuToggle = document.getElementById('mobile-menu');
    const navMenu    = document.getElementById('nav-menu');

    // 1. Mobile Hamburger Logic
    if (menuToggle && navMenu) {
        menuToggle.addEventListener('click', function(e) {
            e.stopPropagation();
            this.blur(); // Force focus release
            
            navMenu.classList.toggle('active');
            const isOpen = navMenu.classList.contains('active');
            menuToggle.setAttribute('aria-expanded', isOpen);
            const spans = menuToggle.querySelectorAll('span');
            
            if (isOpen) {
                spans[0].style.transform = 'rotate(45deg) translate(5px, 6px)';
                spans[1].style.opacity   = '0';
                spans[2].style.transform = 'rotate(-45deg) translate(5px, -6px)';
            } else {
                spans[0].style.transform = '';
                spans[1].style.opacity   = '';
                spans[2].style.transform = '';
                closeAllDropdowns();
            }
        });
    }

    // 2. Dropdown Registry
    const dropdowns = [
        { toggleId: 'research-toggle', menuId: 'research-menu' },
        { toggleId: 'more-toggle',     menuId: 'more-menu'     },
    ]
    .map(d => ({
        toggle: document.getElementById(d.toggleId),
        menu:   document.getElementById(d.menuId),
    }))
    .filter(d => d.toggle && d.menu);

    function closeAllDropdowns() {
        dropdowns.forEach(d => {
            d.menu.classList.remove('open');
            d.toggle.classList.remove('open');
            d.toggle.setAttribute('aria-expanded', 'false');
            d.toggle.style.removeProperty('color');
        });
    }

    dropdowns.forEach(d => {
        d.toggle.addEventListener('click', function(e) {
            e.preventDefault(); 
            e.stopPropagation();
            
            // CRITICAL: Blur removes the sticky focus state
            this.blur(); 
            
            const wasOpen = d.menu.classList.contains('open');
            closeAllDropdowns(); 
            
            if (!wasOpen) {
                d.menu.classList.add('open');
                d.toggle.classList.add('open');
                d.toggle.setAttribute('aria-expanded', 'true');
                // Force inline color to beat internal HTML style blocks
                d.toggle.style.setProperty('color', 'var(--ai-blue)', 'important');
            }
        });

        d.menu.addEventListener('click', (e) => e.stopPropagation());
    });

    // 3. Global Outside Tap/Click Detector
    ['click', 'touchstart'].forEach(evt => {
        document.addEventListener(evt, (e) => {
            const isClickInside = e.target.closest('.nav-dropdown') || e.target.closest('.menu-toggle');
            if (!isClickInside) {
                closeAllDropdowns();
                if (navMenu && navMenu.classList.contains('active')) {
                    navMenu.classList.remove('active');
                    menuToggle.setAttribute('aria-expanded', 'false');
                }
            }
        }, { passive: true });
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeAllDropdowns();
    });
});
