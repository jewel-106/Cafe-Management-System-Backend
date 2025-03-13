require('dotenv').config();
const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.sendStatus(401); // Unauthorized if token is missing
  }

  jwt.verify(token, process.env.ACCESS_TOKEN, (err, response) => {
    if (err) {
      return res.sendStatus(403); // Forbidden if the token is invalid
    }

    res.locals = response; // Store decoded token data in res.locals
    req.user = response;   // Attach decoded token data to req.user
    console.log("res.locals.email:", res.locals.email); // Log the email from decoded token
    next(); // Proceed to the next middleware or route handler
  });
}

module.exports = { authenticateToken };
