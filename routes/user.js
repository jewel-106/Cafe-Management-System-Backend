const express = require("express");
const connection = require("../connection");
const router = express.Router();
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const path = require("path");
const multer = require("multer");
require("dotenv").config();
const bcrypt = require("bcryptjs");
var auth = require("../services/authentication");
var checkRole = require("../services/checkRole");

var transporter = nodemailer.createTransport({
  host: "sandbox.smtp.mailtrap.io",
  port: 2525,
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASSWORD,
  },
});

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // Save files in the 'uploads' directory
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname)); // Rename the file to avoid conflicts
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 } // 100 MB limit
});

// User Signup with Profile Picture Upload
router.post("/signup", upload.single("profile_photo"), (req, res) => {
  
console.log(req);

  let { name, email, contactNumber, password } = req.body;
  let profilePhoto = req.file;

  
  connection.query(
    "SELECT email FROM user WHERE email = ?",
    [email],
    (err, results) => {
      if (!err) {
        if (results.length > 0) {
          return res.status(400).json({ message: "Email already exists." });
        }

        // Hash Password
        const hashedPassword = bcrypt.hashSync(password, 10);

        connection.query(
          "INSERT INTO user (name, email, contactNumber, password, profile_photo, status, role) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [
            name,
            email,
            contactNumber,
            hashedPassword,
            profilePhoto ? profilePhoto.filename : null,
            "true",
            "user",
          ],
          (err, result) => {
            if (!err) {
              return res
                .status(201)
                .json({ message: "User Registered Successfully!" });
            } else {
              return res.status(500).json(err);
            }
          }
        );
      } else {
        return res.status(500).json(err);
      }
    }
  );
});

// User Login
router.post("/login", (req, res) => {
  let { email, password } = req.body;

  connection.query(
    "SELECT * FROM user WHERE email = ?",
    [email],
    (err, results) => {
      if (!err) {
        if (results.length == 0) {
          return res.status(401).json({ message: "Invalid Credentials" });
        }

        const user = results[0];
        if (!bcrypt.compareSync(password, user.password)) {
          return res.status(401).json({ message: "Invalid Credentials" });
        }

        // Create JWT Token
        const token = jwt.sign(
          { id: user.id, email: user.email, role: user.role },
          process.env.ACCESS_TOKEN,
          {
            expiresIn: "8h",
          }
        );
        console.log("token: ",token);
        return res.status(200).json({ message: "Login Successful", token });
      } else {
        return res.status(500).json(err);
      }
    }
  );
});

// Forgot Password - Generate OTP and send via email
router.post("/forgotPassword", (req, res) => {
  const user = req.body;
  query = "select email from user where email=?";
  connection.query(query, [user.email], (err, results) => {
    if (!err) {
      if (results.length <= 0) {
        return res.status(400).json({ message: "Email not found." });
      } else {
        const otp = Math.floor(100000 + Math.random() * 900000); // Generate 6-digit OTP

        // Save OTP to the database with check_otp false (not verified yet)
        query =
          "insert into otp_requests (email, otp, check_otp) values (?, ?, false)";
        connection.query(query, [user.email, otp], (err, result) => {
          if (!err) {
            // Send OTP via email
            var mailOptions = {
              from: process.env.EMAIL,
              to: user.email,
              subject: "Password Reset OTP for Cafe Management System",
              html: `<p>Your OTP is: <b>${otp}</b></p>
                     <p><b>Note:</b> OTP is valid for 5 minutes only.</p>`,
            };

            transporter.sendMail(mailOptions, (error, info) => {
              if (error) {
                return res.status(500).json({ message: "Failed to send OTP." });
              } else {
                return res
                  .status(200)
                  .json({ message: "OTP sent successfully to your email." });
              }
            });
          } else {
            return res.status(500).json(err);
          }
        });
      }
    } else {
      return res.status(500).json(err);
    }
  });
});

// Verify OTP - To verify the OTP sent via email
router.post("/verifyOtp", (req, res) => {
  const { email, otp } = req.body;
  query =
    "select * from otp_requests where email=? and otp=? and check_otp=false";
  connection.query(query, [email, otp], (err, results) => {
    if (!err) {
      if (results.length <= 0) {
        return res
          .status(400)
          .json({ message: "Invalid OTP or OTP already verified." });
      } else {
        // Update OTP status to true (verified)
        query =
          "update otp_requests set check_otp=true where email=? and otp=?";
        connection.query(query, [email, otp], (err, result) => {
          if (!err) {
            return res.status(200).json({
              message: "OTP verified. You can now reset your password.",
            });
          } else {
            return res.status(500).json(err);
          }
        });
      }
    } else {
      return res.status(500).json(err);
    }
  });
});

// Reset Password - After OTP verification
router.post("/resetPassword", (req, res) => {
  const { email, newPassword } = req.body;
  const hashedNewPassword = bcrypt.hashSync(newPassword, 10); // Hash the new password

  query = "update user set password=? where email=?";
  connection.query(query, [hashedNewPassword, email], (err, results) => {
    if (!err) {
      // Optionally, delete the OTP after password reset
      query = "delete from otp_requests where email=?";
      connection.query(query, [email], (err, result) => {
        if (!err) {
          return res
            .status(200)
            .json({ message: "Password reset successfully." });
        } else {
          return res.status(500).json(err);
        }
      });
    } else {
      return res.status(500).json(err);
    }
  });
});

// Get All Users - Admin Only (authentication and authorization)
router.get("/get", auth.authenticateToken, checkRole.checkRole, (req, res) => {
  var query =
    "select id,name,email,contactNumber,status from user where role='admin' or role='user'";
  connection.query(query, (err, results) => {
    if (!err) {
      return res.status(200).json(results);
    } else {
      return res.status(500).json(err);
    }
  });
});

// Update User Status - Admin Only
router.patch(
  "/update",
  auth.authenticateToken,
  checkRole.checkRole,
  (req, res) => {
    let user = req.body;
    var query = "update user set status=? where id=?";
    connection.query(query, [user.status, user.id], (err, results) => {
      if (!err) {
        if (results.affectedRows == 0) {
          return res.status(404).json({ message: "User id does not exist" });
        }
        return res.status(200).json({ message: "User Updated Successfully" });
      } else {
        return res.status(500).json(err);
      }
    });
  }
);

// Check Token - To verify the authentication token
router.get("/checkToken", auth.authenticateToken, (req, res) => {
  return res.status(200).json({ message: "true" });
});

// Change Password - After authenticating the user
router.post("/changePassword", auth.authenticateToken, (req, res) => {
  const user = req.body;
  const email = res.locals.email; // Email from the token

  // First, get the user's current hashed password from the database
  var query = "select password from user where email=?";
  connection.query(query, [email], (err, results) => {
    if (!err) {
      if (results.length <= 0) {
        return res.status(400).json({ message: "User not found" });
      }

      // Compare the provided oldPassword with the hashed password from the database
      if (!bcrypt.compareSync(user.oldPassword, results[0].password)) {
        return res.status(400).json({ message: "Incorrect Old Password" });
      }

      // Hash the new password before updating it
      query = "update user set password=? where email=?";
      connection.query(
        query,
        [bcrypt.hashSync(user.newPassword, 10), email],
        (err, results) => {
          if (!err) {
            return res
              .status(200)
              .json({ message: "Password Updated Successfully." });
          } else {
            return res.status(500).json(err);
          }
        }
      );
    } else {
      return res.status(500).json(err);
    }
  });
});

// Get User Details - Authenticated User Only  getUserDetails
// Get User Profile
router.get("/getUserDetails", auth.authenticateToken, (req, res) => {
  const userId = req.user.id; // Get the user ID from the authenticated token

  // Validate the user ID
  if (!userId) {
    return res.status(400).json({ message: "User ID is required" });
  }

  // Fetch user details from the database
  const query = `
    SELECT id, name, email, contactNumber, profile_photo 
    FROM user 
    WHERE id = ?
  `;
  connection.query(query, [userId], (err, results) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ message: "Database error", error: err.message || err });
    }

    // Check if the user exists
    if (results.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    // Format the user data
    const user = results[0];
    console.log("User data:", user);

    // Construct the full URL for the profile photo (if it exists)
    if (user.profile_photo) {
      user.profile_photo = `${req.protocol}://${req.get("host")}/uploads/${user.profile_photo}`;
    }

    // Return the user data
    return res.status(200).json(user);
  });
});

router.put("/updateProfile", auth.authenticateToken, upload.single("profilePhoto"), (req, res) => {
  const { name, contactNumber, email } = req.body;
  const id = req.user.id;

  // Validate required fields
  if (!name || !contactNumber || !email) {
    return res.status(400).json({ message: "All fields are required" });
  }

  // Step 1: Fetch the existing profile photo URL from the database
  const fetchQuery = `SELECT profile_photo FROM user WHERE id = ?`;
  connection.query(fetchQuery, [id], (fetchErr, fetchResult) => {
    if (fetchErr) {
      return res.status(500).json({ message: "Error fetching profile data", error: fetchErr.message || fetchErr });
    }

    if (fetchResult.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    // Step 2: Use the existing profile photo URL if no new file is uploaded
    let profilePhotoUrl = fetchResult[0].profile_photo; // Default to existing photo
    if (req.file) {
      profilePhotoUrl = `${req.file.filename}`; // Update to new photo if uploaded
    }

    // Step 3: Update the user profile
    const updateQuery = `UPDATE user SET name = ?, contactNumber = ?, email = ?, profile_photo = ? WHERE id = ?`;
    const values = [name, contactNumber, email, profilePhotoUrl, id];

    connection.query(updateQuery, values, (updateErr, updateResult) => {
      if (updateErr) {
        return res.status(500).json({ message: "Error updating profile", error: updateErr.message || updateErr });
      }

      if (updateResult.affectedRows === 0) {
        return res.status(404).json({ message: "User not found or no changes made" });
      }

      // Step 4: Send back the updated user data including profile photo URL
      const updatedUser = { id, name, contactNumber, email, profilePhotoUrl };
      return res.status(200).json({
        message: "Profile updated successfully",
        user: updatedUser,
      });
    });
  });
});

module.exports = router;
