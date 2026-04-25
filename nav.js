/* =========================================
   POCONO AI, LLC - NAVIGATION LOGIC
   ========================================= */

document.addEventListener('DOMContentLoaded', () => {

    // Hamburger toggle
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
                // Also close any open dropdown when closing the whole menu
                closeDropdown();
            }
        });
    }

    // More dropdown toggle
    const dropToggle = document.getElementById('more-toggle');
    const dropMenu   = document.getElementById('more-menu');

    function closeDropdown() {
        if (!dropMenu || !dropToggle) return;
        dropMenu.classList.remove('open');
        dropToggle.classList.remove('open');
        dropToggle.setAttribute('aria-expanded', 'false');
    }

    if (dropToggle && dropMenu) {
        dropToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = dropMenu.classList.toggle('open');
            dropToggle.classList.toggle('open', isOpen);
            dropToggle.setAttribute('aria-expanded', isOpen);
        });

        // Close dropdown on outside click
        document.addEventListener('click', closeDropdown);

        // Prevent inside clicks from closing dropdown
        dropMenu.addEventListener('click', (e) => e.stopPropagation());
    }

});
