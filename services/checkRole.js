require("dotenv").config();

function checkRole(req, res, next) {

  // Check if the role matches MY_USER from environment variables
  if (res.locals.role === process.env.MY_USER) {
    return res.sendStatus(403); // Forbidden if the role matches MY_USER
  }

  next(); // Allow request to continue if role doesn't match
}

module.exports = { checkRole };
