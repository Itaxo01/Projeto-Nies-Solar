// Import required modules

const express = require('express');
const path = require('path');

const userDB = require('./database');

const crypto = require('crypto');
const { log } = require('console');

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname)));


// --- Mock User Database ---
// In a real application, you would query a database (like PostgreSQL, MongoDB, etc.)
// and passwords would be securely hashed using a library like bcrypt.
const sessions = new Map();

// --- Routes ---

/**
 * Handles the root URL ('/').
 * It serves the main login page (index.html).
 */
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, './src/html/index.html'));
});

app.get('./src/html/dashboard.html', (req, res) => {
	const sessionId = req.headers['cookie']?.split('sessionId=')[1];
	
	if(!sessionId || !sessions.has(sessionId)) {
		return res.redirect('./src/html/login.html');
	}

	res.sendFile(path.join(__dirname, './src/html/dashboard.html'));
})

function isAdmin(req, res, next) {
	const sessionId = req.headers['cookie']?.split('sessionId=')[1];
    
    if (!sessionId || !sessions.has(sessionId)) {
        return res.status(401).json({
            success: false,
            message: 'Not authenticated'
        });
    }
    
    const userSession = sessions.get(sessionId);
    if (userSession.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Admin access required'
        });
    }
    
    req.userSession = userSession;
    next();
}

app.get('/admin', (req, res) => {
    const sessionId = req.headers['cookie']?.split('sessionId=')[1];
    
    if (!sessionId || !sessions.has(sessionId)) {
        return res.redirect('./src/html/login.html');
    }
    
    const userSession = sessions.get(sessionId);
    if (userSession.role !== 'admin') {
        return res.redirect('./src/html/dashboard.html'); // Redirect regular users to normal dashboard
    }
    
    res.sendFile(path.join(__dirname, './src/html/admin.html'));
});


/**
 * Handles the POST request for logging in.
 * It checks the provided username and password against the mock database.
 */
app.post('/login', async (req, res) => {
	
	const { email, password } = req.body;
	try {
		const user = await userDB.findUserByEmail(email);

		if (user && user.password === password) {
			// Create session
			const sessionId = crypto.randomBytes(16).toString('hex');
			sessions.set(sessionId, {
					username: user.username,
					email: user.email,
					role: user.role || 'user', // Include role in session
					loginTime: new Date()
			});
			
			console.log(`User '${email} ${sessionId}' logged in successfully with role: ${user.role || 'user'}`);
			res.status(200).json({ 
					success: true,
					message: `Welcome, ${user.username}!`,
					sessionId: sessionId,
					role: user.role || 'user', // Send role to frontend
					username: user.username
			});
		} else {
			console.log(`Failed login attempt for email: ${email}`);
			res.status(401).json({ 
					success: false,
					message: 'Invalid email or password.' 
			});
		}
    } catch (error) {
        console.error('Database error during login:', error);
        res.status(500).json({
            success: false,
            message: 'Server error occurred'
        });
    }
});

/**
 * Handles the POST request for logging out.
 * Clears any server-side session data and confirms logout.
 */
app.post('/logout', (req, res) => {
    const sessionId = req.headers['authorization'] || req.headers['cookie']?.split('sessionId=')[1];
    
    if (sessionId && sessions.has(sessionId)) {
        sessions.delete(sessionId);
        console.log('User session cleared');
    }
    
    res.status(200).json({ 
        success: true,
        message: 'Logged out successfully' 
    });
});

// --- Start the Server ---

app.get('/api/user', (req, res) => {
    const sessionId = req.headers['authorization'] || req.headers['cookie']?.split('sessionId=')[1];
    
    if (!sessionId || !sessions.has(sessionId)) {
        return res.status(401).json({
            success: false,
            message: 'Not authenticated'
        });
    }
    
    const userSession = sessions.get(sessionId);
    res.json({
        success: true,
        user: userSession
    });
});

// Admin API Routes
// GET ALL USERS (ADMIN ONLY)
app.get('/api/admin/users', isAdmin, async (req, res) => {
    console.log('🔍 Admin: Getting all users');
    try {
        const users = await userDB.getAllUsers();
        res.json({
            success: true,
            users: users
        });
    } catch (error) {
        console.error('💥 Admin: Error getting users:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get users'
        });
    }
});

// DELETE USER (ADMIN ONLY)
app.delete('/api/admin/users/:id', isAdmin, async (req, res) => {
    const userId = req.params.id;
    console.log(`🗑️ Admin: Delete request for user ID ${userId}`);
    
    try {
        const deletedUser = await userDB.deleteUser(userId);
        
        if (deletedUser) {
            // Remove user from active sessions if they're logged in
            for (const [sessionId, session] of sessions.entries()) {
                if (session.username === deletedUser.username) {
                    sessions.delete(sessionId);
                    console.log(`🚪 Removed session for deleted user: ${deletedUser.username}`);
                }
            }
            
            res.json({
                success: true,
                message: `User '${deletedUser.username}' deleted successfully`,
                deletedUser: deletedUser
            });
        } else {
            res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
    } catch (error) {
        console.error('💥 Admin: Error deleting user:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete user'
        });
    }
});

// CREATE USER (ADMIN ONLY)
app.post('/api/admin/users', isAdmin, async (req, res) => {
    const { username, password, email, role } = req.body;
    console.log(`👤 Admin: Creating user '${username}' with role '${role || 'user'}'`);
    
    try {
        const newUser = await userDB.createUser(username, password, email, role || 'user');
        res.json({
            success: true,
            message: `User '${username}' created successfully`,
            user: {
                id: newUser.id,
                username: newUser.username,
                email: newUser.email,
                role: newUser.role,
                created_at: newUser.created_at
            }
        });
    } catch (error) {
        console.error('💥 Admin: Error creating user:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create user',
            error: error.message
        });
    }
});

/**
 * Starts the Express server and listens for connections on the specified port.
 */
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
    console.log('To use this, open one terminal and run "node server.js".');
    console.log('Then, open http://localhost:3000 in your browser.');
});
