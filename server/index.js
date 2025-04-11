import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { auth } from './middleware/auth.js';
import authRoutes from './routes/auth.js';
import jobRoutes from './routes/jobs.js';
import freelancerRoutes from './routes/freelancers.js';
import employerRoutes from './routes/employers.js';
import chatRoutes from './routes/chat.js';
import paymentRoutes from './routes/payments.js';
import adminRoutes from './routes/admin.js';
import milestoneRoutes from './routes/milestones.js';
import reviewRoutes from './routes/reviews.js';
import userRoutes from './routes/users.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { S3Client } from "@aws-sdk/client-s3";
import multer from 'multer';

dotenv.config({ path: './server/.env' });

const app = express();

// Get directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define uploads directories
const uploadsDir = path.join(__dirname, 'uploads');
const milestoneSubmissionsDir = path.join(uploadsDir, 'milestone-submissions');

// Ensure uploads directories exist with proper error handling
try {
  fs.mkdirSync(uploadsDir, { recursive: true });
  fs.mkdirSync(milestoneSubmissionsDir, { recursive: true });
  console.log('✓ Uploads directories created/verified successfully:');
  console.log('  - Main uploads directory:', uploadsDir);
  console.log('  - Milestone submissions directory:', milestoneSubmissionsDir);
} catch (error) {
  console.error('ERROR creating uploads directories:', {
    error: error.message,
    code: error.code,
    path: error.path
  });
}

// Serve static files from uploads directory with better error handling
app.use('/api/uploads', (req, res, next) => {
  console.log('Static file request:', req.url);
  next();
}, express.static(path.join(__dirname, 'uploads'), {
  setHeaders: function (res, filePath) {
    console.log('Serving static file:', filePath);
    // Set appropriate content type for various file types
    if (filePath.endsWith('.pdf')) {
      res.setHeader('Content-Type', 'application/pdf');
    } else if (filePath.endsWith('.doc') || filePath.endsWith('.docx')) {
      res.setHeader('Content-Type', 'application/msword');
    } else if (filePath.endsWith('.zip')) {
      res.setHeader('Content-Type', 'application/zip');
    } else if (filePath.endsWith('.rar')) {
      res.setHeader('Content-Type', 'application/x-rar-compressed');
    } else if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
      res.setHeader('Content-Type', 'image/jpeg');
    } else if (filePath.endsWith('.png')) {
      res.setHeader('Content-Type', 'image/png');
    }
  }
}));

// Enable CORS for all routes during development
app.use(cors({
  origin: true, // Allow all origins
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Parse JSON bodies
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`\n=== ${new Date().toISOString()} ===`);
  console.log(`${req.method} ${req.url}`);
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  console.log('Query:', req.query);
  next();
});

// MongoDB connection with better error handling
mongoose.connect('mongodb+srv://root:root@cluster0.dxyvx.mongodb.net/growgig?retryWrites=true&w=majority&appName=Cluster0', {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
})
.then(() => {
  console.log('Connected to MongoDB');
})
.catch(err => {
  console.error('MongoDB connection error:', {
    name: err.name,
    message: err.message,
    stack: err.stack
  });
  process.exit(1);
});

// Handle MongoDB connection events
mongoose.connection.on('error', err => {
  console.error('MongoDB error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.error('MongoDB disconnected. Attempting to reconnect...');
});

mongoose.connection.on('reconnected', () => {
  console.log('MongoDB reconnected');
});

// --- AWS S3 Client Initialization ---
// Initialize S3 Client WITHOUT explicit credentials (uses IAM Role from EC2)
const s3Client = new S3Client({
  region: process.env.AWS_REGION, // Required: Get region from .env
});
const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME; // Required: Get bucket name from .env
// --- End S3 Initialization ---

// --- Multer Configuration for S3 ---
// Configure Multer for memory storage to get file buffer for S3
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit (match frontend)
  // Optional: Add server-side file filtering logic here if needed
});
// --- End Multer Configuration ---

// Pass s3Client, BUCKET_NAME, and upload instance to routes that need them
// Option 1: Middleware (if routes need consistent access)
app.use((req, res, next) => {
  req.s3Client = s3Client;
  req.bucketName = BUCKET_NAME;
  req.upload = upload; // Make multer instance available
  next();
});

// Public routes
app.use('/api/auth', authRoutes);
// Make freelancers route public
app.use('/api/freelancers', freelancerRoutes);

// Protected routes
app.use('/api/users', auth, userRoutes);
app.use('/api/jobs', auth, jobRoutes);
// Removed freelancer routes from here since it's now public
app.use('/api/employers', auth, employerRoutes);
app.use('/api/chat', auth, chatRoutes);
app.use('/api/payments', auth, paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/milestones', auth, milestoneRoutes);
app.use('/api/reviews', auth, reviewRoutes);

// Special routes to handle direct API calls without the /api prefix
// These routes will redirect to the proper API routes
app.post('/payments/fund-escrow', auth, (req, res, next) => {
  console.log('Redirecting from /payments/fund-escrow to /api/payments/fund-escrow');
  req.url = '/api/payments/fund-escrow';
  app._router.handle(req, res);
});

// Specific handler for milestone review endpoints
app.post('/milestones/:id/review', auth, (req, res, next) => {
  console.log(`Redirecting from ${req.url} to /api${req.url}`);
  req.url = `/api${req.url}`;
  app._router.handle(req, res);
});

app.all('/payments/*', auth, (req, res, next) => {
  console.log(`Redirecting from ${req.url} to /api${req.url}`);
  req.url = `/api${req.url}`;
  app._router.handle(req, res);
});

app.all('/milestones/*', auth, (req, res, next) => {
  console.log(`Redirecting from ${req.url} to /api${req.url}`);
  req.url = `/api${req.url}`;
  app._router.handle(req, res);
});

app.post('/milestones', auth, (req, res, next) => {
  console.log('Redirecting from /milestones to /api/milestones');
  req.url = '/api/milestones';
  app._router.handle(req, res);
});

// 404 handler
app.use((req, res) => {
  console.log('404 - Route not found:', req.originalUrl);
  res.status(404).json({ message: 'Route not found' });
});

// Error handling middleware (MUST be after all routes)
app.use((err, req, res, next) => {
  console.error('\n=== Server Error ===');
  console.error('Error type:', err.name);
  console.error('Error message:', err.message);
  console.error('Stack trace:', err.stack);
  console.error('Request URL:', req.originalUrl);
  console.error('Request method:', req.method);
  console.error('Request headers:', req.headers);
  console.error('Request body:', req.body);
  console.error('=== End Error ===\n');

  res.status(500).json({ 
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? {
      type: err.name,
      message: err.message,
      stack: err.stack
    } : undefined
  });
});

const PORT = process.env.PORT || 5000;

// Add error handling for server startup
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  
  // Log all registered routes for debugging
  console.log('\n========= REGISTERED ROUTES =========');
  app._router.stack.forEach(middleware => {
    if (middleware.route) {
      // Routes directly registered on the app
      console.log(`${middleware.route.stack[0].method.toUpperCase()} ${middleware.route.path}`);
    } else if (middleware.name === 'router') {
      // Routes added through routers
      middleware.handle.stack.forEach(handler => {
        if (handler.route) {
          const method = handler.route.stack[0].method.toUpperCase();
          const path = handler.route.path;
          console.log(`${method} ${path}`);
        }
      });
    }
  });
  console.log('======================================\n');
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Please try a different port.`);
    process.exit(1);
  } else {
    console.error('Server error:', error);
    process.exit(1);
  }
});