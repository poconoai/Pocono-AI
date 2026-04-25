/* =========================================
   POCONO AI, LLC - NAVIGATION LOGIC
   ========================================= */

document.addEventListener('DOMContentLoaded', () => {

    // ── Hamburger menu ──
    const menuToggle = document.getElementById('mobile-menu');
    const navMenu = document.getElementById('nav-menu');

    if (menuToggle && navMenu) {
        menuToggle.addEventListener('click', () => {
            navMenu.classList.toggle('active');
            const isExpanded = navMenu.classList.contains('active');
            menuToggle.setAttribute('aria-expanded', isExpanded);

            const spans = menuToggle.querySelectorAll('span');
            if (isExpanded) {
                spans[0].style.transform = 'rotate(45deg) translate(5px, 6px)';
                spans[1].style.opacity = '0';
                spans[2].style.transform = 'rotate(-45deg) translate(5px, -6px)';
            } else {
                spans[0].style.transform = 'none';
                spans[1].style.opacity = '1';
                spans[2].style.transform = 'none';
            }
        });
    }

    // ── More dropdown toggle (mobile + desktop click) ──
    const dropdownToggle = document.getElementById('more-toggle');
    const dropdownMenu = document.getElementById('more-menu');

    if (dropdownToggle && dropdownMenu) {
        dropdownToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = dropdownMenu.classList.toggle('open');
            dropdownToggle.classList.toggle('open', isOpen);
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', () => {
            dropdownMenu.classList.remove('open');
            dropdownToggle.classList.remove('open');
        });

        // Prevent dropdown from closing when clicking inside it
        dropdownMenu.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

});
