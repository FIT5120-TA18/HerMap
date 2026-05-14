// --- US 6.1: Read sessionStorage anf populate sidebar stats ---

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


// --- US 6.3 AC 1: Chart formulas and initalisation ---

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
    chartInstance: null
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
// $20 flat fee per month (2 * $10 fortnightly missed instalments)
function buildBNPLData (opening, months) {
    const result = []; 
    for (let m = 1; m <= months; m++) {
        result.push({
            base: opening,
            interest: 20 * m
        });
    }
    return result;
}

function buildLabels(totalMonths) {
    const labels = [];
    for (let m = 1; m <= totalMonths; m++) labels.push(`M${m}`);
    return labels;
}

function getStepSize(totalMonths) {
    if (totalMonths === 18) return 2;
    if (totalMonths === 24) return 3;
    return 1;
}

function initChart() {
    if (state.chartInstance) {
        state.chartInstance.destroy();
        state.chartInstance = null;
    }

    state.currentStep = 1;
    state.isComplete = false;
    const stepSize = getStepSize(state.totalMonths);
    state.stepSize = stepSize;
    state.totalSteps = state.totalMonths / stepSize;
    
    const allData = state.scenario === 'credit'
        ? buildCCData(state.opening, state.totalMonths)
        : buildBNPLData(state.opening, state.totalMonths);

    const isCC = state.scenario === 'credit';
    const baseColor = isCC ? 'rgba(232,84,106,0.35)' : 'rgba(155,114,207,0.35)';
    const topColor = isCC ? 'rgba(232,84,106,0.95)' : 'rgba(155,114,207,0.95)';    
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
                    label: isCC ? 'Interest accrued' : 'Late fees accrued',
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
                    max: Math.max(state.opening * 1.2, 250),
                    ticks: {
                        callback: v => '$' + v.toLocaleString(),
                        font: { size: 11 }
                    },
                    grid: { color: 'rgba(0,0,0,0.06)'}
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

    for (let i = 0; i < state.totalMonths; i++) {
        const monthIndex = Math.floor(i / state.stepSize);
        if (monthIndex < state.currentStep) {
            top[i] = allData[i].base;
            base[i] = allData[i].base + allData[i].interest;
        } else {
            top[i] = 0;
            base[i] = 0;
        }
    }
    state.chartInstance.update();
}

function updateSidebar(stepIndex) {
    const allData = state.chartInstance.data._allData;
    const monthIndex = Math.min(stepIndex * state.stepSize, state.totalMonths - 1);
    const month = allData[monthIndex];
    if (!month) return;
    const total = month.base + month.interest;
    document.getElementById('statCurrentTotal').textContent = `$${total.toLocaleString()}`;
}

// Boot the chart on page load
initChart();

console.log('US 6.3 AC 1 loaded: Chart Initailised', { 
    scenario: state.scenario, 
    opening: state.opening, 
    totalMonths: state.totalMonths 
});