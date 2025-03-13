const mysql = require('mysql2');
require('dotenv').config();

const connection = mysql.createConnection({
    port: process.env.DB_PORT || 3306,
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'test_db',
    connectTimeout: 10000
});

// Establish connection
connection.connect((err) => {
    if (!err) {
        console.log("✅ Connected to MySQL Successfully");
    } else {
        console.error("❌ Database Connection Failed:", err.code, err.message);
    }
});

module.exports = connection;
