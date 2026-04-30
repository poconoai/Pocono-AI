// ── DYNAMIC ROI ENGINE ──
function initROICalculator() {
    const inpProviders = $('inp-providers');
    const inpSq = $('inp-sq');
    const inpHours = $('inp-hours');
    const inpRate = $('inp-rate');

    if (!inpProviders) return; // Prevent firing if elements aren't loaded

    function formatCurrency(num) {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(num);
    }

    function calculateROI() {
        const providers = parseInt(inpProviders.value) || 1;
        const sqMonthly = parseInt(inpSq.value) || 0;
        const hours = parseFloat(inpHours.value) || 0;
        const rate = parseInt(inpRate.value) || 0;

        // Update Slider Labels
        $('val-providers').textContent = providers;
        $('val-sq').textContent = formatCurrency(sqMonthly);
        $('val-hours').textContent = hours.toFixed(1);
        $('val-rate').textContent = formatCurrency(rate);

        // Constants from Pocono AI strategy
        const months = 36;
        const capexUpfront = 17999;
        const capexMaintenance = 150;
        const haasMonthly = 950;
        const daysPerMonth = 20;

        // The Math
        const costSq = sqMonthly * providers * months;
        const costCapex = (capexUpfront * providers) + (capexMaintenance * providers * months);
        const costHaas = haasMonthly * providers * months;
        const timeValue = hours * rate * daysPerMonth * providers * months;

        // Render to DOM
        $('out-sq').textContent = formatCurrency(costSq);
        $('out-capex').textContent = formatCurrency(costCapex);
        $('out-haas').textContent = formatCurrency(costHaas);
        $('out-time-val').textContent = formatCurrency(timeValue);
    }

    // Attach Event Listeners
    [inpProviders, inpSq, inpHours, inpRate].forEach(inp => {
        inp.addEventListener('input', calculateROI);
    });

    // Initial load
    calculateROI();
}

// Call the function to boot it up
initROICalculator();