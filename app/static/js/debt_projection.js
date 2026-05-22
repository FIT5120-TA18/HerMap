// --- US 6.1: Read sessionStorage and populate sidebar stats ---

const awareness = JSON.parse(sessionStorage.getItem('debtAwareness') || '{}');

// Credit type from debt awareness quiz
const creditType = awareness.creditType || 'credit';
const typeLabels = {
    credit: 'Credit Card',
    bnpl: 'BNPL',
    both: 'Credit Card & BNPL',
    considering: 'Considering Credit or BNPL'
};

// Populate sidebar stat
document.getElementById('statCreditType').textContent = typeLabels[creditType] || creditType;

// Log to console for debugging
console.log('US 6.1 loaded:', { creditType });


// --- US 6.3 ---

const CC_RATE = 0.20 / 12;
const DEFAULT_OPENING = 150;
const DEFAULT_MONTHS = 12;

// State object - holds all dynamic values related to the chart and projection
let state = {
    scenario: awareness.creditType === 'bnpl' ? 'bnpl' : 'credit',
    opening: DEFAULT_OPENING,
    totalMonths: DEFAULT_MONTHS,
    currentStep: 0,
    totalSteps: DEFAULT_MONTHS,
    stepSize: 1,
    isComplete: false,
    chartInstance: null,
};

// Build monthly data for credit card scenario
// 20% p.a. compound interest on running balance
function buildCCData(opening, months) {
    const result = [];
    let balance = opening;
    for (let m = 1; m <= months; m++) {
        balance = balance * (1 + CC_RATE) + 0;
        result.push({
            base: opening,
            interest: Math.max(0, Math.round(balance - opening))
        });
    }
    return result;
}

// Build monthly data for BNPL scenario
const BNPL_MONTHLY_FEE = 17; // $10 + $7 two-tier Afterpay late fee structure

function buildBNPLData (opening, months) {
    const result = []; 
    let totalFees = 0;
    for (let m = 1; m <= months; m++) {
        totalFees += BNPL_MONTHLY_FEE;
        result.push({
            base: opening, // locked - never changes
            interest: totalFees // accumulates additively, no compounding
        });
    }
    return result;
}

// Build labels M1, M2, ... dynamically based on total months to ensure flexibility
function buildLabels(totalMonths) {
    const labels = [];
    for (let m = 1; m <= totalMonths; m++) labels.push(`M${m}`);
    return labels;
}

function roundUpTo25 (value) {
    return Math.ceil(value / 25) * 25;
}

function getStepSizeForMax (max) {
    if (max <= 100) return 10;
    if (max <= 250) return 25;
    if (max <= 500) return 50;
    if (max <= 1000) return 100;
    if (max <= 2500) return 250;
    if (max <= 7500) return 1000;
    return 2000;
}

function initChart() {
    document.getElementById('keyMessage').style.display = 'block';

    if (state.chartInstance) {
        state.chartInstance.destroy();
        state.chartInstance = null;
    }

    state.currentStep = 1;
    state.isComplete = false;
    state.stepSize = 1;
    state.totalSteps = state.totalMonths;
    
    const allData = state.scenario === 'credit'
        ? buildCCData(state.opening, state.totalMonths)
        : buildBNPLData(state.opening, state.totalMonths);

    const m1Total = allData[0].base + allData[0].interest;
    const initialMax = roundUpTo25(m1Total);
    const initialStepSize = getStepSizeForMax(initialMax);
    
    const isCC = state.scenario === 'credit';
    const baseColor = 'rgba(155,114,207,0.95)';
    const topColor = 'rgba(232,84,106,0.95)';    
    const labels = buildLabels(state.totalMonths);
    
    // Start will all values at 0 to let the user control the reveal and fill the data
    const baseValues = new Array(state.totalMonths).fill(0);
    const interestValues = new Array(state.totalMonths).fill(0);

    const ctx = document.getElementById('debtChart').getContext('2d');

    state.chartInstance = new Chart(ctx, {
        type: 'polarArea',
        data: {
            labels,
            datasets: [
                {
                    label: 'Original Amount Owed',
                    data: baseValues,
                    backgroundColor: baseColor,
                    borderColor: 'white',
                    borderWidth: 1.5,
                },
                {
                    label: isCC ? 'Interest Accrued' : 'Late fees accrued',
                    data: interestValues,
                    backgroundColor: topColor,
                    borderColor: 'white',
                    borderWidth: 1.5,
                }
            ],
            // Store full dataset for reveal to reference
            _allData: allData
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration:500, 
                easing: 'easeOutQuart'
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label(ctx) {
                            const month = allData[ctx.dataIndex];
                            if (!month) return '';
                            if (ctx.datasetIndex === 0) {
                                return `Original amount owed: $${month.base.toLocaleString()}`;
                            }
                            const total = month.base + month.interest;
                            return `Total now owed: $${total.toLocaleString()} ($${month.interest.toLocaleString()} accrued)`;
                        }
                    }
                }
            },
            scales: {
                r: {
                    beginAtZero: true,
                    max: initialMax,
                    z: 1,
                    ticks: {
                        callback: v => '$' + v.toLocaleString(),
                        font: { size: 11 },
                        stepSize: initialStepSize,
                        z: 1,
                        backdropColor: 'rgba(255,255,255,0.75)',
                        backdropPadding: 1,
                    },
                    grid: { 
                        color: 'rgba(0,0,0,0.06)',
                        z: 1
                    }
                }
            }
        }
    });

    // Reveal Month 1 so that the chart is not empty
    applyReveal();
    updateSidebar(1);
}

function applyReveal() {
    const allData = state.chartInstance.data._allData;
    const top = state.chartInstance.data.datasets[0].data; // inner -> original amount
    const base = state.chartInstance.data.datasets[1].data; // outer -> original + interest/fees amount

    let highestRevealed = 0;

    for (let i = 0; i < state.totalMonths; i++) {
        if (i < state.currentStep) {
            top[i] = allData[i].base;
            base[i] = allData[i].base + allData[i].interest;
            highestRevealed = Math.max(highestRevealed, base[i]);
        } else {
            top[i] = 0;
            base[i] = 0;
        }
    }

    const newMax = roundUpTo25(highestRevealed);
    const newStepSize = getStepSizeForMax(newMax);

    state.chartInstance.options.scales.r.max = newMax;
    state.chartInstance.options.scales.r.ticks.stepSize = newStepSize;
    state.chartInstance.update();
}

function updateSidebar(stepIndex) {
    const allData = state.chartInstance.data._allData;
    const monthIndex = Math.min(stepIndex * state.stepSize, state.totalMonths - 1);
    const month = allData[monthIndex];
    if (!month) return;
    const total = month.base + month.interest;
    document.getElementById('statCurrentTotal').textContent = `$${total.toLocaleString()}`;
    document.getElementById('statOriginalAmount').textContent = `$${month.base.toLocaleString()}`;
    document.getElementById('statChargesAccrued').textContent = `$${month.interest.toLocaleString()}`;
}

// Boot the chart on page load
initChart();


// --- US 6.3 AC 2: Reveal Controls ---

function revealNext() {
    if (state.isComplete) return;
    state.currentStep++;
    applyReveal();
    updateSidebar(state.currentStep);
    if (state.currentStep >= state.totalSteps) {
        state.isComplete = true;
        onRevealComplete();
    }
    updateRevealUI();
}

function skipToEnd() {
    if (state.isComplete) return;

    const btn = document.getElementById('revealNextBtn');
    const skip = document.getElementById('skipToEndBtn');
    if (btn) btn.disabled = true;
    if (skip) skip.disabled = true;

    function revealStep() {
        if (state.currentStep >= state.totalSteps) {
            state.isComplete = true;
            onRevealComplete();
            updateRevealUI();
            return;
        }
        state.currentStep++;
        applyReveal();
        updateSidebar(state.currentStep);
        setTimeout(revealStep, 350);
    }
    revealStep();
}

function onRevealComplete() {
    document.getElementById('ctaBox').style.display = 'block';
}

function updateRevealUI() {
    const btn = document.getElementById('revealNextBtn');
    const skip = document.getElementById('skipToEndBtn');
    if (!btn || !skip) return;

    btn.disabled = state.isComplete;
    skip.disabled = state.isComplete;
    btn.textContent = state.isComplete ? 'All Months Revealed' : `Reveal Month ${Math.min(state.currentStep + 1, state.totalMonths)}`;
}

function buildLegend() {
    const legend = document.getElementById('chartLegend');
    if (!legend) return;
    const isCC = state.scenario === 'credit';
    const baseHex = 'rgba(155,114,207,0.95)';
    const topHex = 'rgba(232,84,106,0.95)';
    const feeLabel = isCC ? 'Interest Accrued' : 'Late Fees Accrued';

    legend.innerHTML = `
        <span class="legend-item">
            <span class="legend-swatch" style="background:${baseHex};"></span>
            Original Amount Owed
        </span>
        <span class="legend-item">
            <span class="legend-swatch" style="background:${topHex};"></span>
            ${feeLabel}
        </span>
    `;
}


function updateSourceNote() {
    const ccNote = document.getElementById('sourceNoteCC');
    const bnplNote = document.getElementById('sourceNoteBNPL');
    if (!ccNote || !bnplNote) return;

    if (state.scenario === 'credit') {
        ccNote.style.display = 'block';
        bnplNote.style.display = 'none';
    } else {
        ccNote.style.display = 'none';
        bnplNote.style.display = 'block';
    }
}

// Log to console for debugging
console.log('US 6.3 loaded:', { state });

document.getElementById('btnCredit').classList.toggle('active', state.scenario === 'credit');
document.getElementById('btnBNPL').classList.toggle('active', state.scenario === 'bnpl');

// --- US 6.6: Scenario toggle ---
function setScenario(scenario) {
    if (state.scenario === scenario) return;

    // Update state
    state.scenario = scenario;

    document.getElementById('statCreditType').textContent = scenario === 'credit' ? 'Credit Card' : 'BNPL';

    // Update toggle button active state
    document.getElementById('btnCredit').classList.toggle('active', scenario === 'credit');
    document.getElementById('btnBNPL').classList.toggle('active', scenario === 'bnpl');

    // Rebuild chart with new scenario
    initChart();
    buildLegend();
    updateRevealUI();
    updateSourceNote();
    updateBalanceLabel();

    // Log to console for debugging
    console.log('US 6.6 Scenario changed to:', { scenario });
}

// --- US 6.4: DCustomise Projection ---

const DURATION_OPTIONS = [12, 18, 24];

function onSliderChange(index) {
    const months = DURATION_OPTIONS[parseInt(index)];
    document.getElementById('durationDisplay').textContent = `${months} months`;
}

function updateBalanceLabel () {
    const label = document.getElementById('balanceLabel');
    if (!label) return;
    label.textContent = state.scenario === 'bnpl' 
        ? 'Monthly amount you cover with BNPL ($)'
        : 'Current debt balance ($)';
}

function clearBalanceError() {
    const input = document.getElementById('openingBalanceInput');
    const errorEl = document.getElementById('balanceError');
    input.classList.remove('input-error');
    errorEl.style.display = 'none';
    errorEl.textContent = '';
}

function applyCustomisation() {
    // Read projection length
    const sliderIndex = parseInt(document.getElementById('durationSlider').value);
    const newMonths = DURATION_OPTIONS[sliderIndex];

    // Read and validate opening balance
    const input = document.getElementById('openingBalanceInput');
    const errorEl = document.getElementById('balanceError');
    const raw = input.value.trim();

    // Clear previous error
    errorEl.style.display = 'none';
    errorEl.textContent = '';
    input.classList.remove('input-error');

    if (raw !== '') {
        const val = Number(raw);

        if (isNaN(val) || val <= 0) {
            errorEl.textContent = 'Please enter a valid debt amount.';
            errorEl.style.display = 'block';
            input.classList.add('input-error');
            return
        }

        if (val > 10000) { 
            errorEl.textContent = 'We can only project up to $10,000. For larger amounts, please speak to a financial counsellor.';
            errorEl.style.display = 'block';
            input.classList.add('input-error');
            return
        }

        state.opening = val;
    } else {
        // Empty input use default
        state.opening = DEFAULT_OPENING;
    }

    // Apply new projection length
    state.totalMonths = newMonths;

    // Rebuild everything
    initChart();
    buildLegend();
    updateRevealUI();
    updateSourceNote();

    // Log to console for debugging
    console.log('US 6.4 Chart Updated', { totalMonths: state.totalMonths, opening: state.opening });
}

// Boot legend and reveal UI
buildLegend();
updateRevealUI();
updateSourceNote();
updateBalanceLabel();
document.getElementById('btnCredit').classList.toggle('active', state.scenario === 'credit');
document.getElementById('btnBNPL').classList.toggle('active', state.scenario === 'bnpl');

const TUTORIAL_STEPS = [
    {
        targetId: 'scenarioToggle',
        title: 'Choose your credit type',
        desc: 'Switch between Credit Card and BNPL to see how each one grows debt differently over time.'
    },
    {
        targetId: 'debtChart',
        title: 'Your debt projection',
        desc: 'This chart shows how your debt grows each month. each wedge is one month - watch it expand as you reveal more.'
    },
    {
        targetId: 'revealNextBtn',
        title: 'Reveal month by month',
        desc: 'Tap Reveal to uncover each month one at a time and watch the debt grow. You can also reveal all months by click on "Skip to end".'
    },
    {
        targetId: 'customCard',
        title: 'Make it your own',
        desc: 'Enter your actual balance and choose how far ahead you want to project - 12, 18, or 24 months.'
    },
    {
        targetId: 'yourNumbersCard',
        title: 'Track your numbers',
        desc: 'This panel updates as you reveal months so you can always see the real dollar impact.'
    }
]

document.getElementById('absDataBtn').addEventListener('click', () => {
    document.getElementById('absModal').classList.remove('hidden');
});
document.getElementById('absModalClose').addEventListener('click', () => {
    document.getElementById('absModal').classList.add('hidden');
});
document.getElementById('tosModalTrigger').addEventListener('click', () => {
    document.getElementById('tosModal').classList.remove('hidden');
});
document.getElementById('tosModalClose').addEventListener('click', () => {
    document.getElementById('tosModal').classList.add('hidden');
});

['absModal', 'tosModal'].forEach(id => {
    document.getElementById(id).addEventListener('click', (e) => {
        if (e.target === e.currentTarget) {
            e.currentTarget.classList.add('hidden');
        }
    });
});