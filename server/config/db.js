import mongoose from 'mongoose';
import User from '../models/User.js';
import Job from '../models/Job.js';
import Application from '../models/Application.js';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Clean up all collections
    await cleanupDatabase();

  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

const cleanupDatabase = async () => {
  try {
    console.log('\nCleaning up database...');

    // Drop collections
    await Promise.all([
      mongoose.connection.collection('applications').drop().catch(err => {
        if (err.code !== 26) console.error('Error dropping applications:', err);
      }),
      mongoose.connection.collection('jobs').drop().catch(err => {
        if (err.code !== 26) console.error('Error dropping jobs:', err);
      }),
      mongoose.connection.collection('users').drop().catch(err => {
        if (err.code !== 26) console.error('Error dropping users:', err);
      })
    ]);

    console.log('Database cleanup completed\n');
  } catch (error) {
    console.error('Database cleanup error:', error);
  }
};

export default connectDB; 