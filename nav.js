/* =========================================
   POCONO AI, LLC - NAVIGATION & SEARCH LOGIC
   V107 - CROSS-BROWSER STABILITY (CHROME/FIREFOX)
   ========================================= */

document.addEventListener('DOMContentLoaded', () => {
    const menuToggle = document.getElementById('mobile-menu');
    const navMenu    = document.getElementById('nav-menu');

    // ── SEARCH ENGINE LOGIC (The Magnifying Glass Fix) ──────────────────
    // We target the search input and button directly to break the "Blue Lock"
    const searchInput = document.querySelector('header input[type="text"]');
    const searchBtn   = document.querySelector('header .search-btn') || document.querySelector('header button img[src*="search"]')?.parentElement;

    if (searchBtn) {
        searchBtn.addEventListener('click', function(e) {
            e.preventDefault();
            const query = searchInput ? searchInput.value.trim() : "";
            
            // Trigger visual feedback
            this.style.transform = "scale(0.95)";
            
            if (query !== "") {
                console.log("Searching for:", query);
                // Redirect to search or show results
                // window.location.href = `/search.html?q=${encodeURIComponent(query)}`;
            }

            // CRITICAL: Force-kill the blue highlight after click
            setTimeout(() => {
                this.style.transform = "";
                this.blur(); // Physically removes focus for Firefox
            }, 150);
        });
    }

    // ── NAVIGATION & DROPDOWNS ──────────────────────────────────────────
    const dropdowns = [
        { toggleId: 'research-toggle', menuId: 'research-menu' },
        { toggleId: 'more-toggle',     menuId: 'more-menu'     },
    ].map(d => ({
        toggle: document.getElementById(d.toggleId),
        menu:   document.getElementById(d.menuId),
    })).filter(d => d.toggle && d.menu);

    function closeAll() {
        dropdowns.forEach(d => {
            d.menu.classList.remove('open');
            d.toggle.classList.remove('open');
            d.toggle.style.removeProperty('color');
            d.toggle.blur();
        });
        if (navMenu) navMenu.classList.remove('active');
    }

    dropdowns.forEach(d => {
        d.toggle.addEventListener('click', function(e) {
            e.preventDefault(); e.stopPropagation();
            const isOpen = d.menu.classList.contains('open');
            closeAll();
            if (!isOpen) {
                d.menu.classList.add('open');
                d.toggle.classList.add('open');
                d.toggle.style.setProperty('color', 'var(--ai-blue)', 'important');
            }
        });
    });

    // Smart detector for outside taps (Firefox & Chrome)
    ['mousedown', 'touchstart'].forEach(evt => {
        document.addEventListener(evt, (e) => {
            if (!e.target.closest('.nav-dropdown') && !e.target.closest('.menu-toggle') && !e.target.closest('header form')) {
                closeAll();
            }
        }, { passive: true });
    });
});
