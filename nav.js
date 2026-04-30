// ── DYNAMIC ROI ENGINE (Bulletproof) ──
function initROICalculator() {
    try {
        const inpProviders = $('inp-providers');
        const inpSq = $('inp-sq');
        const inpHours = $('inp-hours');
        const inpRate = $('inp-rate');

        // SAFETY GATE: If any input is missing from the HTML, silently abort 
        // to protect the rest of the simulation page (scenario buttons, etc.)
        if (!inpProviders || !inpSq || !inpHours || !inpRate) {
            console.warn("ROI Calculator elements missing. Skipping ROI initialization.");
            return; 
        }

        function formatCurrency(num) {
            return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(num);
        }

        function calculateROI() {
            const providers = parseInt(inpProviders.value) || 1;
            const sqMonthly = parseInt(inpSq.value) || 0;
            const hours = parseFloat(inpHours.value) || 0;
            const rate = parseInt(inpRate.value) || 0;

            // Update Slider Labels safely
            if ($('val-providers')) $('val-providers').textContent = providers;
            if ($('val-sq')) $('val-sq').textContent = formatCurrency(sqMonthly);
            if ($('val-hours')) $('val-hours').textContent = hours.toFixed(1);
            if ($('val-rate')) $('val-rate').textContent = formatCurrency(rate);

            // Pocono AI Constants
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

            // Render to DOM safely
            if ($('out-sq')) $('out-sq').textContent = formatCurrency(costSq);
            if ($('out-capex')) $('out-capex').textContent = formatCurrency(costCapex);
            if ($('out-haas')) $('out-haas').textContent = formatCurrency(costHaas);
            if ($('out-time-val')) $('out-time-val').textContent = formatCurrency(timeValue);
        }

        // Attach Event Listeners
        [inpProviders, inpSq, inpHours, inpRate].forEach(inp => {
            inp.addEventListener('input', calculateROI);
        });

        // Initial load calculation
        calculateROI();
        
    } catch (error) {
        // If anything catastrophic happens, log it but don't break the page
        console.error("ROI Engine failed to load, but page execution will continue.", error);
    }
}

// Boot up the calculator
initROICalculator();