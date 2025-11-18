// This function is linked from admin_log.html
async function fetchLogs() {
    try {
        const response = await fetch('https://gmu-nav.onrender.com/api/logs');
        if (!response.ok) {
            throw new Error('Failed to fetch logs.');
        }
        const result = await response.json();
        populateLogTable(result.data);
    } catch (error) {
        const logTable = document.getElementById('log-table');
        logTable.innerHTML = '<tr><td>Error loading update logs.</td></tr>';
        console.error('Fetch logs error:', error);
    }
}

function populateLogTable(logData) {
    const table = document.getElementById('log-table');
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

    tableHTML += '</tbody>';
    table.innerHTML = tableHTML;
}

// Make the function globally available for admin_log.html
window.fetchLogs = fetchLogs;
