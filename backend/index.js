import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Server } from 'socket.io';
import http from 'http';

// Import custom modules
import db from './utils/db.js';
import errorHandler from './middleware/errorHandler.js';
import authRoutes from './routes/auth.routes.js';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  }
});

// Middleware
app.use(cookieParser());
app.use(express.json());
app.use(cors({
  origin: [
    'https://patient.connectedes.co.za', 
    'http://localhost:5001', 
    'http://localhost:3000', 
    'http://localhost:8081'
  ],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));
app.use(errorHandler);

// Auth Routes
app.use('/api/userAuth', authRoutes);

// WebRTC signaling events
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Handle WebRTC signaling events
  socket.on('offer', (data) => {
    socket.broadcast.emit('offer', data);
  });

  socket.on('answer', (data) => {
    socket.broadcast.emit('answer', data);
  });

  socket.on('candidate', (data) => {
    socket.broadcast.emit('candidate', data);
  });

  // Handle incoming messages
  socket.on('message', (data) => {
    // Broadcast the message to all other clients
    socket.broadcast.emit('message', data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Server setup
const PORT = process.env.URL_PORT || 5000;
const SIGNALING_PORT = 5101;
const address = '0.0.0.0';

// Database connection and server start
db.query("SELECT 1")
  .then(data => {
    console.log("Database connection succeeded.");
    server.listen(SIGNALING_PORT, address, () => {
      console.log(`Signaling server running on port ${SIGNALING_PORT}`);
    });
    app.listen(PORT, address, () => {
      console.log(`Server started at Port: ${PORT}`);
    });
  })
  .catch(err => console.log("Database connection failed: " + err));
