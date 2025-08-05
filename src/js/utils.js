// const { log } = require("console");

console.log("Utils.js loaded successfully");

// --- DOM Elements ---
const loginContainer = document.getElementById('login-container');
const welcomeContainer = document.getElementById('welcome-container');
const loginForm = document.getElementById('login-form');
const logoutButton = document.getElementById('logout-button');
const errorMessage = document.getElementById('error-message');
const welcomeMessage = document.getElementById('welcome-message');

console.log("DOM Elements found:", {
    loginContainer: !!loginContainer,
    loginForm: !!loginForm,
    errorMessage: !!errorMessage
});

// Get input elements for navigation
const emailInput = document.getElementById('email');
const senhaInput = document.getElementById('senha');

// --- Event Listeners ---

// Add Enter key navigation between form fields
if(emailInput && senhaInput) {
	emailInput.addEventListener('keydown', (event) => {
	if (event.key === 'Enter') {
			event.preventDefault(); // Prevent form submission
			senhaInput.focus(); // Move focus to password field
		}
	});

	senhaInput.addEventListener('keydown', (event) => {
		if (event.key === 'Enter') {
			// Allow the form to submit when Enter is pressed in the password field
			loginForm.dispatchEvent(new Event('submit'));
		}
	});
}

/**
* Handles the login form submission.
* It prevents the default form action, sends credentials to the backend,
* and updates the UI based on the response.
*/

if (loginForm) {
	console.log("Login form found, adding event listener");
	loginForm.addEventListener('submit', async (event) => {
		console.log("Login form submitted!");
		event.preventDefault(); // Prevent page reload
		
		if (errorMessage) {
			errorMessage.classList.add('hidden'); // Hide previous errors
		}

		// Fix: Use the correct form field names from your HTML
		const email = loginForm.email.value;  // Changed from 'usuario' to 'email'
		const password = loginForm.senha.value;    // Changed from 'password' to 'senha'
		
		console.log("Login attempt:", email, "Password length:", password.length);
		
		try {
				// Send a POST request to the backend's /login endpoint
				const response = await fetch('/login', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({ 
						email: email, 
						password: password 
					}),
					
				});
				const data = await response.json();
				console.log("Server response:", response.status, data);

				if (response.ok) {
					console.log("Login successful, redirecting...");
					// If login is successful, save session and redirect
					// Store the session ID from server for authentication
					localStorage.setItem('sessionId', data.sessionId);
					localStorage.setItem('userSession', JSON.stringify({
						username: data.username,
						email: email,
						role: data.role || 'user',
						loginTime: new Date().toISOString()
					}));
					
					// Redirect based on user role
					if (data.role === 'admin') {
						console.log("Redirecting to admin dashboard");
						window.location.href = '../html/admin.html';
					} else {
						console.log("Redirecting to user dashboard");
						window.location.href = '../html/dashboard.html';
					}
				} else {
					// If login fails, show an error
					showError(data.message);
				}
		} catch (error) {
				// Handle network errors or server being down
				console.error('Login request failed:', error);
				showError('Could not connect to the server. Please try again later.');
		}
	});
}

/**
* Handles the logout button click.
* It clears the session and redirects to the home page.
*/
if (logoutButton) {
	logoutButton.addEventListener('click', async () => {
		try {
			// Send logout request to server (if you have session management)
			const response = await fetch('/logout', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				}
			});

			// Clear any stored session data
			localStorage.removeItem('userSession');
			sessionStorage.removeItem('userSession');
			
			// Provide user feedback
			console.log('User logged out successfully');
			
			// Redirect to home page
			window.location.href = '/';
			
		} catch (error) {
			console.error('Logout request failed:', error);
			
			// Even if server request fails, clear local session and redirect
			localStorage.removeItem('userSession');
			sessionStorage.removeItem('userSession');
			window.location.href = '/';
		}
	});
}

// --- Navbar Management Functions ---

/**
 * Updates the navbar based on the user's login status
 */
function updateNavbar() {
	const session = localStorage.getItem('userSession');
	const loginLink = document.getElementById('login-link');
	const userSection = document.getElementById('user-section');
	const dashboardLink = document.getElementById('dashboard-link');
	const userAvatar = document.getElementById('user-avatar');
	const userName = document.getElementById('user-name');
	
	if (session) {
		// User is logged in
		const userData = JSON.parse(session);
		
		// Hide login link, show user section and dashboard link
		if (loginLink) loginLink.style.display = 'none';
		if (userSection) userSection.style.display = 'flex';
		if (dashboardLink) dashboardLink.style.display = 'block';
		
		// Update user info
		if (userName) userName.textContent = userData.username;
		if (userAvatar) {
			// Set avatar to first letter of username
			userAvatar.textContent = userData.username.charAt(0).toUpperCase();
		}
		
		console.log('Navbar updated for logged in user:', userData.username);
	} else {
		// User is not logged in
		if (loginLink) loginLink.style.display = 'block';
		if (userSection) userSection.style.display = 'none';
		if (dashboardLink) dashboardLink.style.display = 'none';
		
		console.log('Navbar updated for anonymous user');
	}
}

/**
 * Initialize navbar on page load
 */
function initializeNavbar() {
	// Update navbar based on current login status
	updateNavbar();
	
	// Set up logout button if it exists
	const logoutButton = document.getElementById('logout-button');
	if (logoutButton) {
		logoutButton.addEventListener('click', () => {
			// Clear session storage
			localStorage.removeItem('userSession');
			sessionStorage.removeItem('userSession');
			
			// Send logout request to server
			fetch('/logout', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				}
			}).then(() => {
				console.log('Logout successful');
			}).catch(error => {
				console.error('Logout error:', error);
			});
			
			// Update navbar and redirect
			updateNavbar();
			window.location.href = '/';
		});
	}
}

// Initialize navbar when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
	initializeNavbar();
});

// --- UI Update Functions ---

/**
* Hides the login form and shows the welcome message.
* @param {string} message - The welcome message from the server.
*/
function showWelcomeScreen(message) {
	loginContainer.classList.add('hidden');
	welcomeMessage.textContent = message;
	welcomeContainer.classList.remove('hidden');
}

/**
* Hides the welcome message and shows the login form.
*/
function showLoginScreen() {
	welcomeContainer.classList.add('hidden');
	loginContainer.classList.remove('hidden');
	loginForm.reset(); // Clear username and password fields
}

/**
* Displays an error message on the login form.
* @param {string} message - The error message to display.
*/
function showError(message) {
	errorMessage.textContent = message;
	errorMessage.classList.remove('hidden');
}