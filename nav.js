document.addEventListener("DOMContentLoaded", function() {
    const navHTML = `
        <ul>
            <li><a href="index.html">Home</a></li>
            <li><a href="solutions.html">Solutions</a></li>
            <li><a href="trust.html">Trust & Math</a></li>
            <li><a href="architecture.html">Architecture</a></li>
            <li><a href="pricing.html">Pricing</a></li>
            <li><a href="partners.html">Partners</a></li>
            <li><a href="#contact">Contact</a></li>
        </ul>
    `;

    const navMenu = document.getElementById('nav-menu');
    if (navMenu) {
        navMenu.innerHTML = navHTML;
    }
});
