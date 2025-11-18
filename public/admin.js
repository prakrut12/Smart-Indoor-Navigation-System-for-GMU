const BASE_URL = "https://smart-indoor-navigation-system-for-gmu.onrender.com";

document.addEventListener('DOMContentLoaded', () => {
    const loginSection = document.getElementById('login-section');
    const feedbackSection = document.getElementById('feedback-section');
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    const averageRatingElement = document.getElementById('average-rating');
    const clearFeedbackBtn = document.getElementById('clear-feedback-btn');

    if (sessionStorage.getItem('isAdminLoggedIn') === 'true') {
        showFeedback();
    }

    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch(`${BASE_URL}/api/login`, {
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
        }
    });

    async function fetchAverageRating() {
        try {
            const response = await fetch(`${BASE_URL}/api/feedback/average`);
            const result = await response.json();

            if (response.ok) {
                averageRatingElement.textContent = `Overall Performance: ${Number(result.average).toFixed(2)} / 5`;
            } else {
                averageRatingElement.textContent = `Overall Performance: Error loading rating`;
            }
        } catch (error) {
            averageRatingElement.textContent = `Overall Performance: Error loading rating`;
        }
    }

    clearFeedbackBtn.addEventListener('click', async () => {
        const isConfirmed = confirm('Are you sure you want to move all feedback to the recycle bin?');

        if (isConfirmed) {
            try {
                const response = await fetch(`${BASE_URL}/api/feedback`, {
                    method: 'DELETE',
                });
                const result = await response.json();
                alert(result.message);
                if (response.ok) showFeedback();
            } catch (error) {
                alert('An error occurred while clearing feedback.');
            }
        }
    });

    async function showFeedback() {
        loginSection.style.display = 'none';
        feedbackSection.style.display = 'block';

        await fetchAverageRating();

        try {
            const response = await fetch(`${BASE_URL}/api/feedback`);
            const result = await response.json();

            populateFeedbackTable(result.data);
        } catch (error) {
            const feedbackTable = document.getElementById('feedback-table');
            feedbackTable.innerHTML = '<tr><td>Error loading feedback.</td></tr>';
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
