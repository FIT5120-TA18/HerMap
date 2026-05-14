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
