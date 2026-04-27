/* =========================================
   POCONO AI, LLC — NAVIGATION v43
   Bulletproof dropdown: explicit state machine,
   single document listener, proper touch handling.
   ========================================= */
(function () {
    'use strict';

    document.addEventListener('DOMContentLoaded', function () {

        /* ── Hamburger ─────────────────────────────────────── */
        var toggle  = document.getElementById('mobile-menu');
        var navMenu = document.getElementById('nav-menu');
        var mOpen   = false;

        function setMobile(open) {
            mOpen = open;
            if (!navMenu || !toggle) return;
            navMenu.classList.toggle('active', open);
            toggle.setAttribute('aria-expanded', String(open));
            var spans = toggle.querySelectorAll('span');
            spans[0].style.transform = open ? 'rotate(45deg) translate(5px,6px)' : '';
            spans[1].style.opacity   = open ? '0' : '';
            spans[2].style.transform = open ? 'rotate(-45deg) translate(5px,-6px)' : '';
            if (!open) closeAll();
        }

        if (toggle && navMenu) {
            toggle.addEventListener('click', function (e) {
                e.stopPropagation();
                setMobile(!mOpen);
            });
        }

        /* ── Dropdowns ─────────────────────────────────────── */
        var registry = [
            { toggleId: 'more-toggle', menuId: 'more-menu' },
        ].map(function (d) {
            return { toggle: document.getElementById(d.toggleId),
                     menu:   document.getElementById(d.menuId),
                     open:   false };
        }).filter(function (d) { return d.toggle && d.menu; });

        function openDrop(d) {
            d.open = true;
            d.menu.classList.add('open');
            d.toggle.classList.add('open');
            d.toggle.setAttribute('aria-expanded', 'true');
            d.menu.style.zIndex = '2100';
        }
        function closeDrop(d) {
            d.open = false;
            d.menu.classList.remove('open');
            d.toggle.classList.remove('open');
            d.toggle.setAttribute('aria-expanded', 'false');
        }
        function closeAll() { registry.forEach(closeDrop); }

        registry.forEach(function (d) {
            d.toggle.addEventListener('click', function (e) {
                e.stopPropagation();
                var was = d.open;
                closeAll();
                if (!was) openDrop(d);
            });
        });

        /* Single outside-click handler */
        document.addEventListener('click', function (e) {
            var inside = registry.some(function (d) {
                return d.menu.contains(e.target) || d.toggle.contains(e.target);
            });
            if (!inside) closeAll();
            if (!inside && mOpen && navMenu && !navMenu.contains(e.target) &&
                toggle && !toggle.contains(e.target)) {
                setMobile(false);
            }
        });

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') { closeAll(); setMobile(false); }
        });
    });

    /* ── Reading progress ──────────────────────────────────── */
    document.addEventListener('DOMContentLoaded', function () {
        var bar = document.getElementById('reading-progress');
        if (!bar) return;
        function upd() {
            var d = document.documentElement;
            var t = d.scrollHeight - d.clientHeight;
            bar.style.width = t > 0 ? ((d.scrollTop || document.body.scrollTop) / t * 100) + '%' : '0%';
        }
        window.addEventListener('scroll', upd, { passive: true });
        upd();
    });

    /* ── Fade-in observer ──────────────────────────────────── */
    document.addEventListener('DOMContentLoaded', function () {
        if (!('IntersectionObserver' in window)) return;
        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (e) {
                if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); }
            });
        }, { threshold: 0.08 });
        document.querySelectorAll('.fade-in-section').forEach(function (el) { io.observe(el); });
    });

    /* ── Back-to-top ───────────────────────────────────────── */
    document.addEventListener('DOMContentLoaded', function () {
        var btn = document.createElement('button');
        btn.id = 'back-to-top'; btn.type = 'button';
        btn.setAttribute('aria-label', 'Back to top');
        btn.innerHTML = '&#8593;';
        document.body.appendChild(btn);
        btn.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
        window.addEventListener('scroll', function () {
            btn.classList.toggle('visible', window.scrollY > 400);
        }, { passive: true });
    });
}());
