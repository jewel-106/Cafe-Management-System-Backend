const { Pool } = require('pg');
require('dotenv').config();


// Create a new pool with the database URL from environment variables
// const pool = new Pool({
//     host: 'db.sqmrjdbukuthsimdnviz.supabase.co',
//     port: 5432,
//     database: 'postgres',
//     user: 'postgres',
//     password: 'testadmin',
//     ssl: { rejectUnauthorized: false }
// });
// console.log("DATABASE_URL", process.env.DATABASE_URL);



// // Handle connection errors
// pool.on('connect', () => {
//     console.log('Connected to the PostgreSQL database');
// });

// pool.on('error', (err) => {
//     console.error('Error with PostgreSQL connection:', err);
// });
const pool = new Pool({
    port: process.env.DB_PORT || 5432,
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USERNAME || 'cafe',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'cafe',
    connectTimeout: 10000
});


// Establish connection
pool.connect((err, client, release) => {
    if (!err) {
        console.log("✅ Connected to PostgreSQL Successfully");
    } else {
        console.error("❌ Database Connection Failed:");
    }
});

module.exports = pool;
