import express from 'express';
import { Server } from 'socket.io';
import http from 'http';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  }
});

// Maintain a map to store users and their activity status
const userStatus = new Map();

// Server-side (Node.js using socket.io)
io.on('connection', (socket) => {
  socket.on('joinRoom', ({ userName, roomId }) => {
    socket.join(roomId);
    console.log(`${userName} joined room ${roomId}`);
  });

  // Handling message sending
  // Server-side (Node.js example)
socket.on('sendMessage', (messageData) => {
  const { roomId } = messageData;
  // Broadcast the message to everyone except the sender
  socket.to(roomId).emit('receiveMessage', messageData);
});

socket.on('joinRoom', ({ userName, roomId }) => {
  socket.join(roomId);
  console.log(`${userName} joined room ${roomId}`);
});



});



io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Listen for user joining with details
  socket.on('join-room', (data) => {
    const { userName, roomId } = data;
    userStatus.set(socket.id, { userName, roomId, cameraOn: true, muted: false });
    
    socket.join(roomId);
    console.log(`${userName} joined room: ${roomId}`);
    
    // Notify other users in the room
    socket.to(roomId).emit('user-joined', { userName, socketId: socket.id });
  });

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
    const { roomId } = data;
    socket.to(roomId).emit('message', data);
  });
  // Server-side event listener for receiving a message
socket.on('sendMessage', (data) => {
  const { roomId, userName, message } = data;
  
  // Broadcast the message to all clients in the same room
  socket.to(roomId).emit('receiveMessage', {
    roomId,
    userName,
    message,
  });
});


  // Toggle camera on/off status
  socket.on('toggle-camera', (data) => {
    const { cameraOn } = data;
    const user = userStatus.get(socket.id);
    if (user) {
      user.cameraOn = cameraOn;
      const { userName, roomId } = user;
      console.log(`${userName} has turned the camera ${cameraOn ? 'on' : 'off'}`);
      io.to(roomId).emit('camera-status-changed', { userName, cameraOn });
    }
  });
  // Server-side (Node.js)
socket.on('message', (data) => {
  // Emit the message to all other clients in the room
  socket.to(data.roomId).emit('message', data);
});


  // Toggle mute status
  socket.on('toggle-mute', (data) => {
    const { muted } = data;
    const user = userStatus.get(socket.id);
    if (user) {
      user.muted = muted;
      const { userName, roomId } = user;
      console.log(`${userName} is now ${muted ? 'muted' : 'unmuted'}`);
      io.to(roomId).emit('mute-status-changed', { userName, muted });
    }
  });

  // Handle user disconnect
  socket.on('disconnect', () => {
    const user = userStatus.get(socket.id);
    if (user) {
      const { userName, roomId } = user;
      console.log(`${userName} disconnected from room: ${roomId}`);
      io.to(roomId).emit('user-left', { userName, socketId: socket.id });
      userStatus.delete(socket.id);
    }
  });
});

server.listen(5201, () => {
  console.log('Signaling server running on port 5201');
});
