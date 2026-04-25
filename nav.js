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

    // Research dropdown toggle
    const resToggle  = document.getElementById('research-toggle');
    const resMenu    = document.getElementById('research-menu');

    function closeAllDropdowns() {
        if (dropMenu && dropToggle) {
            dropMenu.classList.remove('open');
            dropToggle.classList.remove('open');
            dropToggle.setAttribute('aria-expanded', 'false');
        }
        if (resMenu && resToggle) {
            resMenu.classList.remove('open');
            resToggle.classList.remove('open');
            resToggle.setAttribute('aria-expanded', 'false');
        }
    }

    // Legacy alias for closeDropdown calls elsewhere
    function closeDropdown() { closeAllDropdowns(); }

    if (dropToggle && dropMenu) {
        dropToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            const opening = !dropMenu.classList.contains('open');
            closeAllDropdowns();
            if (opening) {
                dropMenu.classList.add('open');
                dropToggle.classList.add('open');
                dropToggle.setAttribute('aria-expanded', 'true');
            }
        });
        dropMenu.addEventListener('click', (e) => e.stopPropagation());
    }

    if (resToggle && resMenu) {
        resToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            const opening = !resMenu.classList.contains('open');
            closeAllDropdowns();
            if (opening) {
                resMenu.classList.add('open');
                resToggle.classList.add('open');
                resToggle.setAttribute('aria-expanded', 'true');
            }
        });
        resMenu.addEventListener('click', (e) => e.stopPropagation());
    }

    // Close all dropdowns on outside click
    document.addEventListener('click', closeAllDropdowns);

});
