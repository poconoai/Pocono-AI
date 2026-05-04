/* =========================================
   POCONO AI, LLC - NAVIGATION LOGIC
   The "Invisible Glass" Fix for Safari
   ========================================= */

document.addEventListener('DOMContentLoaded', () => {

    // 1. Dynamically inject the invisible backdrop so we don't have to touch HTML
    const backdrop = document.createElement('div');
    backdrop.id = 'nav-backdrop';
    document.body.appendChild(backdrop);

    // ── Hamburger (mobile) ────────────────────────────────────────────────
    const menuToggle = document.getElementById('mobile-menu');
    const navMenu    = document.getElementById('nav-menu');

    if (menuToggle && navMenu) {
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            navMenu.classList.toggle('active');
            const isOpen = navMenu.classList.contains('active');
            menuToggle.setAttribute('aria-expanded', isOpen);
            const spans = menuToggle.querySelectorAll('span');
            
            if (isOpen) {
                spans[0].style.transform = 'rotate(45deg) translate(5px, 6px)';
                spans[1].style.opacity   = '0';
                spans[2].style.transform = 'rotate(-45deg) translate(5px, -6px)';
                backdrop.classList.add('active'); // Turn on glass
            } else {
                spans[0].style.transform = '';
                spans[1].style.opacity   = '';
                spans[2].style.transform = '';
                closeAllDropdowns();
            }
        });
    }

    // ── Dropdown registry ─────────────────────────────────────────────────
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
            
            // Bruteforce remove inline color to reset it
            d.toggle.style.color = ''; 
        });
        
        // Remove mobile menu states
        if (navMenu) navMenu.classList.remove('active');
        if (menuToggle) {
            menuToggle.setAttribute('aria-expanded', 'false');
            const spans = menuToggle.querySelectorAll('span');
            if(spans.length === 3) {
                spans[0].style.transform = '';
                spans[1].style.opacity   = '';
                spans[2].style.transform = '';
            }
        }
        
        // Turn off the invisible glass
        backdrop.classList.remove('active');
    }

    dropdowns.forEach(d => {
        d.toggle.addEventListener('click', (e) => {
            e.preventDefault(); 
            e.stopPropagation();
            
            const wasOpen = d.menu.classList.contains('open');
            closeAllDropdowns(); // Close everything first
            
            if (!wasOpen) {
                // Open this specific menu
                d.menu.classList.add('open');
                d.toggle.classList.add('open');
                d.toggle.setAttribute('aria-expanded', 'true');
                
                // Bruteforce inline style to beat HTML !important tags
                d.toggle.style.color = 'var(--ai-blue)';
                
                // Turn on the invisible glass
                backdrop.classList.add('active');
            }
        });

        // Stop clicks inside the menu from closing the menu
        d.menu.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    });

    // ── The Safari Event Delegation Fix ───────────────────────────────────
    // ONLY the invisible glass listens for outside clicks. Safari respects this.
    ['click', 'touchstart'].forEach(evt => {
        backdrop.addEventListener(evt, (e) => {
            e.preventDefault(); // Stop mobile double-firing
            e.stopPropagation();
            closeAllDropdowns();
        }, { passive: false });
    });

    // Close on Escape from anywhere
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeAllDropdowns();
    });
});
