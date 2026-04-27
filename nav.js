/* =========================================
   Pocono AI — nav.js v30
   Shared navigation + accessibility + reading progress
   ========================================= */

(function () {
    'use strict';

    // ── HAMBURGER ──
    var mobileBtn = document.getElementById('mobile-menu');
    var navMenu   = document.getElementById('nav-menu');

    if (mobileBtn && navMenu) {
        mobileBtn.addEventListener('click', function () {
            var isOpen = navMenu.classList.toggle('active');
            mobileBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        });

        // Close nav when clicking outside
        document.addEventListener('click', function (e) {
            if (!navMenu.contains(e.target) && !mobileBtn.contains(e.target)) {
                navMenu.classList.remove('active');
                mobileBtn.setAttribute('aria-expanded', 'false');
                // close any open dropdowns too
                document.querySelectorAll('.nav-dropdown-menu.open').forEach(function(m){ m.classList.remove('open'); });
                document.querySelectorAll('.nav-dropdown-toggle.open').forEach(function(t){ t.classList.remove('open'); t.setAttribute('aria-expanded','false'); });
            }
        });
    }

    // ── DROPDOWN TOGGLES ──
    document.querySelectorAll('.nav-dropdown-toggle').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            var menuId = btn.id.replace('-toggle', '-menu');
            var menu   = document.getElementById(menuId);
            if (!menu) return;

            var isOpen = menu.classList.toggle('open');
            btn.classList.toggle('open', isOpen);
            btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');

            // Close sibling dropdowns
            document.querySelectorAll('.nav-dropdown-menu').forEach(function (m) {
                if (m !== menu) {
                    m.classList.remove('open');
                    var sibBtn = document.getElementById(m.id.replace('-menu', '-toggle'));
                    if (sibBtn) { sibBtn.classList.remove('open'); sibBtn.setAttribute('aria-expanded', 'false'); }
                }
            });
        });
    });

    // ── KEYBOARD TRAP: Close dropdowns on Escape ──
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            document.querySelectorAll('.nav-dropdown-menu.open').forEach(function(m){ m.classList.remove('open'); });
            document.querySelectorAll('.nav-dropdown-toggle.open').forEach(function(t){ t.classList.remove('open'); t.setAttribute('aria-expanded','false'); });
            if (navMenu) { navMenu.classList.remove('active'); }
            if (mobileBtn) { mobileBtn.setAttribute('aria-expanded','false'); }
        }
    });

    // ── READING PROGRESS BAR (v30) ──
    var bar = document.getElementById('reading-progress');
    if (bar) {
        function updateProgress() {
            var doc     = document.documentElement;
            var scrolled = doc.scrollTop || document.body.scrollTop;
            var total   = doc.scrollHeight - doc.clientHeight;
            bar.style.width = total > 0 ? (scrolled / total * 100) + '%' : '0%';
        }
        window.addEventListener('scroll', updateProgress, { passive: true });
        updateProgress();
    }

})();

/* ── v31 ANNOUNCEMENT BAR DISMISS ── */
var closeBtn = document.querySelector('.close-announce');
if (closeBtn) {
    closeBtn.addEventListener('click', function() {
        var bar = document.querySelector('.announce-bar');
        if (bar) { bar.style.display = 'none'; sessionStorage.setItem('announce-closed','1'); }
    });
    if (sessionStorage.getItem('announce-closed')) {
        var bar = document.querySelector('.announce-bar');
        if (bar) bar.style.display = 'none';
    }
}

/* ── v31 FADE-IN SECTION OBSERVER ── */
if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                io.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });
    document.querySelectorAll('.fade-in-section').forEach(function(el) { io.observe(el); });
}
