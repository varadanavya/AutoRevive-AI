// AutoRevive AI Dashboard JavaScript App
let categoryChartInstance = null;
let decisionChartInstance = null;
let rawTransactionsData = [];

document.addEventListener('DOMContentLoaded', () => {
  fetchDashboardData();
  fetchTransactions();
  // Auto refresh every 5 seconds
  setInterval(() => {
    fetchDashboardData();
    fetchTransactions();
  }, 5000);
});

// Fetch High level KPI metrics and chart data
async function fetchDashboardData() {
  try {
    const res = await fetch('/api/v1/analytics/dashboard');
    const json = await res.json();

    if (json.success && json.data) {
      const d = json.data;

      // Update KPI Metrics
      document.getElementById('metric-revenue-at-risk').innerText = `₹${d.revenueAtRisk.toLocaleString('en-IN')}`;
      document.getElementById('metric-recovered-revenue').innerText = `₹${d.recoveredRevenue.toLocaleString('en-IN')}`;
      document.getElementById('metric-recovery-rate').innerText = `${d.recoveryRatePercent}%`;
      document.getElementById('metric-active-workflows').innerText = d.activeWorkflows;
      document.getElementById('metric-failed-count').innerText = d.totalFailedPayments;
      document.getElementById('metric-recovery-bar').style.width = `${Math.min(100, d.recoveryRatePercent)}%`;

      // Update Charts
      updateCategoryChart(d.categoryBreakdown);
      updateDecisionChart(d.decisionBreakdown);
    }
  } catch (err) {
    console.error('Error fetching dashboard metrics:', err);
  }
}

// Fetch transactions audit log
async function fetchTransactions() {
  try {
    const res = await fetch('/api/v1/transactions?limit=50');
    const json = await res.json();

    if (json.success && json.data) {
      rawTransactionsData = json.data;
      renderTransactionsTable(rawTransactionsData);
    }
  } catch (err) {
    console.error('Error fetching transactions:', err);
  }
}

// Filter transactions by search text and status
function filterTransactions() {
  const q = (document.getElementById('table-search').value || '').toLowerCase();
  const statusFilter = document.getElementById('table-status-filter').value;

  const filtered = rawTransactionsData.filter(tx => {
    const matchSearch =
      tx.razorpayPaymentId.toLowerCase().includes(q) ||
      (tx.customer && tx.customer.name.toLowerCase().includes(q)) ||
      (tx.failureReason && tx.failureReason.toLowerCase().includes(q));

    const matchStatus = !statusFilter || tx.status === statusFilter || tx.recoveryStatus === statusFilter;

    return matchSearch && matchStatus;
  });

  renderTransactionsTable(filtered);
}

// Render Transactions Table HTML with smooth hover effects
function renderTransactionsTable(transactions) {
  const tbody = document.getElementById('transactions-table-body');
  tbody.innerHTML = '';

  if (transactions.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="p-6 text-center text-gray-500">
          No transactions match current filters.
        </td>
      </tr>
    `;
    return;
  }

  transactions.forEach(tx => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-blue-500/10 hover:border-l-4 hover:border-l-blue-500 transition-all duration-200 border-b border-gray-800/40 group';

    const latestLog = tx.failureLogs && tx.failureLogs.length > 0 ? tx.failureLogs[0] : null;
    const probability = latestLog ? latestLog.recoveryProbability : 50.0;
    const category = tx.failureCategory || (latestLog ? latestLog.category : 'N/A');

    // Status Badge Styling
    let statusBadge = '';
    if (tx.recoveryStatus === 'RECOVERED' || tx.status === 'CAPTURED') {
      statusBadge = `<span class="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:bg-emerald-500/20 transition"><i class="fa-solid fa-check"></i> RECOVERED</span>`;
    } else if (tx.recoveryStatus === 'IN_RECOVERY') {
      statusBadge = `<span class="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 group-hover:bg-blue-500/20 transition"><i class="fa-solid fa-sync animate-spin"></i> IN RECOVERY</span>`;
    } else if (tx.recoveryStatus === 'STOPPED') {
      statusBadge = `<span class="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 group-hover:bg-rose-500/20 transition"><i class="fa-solid fa-ban"></i> STOPPED</span>`;
    } else {
      statusBadge = `<span class="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 group-hover:bg-amber-500/20 transition">FAILED</span>`;
    }

    // Category Badge
    const categoryBadge = `<span class="px-2 py-0.5 rounded-md text-[11px] font-medium bg-gray-800 text-gray-300 border border-gray-700 group-hover:border-blue-500/40 transition">${category}</span>`;

    // Probability bar color
    let probColor = 'bg-emerald-400';
    if (probability < 40) probColor = 'bg-rose-400';
    else if (probability < 70) probColor = 'bg-amber-400';

    tr.innerHTML = `
      <td class="p-3">
        <div class="font-mono text-xs text-white font-medium group-hover:text-blue-400 transition">${tx.razorpayPaymentId}</div>
        <div class="text-[11px] text-gray-400 group-hover:text-gray-200 transition">${tx.customer ? tx.customer.name : 'Unknown Customer'}</div>
      </td>
      <td class="p-3 font-semibold text-white group-hover:scale-105 transition origin-left">
        ₹${tx.amount.toLocaleString('en-IN')}
      </td>
      <td class="p-3">
        <span class="text-[11px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-300 font-mono group-hover:bg-gray-700 transition">${tx.paymentMethod}</span>
      </td>
      <td class="p-3 text-gray-400 text-xs truncate max-w-[180px] group-hover:text-gray-300 transition" title="${tx.failureReason || 'N/A'}">
        ${tx.failureReason || 'N/A'}
      </td>
      <td class="p-3">
        ${categoryBadge}
      </td>
      <td class="p-3">
        <div class="flex items-center space-x-2">
          <span class="text-xs font-semibold text-gray-200">${probability}%</span>
          <div class="w-16 bg-gray-800 h-1.5 rounded-full overflow-hidden">
            <div class="${probColor} h-full transition-all duration-300" style="width: ${probability}%"></div>
          </div>
        </div>
      </td>
      <td class="p-3">
        ${statusBadge}
      </td>
      <td class="p-3 text-right space-x-2">
        <button onclick="openModal('${tx.id}')" class="px-2.5 py-1 rounded bg-blue-600/20 hover:bg-blue-600 hover:text-white text-blue-400 text-[11px] font-medium border border-blue-500/30 transition-all duration-200 hover:scale-105 shadow-sm" title="View AI Diagnosis">
          <i class="fa-solid fa-brain"></i> AI Reasoning
        </button>
        ${(tx.status === 'FAILED' && tx.recoveryStatus !== 'RECOVERED') ? `
          <button onclick="triggerRecovery('${tx.id}')" class="px-2.5 py-1 rounded bg-emerald-600/20 hover:bg-emerald-600 hover:text-white text-emerald-400 text-[11px] font-medium border border-emerald-500/30 transition-all duration-200 hover:scale-105 shadow-sm" title="Trigger Instant Recovery">
            <i class="fa-solid fa-bolt"></i> Trigger
          </button>
        ` : ''}
      </td>
    `;

    tbody.appendChild(tr);
  });
}

// Chart.js Category Breakdown
function updateCategoryChart(data) {
  const ctx = document.getElementById('chart-category').getContext('2d');
  const labels = Object.keys(data);
  const values = Object.values(data);

  if (categoryChartInstance) {
    categoryChartInstance.data.labels = labels;
    categoryChartInstance.data.datasets[0].data = values;
    categoryChartInstance.update();
    return;
  }

  categoryChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: [
          '#3B82F6', // INSUFFICIENT_FUNDS
          '#8B5CF6', // BANK_TIMEOUT
          '#10B981', // GATEWAY_TIMEOUT
          '#F59E0B', // EXPIRED_CARD
          '#6366F1', // NETWORK_ERROR
          '#EF4444', // SUSPECTED_FRAUD
        ],
        borderWidth: 0,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: { color: '#9CA3AF', font: { size: 11 } }
        }
      },
      cutout: '70%',
    }
  });
}

// Chart.js Decision Breakdown
function updateDecisionChart(data) {
  const ctx = document.getElementById('chart-decisions').getContext('2d');
  const labels = Object.keys(data);
  const values = Object.values(data);

  if (decisionChartInstance) {
    decisionChartInstance.data.labels = labels;
    decisionChartInstance.data.datasets[0].data = values;
    decisionChartInstance.update();
    return;
  }

  decisionChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Recommended Workflows',
        data: values,
        backgroundColor: '#3B82F6',
        borderRadius: 6,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: { ticks: { color: '#9CA3AF', font: { size: 10 } }, grid: { display: false } },
        y: { ticks: { color: '#9CA3AF', stepSize: 1 }, grid: { color: 'rgba(255,255,255,0.05)' } }
      }
    }
  });
}

// Open AI Diagnosis Explanation Modal
function openModal(txId) {
  const tx = rawTransactionsData.find(t => t.id === txId);
  if (!tx) return;

  const latestLog = tx.failureLogs && tx.failureLogs.length > 0 ? tx.failureLogs[0] : null;

  document.getElementById('modal-payment-id').innerText = `Payment ID: ${tx.razorpayPaymentId}`;
  document.getElementById('modal-category').innerText = tx.failureCategory || (latestLog ? latestLog.category : 'N/A');

  const workflow = tx.workflows && tx.workflows.length > 0 ? tx.workflows[0] : null;
  document.getElementById('modal-decision').innerText = workflow ? workflow.decision : 'RETRY_LATER';
  document.getElementById('modal-probability').innerText = `${latestLog ? latestLog.recoveryProbability : 50}%`;
  document.getElementById('modal-risk').innerText = `${latestLog ? latestLog.riskScore : 15}/100`;

  document.getElementById('modal-explanation').innerText = latestLog ? latestLog.aiDiagnosis : 'No detailed AI diagnostic telemetry recorded.';
  document.getElementById('modal-strategy').innerText = workflow ? workflow.recoveryStrategy : 'Standard exponential backoff scheduled.';

  document.getElementById('ai-modal').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('ai-modal').classList.add('hidden');
}

// Demo Actions: Simulate Failure Webhook
async function simulateFailure() {
  const category = document.getElementById('demo-category-select').value;
  const btn = document.getElementById('btn-simulate-failure');
  btn.disabled = true;
  btn.innerHTML = `<i class="fa-solid fa-spinner animate-spin"></i> Triggering Webhook...`;

  try {
    const res = await fetch('/api/v1/demo/simulate-failure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category })
    });
    const json = await res.json();
    alert(`Webhook Simulated! Payment ID: ${json.data.paymentId} classified as ${json.data.category}`);
    await fetchDashboardData();
    await fetchTransactions();
  } catch (err) {
    alert('Error triggering simulation: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<i class="fa-solid fa-bug"></i> Simulate Failed Webhook`;
  }
}

// Demo Actions: Run Smart Retry Tick
async function executeRetries() {
  const btn = document.getElementById('btn-execute-retries');
  btn.disabled = true;
  btn.innerHTML = `<i class="fa-solid fa-spinner animate-spin"></i> Executing Retries...`;

  try {
    const res = await fetch('/api/v1/demo/execute-retry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const json = await res.json();
    alert(json.message);
    await fetchDashboardData();
    await fetchTransactions();
  } catch (err) {
    alert('Error executing retries: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<i class="fa-solid fa-play"></i> Run Smart Retry Tick`;
  }
}

// Demo Actions: Reset Data
async function resetDemoData() {
  if (!confirm('Are you sure you want to reset demo data?')) return;
  try {
    await fetch('/api/v1/demo/reset', { method: 'POST' });
    alert('Demo data cleared! Re-seeding database...');
    location.reload();
  } catch (err) {
    alert('Error resetting demo data: ' + err.message);
  }
}

// Trigger Manual AI Recovery for single transaction
async function triggerRecovery(txId) {
  try {
    const res = await fetch('/api/v1/recovery/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactionId: txId })
    });
    const json = await res.json();
    alert(json.message || 'AI Recovery Triggered!');
    await fetchDashboardData();
    await fetchTransactions();
  } catch (err) {
    alert('Error triggering recovery: ' + err.message);
  }
}
