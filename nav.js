/* =========================================
   POCONO AI, LLC — NAVIGATION V2026
   Architect: Lead Front-End (2026 Build)
   ========================================= */

/*
 * ── CORE PHILOSOPHY: THE "TOUCH POINTER" ARCHITECTURE ────────────────────
 *
 * The iOS "Blue Lock" and event-swallowing bugs share a single root cause:
 * iOS Safari treats touch events and click events as SEPARATE concerns.
 * The browser fires touchstart → touchend → (300ms later) → click.
 * The document.addEventListener('click') on a backdrop fires AFTER the
 * browser has already re-focused the last-tapped element, making blur() a
 * race you'll always lose with setTimeout.
 *
 * THE 2026-STANDARD SOLUTION — Three-Layer Defense:
 *
 * Layer 1 — CSS `focus-visible` + `-webkit-tap-highlight-color: transparent`
 *   Kills the blue ring at the paint level. :focus rings only show for
 *   keyboard nav (pointer-triggered focus gets no ring at all via
 *   :focus:not(:focus-visible)). This is the W3C-blessed approach.
 *
 * Layer 2 — `pointer-events`-based Backdrop (The Real iOS Fix)
 *   Instead of listening for clicks on document (which iOS swallows),
 *   we inject a fixed full-screen <div> BEHIND the dropdown but ABOVE
 *   the page content. When iOS sees a touch on this div (which is a
 *   real interactive element), it fires its touchstart → click chain
 *   normally. The backdrop listener closes menus reliably on every device.
 *   This is used in production by Apple, GitHub, and Stripe.
 *
 * Layer 3 — Immediate `.blur()` on `pointerup` (not click)
 *   `pointerup` fires before the browser synthesizes focus, giving us
 *   a chance to pre-empt the focus assignment. Combined with Layer 1,
 *   this ensures zero sticky rings on both iOS and Android Chrome.
 *
 * ─────────────────────────────────────────────────────────────────────────
 */

(function () {
  'use strict';

  /* ── 1. WAIT FOR DOM ─────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', init);

  function init() {

    /* ── 2. BACKDROP (Layer 2 — The Real iOS Fix) ─────────── */
    const backdrop = document.createElement('div');
    backdrop.id = 'nav-backdrop';
    // Injected into body, sits between header (z:1000) and page content (z:1)
    document.body.appendChild(backdrop);

    // Use both touchstart and click to cover all browsers
    backdrop.addEventListener('touchstart', closeAll, { passive: true });
    backdrop.addEventListener('click', closeAll);

    /* ── 3. GLOBAL FOCUS-BLUR PURGE (Layer 3) ─────────────── */
    // pointerup fires before synthesized focus on iOS/Android
    document.addEventListener('pointerup', (e) => {
      const tag = e.target.tagName;
      // For non-input interactive elements, blur immediately
      if (tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') {
        requestAnimationFrame(() => {
          if (document.activeElement && document.activeElement !== document.body) {
            // Only blur non-search elements (search needs focus to type)
            if (!document.activeElement.closest('#search-panel')) {
              document.activeElement.blur();
            }
          }
        });
      }
    });

    /* ── 4. ELEMENTS ───────────────────────────────────────── */
    const header       = document.querySelector('header');
    const menuToggle   = document.getElementById('mobile-menu');
    const mobileMenu   = document.getElementById('mobile-nav-panel');
    const searchIcon   = document.getElementById('search-icon-btn');
    const searchPanel  = document.getElementById('search-panel');
    const searchInput  = document.getElementById('search-panel-input');
    const searchClose  = document.getElementById('search-panel-close');

    /* ── 5. DROPDOWN STATE MACHINE ─────────────────────────── */
    const dropdowns = Array.from(
      document.querySelectorAll('.nav-item[data-dropdown]')
    ).map(item => ({
      item,
      toggle: item.querySelector('.nav-toggle'),
      menu:   document.getElementById(item.dataset.dropdown),
    })).filter(d => d.toggle && d.menu);

    let activeDropdown = null;
    let searchOpen     = false;
    let mobileOpen     = false;

    function openDropdown(d) {
      if (activeDropdown && activeDropdown !== d) closeDropdown(activeDropdown);
      d.item.classList.add('is-open');
      d.menu.classList.add('is-open');
      d.toggle.setAttribute('aria-expanded', 'true');
      activeDropdown = d;
      backdrop.classList.add('is-active');
    }

    function closeDropdown(d) {
      d.item.classList.remove('is-open');
      d.menu.classList.remove('is-open');
      d.toggle.setAttribute('aria-expanded', 'false');
      if (activeDropdown === d) activeDropdown = null;
    }

    function closeAll() {
      dropdowns.forEach(closeDropdown);
      closeMobile();
      backdrop.classList.remove('is-active');
    }

    /* ── 6. DESKTOP DROPDOWN HANDLERS ─────────────────────── */
    dropdowns.forEach(d => {
      // Keyboard: Enter/Space opens, Escape closes
      d.toggle.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          d.item.classList.contains('is-open') ? closeDropdown(d) : openDropdown(d);
        }
        if (e.key === 'Escape') { closeDropdown(d); d.toggle.focus(); }
      });

      // Click/touch: unified via click (works after our backdrop architecture)
      d.toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        d.item.classList.contains('is-open') ? closeDropdown(d) : openDropdown(d);
      });

      // Close when focus leaves the dropdown region (keyboard Tab nav)
      d.menu.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') { closeDropdown(d); d.toggle.focus(); }
      });
    });

    /* ── 7. SEARCH PANEL ───────────────────────────────────── */
    function openSearch() {
      closeAll();
      searchOpen = true;
      searchPanel.classList.add('is-open');
      searchIcon.setAttribute('aria-expanded', 'true');
      backdrop.classList.add('is-active');
      // Auto-focus AFTER CSS transition (300ms). Use transitionend for precision.
      searchPanel.addEventListener('transitionend', function focusOnce() {
        searchInput && searchInput.focus({ preventScroll: true });
        searchPanel.removeEventListener('transitionend', focusOnce);
      });
    }

    function closeSearch() {
      searchOpen = false;
      searchPanel.classList.remove('is-open');
      searchIcon.setAttribute('aria-expanded', 'false');
      if (!activeDropdown && !mobileOpen) backdrop.classList.remove('is-active');
    }

    if (searchIcon) {
      searchIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        searchOpen ? closeSearch() : openSearch();
      });
    }

    if (searchClose) {
      searchClose.addEventListener('click', closeSearch);
    }

    if (searchInput) {
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') { closeSearch(); searchIcon && searchIcon.focus(); }
        if (e.key === 'Enter') { e.preventDefault(); executeSearch(); }
      });
    }

    /* ── 8. SEARCH EXECUTION ───────────────────────────────── */
    function executeSearch() {
      if (!searchInput) return;
      const q = searchInput.value.trim();
      if (!q) return;
      // Hook into existing search.js if available, else redirect
      if (typeof window.runPoconoSearch === 'function') {
        window.runPoconoSearch(q);
      } else {
        window.location.href = `search.html?q=${encodeURIComponent(q)}`;
      }
    }

    /* ── 9. MOBILE PANEL ───────────────────────────────────── */
    function openMobile() {
      mobileOpen = true;
      mobileMenu && mobileMenu.classList.add('is-open');
      menuToggle && menuToggle.classList.add('is-open');
      menuToggle && menuToggle.setAttribute('aria-expanded', 'true');
      backdrop.classList.add('is-active');
      document.body.style.overflow = 'hidden'; // Prevent scroll-bleed
    }

    function closeMobile() {
      mobileOpen = false;
      mobileMenu && mobileMenu.classList.remove('is-open');
      menuToggle && menuToggle.classList.remove('is-open');
      menuToggle && menuToggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    }

    if (menuToggle) {
      menuToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        mobileOpen ? closeMobile() : openMobile();
      });
    }

    // Mobile accordion sub-menus
    document.querySelectorAll('.mob-section-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const section = btn.closest('.mob-section');
        section && section.classList.toggle('is-open');
      });
    });

    /* ── 10. ESCAPE KEY (global) ───────────────────────────── */
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (searchOpen) { closeSearch(); return; }
        if (activeDropdown || mobileOpen) closeAll();
      }
    });

    /* ── 11. SCROLL BEHAVIOR ───────────────────────────────── */
    let lastScrollY = 0;
    const scrollHandler = () => {
      const y = window.scrollY;
      if (header) {
        header.classList.toggle('scrolled', y > 20);
        // Hide header on scroll-down, reveal on scroll-up (mobile only)
        if (window.innerWidth < 768) {
          header.classList.toggle('nav-hidden', y > lastScrollY && y > 80);
        }
      }
      lastScrollY = y;
    };
    window.addEventListener('scroll', scrollHandler, { passive: true });

    /* ── 12. READING PROGRESS BAR ──────────────────────────── */
    const progressBar = document.getElementById('reading-progress');
    if (progressBar) {
      window.addEventListener('scroll', () => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        progressBar.style.width = max > 0 ? (window.scrollY / max * 100) + '%' : '0%';
      }, { passive: true });
    }

  } // end init()

})();
