// ==========================================
// 🚀 ENTERPRISE QUANTUM CORE STATE MANAGEMENT ENGINE
// ARCHITECTURE LEVEL: ULTRA-PERFORMANCE MODULE (NO-LAG V2.6)
// ==========================================

const ROW_HEIGHT = 40;
const currencySanitizer = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

// Ensure clean DOM nodes filtering setup
if(document.getElementById('filter-type')) document.getElementById('filter-type').value = "";
if(document.getElementById('filter-dept')) document.getElementById('filter-dept').value = "";
if(document.getElementById('search-input')) document.getElementById('search-input').value = "";

export let masterDataPool = [];
export let computedFilteredDataset = [];
let bufferQueue = [];
let isEngineRunningPaused = false;
let isFrameThrottled = false;

let totalRowsCount = 0;
let totalRobotsDeployed = 0;
let globalCumulativeSavings = 0;
let chartRef = null;

let sortSpecs = []; 

const tbody = document.getElementById('grid-body');
const gridTable = document.getElementById('grid-table');
const runway = document.getElementById('grid-runway');
const viewport = document.getElementById('grid-panel');

// Matrix recycling row pre-rendering logic
if (tbody) {
    tbody.innerHTML = "";
    for (let i = 0; i < 35; i++) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td></td><td></td><td></td><td></td><td></td><td></td><td></td>`;
        tbody.appendChild(tr);
    }
}
const pooledRows = tbody ? Array.from(tbody.children) : [];

// Local Workspace States Management
const panels = ['kpi-panel', 'chart-panel', 'grid-panel'];
panels.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const state = localStorage.getItem(`visible-${id}`);
    if (state === 'hidden') el.style.display = 'none';

    const btn = document.getElementById(`toggle-${id.split('-')[0]}`);
    if(btn) {
        btn.onclick = () => {
            if(el.style.display === 'none') {
                el.style.display = '';
                localStorage.setItem(`visible-${id}`, 'visible');
            } else {
                el.style.display = 'none';
                localStorage.setItem(`visible-${id}`, 'hidden');
            }
            if(id === 'chart-panel') updateChart();
        };
    }
});

// Stream Integration Watchdog Setup
if (window.initializeRpaStream) {
    window.initializeRpaStream((incomingBatch) => {
        if (isEngineRunningPaused) {
            bufferQueue.push(...incomingBatch);
            const watchdogEl = document.getElementById('sentinel-buffer-size');
            if (watchdogEl) {
                watchdogEl.innerText = `${bufferQueue.length} (STAGED)`;
                watchdogEl.style.color = '#ffb703'; 
            }
            return; 
        }

        incomingBatch.forEach(row => {
            const normalizedRow = {
                project_id: row.project_id || row.id || 'N/A',
                company_id: row.company_id || row.company || 'N/A',
                project_name: row.project_name || row.name || '',
                implementation_partner: row.implementation_partner || row.partner || '',
                country: row.country || 'Global',
                automation_type: row.automation_type || row.type || 'Bot',
                department: row.department || row.dept || 'Operations',
                budget_usd: parseFloat(row.budget_usd || row.budget || 0),
                roi_percent: parseFloat(row.roi_percent || row.roi || 0),
                employee_hours_saved: parseFloat(row.employee_hours_saved || row.hours_saved || 0),
                project_status: row.project_status || row.status || 'Completed',
                robots_deployed: parseInt(row.robots_deployed || row.robots || 0),
                annual_savings_usd: parseFloat(row.annual_savings_usd || row.savings || 0)
            };

            totalRowsCount++;
            totalRobotsDeployed += normalizedRow.robots_deployed;
            globalCumulativeSavings += normalizedRow.annual_savings_usd;
            masterDataPool.push(normalizedRow);
        });

        if(document.getElementById('kpi-rows')) document.getElementById('kpi-rows').innerText = totalRowsCount.toLocaleString();
        if(document.getElementById('kpi-robots')) document.getElementById('kpi-robots').innerText = totalRobotsDeployed.toLocaleString();
        if(document.getElementById('kpi-savings')) document.getElementById('kpi-savings').innerText = currencySanitizer.format(globalCumulativeSavings);

        executePipelineRecalculation();
        
        const watchdogEl = document.getElementById('sentinel-buffer-size');
        if (watchdogEl) {
            watchdogEl.innerText = `0 (CLEAR)`;
            watchdogEl.style.color = ''; 
        }
    });
}

// Data Mutation Pipeline Architecture
function executePipelineRecalculation() {
    let workingDataset = [...masterDataPool];
    
    const typeFilter = document.getElementById('filter-type') ? document.getElementById('filter-type').value : "";
    if (typeFilter) workingDataset = workingDataset.filter(r => r.automation_type === typeFilter);

    const deptFilter = document.getElementById('filter-dept') ? document.getElementById('filter-dept').value : "";
    if (deptFilter) workingDataset = workingDataset.filter(r => r.department === deptFilter);

    const searchRaw = document.getElementById('search-input') ? document.getElementById('search-input').value.toLowerCase().trim() : "";
    if (searchRaw !== "") {
        const tokens = searchRaw.split(/\s+/); 
        workingDataset = workingDataset.filter(r => {
            const denseString = `${r.project_id} ${r.company_id} ${r.project_name} ${r.implementation_partner} ${r.country} ${r.automation_type} ${r.department} ${r.project_status}`.toLowerCase();
            return tokens.every(token => denseString.includes(token));
        });
    }

    if (sortSpecs.length > 0) {
        workingDataset.sort((a, b) => {
            for (let spec of sortSpecs) {
                let valA = a[spec.column];
                let valB = b[spec.column];
                if (typeof valA === 'string') {
                    let comp = valA.localeCompare(valB);
                    if (comp !== 0) return spec.direction === 'asc' ? comp : -comp;
                } else {
                    if (valA !== valB) return spec.direction === 'asc' ? valA - valB : valB - valA;
                }
            }
            return 0;
        });
    }

    computedFilteredDataset = workingDataset;
    if(runway) runway.style.height = `${computedFilteredDataset.length * ROW_HEIGHT}px`;
    
    renderSortIndicators();
    requestThrottledRender();
    updateChart();
}

// Recycled Layout Animation Request Frame
function requestThrottledRender() {
    if (isFrameThrottled || !viewport) return;
    isFrameThrottled = true;

    requestAnimationFrame(() => {
        const startTime = performance.now();
        const currentOffset = viewport.scrollTop;
        let startIndex = Math.floor(currentOffset / ROW_HEIGHT);
        startIndex = Math.max(0, startIndex);

        let dataLen = computedFilteredDataset.length;
        if(gridTable) gridTable.style.transform = `translate3d(0, ${startIndex * ROW_HEIGHT}px, 0)`;

        const searchQuery = document.getElementById('search-input') ? document.getElementById('search-input').value.trim() : "";

        for (let i = 0; i < pooledRows.length; i++) {
            const trNode = pooledRows[i];
            const dataIndex = startIndex + i;

            if (dataIndex < dataLen) {
                const item = computedFilteredDataset[dataIndex];
                trNode.style.display = '';
                
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
        const endTime = performance.now();
        if(document.getElementById('performance-lag')) {
            document.getElementById('performance-lag').innerText = `${(endTime - startTime).toFixed(2)}ms`;
        }
        isFrameThrottled = false;
    });
}

function applyFuzzyHighlight(text, query) {
    if (!query) return text;
    const Fraser = query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`(${Fraser})`, 'gi');
    return text.toString().replace(regex, '<span class="match-highlight">$1</span>');
}

// Sort Priority Interface Render Matrix
function renderSortIndicators() {
    const columns = [
        { id: 'project_id', name: 'Project ID' },
        { id: 'company_id', name: 'Company ID' },
        { id: 'automation_type', name: 'Type' },
        { id: 'budget_usd', name: 'Budget' },
        { id: 'roi_percent', name: 'ROI %' },
        { id: 'employee_hours_saved', name: 'Hrs Saved' },
        { id: 'project_status', name: 'Status' }
    ];

    const superscriptNumbers = ['¹', '²', '³', '⁴', '⁵', '⁶', '⁷'];

    columns.forEach(col => {
        const thElement = document.getElementById(`th-${col.id}`);
        if (!thElement) return;

        const activeSortIndex = sortSpecs.findIndex(s => s.column === col.id);

        if (activeSortIndex > -1) {
            const arrowIndicator = sortSpecs[activeSortIndex].direction === 'asc' ? ' ▲' : ' ▼';
            const priorityBadge = sortSpecs.length > 1 ? superscriptNumbers[activeSortIndex] : '';
            
            thElement.innerText = `${col.name}${arrowIndicator}${priorityBadge}`;
            thElement.style.color = 'var(--neon-blue)';
            thElement.style.textShadow = '0 0 10px rgba(0, 240, 255, 0.6)';
            thElement.style.borderBottom = '2px solid var(--neon-blue)';
        } else {
            const fallbackHint = ['budget_usd', 'roi_percent', 'employee_hours_saved'].includes(col.id) ? ' ↕' : '';
            thElement.innerText = col.name + fallbackHint;
            thElement.style.color = '';
            thElement.style.textShadow = '';
            thElement.style.borderBottom = '';
        }
    });
}

// Chart Layout Stabilization Render
function updateChart() {
    const chartCard = document.getElementById('chart-panel');
    if (!chartCard || chartCard.style.display === 'none') return;

    let comp = 0, fail = 0;
    computedFilteredDataset.forEach(r => {
        if (r.project_status === 'Completed') comp++;
        if (r.project_status === 'Failed') fail++;
    });

    if (chartRef) chartRef.destroy();
    
    const chartCanvas = document.getElementById('myAnalyticsChart');
    if(!chartCanvas) return;
    const ctx = chartCanvas.getContext('2d');
    
    chartRef = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Completed Metrics', 'System Failures'],
            datasets: [{ 
                label: 'Telemetry Pool', 
                data: [comp, fail], 
                backgroundColor: ['#39ff14', '#ff3131'],
                borderWidth: 0,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false, 
            plugins: { legend: { display: false } },
            scales: { 
                x: { 
                    ticks: { color: '#64748b', font: { family: 'monospace' } },
                    grid: { color: 'rgba(255,255,255,0.03)' }
                }, 
                y: { 
                    beginAtZero: true, 
                    ticks: { color: '#64748b', font: { family: 'monospace' } },
                    grid: { color: 'rgba(255,255,255,0.03)' }
                } 
            }
        }
    });
}

if(document.getElementById('btn-toggle')) {
    document.getElementById('btn-toggle').onclick = () => {
        isEngineRunningPaused = !isEngineRunningPaused;
        const btn = document.getElementById('btn-toggle');
        const overlay = document.getElementById('status-overlay');

        if (isEngineRunningPaused) {
            btn.innerText = "RUN ENGINE"; btn.className = "btn btn-play";
            if(overlay) { overlay.innerText = "■ PAUSED"; overlay.style.color = "var(--neon-red)"; }
        } else {
            btn.innerText = "PAUSE ENGINE"; btn.className = "btn btn-pause";
            if(overlay) { overlay.innerText = "● ONLINE"; overlay.style.color = "var(--neon-green)"; }
            
            if (bufferQueue.length > 0) {
                masterDataPool.push(...bufferQueue);
                bufferQueue = [];
            }
            executePipelineRecalculation();
        }
    };
}

if(document.getElementById('btn-export')) {
    document.getElementById('btn-export').onclick = () => {
        if (!computedFilteredDataset || computedFilteredDataset.length === 0) return;
        const headers = ["Project ID", "Company ID", "Project Name", "Automation Type", "Department", "Budget (USD)", "ROI (%)", "Hours Saved", "Status"];
        const csvRows = [headers.join(",")];
        computedFilteredDataset.forEach(row => {
            const values = [`"${row.project_id}"`, `"${row.company_id}"`, `"${row.project_name.replace(/"/g, '""')}"`, `"${row.automation_type}"`, `"${row.department}"`, row.budget_usd, row.roi_percent.toFixed(2), row.employee_hours_saved, `"${row.project_status}"`];
            csvRows.push(values.join(","));
        });
        const blob = new Blob([csvRows.join("\n")], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `RPA_Quantum_Snapshot_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };
}

if(document.getElementById('btn-json')) {
    document.getElementById('btn-json').onclick = () => {
        if (!computedFilteredDataset || computedFilteredDataset.length === 0) return;
        const jsonString = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(computedFilteredDataset, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", jsonString);
        downloadAnchor.setAttribute("download", `RPA_Quantum_Snapshot_${Date.now()}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        document.body.removeChild(downloadAnchor);
    };
}

// Multi-Sort Interaction Execution Node
['project_id', 'company_id', 'automation_type', 'budget_usd', 'roi_percent', 'employee_hours_saved', 'project_status'].forEach(col => {
    const th = document.getElementById(`th-${col}`);
    if(!th) return;
    th.onclick = (e) => {
        const existingIndex = sortSpecs.findIndex(s => s.column === col);
        if (e.shiftKey) {
            if (existingIndex > -1) {
                if (sortSpecs[existingIndex].direction === 'asc') {
                    sortSpecs[existingIndex].direction = 'desc';
                } else {
                    sortSpecs.splice(existingIndex, 1); 
                }
            } else {
                sortSpecs.push({ column: col, direction: 'asc' });
            }
        } else {
            if (existingIndex > -1 && sortSpecs.length === 1) {
                if (sortSpecs[existingIndex].direction === 'asc') {
                    sortSpecs[existingIndex].direction = 'desc';
                } else {
                    sortSpecs = [];
                }
            } else {
                sortSpecs = [{ column: col, direction: 'asc' }];
            }
        }
        executePipelineRecalculation();
    };
});

if(viewport) viewport.onscroll = () => requestThrottledRender();
if(document.getElementById('search-input')) document.getElementById('search-input').oninput = () => executePipelineRecalculation();
if(document.getElementById('filter-type')) document.getElementById('filter-type').onchange = () => executePipelineRecalculation();
if(document.getElementById('filter-dept')) document.getElementById('filter-dept').onchange = () => executePipelineRecalculation();

// Trigger single dynamic boot state pipeline update
executePipelineRecalculation();