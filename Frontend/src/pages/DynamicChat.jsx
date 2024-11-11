import React, { useEffect, useRef, useState } from 'react';
import { FaUser, FaUsers, FaVideo, FaMicrophone, FaMicrophoneSlash, FaVideoSlash, FaComments } from 'react-icons/fa';
import { MdCallEnd } from 'react-icons/md';




const SERVER_URL = 'ws://localhost:3200';

const DynamicChat = () => {
  const [roomId, setRoomId] = useState('');
  const [username, setUsername] = useState('');
  const [userAvatar, setUserAvatar] = useState(null);
  const [isJoined, setIsJoined] = useState(false);
  const [peers, setPeers] = useState({});
  const [participants, setParticipants] = useState([]);
  const [showParticipants, setShowParticipants] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const localStreamRef = useRef(null);
  const videoRefs = useRef({});
  const socketRef = useRef(null);
  const toastRef = useRef(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
const screenStreamRef = useRef(null);
const [showChat, setShowChat] = useState(false);

  const signalQueue = {}; // Object to store queued signals by peer ID


// Existing handleMessage function


  

  const handleMessage = async (data) => {
    switch (data.type) {
      case 'new-participant':
        if (!peers[data.id]) {
          await createPeerConnection(data.id, true);
        }
        setParticipants((prev) => [
          ...prev,
          { id: data.id, username: data.username, avatar: data.avatar },
        ]);
        showToast(`${data.username} has joined the room.`);
        
        // Process queued signals for this peer
        if (signalQueue[data.id]) {
          while (signalQueue[data.id].length) {
            const signalData = signalQueue[data.id].shift();
            await handleSignal(data.id, signalData);
          }
          delete signalQueue[data.id];
        }
        break;

      case 'signal':
        if (!peers[data.id]) {
          console.warn(`Peer connection not found for ID: ${data.id}. Queuing signal...`);
          signalQueue[data.id] = signalQueue[data.id] || [];
          signalQueue[data.id].push(data.signalData);
        } else {
          await handleSignal(data.id, data.signalData);
        }
        break;

      case 'participant-left':
        showToast(`${data.username} has left the room.`);
        removeParticipant(data.id);
        setParticipants((prev) => prev.filter((p) => p.id !== data.id));
        break;

        case 'chat':
          setMessages((prev) => [...prev, data]);
          showToast(`${data.username}: ${data.content}`);
          break;

      default:
        console.error('Unknown message type:', data.type);
    }
  };

  const sendMessage = (messageContent) => {
    try {
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(
          JSON.stringify({
            type: 'chat',
            roomId,
            username,
            content: messageContent,
            timestamp: new Date().toISOString(),
          })
        );
      } else {
        throw new Error('WebSocket connection is not open');
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      showToast('Failed to send message.');
    }
  };
  
  
 

  const showToast = (message) => {
    if (toastRef.current) { // Check if the ref is available
      const toast = document.createElement('div');
      toast.className = 'toast';
      toast.innerText = message;
      toastRef.current.appendChild(toast);
      setTimeout(() => {
        toast.remove();
      }, 3000);
    }
  };

  const handleSignal = async (id, signalData) => {
    const peerConnection = peers[id];
    
    peerConnection.ontrack = (event) => {
      if (event.streams[0]) {
        videoRefs.current[id].srcObject = event.streams[0];
      }
    };
  
    if (!peerConnection) {
      console.error(`Peer connection not found for ID: ${id}`);
      return;
    }

    try {
      if (signalData.sdp) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(signalData.sdp));
        if (signalData.sdp.type === 'offer') {
          const answer = await peerConnection.createAnswer();
          await peerConnection.setLocalDescription(answer);
          socketRef.current.send(JSON.stringify({ type: 'signal', targetId: id, signalData: { sdp: answer } }));
        }
      } else if (signalData.candidate) {
        await peerConnection.addIceCandidate(new RTCIceCandidate(signalData.candidate));
      }
    } catch (error) {
      console.error('Error handling signal:', error);
    }
  };
  

  const joinRoom = async () => {
    if (!roomId) return alert('Please enter a Room ID');
    if (!username) return alert('Please enter your username');

    const avatar = userAvatar || `https://api.adorable.io/avatars/285/${username}.png`;

    setLoading(true);
    setIsJoined(true);
    setConnectionStatus('Joining room...');

    // Open WebSocket connection only when joining the room
    socketRef.current = new WebSocket(SERVER_URL);

    socketRef.current.onopen = async () => {
      setConnectionStatus('Connected to server');
      
      try {
        // Initialize local media stream
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStreamRef.current.srcObject = stream;

        // Only join the room after the local stream is successfully set
        socketRef.current.send(JSON.stringify({ type: 'join', roomId, username, avatar }));
        setLoading(false);
      } catch (error) {
        console.error('Error accessing media devices:', error);
        alert('Could not access media devices.');
        setLoading(false);
      }
    };

    socketRef.current.onclose = () => {
      setConnectionStatus('Disconnected from server');
      cleanupConnections();
    };

    socketRef.current.onerror = (error) => {
      console.error('WebSocket error:', error);
      showToast('WebSocket error occurred');
    };

    socketRef.current.onmessage = async (message) => {
      const data = JSON.parse(message.data);
      handleMessage(data);
    };
  };

  const leaveRoom = () => {
    if (socketRef.current) {
      socketRef.current.send(JSON.stringify({ type: 'leave', roomId, username }));
    }
    cleanupConnections();
    if (socketRef.current) socketRef.current.close();
    setIsJoined(false);
    setParticipants([]);
    setPeers({});
    showToast('You left the room.');
  };

  const createPeerConnection = async (id, initiator) => {
    if (peers[id] || !localStreamRef.current.srcObject) return;

    const peerConnection = new RTCPeerConnection();

    // Add local tracks to peer connection
    localStreamRef.current.srcObject.getTracks().forEach(track => {
      peerConnection.addTrack(track, localStreamRef.current.srcObject);
    });

    peerConnection.ontrack = (event) => {
      if (event.streams[0] && videoRefs.current[id]) {
        videoRefs.current[id].srcObject = event.streams[0];
      } else {
        console.error(`Video reference for ${id} is not available`);
      }
    };
    

    peerConnection.ontrack = (event) => {
      if (event.streams[0] && videoRefs.current[id]) {
        videoRefs.current[id].srcObject = event.streams[0];
      } else {
        console.error(`Video reference for ${id} is not available`);
      }
    };
    

    setPeers(prevPeers => ({ ...prevPeers, [id]: peerConnection }));

    if (initiator) {
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      socketRef.current.send(JSON.stringify({
        type: 'signal',
        targetId: id,
        signalData: { sdp: peerConnection.localDescription },
      }));
    }
  };

  const removeParticipant = (id) => {
    const peerConnection = peers[id];
    if (peerConnection) {
      peerConnection.close();
    }
  
    // Clear the video element for the removed participant
    const videoElement = videoRefs.current[id];
    if (videoElement) {
      videoElement.srcObject = null; // Clear video stream
      delete videoRefs.current[id]; // Remove the reference from videoRefs
    }
  
    setPeers((prevPeers) => {
      const { [id]: _, ...remainingPeers } = prevPeers;
      return remainingPeers;
    });
  
    setConnectionStatus(`Participant left: ${id}`);
  };
  

  const cleanupConnections = () => {
    Object.keys(peers).forEach((id) => {
      const peerConnection = peers[id];
      if (peerConnection) peerConnection.close();
    });
    setParticipants([]);
    setPeers({});
  };

  const toggleParticipantsPanel = () => setShowChat(false);

  const toggleAudio = () => {
    const audioTrack = localStreamRef.current?.srcObject?.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsAudioEnabled(audioTrack.enabled);
    }
  };

  const toggleVideo = () => {
    const videoTrack = localStreamRef.current?.srcObject?.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsVideoEnabled(videoTrack.enabled);
    }
  };

  const startScreenShare = async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      screenStreamRef.current = screenStream;
      localStreamRef.current.srcObject = screenStream;
      setIsScreenSharing(true);
    } catch (error) {
      console.error('Error starting screen share:', error);
    }
  };

  const stopScreenShare = () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    localStreamRef.current.srcObject = null;
    setIsScreenSharing(false);
  };

  const generateRandomColor = () => {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  };

  const Chat = () => (
    <div className="chat-box p-3">
      {messages.map((msg, index) => (
        <div key={msg.timestamp} className="message p-2 border-b">
        <span className="font-semibold text-blue-500">{msg.username}:</span>
        <span className="ml-2">{msg.content}</span>
        <span className="ml-auto text-xs text-gray-400">
          {new Date(msg.timestamp).toLocaleTimeString()}
        </span>
      </div>
      
      ))}
      <input 
        type="text" 
        placeholder="Type a message..." 
        className="w-full p-2 border rounded-md mt-2"
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            sendMessage(e.target.value);
            e.target.value = '';
          }
        }}
      />
    </div>
  );

  
  
  return (
    <div className=''>
   

      <div className="flex h-screen w-screen">
      <div className="flex flex-col flex-1 bg-gray-50 overflow-hidden">
        <header className="flex justify-between items-center p-4 bg-gray-100 border-b border-gray-200 shadow-md">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowChat(false)}
              className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition"
              aria-label="Toggle Participants Panel"
            >
              <FaUsers className="mr-2" />
              Participants
            </button>
            <p className="text-sm text-gray-500">{connectionStatus}</p>
          </div>
          <h1 className="text-xl font-bold text-gray-800">Video Conference</h1>
          <button
            onClick={leaveRoom}
            className="flex items-center px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition duration-200"
            aria-label="Leave Room"
          >
            <MdCallEnd className="mr-2" />
            Leave Room
          </button>
        </header>

        <div className="flex flex-grow overflow-hidden">
          <main className="flex-1 flex flex-col items-center justify-center bg-gray-50">
            {!isJoined ? (
              // Room join form
              <div className="w-full max-w-sm p-5 bg-white rounded-md shadow-md space-y-4">
                <input type="text" placeholder="Room ID" value={roomId} onChange={(e) => setRoomId(e.target.value)} className="w-full p-3 border rounded-md focus:border-blue-500 focus:outline-none" />
                <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full p-3 border rounded-md focus:border-blue-500 focus:outline-none" />
                <button onClick={joinRoom} className="w-full flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md" aria-label="Join Room">
                  <FaUser className="mr-2" />
                  Join Room
                </button>
              </div>
            ) : (
              // Video section
              <div className="w-full h-full flex flex-col overflow-y-auto">
                <div className="flex-grow grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4 bg-white rounded-md shadow-lg">
                  <div className="relative w-full h-48 group">
                    <video ref={localStreamRef} autoPlay playsInline muted className="w-full h-full border border-gray-300 rounded-md" />
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-25 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-white">You</span>
                    </div>
                  </div>
                  {participants.map((participant) => (
                    <div key={participant.id} className="relative w-full h-48 group">
                      <video ref={(el) => (videoRefs.current[participant.id] = el)} autoPlay playsInline className="w-full h-full border border-gray-300 rounded-md" />

                      <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-25 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-white">{participant.username}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Control Panel */}
                <div className="flex justify-center space-x-4 py-3 bg-gray-200 border-t border-gray-300">
                  <button onClick={toggleVideo} className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition" title={isVideoEnabled ? 'Turn Off Video' : 'Turn On Video'}>
                    {isVideoEnabled ? <FaVideo /> : <FaVideoSlash />}
                  </button>
                  <button onClick={toggleAudio} className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition" title={isAudioEnabled ? 'Mute Audio' : 'Unmute Audio'}>
                    {isAudioEnabled ? <FaMicrophone /> : <FaMicrophoneSlash />}
                  </button>
                  <button onClick={leaveRoom} className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition" title="Leave Room">
                    <MdCallEnd />
                  </button>
                  <button
  onClick={() => {
    setShowChat(!showChat);
    console.log('Chat Toggled:', !showChat); // Debugging line
  }}
  className="p-2 bg-green-500 text-white rounded-full hover:bg-green-600 transition"
  title="Toggle Chat"
>
  <FaComments />
</button>

                </div>
              </div>
            )}
          </main>

          {/* Chat/Participants Sidebar */}
          {showChat ? (
            <aside className="h-full w-1/4 bg-white border-l border-gray-200 shadow-lg flex flex-col">
              <h2 className="text-lg font-semibold text-gray-700 bg-gray-200 p-3 text-center">Chat</h2>
              <Chat />
            </aside>
          ) : (
            showParticipants && (
              <aside className="h-full w-1/4 bg-white border-l border-gray-200 shadow-lg flex flex-col">
                <h2 className="text-lg font-semibold text-gray-700 bg-gray-200 p-3 text-center">Participants</h2>
                <ul className="p-3 space-y-2 overflow-y-auto">
                  {participants.map((participant) => (
                    <li key={participant.id} className="flex items-center space-x-3 p-2 hover:bg-gray-100 rounded-md">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold" style={{ backgroundColor: generateRandomColor() }}>
                        {participant.username[0].toUpperCase()}
                      </div>
                      <span className="text-gray-800 font-medium">{participant.username}</span>
                    </li>
                  ))}
                </ul>
              </aside>
            )
          )}
        </div>
      </div>
    </div>

    
    <div>

    </div>
      </div>
      

     
  );
};

export default DynamicChat;
