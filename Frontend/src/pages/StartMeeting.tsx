import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import socket from '../socket'; // Import the socket instance

interface WebSocketMessage {
  type: string;
  userId?: string;
  message?: string;
}

const StartMeeting: React.FC = () => {
  const [roomId, setRoomId] = useState<string>(''); 
  const [userName, setUserName] = useState<string>(''); 
  const [participants, setParticipants] = useState<string[]>([]); 
  const [showParticipants, setShowParticipants] = useState<boolean>(false);
  const [showChatButton, setShowChatButton] = useState<boolean>(false);
  const [email, setEmail] = useState<string>(''); 
  const [password, setPassword] = useState<string>(''); 

  const navigate = useNavigate(); 

  const handleWebSocketMessage = (data: WebSocketMessage) => {
    switch (data.type) {
      case 'join-confirmation':
        setParticipants((prev) => [...prev, data.userId!]);
        break;
      case 'room-participants':
        setParticipants(data.message?.split(',') || []);
        break;
      default:
        break;
    }
  };

  useEffect(() => {
    // Set up WebSocket event listeners
    socket.on('message', (data: WebSocketMessage) => {
      handleWebSocketMessage(data);
    });

    // Clean up the event listener on component unmount
    return () => {
      socket.off('message', handleWebSocketMessage);
    };
  }, []);

  // Login and join room function
  const joinRoom = async () => {
    if (socket && roomId && userName && email && password) {
      // First, validate email and password
      try {
        const response = await fetch('http://localhost:5000/api/userAuth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (data.success) {
          // If login is successful, join the room
          socket.send(
            JSON.stringify({
              type: 'join',
              room: roomId,
              userId: userName,
              email,
            })
          );

          // Show the participants section and chat button
          setShowParticipants(true);
          setShowChatButton(true);
        } else {
          alert(data.message); // Show an error message if login fails
        }
      } catch (error) {
        console.error('Error logging in:', error);
        alert('An error occurred while logging in.');
      }
    }
  };

  const goToChat = () => {
    navigate('/chat', { state: { roomId, userName } });
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white">
      <h1 className="text-2xl font-bold mb-4">Join a Meeting</h1>
      <div className="bg-gray-800 p-6 rounded-md shadow-md w-80">
        <div className="flex flex-col mb-4">
          <label className="text-sm mb-2">Enter Room ID:</label>
          <input
            type="text"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            className="p-2 rounded bg-gray-700 border-none focus:ring-2 focus:ring-blue-500 text-white"
          />
        </div>

        <div className="flex flex-col mb-4">
          <label className="text-sm mb-2">Enter Your Name:</label>
          <input
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            className="p-2 rounded bg-gray-700 border-none focus:ring-2 focus:ring-blue-500 text-white"
          />
        </div>

        <div className="flex flex-col mb-4">
          <label className="text-sm mb-2">Enter Your Email:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="p-2 rounded bg-gray-700 border-none focus:ring-2 focus:ring-blue-500 text-white"
          />
        </div>

        <div className="flex flex-col mb-4">
          <label className="text-sm mb-2">Enter Your Password:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="p-2 rounded bg-gray-700 border-none focus:ring-2 focus:ring-blue-500 text-white"
          />
        </div>

        <button
          onClick={joinRoom}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded transition duration-300"
        >
          Enter
        </button>
      </div>

      {showParticipants && (
        <div className="mt-8 w-80">
          <h2 className="text-lg font-bold mb-4">Participants in Room:</h2>
          <ul className="list-disc list-inside bg-gray-800 p-4 rounded-md">
            {participants.length > 0 ? (
              participants.map((participant, index) => (
                <li key={index} className="text-sm text-gray-300">
                  {participant}
                </li>
              ))
            ) : (
              <p className="text-gray-400">No participants yet.</p>
            )}
          </ul>
        </div>
      )}

      {showChatButton && (
        <button
          onClick={goToChat}
          className="mt-4 w-80 bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded transition duration-300"
        >
          Go to Chat
        </button>
      )}
    </div>
  );
};

export default StartMeeting;