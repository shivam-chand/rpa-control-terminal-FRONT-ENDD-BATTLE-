import { computedFilteredDataset, ROW_HEIGHT } from './stateEngine.js';

const currencySanitizer = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
let chartRef = null;
let isFrameThrottled = false;

// Initialize Workspace panel display states (Feature 6 Layout Persistence)
const LAYOUT_KEYS = ['kpi-panel', 'chart-panel', 'grid-panel'];

export function initLayoutState() {
    LAYOUT_KEYS.forEach(id => {
        const savedState = localStorage.getItem(`visible-${id}`);
        const element = document.getElementById(id);
        if (savedState === 'hidden') {
            element.style.display = 'none';
        }
        
        // Wire up visibility toggles
        const toggleBtn = document.getElementById(`toggle-${id.split('-')[0]}`);
        if(toggleBtn) {
            toggleBtn.onclick = () => {
                const current = element.style.display;
                if(current === 'none') {
                    element.style.display = '';
                    localStorage.setItem(`visible-${id}`, 'visible');
                } else {
                    element.style.display = 'none';
                    localStorage.setItem(`visible-${id}`, 'hidden');
                }
            };
        }
    });

    // Spawn Virtual Row Recycled Elements Array pool inside Viewport height
    const tbody = document.getElementById('grid-body');
    tbody.innerHTML = "";
    for (let i = 0; i < 40; i++) { // Render standard viewport row ceiling buffers
        const tr = document.createElement('tr');
        tr.innerHTML = `<td></td><td></td><td></td><td></td><td></td><td></td><td></td>`;
        tbody.appendChild(tr);
    }
}

export function updateKPIs(rows, robots, savings) {
    document.getElementById('kpi-rows').innerText = rows.toLocaleString();
    document.getElementById('kpi-robots').innerText = robots.toLocaleString();
    document.getElementById('kpi-savings').innerText = currencySanitizer.format(savings);
}

export function renderGridRows() {
    if (isFrameThrottled) return;
    isFrameThrottled = true;

    requestAnimationFrame(() => {
        const startTime = performance.now();
        const viewport = document.getElementById('grid-panel');
        const gridTable = document.getElementById('grid-table');
        const pooledRows = Array.from(document.getElementById('grid-body').children);
        const searchQuery = document.getElementById('search-input').value.trim();

        const currentOffset = viewport.scrollTop;
        let startIndex = Math.floor(currentOffset / ROW_HEIGHT);
        startIndex = Math.max(0, startIndex);

        let dataLen = computedFilteredDataset.length;
        gridTable.style.transform = `translate3d(0, ${startIndex * ROW_HEIGHT}px, 0)`;

        for (let i = 0; i < pooledRows.length; i++) {
            const trNode = pooledRows[i];
            const dataIndex = startIndex + i;

            if (dataIndex < dataLen) {
                const item = computedFilteredDataset[dataIndex];
                trNode.style.display = '';
                
                // Feature 3 Warning Hue trigger logic
                const hasAnomalies = item.project_status === 'Failed' || item.roi_percent < 0;
                trNode.className = hasAnomalies ? 'row-flash-alert' : '';

                const td = trNode.children;
                td[0].innerHTML = applyFuzzyHighlight(item.project_id, searchQuery);
                td[1].innerHTML = applyFuzzyHighlight(item.company_id, searchQuery);
                td[2].innerHTML = applyFuzzyHighlight(item.automation_type, searchQuery);
                
                td[3].innerText = currencySanitizer.format(item.budget_usd);
                td[4].innerText = item.roi_percent.toFixed(2) + '%';
                td[4].style.color = item.roi_percent < 0 ? 'var(--neon-red)' : 'var(--neon-green)';
                
                td[5].innerText = Math.round(item.employee_hours_saved).toLocaleString();
                td[6].innerHTML = `<span class="status-badge ${item.project_status === 'Completed' ? 'status-completed' : 'status-failed'}">${item.project_status}</span>`;
            } else {
                trNode.style.display = 'none';
            }
        }
        
        document.getElementById('grid-panel').onscroll = () => renderGridRows();
        const endTime = performance.now();
        document.getElementById('performance-lag').innerText = `${(endTime - startTime).toFixed(2)}ms`;
        isFrameThrottled = false;
    });
}

function applyFuzzyHighlight(text, query) {
    if (!query) return text;
    const escaped = query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');
    return text.toString().replace(regex, '<span class="match-highlight">$1</span>');
}

export function updateChart() {
    const chartCard = document.getElementById('chart-panel');
    if (chartCard.style.display === 'none') return;

    let comp = 0, fail = 0;
    computedFilteredDataset.forEach(r => {
        if (r.project_status === 'Completed') comp++;
        if (r.project_status === 'Failed') fail++;
    });

    if (chartRef) chartRef.destroy();
    const ctx = document.getElementById('myAnalyticsChart').getContext('2d');
    chartRef = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Completed Metrics', 'System Failures'],
            datasets: [{ label: 'Telemetry Streams Pool', data: [comp, fail], backgroundColor: ['#39ff14', '#ff3131'] }]
        },
        options: {
            responsive: true,
            plugins: { legend: { labels: { color: '#f8fafc' } } },
            scales: { x: { ticks: { color: '#64748b' } }, y: { ticks: { color: '#64748b' } } }
        }
    });
}