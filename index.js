const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const connection = require('./connection');
const userRoutes = require('./routes/user');
const categoryRoutes = require('./routes/category');
const productRoutes = require('./routes/product');
const billRoutes = require('./routes/bill');
const dashboardRoutes = require('./routes/dashboard');

const app = express();

app.use((req, res, next) => {
    console.log('Headers:', req.headers);
    next();
  });
app.use(express.json({ limit: '10mb' }));  // Increase the limit here
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Enable CORS
app.use(cors());

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Multer Storage Configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // Save files in "uploads" folder
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`); // Unique filename
    }
});

// Multer upload setup
const upload = multer({ storage });

// Register API Routes
app.use('/user', userRoutes); // These routes can still expect JSON
app.use('/category', categoryRoutes);
app.use('/product', productRoutes);
app.use('/bill', billRoutes);
app.use('/dashboard', dashboardRoutes);

// Use multer only for the file upload route
app.post('/upload', upload.single('file'), (req, res) => {
  res.json({ message: 'File uploaded successfully!', file: req.file });
});

module.exports = app;
