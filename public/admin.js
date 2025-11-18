document.addEventListener('DOMContentLoaded', () => {
    const loginSection = document.getElementById('login-section');
    const feedbackSection = document.getElementById('feedback-section');
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    const averageRatingElement = document.getElementById('average-rating');
    const clearFeedbackBtn = document.getElementById('clear-feedback-btn');

    // Check if user is already logged in (using sessionStorage)
    if (sessionStorage.getItem('isAdminLoggedIn') === 'true') {
        showFeedback();
    }

    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch('http://localhost:3000/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });

            const result = await response.json();

            if (response.ok && result.success) {
                sessionStorage.setItem('isAdminLoggedIn', 'true');
                showFeedback();
            } else {
                loginError.textContent = result.message || 'Invalid credentials.';
            }
        } catch (error) {
            loginError.textContent = 'An error occurred. Please try again.';
            console.error('Login error:', error);
        }
    });

    async function fetchAverageRating() {
        try {
            const response = await fetch('http://localhost:3000/api/feedback/average');
            const result = await response.json();
            if (response.ok) {
                averageRatingElement.textContent = `Overall Performance: ${Number(result.average).toFixed(2)} / 5`;
            } else {
                averageRatingElement.textContent = `Overall Performance: Error loading rating`;
            }
        } catch (error) {
            console.error('Error fetching average rating:', error);
            averageRatingElement.textContent = `Overall Performance: Error loading rating`;
        }
    }
    clearFeedbackBtn.addEventListener('click', async () => {
        // Confirmation dialog to prevent accidental deletion
        const isConfirmed = confirm('Are you sure you want to move all feedback to the recycle bin?');

        if (isConfirmed) {
            try {
                const response = await fetch('http://localhost:3000/api/feedback', {
                    method: 'DELETE',
                });
                const result = await response.json();
                alert(result.message);
                if (response.ok) {
                    // Refresh the feedback table to show it's empty
                    showFeedback();
                }
            } catch (error) {
                alert('An error occurred while clearing feedback.');
                console.error('Clear feedback error:', error);
            }
        }
    });
    async function showFeedback() {
        loginSection.style.display = 'none';
        feedbackSection.style.display = 'block';
        await fetchAverageRating();

        try {
            const response = await fetch('http://localhost:3000/api/feedback');
            if (!response.ok) {
                throw new Error('Failed to fetch feedback.');
            }
            const result = await response.json();
            populateFeedbackTable(result.data);
        } catch (error) {
            const feedbackTable = document.getElementById('feedback-table');
            feedbackTable.innerHTML = '<tr><td>Error loading feedback.</td></tr>';
            console.error('Fetch feedback error:', error);
        }
    }

    function populateFeedbackTable(feedbackData) {
        const table = document.getElementById('feedback-table');
        let tableHTML = `
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Rating</th>
                    <th>Feedback</th>
                    <th>Submitted At</th>
                </tr>
            </thead>
            <tbody>
        `;
        feedbackData.forEach(item => {
            tableHTML += `
                <tr>
                    <td>${item.id}</td>
                    <td>${item.name}</td>
                    <td>${item.email}</td>
                    <td>${item.rating || 'N/A'}</td>
                    <td>${item.feedback}</td>
                    <td>${new Date(item.submitted_at).toLocaleString()}</td>
                </tr>
            `;
        });
        tableHTML += '</tbody>';
        table.innerHTML = tableHTML;
    }
});