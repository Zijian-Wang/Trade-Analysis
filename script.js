const riskSlider = document.getElementById('riskSlider');
const riskInput = document.getElementById('riskInput');
const portfolioInput = document.getElementById('portfolio');
const entryInput = document.getElementById('entry');
const stopLossInput = document.getElementById('stopLoss');
const takeProfitInput = document.getElementById('takeProfit');
const symbolInput = document.getElementById('symbol');

const directionInputs = document.querySelectorAll('input[name="direction"]');
const sentimentSelect = document.getElementById('sentiment');

const portfolioDisplay = document.getElementById('portfolioDisplay');

const resultPosition = document.getElementById('positionSize');
const resultPositionVal = document.getElementById('positionValue');
const resultRisk = document.getElementById('riskAmount');
const resultEntryRisk = document.getElementById('entryRisk');
const resultRR = document.getElementById('rrRatio');
const toast = document.getElementById('toast');

const addTradeBtn = document.getElementById('addTradeBtn');
const exportBtn = document.getElementById('exportBtn');
const copyJsonBtn = document.getElementById('copyJsonBtn');
const tradeTableBody = document.querySelector('#tradeTable tbody');

// CSS Variables for Colors
const COLOR_LONG = '#22c55e';
const COLOR_SHORT = '#d946ef';

let trades = [];

// Event Listeners
const inputs = [riskSlider, riskInput, portfolioInput, entryInput, stopLossInput, takeProfitInput, symbolInput];
inputs.forEach(input => input.addEventListener('input', calculateResults));
sentimentSelect.addEventListener('change', calculateResults);
directionInputs.forEach(input => input.addEventListener('change', handleDirectionChange));

// Copy Listeners
[resultPosition, resultPositionVal].forEach(el => {
    el.addEventListener('click', (e) => {
        if (e.target.textContent !== '---') {
            navigator.clipboard.writeText(e.target.textContent).then(() => showToast("Copied to Clipboard!"));
        }
    });
});

// Force Uppercase Symbol
symbolInput.addEventListener('input', (e) => {
    e.target.value = e.target.value.toUpperCase();
});

// Sync Slider and Number Input
riskSlider.addEventListener('input', (e) => {
    riskInput.value = e.target.value;
    calculateResults();
});

riskInput.addEventListener('input', (e) => {
    let val = parseFloat(e.target.value);
    if (val >= 0.5 && val <= 2.0) {
        riskSlider.value = val;
    }
    calculateResults();
});

function updatePortfolioDisplay() {
    const val = parseFloat(portfolioInput.value);
    if (!isNaN(val)) {
        portfolioDisplay.textContent = val.toLocaleString();
    } else {
        portfolioDisplay.textContent = '';
    }
}

portfolioInput.addEventListener('input', updatePortfolioDisplay);

function handleDirectionChange() {
    const direction = document.querySelector('input[name="direction"]:checked').value;
    const root = document.documentElement;

    const breakoutOption = sentimentSelect.querySelector('option[value="Break Out"]') || sentimentSelect.querySelector('option[value="Break Down"]');

    if (direction === 'Short') {
        if (breakoutOption) {
            breakoutOption.value = "Break Down";
            breakoutOption.textContent = "BREAK DOWN";
        }
        root.style.setProperty('--active-color', COLOR_SHORT);
    } else {
        if (breakoutOption) {
            breakoutOption.value = "Break Out";
            breakoutOption.textContent = "BREAKOUT";
        }
        root.style.setProperty('--active-color', COLOR_LONG);
    }
    calculateResults();
}

// Initial Sync
handleDirectionChange();
updatePortfolioDisplay();
updateHistoryButtons();

function formatMoney(num) {
    return num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function formatPrice(num) {
    return parseFloat(num.toFixed(2)).toString();
}

function showToast(msg) {
    toast.textContent = msg;
    toast.classList.remove('hidden');
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 2000);
}

function validateInputs(direction, entry, stopLoss, takeProfit, symbol) {
    let valid = true;
    entryInput.classList.remove('error');
    stopLossInput.classList.remove('error');
    takeProfitInput.classList.remove('error');
    symbolInput.classList.remove('error');

    // Mandatory Field Check (Symbol)
    if (!symbol || symbol.trim() === '') {
        // Only mark error if fields are touched or we want aggressive validation. 
        // For smoother UX, maybe we don't red-border immediately, but we definitely RETURN false.
        // Let's marking it valid=false is enough to disable button.
        valid = false;
    }

    if (entry > 0 && stopLoss > 0) {
        if (direction === 'Long') {
            if (stopLoss >= entry) {
                stopLossInput.classList.add('error');
                valid = false;
            }
            if (takeProfit > 0 && takeProfit <= entry) {
                takeProfitInput.classList.add('error');
                valid = false;
            }
        } else {
            if (stopLoss <= entry) {
                stopLossInput.classList.add('error');
                valid = false;
            }
            if (takeProfit > 0 && takeProfit >= entry) {
                takeProfitInput.classList.add('error');
                valid = false;
            }
        }
    } else {
        // Basic Check: If inputs are present but 0 or negative
        valid = false;
    }
    return valid;
}

function updateResult(element, value, isValid, validColorClass = 'text-white') {
    if (isValid) {
        element.textContent = value;
        element.classList.remove('text-slate-700', 'opacity-30'); // dim styles
        element.classList.add(validColorClass);
    } else {
        element.textContent = "N/A";
        element.classList.remove(validColorClass);
        element.classList.add('text-slate-700'); // Dim color
    }
}

function calculateResults() {
    const portfolio = parseFloat(portfolioInput.value) || 0;
    const entry = parseFloat(entryInput.value) || 0;
    const stopLoss = parseFloat(stopLossInput.value) || 0;
    const takeProfit = parseFloat(takeProfitInput.value) || 0;
    const riskPercent = parseFloat(riskInput.value) || 0;
    const direction = document.querySelector('input[name="direction"]:checked').value;
    const symbol = symbolInput.value;

    const inputsValid = validateInputs(direction, entry, stopLoss, takeProfit, symbol);

    if (!inputsValid) {
        addTradeBtn.disabled = true;
        updateResult(resultRisk, "N/A", false, 'text-white');
        updateResult(resultPosition, "N/A", false, 'text-white');
        // positionValue has no specific color class in HTML?
        // In HTML: <span id="positionValue" class="font-mono text-sm font-semibold cursor-pointer" ...>
        // Parent has text-emerald-400.
        // If I text-slate-700 the span, it overrides? Yes.
        resultPositionVal.textContent = "N/A";
        resultPositionVal.classList.add('text-slate-700');

        updateResult(resultRR, "N/A", false, 'text-accent-success');
        // actually HTML has it inside a span with text-accent-danger/success is for Target/Stop label. 
        // The Entry Risk in Results (right col) is removed?
        // No, resultEntryRisk is used in Stop Loss risk calc label: <span id="entryRisk">---</span>. 
        // Parent: text-accent-danger. 
        updateResult(resultEntryRisk, "N/A", false, 'text-inherit');
        return { valid: false };
    }

    if (entry > 0 && stopLoss > 0 && portfolio > 0 && symbol) {
        addTradeBtn.disabled = false;

        const riskAmount = portfolio * (riskPercent / 100);
        const priceDiff = Math.abs(entry - stopLoss);

        let positionSize = 0;
        let positionValue = 0;
        let entryRiskPercent = 0;

        // Entry Risk Calculation: ABS(Stop - Entry) / Entry
        entryRiskPercent = (priceDiff / entry) * 100;

        if (priceDiff > 0) {
            positionValue = riskAmount / (entryRiskPercent / 100);
            positionSize = Math.floor(positionValue / entry);
        }

        let rr = 0;
        if (takeProfit > 0) {
            let potentialProfit = Math.abs(takeProfit - entry);
            if (priceDiff > 0) rr = potentialProfit / priceDiff;
        }

        updateResult(resultRisk, `$${formatMoney(riskAmount)}`, true, 'text-white');
        updateResult(resultPosition, positionSize.toLocaleString(), true, 'text-white');

        // Ensure positionValue uses inherited color or specific
        // It's in a Emerald pill. We just want text content. But 'N/A' should be dim.
        // Valid case: remove dim. inherit emerald.
        resultPositionVal.textContent = `$${formatMoney(positionValue)}`;
        resultPositionVal.classList.remove('text-slate-700');

        updateResult(resultRR, takeProfit > 0 && rr > 0 ? `${rr.toFixed(2)}R` : "N/A", takeProfit > 0 && rr > 0, 'text-accent-success');

        // Entry Risk
        // It is merely text content inside <span id="entryRisk">
        // Parent has text-accent-danger.
        // N/A should be dim? 
        updateResult(resultEntryRisk, `${entryRiskPercent.toFixed(2)}%`, true, 'text-inherit');
        // actually for Entry Risk, if valid, we want it to inherit from parent (danger). 
        // If N/A, we want dim.

        return {
            valid: true,
            positionSize,
            positionValue,
            riskAmount,
            rr,
            entryRiskPercent,
            portfolio,
            entry,
            stopLoss,
            takeProfit,
            riskPercent,
            direction
        };
    } else {
        addTradeBtn.disabled = true;
        updateResult(resultRisk, "N/A", false, 'text-white');
        updateResult(resultPosition, "N/A", false, 'text-white');

        resultPositionVal.textContent = "N/A";
        resultPositionVal.classList.add('text-slate-700');

        updateResult(resultRR, "N/A", false, 'text-accent-success');
        updateResult(resultEntryRisk, "N/A", false, 'text-inherit');
        return { valid: false };
    }
}

function updateHistoryButtons() {
    const hasTrades = trades.length > 0;
    exportBtn.disabled = !hasTrades;
    copyJsonBtn.disabled = !hasTrades;
}

addTradeBtn.addEventListener('click', () => {
    const calc = calculateResults();
    const symbol = symbolInput.value.toUpperCase();

    if (!calc.valid) return;

    // Final check implies calc.valid is enough, but double check symbol just in case
    if (!symbol) return;

    const sentiment = sentimentSelect.value;

    const trade = {
        id: Date.now(),
        date: new Date().toLocaleDateString(),
        symbol: symbol,
        direction: calc.direction,
        sentiment: sentiment,
        entry: calc.entry,
        stopLoss: calc.stopLoss,
        takeProfit: calc.takeProfit || null,
        riskPercent: calc.riskPercent,
        positionSize: calc.positionSize,
        positionValue: calc.positionValue,
        riskAmount: calc.riskAmount,
        entryRisk: calc.entryRiskPercent.toFixed(2),
        rr: calc.rr > 0 ? calc.rr.toFixed(2) : 'N/A'
    };

    trades.push(trade);
    renderTable();
    updateHistoryButtons();

    // Optional: Clear symbol to encourage next trade? Or keep settings?
    // User didn't specify, keeping fields populated is usually better for rapid analysis.
});

function renderTable() {
    tradeTableBody.innerHTML = '';
    trades.slice().reverse().forEach(trade => {
        const row = document.createElement('tr');

        const fmtEntry = formatPrice(trade.entry);
        const fmtStop = formatPrice(trade.stopLoss);
        const fmtTarget = trade.takeProfit ? formatPrice(trade.takeProfit) : '-';
        const fmtRisk = formatMoney(trade.riskAmount);

        row.innerHTML = `
            <td>${trade.date}</td>
            <td><strong>${trade.symbol}</strong></td>
            <td>${trade.direction}</td>
            <td>${trade.sentiment}</td>
            <td>${fmtEntry}</td>
            <td>${fmtStop}</td>
            <td>${fmtTarget}</td>
            <td>${trade.riskPercent}%</td>
            <td>${trade.entryRisk}%</td>
            <td>${trade.positionSize.toLocaleString()}</td>
            <td>$${fmtRisk}</td>
            <td>${trade.rr}</td>
        `;
        tradeTableBody.appendChild(row);
    });
}

function getJsonString() {
    return JSON.stringify(trades, null, 2);
}

copyJsonBtn.addEventListener('click', () => {
    if (trades.length === 0) return;
    navigator.clipboard.writeText(getJsonString()).then(() => showToast("JSON Copied!"));
});

exportBtn.addEventListener('click', () => {
    if (trades.length === 0) return;

    const dataStr = getJsonString();
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `trade_history_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});
