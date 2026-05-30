// ─────────────────────────────────────────────────────────────
//  BUDGET VISION — App Logic
//  Live chart, category tracking, smart insights, 50-30-20 rule
// ─────────────────────────────────────────────────────────────

// ── Categories ────────────────────────────────────────────────
const CATEGORIES = [
  { id: 'housing',       label: 'Rent / Housing',   emoji: '🏠', color: '#4D7FFF', type: 'need'  },
  { id: 'food',          label: 'Food & Groceries',  emoji: '🛒', color: '#10D97E', type: 'need'  },
  { id: 'transport',     label: 'Transport',          emoji: '🚗', color: '#F0B429', type: 'need'  },
  { id: 'health',        label: 'Health & Medical',   emoji: '💊', color: '#00D4FF', type: 'need'  },
  { id: 'entertainment', label: 'Entertainment',      emoji: '🎬', color: '#FF5757', type: 'want'  },
  { id: 'shopping',      label: 'Shopping',           emoji: '🛍️', color: '#B57BFF', type: 'want'  },
  { id: 'education',     label: 'Education',          emoji: '📚', color: '#FF8A3D', type: 'need'  },
  { id: 'other',         label: 'Other Expenses',     emoji: '📦', color: '#7A82A8', type: 'want'  },
];

// ── State ─────────────────────────────────────────────────────
let income   = 0;
let expenses = {};
let chart    = null;

CATEGORIES.forEach(c => { expenses[c.id] = 0; });

// ── Format Indian Rupee ───────────────────────────────────────
function fmt(amount) {
  if (amount >= 100000) return '₹' + (amount / 100000).toFixed(1) + 'L';
  if (amount >= 1000)   return '₹' + (amount / 1000).toFixed(1) + 'K';
  return '₹' + Math.round(amount).toLocaleString('en-IN');
}

function fmtFull(amount) {
  return '₹' + Math.round(amount).toLocaleString('en-IN');
}

// ── Set month badge ───────────────────────────────────────────
document.getElementById('month-badge').textContent =
  new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

// ── Build Category Rows ───────────────────────────────────────
function buildCategories() {
  const grid = document.getElementById('categories-grid');
  grid.innerHTML = CATEGORIES.map(cat => `
    <div class="cat-row" id="row-${cat.id}">
      <div class="cat-emoji">${cat.emoji}</div>
      <div class="cat-info">
        <div class="cat-label">${cat.label}</div>
        <div class="cat-bar-wrap">
          <div class="cat-bar-bg">
            <div class="cat-bar-fill" id="bar-${cat.id}" style="background:${cat.color}"></div>
          </div>
          <div class="cat-pct" id="pct-${cat.id}">0%</div>
        </div>
      </div>
      <div class="cat-input-wrap">
        <span class="cat-currency">₹</span>
        <input
          type="number"
          class="cat-input"
          id="input-${cat.id}"
          placeholder="0"
          min="0"
          data-id="${cat.id}"
        />
      </div>
    </div>
  `).join('');

  // Add listeners
  CATEGORIES.forEach(cat => {
    document.getElementById(`input-${cat.id}`).addEventListener('input', e => {
      expenses[cat.id] = parseFloat(e.target.value) || 0;
      update();
    });
  });
}

// ── Init Chart ────────────────────────────────────────────────
function initChart() {
  const ctx = document.getElementById('donut-chart').getContext('2d');
  chart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: CATEGORIES.map(c => c.label),
      datasets: [{
        data: CATEGORIES.map(() => 1),
        backgroundColor: CATEGORIES.map(c => c.color + '33'),
        borderColor: CATEGORIES.map(c => c.color),
        borderWidth: 1.5,
        hoverOffset: 6,
      }]
    },
    options: {
      cutout: '72%',
      responsive: true,
      animation: { animateRotate: true, duration: 400 },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.label}: ${fmtFull(ctx.raw)}`
          },
          backgroundColor: '#10141E',
          borderColor: '#1C2236',
          borderWidth: 1,
          titleColor: '#E8ECFF',
          bodyColor: '#7A82A8',
          padding: 10,
        }
      }
    }
  });
}

// ── Update Chart ──────────────────────────────────────────────
function updateChart(total) {
  const vals = CATEGORIES.map(c => expenses[c.id] || 0);
  const hasData = vals.some(v => v > 0);

  if (!hasData) {
    chart.data.datasets[0].data = CATEGORIES.map(() => 1);
    chart.data.datasets[0].backgroundColor = CATEGORIES.map(c => c.color + '18');
    chart.data.datasets[0].borderColor = CATEGORIES.map(() => '#1C2236');
  } else {
    chart.data.datasets[0].data = vals;
    chart.data.datasets[0].backgroundColor = CATEGORIES.map(c => c.color + '99');
    chart.data.datasets[0].borderColor = CATEGORIES.map(c => c.color);
  }

  chart.update('active');

  // Center amount
  document.getElementById('chart-center-amount').textContent = fmt(total);
}

// ── Update Legend ─────────────────────────────────────────────
function updateLegend(total) {
  const legendEl = document.getElementById('chart-legend');
  legendEl.innerHTML = CATEGORIES
    .filter(c => expenses[c.id] > 0)
    .sort((a, b) => expenses[b.id] - expenses[a.id])
    .slice(0, 5)
    .map(c => {
      const pct = total > 0 ? ((expenses[c.id] / total) * 100).toFixed(0) : 0;
      return `
        <div class="legend-item">
          <div class="legend-dot" style="background:${c.color}"></div>
          <div class="legend-name">${c.label}</div>
          <div class="legend-pct">${pct}%</div>
        </div>`;
    }).join('');
}

// ── Update Progress Bars ──────────────────────────────────────
function updateBars() {
  CATEGORIES.forEach(cat => {
    const val  = expenses[cat.id] || 0;
    const pct  = income > 0 ? Math.min((val / income) * 100, 100) : 0;
    document.getElementById(`bar-${cat.id}`).style.width = pct + '%';
    document.getElementById(`pct-${cat.id}`).textContent = pct.toFixed(0) + '%';
  });
}

// ── Update Metric Cards ───────────────────────────────────────
function updateMetrics(total) {
  const remaining    = income - total;
  const savingsRate  = income > 0 ? (remaining / income) * 100 : 0;

  document.getElementById('m-income').textContent       = fmtFull(income);
  document.getElementById('m-spent').textContent        = fmtFull(total);
  document.getElementById('m-remaining').textContent    = fmtFull(Math.abs(remaining));
  document.getElementById('m-savings-rate').textContent = savingsRate.toFixed(0) + '%';

  // Color remaining
  const remEl = document.getElementById('m-remaining');
  remEl.className = 'metric-value ' + (remaining >= 0 ? 'positive' : 'negative');

  // Color savings
  const savEl = document.getElementById('m-savings-rate');
  if (savingsRate >= 20)       savEl.className = 'metric-value good';
  else if (savingsRate >= 10)  savEl.className = 'metric-value warn';
  else                         savEl.className = 'metric-value bad';
}

// ── Generate Insights ─────────────────────────────────────────
function generateInsights(total) {
  const insightsEl = document.getElementById('insights-list');

  if (income === 0) {
    insightsEl.innerHTML = `<div class="insight-placeholder">Add your income and expenses above to get personalized insights.</div>`;
    return;
  }

  const insights   = [];
  const remaining  = income - total;
  const savingsRate = income > 0 ? (remaining / income) * 100 : 0;
  const housingPct  = income > 0 ? (expenses.housing / income) * 100 : 0;
  const foodPct     = income > 0 ? (expenses.food / income) * 100 : 0;
  const entPct      = income > 0 ? (expenses.entertainment / income) * 100 : 0;
  const shopPct     = income > 0 ? (expenses.shopping / income) * 100 : 0;

  // Overspending
  if (remaining < 0) {
    insights.push({ type: 'danger', icon: '🚨', text: `You're overspending by ${fmtFull(Math.abs(remaining))} this month! Review your expenses immediately.` });
  }

  // Savings rate
  if (savingsRate >= 30) {
    insights.push({ type: 'success', icon: '🌟', text: `Excellent! You're saving ${savingsRate.toFixed(0)}% of your income. You're well ahead of the 20% goal.` });
  } else if (savingsRate >= 20) {
    insights.push({ type: 'success', icon: '✅', text: `Great work! You're saving ${savingsRate.toFixed(0)}% of your income — right on target with the 20% rule.` });
  } else if (savingsRate >= 10 && remaining >= 0) {
    insights.push({ type: 'warning', icon: '💡', text: `You're saving ${savingsRate.toFixed(0)}% of your income. Try to push this to at least 20% (${fmtFull(income * 0.20)} per month).` });
  } else if (remaining >= 0) {
    insights.push({ type: 'danger', icon: '⚠️', text: `Only ${savingsRate.toFixed(0)}% savings rate. Aim for at least 20% — that's ${fmtFull(income * 0.20)} per month.` });
  }

  // Housing
  if (housingPct > 40) {
    insights.push({ type: 'warning', icon: '🏠', text: `Rent takes ${housingPct.toFixed(0)}% of your income. Experts recommend keeping housing under 30% (${fmtFull(income * 0.30)}).` });
  } else if (housingPct > 0 && housingPct <= 30) {
    insights.push({ type: 'success', icon: '🏠', text: `Good job! Housing is ${housingPct.toFixed(0)}% of income — within the healthy 30% range.` });
  }

  // Food
  if (foodPct > 25) {
    insights.push({ type: 'warning', icon: '🛒', text: `Food & groceries are ${foodPct.toFixed(0)}% of income. Try meal planning or cooking at home to cut this down.` });
  }

  // Entertainment
  if (entPct > 15) {
    insights.push({ type: 'warning', icon: '🎬', text: `Entertainment is ${entPct.toFixed(0)}% of income. Try to keep this under 10% (${fmtFull(income * 0.10)}).` });
  }

  // Shopping
  if (shopPct > 20) {
    insights.push({ type: 'warning', icon: '🛍️', text: `Shopping is at ${shopPct.toFixed(0)}% of income — quite high. Try the 24-hour rule before buying non-essentials.` });
  }

  // All good
  if (insights.length === 0 && total > 0) {
    insights.push({ type: 'success', icon: '🎯', text: `Your budget looks balanced! Keep tracking your expenses every month to stay on track.` });
  }

  const iconClass = { success: 'insight-success', warning: 'insight-warning', danger: 'insight-danger', info: 'insight-info' };
  insightsEl.innerHTML = insights.map(i => `
    <div class="insight-item ${iconClass[i.type]}">
      <span class="insight-icon">${i.icon}</span>
      <span>${i.text}</span>
    </div>`).join('');
}

// ── 50-30-20 Rule Analysis ────────────────────────────────────
function updateRuleAnalysis(total) {
  const ruleEl = document.getElementById('rule-bars');

  const needs   = (expenses.housing || 0) + (expenses.food || 0) + (expenses.transport || 0) + (expenses.health || 0) + (expenses.education || 0);
  const wants   = (expenses.entertainment || 0) + (expenses.shopping || 0) + (expenses.other || 0);
  const savings = Math.max(income - total, 0);

  const needsPct  = income > 0 ? (needs   / income) * 100 : 0;
  const wantsPct  = income > 0 ? (wants   / income) * 100 : 0;
  const savingPct = income > 0 ? (savings / income) * 100 : 0;

  const bars = [
    { label: 'Needs',   tag: 'Housing, Food, Transport, Health, Education', target: 50, current: needsPct,  color: '#4D7FFF', amount: needs   },
    { label: 'Wants',   tag: 'Entertainment, Shopping, Other',               target: 30, current: wantsPct,  color: '#B57BFF', amount: wants   },
    { label: 'Savings', tag: 'What you keep',                                 target: 20, current: savingPct, color: '#10D97E', amount: savings },
  ];

  ruleEl.innerHTML = bars.map(b => {
    const markerPos = b.target; // target position as %
    const barWidth  = Math.min(b.current, 100);
    const overBudget = b.current > b.target;
    const fillColor = overBudget && b.label !== 'Savings' ? '#FF5757' : b.color;
    return `
      <div class="rule-bar-row">
        <div class="rule-bar-header">
          <div class="rule-bar-label">
            ${b.label}
            <span class="rule-tag">${b.tag}</span>
          </div>
          <div class="rule-bar-values">
            <span class="rule-current" style="color:${fillColor}">${b.current.toFixed(0)}%</span>
            <span class="rule-target">/ ${b.target}% ideal</span>
          </div>
        </div>
        <div class="rule-bg">
          <div class="rule-fill" style="width:${barWidth}%; background:${fillColor}"></div>
          <div class="rule-marker" style="left:${markerPos}%"></div>
        </div>
      </div>`;
  }).join('');
}

// ── Main Update Function ──────────────────────────────────────
function update() {
  const total = CATEGORIES.reduce((sum, c) => sum + (expenses[c.id] || 0), 0);

  updateMetrics(total);
  updateChart(total);
  updateLegend(total);
  updateBars();
  generateInsights(total);
  updateRuleAnalysis(total);
}

// ── Income Listener ───────────────────────────────────────────
document.getElementById('income-input').addEventListener('input', e => {
  income = parseFloat(e.target.value) || 0;
  update();
});

// ── Init ──────────────────────────────────────────────────────
buildCategories();
initChart();
update();
