/* =========================================
   POCONO AI, LLC - NAVIGATION & SEARCH
   V108 - UNIFIED PERIMETER BUILD
   ========================================= */

document.addEventListener('DOMContentLoaded', () => {
    const menuToggle = document.getElementById('mobile-menu');
    const navMenu    = document.getElementById('nav-menu');

    // ── THE "BLUE LOCK" KILLER ──────────────────────────────────────────
    // Force-clears focus from ANY element clicked to prevent sticky blue rings
    document.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON' || e.target.tagName === 'A') {
            setTimeout(() => e.target.blur(), 150);
        }
    });

    // ── SEARCH ENGINE LOGIC ─────────────────────────────────────────────
    const searchForm = document.querySelector('.search-container');
    const searchInput = document.querySelector('.search-input');
    const searchBtn = document.querySelector('.search-submit');

    if (searchBtn && searchInput) {
        const executeSearch = () => {
            const query = searchInput.value.trim();
            if (query) {
                console.log("Sovereign Search Initiated:", query);
                // Trigger visual feedback
                searchBtn.style.color = 'var(--ai-blue)';
                setTimeout(() => { searchBtn.style.color = ''; }, 500);
                
                // Add your search redirect here, e.g.:
                // window.location.href = `https://poconoai.com/search?q=${query}`;
            }
        };

        searchBtn.addEventListener('click', (e) => {
            e.preventDefault();
            executeSearch();
        });

        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                executeSearch();
            }
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
        });
        if (navMenu) navMenu.classList.remove('active');
    }

    dropdowns.forEach(d => {
        d.toggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const isOpen = d.menu.classList.contains('open');
            closeAll();
            if (!isOpen) {
                d.menu.classList.add('open');
                d.toggle.classList.add('open');
                d.toggle.style.setProperty('color', 'var(--ai-blue)', 'important');
            }
        });
    });

    // Mobile Hamburger
    if (menuToggle) {
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            navMenu.classList.toggle('active');
        });
    }

    // Close on outside tap
    document.addEventListener('touchstart', (e) => {
        if (!e.target.closest('header')) closeAll();
    }, { passive: true });
});
