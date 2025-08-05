require('dotenv').config();

console.log('Loading database module...');

const { Pool } = require('pg');

// Debug environment variables

const dbConfig = {
	user: process.env.DB_USER,
	host: process.env.DB_HOST,
	database: process.env.DB_NAME,
	password: process.env.DB_PASSWORD,
	port: parseInt(process.env.DB_PORT),
};

console.log('🔧 Database config created:')

const pool = new Pool(dbConfig);


async function initDatabase() {
	try {
		await pool.query(
			`CREATE TABLE IF NOT EXISTS users (
				id SERIAL PRIMARY KEY,
				username VARCHAR(50) UNIQUE NOT NULL,
				password VARCHAR(255) NOT NULL,
				email VARCHAR(100) UNIQUE NOT NULL,
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
			)
		`);
		await pool.query(
			`ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user'`
		);

		await insertDefaultUsers();
	} catch (err) {
		console.error('💥 Database initialization error:', err.message);
		console.error('Full error:', err);
		console.error('Stack:', err.stack);
		// Don't throw or exit - just log the error
		console.error('⚠️  Server will continue but database operations may fail');
	}
}


async function insertDefaultUsers() {
	console.log('Checking for existing admin user...');
	try {
        const existingAdmin = await pool.query(
            'SELECT username FROM users WHERE username = $1',
            [process.env.ADMIN_USERNAME]
        );
        
        if (existingAdmin.rows.length === 0) {
        	console.log('Creating admin user...');
            await pool.query(
                'INSERT INTO users (username, password, email, role) VALUES ($1, $2, $3, $4)',
                [
                    process.env.ADMIN_USERNAME,
                    process.env.ADMIN_PASSWORD,
                    process.env.ADMIN_EMAIL,
						  'admin'
                ]
            );
            console.log(`Admin user created: ${process.env.ADMIN_USERNAME}`);
        } else {
            console.log('Admin user already exists');

        }
    } catch (err) {
        console.error('Error creating admin user:', err.message);
        console.error('Full error:', err);
        // Don't throw - just log the error
    }
}

// funções da database
const userDB = {
	async findUser(username) {
		console.log(`Database: Looking for user '${username}'`);
		try {
			const result = await pool.query(
				'SELECT * FROM users WHERE username = $1',
				[username]
			);
			console.log(`Database: Found ${result.rows.length} user(s)`);
			return result.rows[0];
		} catch (err) {
			console.error('Database: Error in findUser:', err.message);
			throw err;
		}
	},

	async findUserByEmail(email) {
		console.log(`Database: Looking for user by email '${email}'`);
		try {
			const result = await pool.query(
				'SELECT * FROM users WHERE email = $1',
				[email]
			);
			console.log(`Database: Found ${result.rows.length} user(s)`);
			return result.rows[0];
		} catch (err) {
			console.error('Database: Error in findUserByEmail:', err.message);
			throw err;
		}
	},

	async createUser(username, password, email, role = 'user') {
		console.log(`Database: Creating user '${username}' with role '${role}'`);
		try {
			const result = await pool.query(
				'INSERT INTO users (username, password, email, role) VALUES ($1, $2, $3, $4) RETURNING *',
				[username, password, email, role]
			)
			console.log('Database: User created successfully');
			return result.rows[0];
		} catch (err) {
			console.error('Database: Error in createUser:', err.message);
			throw err;
		}
	},

	
	// ADMIN ONLY
	async deleteUser(userId) {
		console.log(`Database: Deleting user with ID '${userId}'`);
		try {
			const result = await pool.query(
				'DELETE FROM users WHERE id = $1 RETURNING *',
				[userId]
			);
			
			if (result.rows.length > 0) {
				console.log(`Database: User '${result.rows[0].username}' deleted successfully`);
				return result.rows[0];
			} else {
				console.log('Database: No user found with that ID');
				return null;
			}
		} catch (err) {
			console.error('Database: Error in deleteUser:', err.message);
			throw err;
		}
	},

	async getAllUsers() {
		console.log('Database: Getting all users');
		try {
            const result = await pool.query(
                'SELECT id, username, email, role, created_at FROM users ORDER BY created_at DESC'
            );
            console.log(`Database: Retrieved ${result.rows.length} users`);
            return result.rows;
        } catch (err) {
        	console.error('Database: Error in getAllUsers:', err.message);
            throw err;
        }
	}
}

// Initialize database with better error handling
initDatabase().then(() => {
	console.log('Database module initialization completed');
}).catch((error) => {
	console.error('Database module initialization failed:', error);
	console.error('⚠️ This might cause the server to exit');
});

module.exports = userDB;