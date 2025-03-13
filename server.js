require('dotenv').config();
const http = require('http');
const app = require('./index');  // Import app from index.js

const server = http.createServer(app);


app.get('/', (req, res) => {
    res.status(200).send("Hello from the server side");
});
// Start the server
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
});
