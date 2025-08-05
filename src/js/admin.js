// admin.js - Admin dashboard functionality
let users = [];
let currentUser = null;

// Load users when page loads
document.addEventListener('DOMContentLoaded', () => {
    checkAdminAuth();
    loadUsers();
    setupAddUserForm();
    setupRefreshButton();
    loadCurrentUser();
});

// Check if user is authenticated and is admin
async function checkAdminAuth() {
    const sessionId = localStorage.getItem('sessionId');
    if (!sessionId) {
        window.location.href = '../html/login.html';
        return;
    }

    // Set cookie for server-side authentication
    document.cookie = `sessionId=${sessionId}; path=/`;
}

// Load current user info
function loadCurrentUser() {
    const userSession = localStorage.getItem('userSession');
    if (userSession) {
        const userData = JSON.parse(userSession);
        const welcomeMessage = document.getElementById('welcome-message-admin');
        if (welcomeMessage) {
            welcomeMessage.textContent = `Welcome, ${userData.username}!`;
        }
        currentUser = userData;
    }
}

// Load all users
async function loadUsers() {
    try {
        const response = await fetch('/api/admin/users', {
            credentials: 'include',
            headers: {
                'Cookie': document.cookie
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            users = data.users;
				console.log(users);
				
            displayUsers();
            updateStats();
        } else if (response.status === 403) {
            alert('Access denied. Admin privileges required.');
            window.location.href = '../html/dashboard.html';
        } else {
            console.error('Failed to load users');
            showLoadingError('Failed to load users');
        }
    } catch (error) {
        console.error('Error loading users:', error);
        showLoadingError('Error loading users');
    }
}

// Display users in table
function displayUsers() {
    const tbody = document.getElementById('users-table-body');
    
    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No users found</td></tr>';
        return;
    }
    
    tbody.innerHTML = '';
    
    users.forEach(user => {
        const row = document.createElement('tr');
        const createdDate = new Date(user.created_at).toLocaleDateString('pt-BR');
        
        row.innerHTML = `
            <td>${user.id}</td>
            <td>${user.username}</td>
            <td>${user.email}</td>
            <td><span class="role-${user.role || 'user'}">${(user.role || 'user').toUpperCase()}</span></td>
            <td>${createdDate}</td>
            <td>
                <button onclick="deleteUser(${user.id}, '${user.username}')" class="btn-danger" 
                        ${user.role === 'admin' && currentUser && user.username === currentUser.username ? 'disabled title="Cannot delete yourself"' : ''}>
                    Delete
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    // Update last updated time
    document.getElementById('last-updated').textContent = new Date().toLocaleString('pt-BR');
}

// Update statistics
function updateStats() {
    const totalUsers = users.length;
    const adminUsers = users.filter(user => user.role === 'admin').length;
    const regularUsers = totalUsers - adminUsers;
    
    document.getElementById('total-users').textContent = totalUsers;
    document.getElementById('admin-users').textContent = adminUsers;
    document.getElementById('regular-users').textContent = regularUsers;
}

// Show loading error
function showLoadingError(message) {
    const tbody = document.getElementById('users-table-body');
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: red;">${message}</td></tr>`;
}

// Delete user
async function deleteUser(userId, username) {
    // Prevent admin from deleting themselves
    if (currentUser && username === currentUser.username) {
        alert('You cannot delete your own account!');
        return;
    }

    if (!confirm(`Are you sure you want to delete user "${username}"?\n\nThis action cannot be undone.`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/admin/users/${userId}`, {
            method: 'DELETE',
            credentials: 'include',
            headers: {
                'Cookie': document.cookie
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            showMessage('add-user-message', data.message, 'success');
            loadUsers(); // Reload the users list
        } else {
            const error = await response.json();
            showMessage('add-user-message', 'Error: ' + error.message, 'error');
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        showMessage('add-user-message', 'Failed to delete user', 'error');
    }
}

// Setup add user form
function setupAddUserForm() {
    const form = document.getElementById('add-user-form');
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = document.getElementById('new-username').value;
        const email = document.getElementById('new-email').value;
        const password = document.getElementById('new-password').value;
        const role = document.getElementById('new-role').value;
        
        const userData = {
            username: username,
            email: email,
            password: password,
            role: role
        };
        
        try {
            const response = await fetch('/api/admin/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Cookie': document.cookie
                },
                credentials: 'include',
                body: JSON.stringify(userData)
            });
            
            if (response.ok) {
                const data = await response.json();
                showMessage('add-user-message', data.message, 'success');
                form.reset();
                loadUsers(); // Reload the users list
            } else {
                const error = await response.json();
                showMessage('add-user-message', 'Error: ' + error.message, 'error');
            }
        } catch (error) {
            console.error('Error creating user:', error);
            showMessage('add-user-message', 'Failed to create user', 'error');
        }
    });
}

// Setup refresh button
function setupRefreshButton() {
    const refreshButton = document.getElementById('refresh-users');
    refreshButton.addEventListener('click', () => {
        loadUsers();
        showMessage('add-user-message', 'Users refreshed!', 'success');
    });
}

// Show message
function showMessage(elementId, message, type) {
    const messageEl = document.getElementById(elementId);
    messageEl.textContent = message;
    messageEl.className = `message ${type}`;
    messageEl.style.display = 'block';
    
    // Hide message after 5 seconds
    setTimeout(() => {
        messageEl.style.display = 'none';
    }, 5000);
}

// Go to regular dashboard
function goToRegularDashboard() {
    window.location.href = '../html/dashboard.html';
}

// Logout function
async function logout() {
    try {
        const response = await fetch('/logout', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Cookie': document.cookie
            }
        });
        
        // Clear local storage
        localStorage.removeItem('userSession');
        localStorage.removeItem('sessionId');
        
        // Clear cookies
        document.cookie = 'sessionId=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        
        if (response.ok) {
            window.location.href = '../html/login.html';
        } else {
            // Even if server request fails, redirect to login
            window.location.href = '../html/login.html';
        }
    } catch (error) {
        console.error('Logout error:', error);
        // Clear local data and redirect anyway
        localStorage.removeItem('userSession');
        localStorage.removeItem('sessionId');
        window.location.href = '../html/login.html';
    }
}
