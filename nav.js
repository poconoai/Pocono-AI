/* =========================================
   POCONO AI, LLC - NAVIGATION LOGIC
   Dropdown system — click-stable, no CSS hover flicker
   Adding new dropdowns: push {toggleId, menuId} to the
   dropdowns array below — no other changes needed.
   ========================================= */

document.addEventListener('DOMContentLoaded', () => {

    // ── Hamburger (mobile) ────────────────────────────────────────────────
    const menuToggle = document.getElementById('mobile-menu');
    const navMenu    = document.getElementById('nav-menu');

    if (menuToggle && navMenu) {
        menuToggle.addEventListener('click', () => {
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

    // ── Dropdown registry — add new dropdowns here ────────────────────────
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
        });
    }

    dropdowns.forEach(d => {

        // Toggle on button click
        d.toggle.addEventListener('click', (e) => {
            e.stopPropagation();
            const wasOpen = d.menu.classList.contains('open');
            closeAllDropdowns();
            if (!wasOpen) {
                d.menu.classList.add('open');
                d.toggle.classList.add('open');
                d.toggle.setAttribute('aria-expanded', 'true');
            }
        });

        // CRITICAL: stop propagation inside menu so the outside-click
        // handler on document does not fire before link click registers.
        d.menu.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    });

    // Close on any outside click
    document.addEventListener('click', closeAllDropdowns);

    // Close on Escape from anywhere
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeAllDropdowns();
    });

});

/* ── Reading progress bar ── */
(function () {
    var bar = document.getElementById('reading-progress');
    if (!bar) return;
    function update() {
        var doc = document.documentElement;
        var scrolled = doc.scrollTop || document.body.scrollTop;
        var total = doc.scrollHeight - doc.clientHeight;
        bar.style.width = total > 0 ? (scrolled / total * 100) + '%' : '0%';
    }
    window.addEventListener('scroll', update, { passive: true });
    update();
}());

/* ── Scroll fade-in observer ── */
if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                io.unobserve(entry.target);
            }
        });
    }, { threshold: 0.08 });
    document.querySelectorAll('.fade-in-section').forEach(function (el) {
        io.observe(el);
    });
}

/* ── v35 BACK-TO-TOP BUTTON ── */
(function () {
    var btn = document.createElement('button');
    btn.id = 'back-to-top';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Back to top');
    btn.innerHTML = '&#8593;';
    document.body.appendChild(btn);

    btn.addEventListener('click', function () {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    window.addEventListener('scroll', function () {
        if (window.scrollY > 400) {
            btn.classList.add('visible');
        } else {
            btn.classList.remove('visible');
        }
    }, { passive: true });
})();
