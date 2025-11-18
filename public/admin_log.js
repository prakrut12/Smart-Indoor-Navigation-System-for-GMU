const BASE_URL = "https://gmu-nav.onrender.com";

// Fetch and display logs
//  NEW FUNCTION — Create Log
async function createLog(description) {
    try {
        const response = await fetch(`${BASE_URL}/api/logs`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                admin_user: "admin",   // REQUIRED FIELD
                description: description
            })
        });

        const result = await response.json();

        if (response.ok) {
            alert("Update logged successfully!");
            fetchLogs(); // refresh table
        } else {
            alert(result.message || "Failed to log update.");
        }
    } catch (error) {
        alert("Error logging update.");
        console.error("Create log error:", error);
    }
}

// Populate table with logs
function populateLogTable(logData) {
    const table = document.getElementById("log-table");
    if (!table) return;

    let tableHTML = `
        <thead>
            <tr>
                <th>Log ID</th>
                <th>Admin User</th>
                <th>Description</th>
                <th>Timestamp</th>
            </tr>
        </thead>
        <tbody>
    `;

    if (logData && logData.length > 0) {
        logData.forEach(item => {
            tableHTML += `
                <tr>
                    <td>${item.id}</td>
                    <td>${item.admin_user}</td>
                    <td>${item.description}</td>
                    <td>${new Date(item.timestamp).toLocaleString()}</td>
                </tr>
            `;
        });
    } else {
        tableHTML += `<tr><td colspan="4">No update logs found.</td></tr>`;
    }

    tableHTML += "</tbody>";
    table.innerHTML = tableHTML;
}

//  NEW FUNCTION — Create Log
async function createLog(description) {
    try {
        const response = await fetch(`${BASE_URL}/api/logs`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ description })
        });

        const result = await response.json();

        if (response.ok) {
            alert("Update logged successfully!");
            fetchLogs(); // refresh table
        } else {
            alert(result.message || "Failed to log update.");
        }
    } catch (error) {
        alert("Error logging update.");
        console.error("Create log error:", error);
    }
}

// Expose functions to HTML
window.fetchLogs = fetchLogs;
window.createLog = createLog;
