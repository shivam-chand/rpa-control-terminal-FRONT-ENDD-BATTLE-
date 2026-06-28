// Global execution context for synchronization
window.initializeRpaStream = function(callback) {
    console.log("🚀 RPA Telemetry Stream Powered Up...");
    
    const automationTypes = ["Bot", "Workflow", "AI-Agent"];
    const departments = ["Finance", "HR", "Operations"];
    const statuses = ["Completed", "Failed"];

    function generateBatch() {
        // Feature 1: Every 200ms tick generates new telemetry records
        let batchSize = Math.floor(Math.random() * 5) + 3; 
        let batchData = [];

        for(let i = 0; i < batchSize; i++) {
            let mockRoi = parseFloat((Math.random() * 260 - 60).toFixed(2));
            let mockStatus = mockRoi < 0 ? "Failed" : statuses[Math.floor(Math.random() * statuses.length)];
            
            batchData.push({
                project_id: "PRJ-" + Math.floor(1000 + Math.random() * 9000),
                company_id: "COMP-" + String.fromCharCode(65 + Math.floor(Math.random() * 26)),
                project_name: "Automated Core Lifecycle Engine",
                implementation_partner: "Tata Cloud Analytics",
                country: "India USA",
                automation_type: automationTypes[Math.floor(Math.random() * automationTypes.length)],
                department: departments[Math.floor(Math.random() * departments.length)],
                budget_usd: Math.floor(25000 + Math.random() * 120000),
                roi_percent: mockRoi,
                robots_deployed: Math.floor(1 + Math.random() * 10),
                annual_savings_usd: Math.floor(6000 + Math.random() * 75000),
                employee_hours_saved: Math.floor(150 + Math.random() * 4000),
                project_status: mockStatus
            });
        }
        callback(batchData);
    }

    // Strict 200ms interval pipeline execution as mandated by the PDF specs
    setInterval(generateBatch, 200); 
};