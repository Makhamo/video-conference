import React, { useEffect, useRef, useState } from 'react';
import socket from '../socket';
import { useLocation } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import TopMenu from '../components/TopMenu';
import Participants from '../components/Participants';
import EmojiPicker from 'emoji-picker-react';
import { IoIosClose } from 'react-icons/io';
import { FaSpinner } from 'react-icons/fa';
import { FaVideo, FaVideoSlash, FaShareSquare } from 'react-icons/fa';
import { VscUnmute } from 'react-icons/vsc';
import { MdCallEnd } from 'react-icons/md';
import { IoIosRecording } from "react-icons/io";
import Host from '../components/Host';
import MessagingEnvironment from '../components/MessagingEnvironment';
import { FaUsers, FaComments } from 'react-icons/fa';
import { IoHandRight } from "react-icons/io5";
import { FcLikePlaceholder } from "react-icons/fc";


const iceServersConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    // Additional STUN/TURN servers can be added here
  ],
};

const Chat = () => {
  
  // Import necessary hooks from React and router
const location = useLocation(); // Gets the current location object from the router
const { roomId, userName } = location.state || {}; // Extracts roomId and userName from the location state, if available
const navigate = useNavigate(); // Provides navigation functionality

// State declarations for managing various states in the component
const [isCallActive, setIsCallActive] = useState(false); // Tracks if the call is active
const [isViewing, setIsViewing] = useState(true); // Tracks if the user is currently viewing the call
const [isCameraOn, setIsCameraOn] = useState(true); // Tracks the camera's on/off state
const [isMicOn, setIsMicOn] = useState(true); // Tracks the microphone's on/off state
const [isScreenSharing, setIsScreenSharing] = useState(false); // Tracks if screen sharing is active
const [isMessagingOpen, setIsMessagingOpen] = useState(false); // Tracks if the messaging panel is open
const [unreadCount, setUnreadCount] = useState(0); // Tracks the number of unread messages
const [transcript, setTranscript] = useState(''); // Stores the speech-to-text transcript
const [volume, setVolume] = useState(1); // Sets the audio volume
const [isTranscribing, setIsTranscribing] = useState(false); // Tracks if speech-to-text transcription is active

// References for accessing DOM elements and external objects
const recognitionRef = useRef(null); // Reference for speech recognition
const [callStartTime, setCallStartTime] = useState(null); // Stores the start time of the call
const [callDuration, setCallDuration] = useState(0); // Tracks the duration of the call
const localVideoRef = useRef(null); // Reference to the local video element
const remoteVideoRef = useRef(null); // Reference to the remote video element
const peerConnection = useRef(null); // Reference to the WebRTC peer connection
const localStream = useRef(null); // Reference to the local media stream

const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const [currentMessage, setCurrentMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [userTypingStatus, setUserTypingStatus] = useState('');
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  


useEffect(() => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRecognition) {
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptPart = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          setTranscript((prev) => prev + transcriptPart + '\n');
        } else {
          interimTranscript += transcriptPart;
        }
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech Recognition Error:', event.error);
    };

    recognitionRef.current = recognition;
  }
}, []);
useEffect(() => {
  if (transcript) {
    // Send the updated transcript to the server whenever it changes
    socket.emit('transcript', { roomId, transcript });
  }
}, [transcript, roomId]);


// Effect to track and update the call duration every second if a call is active
useEffect(() => {
  let interval;
  if (isCallActive && callStartTime) {
    interval = setInterval(() => {
      setCallDuration(Math.floor((Date.now() - callStartTime) / 1000)); // Update call duration
    }, 1000);
  }
  return () => clearInterval(interval); // Cleanup interval on component unmount or when call ends
}, [isCallActive, callStartTime]);


useEffect(() => {
  socket.on('message', (data) => {
    setMessages((prevMessages) => [...prevMessages, { ...data, isNew: true }]);
    setUnreadCount((prevCount) => prevCount + 1); // Increase unread messages count
  });

  const handleReconnect = () => {
    if (!socket.connected) {
      socket.connect(); // Reconnect the socket if disconnected
    }
  };

  socket.on('disconnect', handleReconnect);

  // Cleanup socket listeners on component unmount
  return () => {
    socket.off('message');
    socket.off('disconnect', handleReconnect);
  };
}, []);

// Effect to handle WebRTC peer connection setup and signaling
useEffect(() => {
  peerConnection.current = new RTCPeerConnection(iceServersConfig); // Create a new peer connection

  // Handle ICE candidates for NAT traversal
  peerConnection.current.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit('candidate', { candidate: event.candidate, roomId });
    }
  };

  // Handle incoming media tracks
  peerConnection.current.ontrack = (event) => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = event.streams[0];
      const remoteAudio = new Audio();
      remoteAudio.srcObject = event.streams[0];
      remoteAudio.volume = volume;
      remoteAudio.play(); // Play remote audio stream
    }
  };

  // Handle signaling events for WebRTC connection
  socket.on('offer', async (data) => {
    if (data.roomId !== roomId) return;
    await peerConnection.current?.setRemoteDescription(new RTCSessionDescription(data.offer));
    const answer = await peerConnection.current?.createAnswer();
    await peerConnection.current?.setLocalDescription(answer);
    socket.emit('answer', { answer, roomId });
  });

  socket.on('answer', async (data) => {
    if (data.roomId !== roomId) return;
    await peerConnection.current?.setRemoteDescription(new RTCSessionDescription(data.answer));
  });

  socket.on('candidate', async (data) => {
    if (data.roomId !== roomId) return;
    await peerConnection.current?.addIceCandidate(new RTCIceCandidate(data.candidate));
  });

  // Cleanup socket listeners on component unmount
  return () => {
    socket.off('offer');
    socket.off('answer');
    socket.off('candidate');
  };
}, [roomId, volume]);

// Video constraints configuration for the media stream
const videoConstraints = {
  width: { ideal: 720 },
  height: { ideal: 480 },
  frameRate: { ideal: 30, max: 60 },
};

// Function to start a call
const startCall = async () => {
  setIsCallActive(true);
  setCallStartTime(Date.now());

  // Get local media stream
  localStream.current = await navigator.mediaDevices.getUserMedia({
    video: videoConstraints,
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
    },
  });

  // Add local tracks to the peer connection
  localStream.current.getTracks().forEach((track) => {
    peerConnection.current?.addTrack(track, localStream.current);
  });

  // Set local video stream
  if (localVideoRef.current) {
    localVideoRef.current.srcObject = localStream.current;
  }

  // Create and send an offer to the other peer
  const offer = await peerConnection.current?.createOffer();
  await peerConnection.current?.setLocalDescription(offer);
  socket.emit('offer', { offer, roomId });

  // Start speech recognition if available
  if (recognitionRef.current) {
    recognitionRef.current.start();
    setIsTranscribing(true);
  }
};

// Function to end a call
const endCall = () => {
  peerConnection.current?.close(); // Close peer connection
  setIsCallActive(false);
  setCallStartTime(null);
  setCallDuration(0);

  // Stop media streams and cleanup
  if (localVideoRef.current) localVideoRef.current.srcObject = null;
  if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
  localStream.current?.getTracks().forEach((track) => track.stop());

  // Stop speech recognition if it was active
  if (recognitionRef.current && isTranscribing) {
    recognitionRef.current.stop();
    setIsTranscribing(false);
  }
};

// Function to toggle the microphone
const toggleMic = () => {
  const audioTrack = localStream.current?.getAudioTracks()[0];
  if (audioTrack) {
    audioTrack.enabled = !audioTrack.enabled;
    setIsMicOn(audioTrack.enabled);
  }
};

// Function to replace the video track
const replaceVideoTrack = (newTrack) => {
  const sender = peerConnection.current?.getSenders().find((s) => s.track?.kind === 'video');
  if (sender) {
    sender.replaceTrack(newTrack);
  }
};

// Function to toggle the camera
const toggleCamera = () => {
  const videoTrack = localStream.current?.getVideoTracks()[0];
  if (videoTrack) {
    videoTrack.enabled = !videoTrack.enabled;
    setIsCameraOn(videoTrack.enabled);
    replaceVideoTrack(videoTrack);
  }
};
//++++++++++++++++++++++++++++++++++++++++++++++++++++Share screen+++++++++++++++++++++++++++++++++++++++++++
// Function to toggle screen sharing
const toggleScreenShare = async () => {
  if (!isScreenSharing) {
    const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
    const screenTrack = screenStream.getTracks()[0];
    replaceVideoTrack(screenTrack);
    screenTrack.onended = () => toggleScreenShare(); // Stop sharing when screen sharing ends
    setIsScreenSharing(true);
  } else {
    const videoTrack = localStream.current?.getVideoTracks()[0];
    replaceVideoTrack(videoTrack); // Switch back to the camera video track
    setIsScreenSharing(false);
  }
};
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//+++++++++++++++++++++++++++++++++++++++++++++++Messages+++++++++++++++++++++++++++++++++++++++++++++++++++++++


useEffect(() => {
  socket.emit('joinRoom', { userName, roomId });

  socket.on('typing', (user) => {
    setUserTypingStatus(`${user} is typing...`);
    setTimeout(() => setUserTypingStatus(''), 2000);
  });

  socket.on('receiveMessage', (message) => {
    setMessages((prevMessages) => [...prevMessages, message]);
  });

  return () => {
    socket.emit('leaveRoom', { userName, roomId });
    socket.off('typing');
    socket.off('receiveMessage');
  };
}, [roomId, userName]);

useEffect(() => {
  if (messagesEndRef.current) {
    messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }
}, [messages]);

const handleTyping = (e) => {
  setCurrentMessage(e.target.value);
  if (!isTyping) {
    setIsTyping(true);
    socket.emit('typing', roomId);
  }

  clearTimeout(typingTimeoutRef.current);
  typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 1500);
};

const handleMessageSend = () => {
  if (!currentMessage.trim()) return;
  setIsSendingMessage(true);

  const messageData = {
    sender: userName,
    roomId,
    text: currentMessage.trim(),
    timestamp: new Date().toISOString(),
    status: 'sent',
  };

  socket.emit('sendMessage', messageData);
  const newMessage = { ...messageData, status: 'delivered' };

  messagesRef.current = [...messagesRef.current, newMessage];
  setMessages([...messagesRef.current]);
  setCurrentMessage('');
  setIsSendingMessage(false);
};

const handleEmojiSelect = (emoji) => {
  const cursorPosition = inputRef.current.selectionStart;
  const newMessage =
    currentMessage.slice(0, cursorPosition) +
    emoji.emoji +
    currentMessage.slice(cursorPosition);
  setCurrentMessage(newMessage);
  setIsEmojiPickerOpen(false);
};

const handleDoubleTap = (index) => {
  const updatedMessages = [...messages];
  updatedMessages[index].reaction = '❤️';
  setMessages(updatedMessages);
};

const handleClickOutside = (e) => {
  if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target)) {
    setIsEmojiPickerOpen(false);
  }
};

useEffect(() => {
  document.addEventListener('mousedown', handleClickOutside);
  return () => document.removeEventListener('mousedown', handleClickOutside);
}, []);


///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////




// Function to navigate back to the home page
const back = () => {
  endCall();
  navigate('/');
};

// Function to toggle viewing mode
const toggleViewing = () => {
  setIsViewing(!isViewing);
};

// Function to format the call duration into minutes and seconds
const formatDuration = (duration) => {
  const minutes = Math.floor(duration / 60);
  const seconds = duration % 60;
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};





  return (
    <div className="flex flex-col h-screen w-full border p-1 bg-gray-900 rounded-md overflow-hidden">
      {/* Top Menu Section */}
      
      <div className="chat-container">
      <TopMenu
          isCallActive={isCallActive}
          startCall={startCall}
          endCall={endCall}
          isViewing={isViewing}
          toggleViewing={toggleViewing}
          callDuration={callDuration}
          formatDuration={formatDuration}/>
    </div>
      {/* Main Content Section */}
      <div className="flex flex-col h-full">
        <div className="flex flex-row h-full bg-gray-900 space-x-1">

          
          {/* Keep Remote Video Screen */}
      
       <div className="relative w-full bg-gray-800 rounded-md overflow-hidden shadow-lg justify-center flex flex-col items-center">
        {/* grid */}
        
        <div className="flex flex-col md:flex-row justify-center items-center h-full w-full gap-1 py-1 bg-gray-900">
  {/* Remote Video Section */}
  <div className="relative w-full md:w-1/2 h-72 md:h-full bg-gray-800 rounded-r-lg overflow-hidden shadow-2xl flex flex-col justify-center items-center transition-transform duration-300 ease-in-out hover:scale-95">
    
    {/* User Name Label */}
    <div className="absolute top-2 left-2 bg-gray-900 bg-opacity-80 text-white text-sm font-semibold px-3 py-1 rounded-lg shadow-md">
      {userName}
    </div>

    {/* Remote Video */}
    <video
      ref={remoteVideoRef}
      autoPlay
      playsInline
      className="w-full h-full rounded-lg object-cover transition-opacity duration-500 p-1"
      style={{ opacity: remoteVideoRef.current?.srcObject ? 1 : 0.4 }}
    />

    {/* Loading Indicator */}
    {!remoteVideoRef.current?.srcObject && (
      <div className="flex flex-col items-center justify-center absolute inset-0 bg-gray-800 bg-opacity-70">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-gray-300"></div>
        <p className="text-gray-300 text-sm mt-3 animate-pulse">Waiting for the remote stream...</p>
      </div>
    )}
  </div>

  {/* Local Video Section */}
  <div className="bg-gray-800 rounded-l-lg shadow-2xl p-1 flex flex-col w-full md:w-1/2 h-72 md:h-full items-center justify-center transition-transform duration-300 ease-in-out hover:scale-95">
    <div className="font-bold text-xs mb-3 text-white">You</div>
    <video
      ref={localVideoRef}
      autoPlay
      muted
      playsInline
      className="h-full w-full max-h-64 md:max-h-full rounded-lg transform -scale-x-100 object-cover transition-all duration-500"
    />
  </div>
</div>






  <div className='h-14 bg-gradient-to-l w-full from-slate-700 to-gray-800 p-2  ' >
    <div className='min-w-48 items-center  bg-gradient-to-r  bg-gray-800 border border-gray-700 rounded-full h-full shadow-md '>
    <div className="flex flex-row justify-between items-center space-x-5 m-1">

      <div className='flex space-x-3'>
      <span className='bg-gray-800 rounded-full hover:bg-slate-700 duration-200'>
        <IoIosRecording
          className={`p-2 text-3xl cursor-pointer ${isMicOn ? 'text-white hover:text-green-500' : 'text-gray-400'}`}
          onClick={toggleMic}
          aria-label="Toggle Mic"
        />
        </span>
         {/* Inbox Button */}
      <button
        onClick={toggleViewing}
       className={`flex items-center p-2  rounded-full opacity-45 bg-green-200 text-gray-800 hover:bg-blue-200 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transform transition-all duration-200 ease-out`}
       aria-label="Toggle Inbox"
     >
       <FaComments className="" />
       <span className="hidden md:inline text-xs font-semibold"></span>
     </button>
      </div>
      <div className='flex space-x-3'>
 <span className='bg-gray-800 rounded-full hover:bg-slate-700 duration-200'>
        <VscUnmute
          className={`p-2 text-3xl cursor-pointer ${isMicOn ? 'text-white hover:text-green-500' : 'text-gray-400'}`}
          onClick={toggleMic}
          aria-label="Toggle Mic"
        />
      </span>
      <span  className='bg-gray-800 rounded-full hover:bg-slate-700 duration-200'>
        <MdCallEnd
          className="p-2 text-3xl text-red-500 cursor-pointer hover:text-red-700 transition duration-300 ease-in-out"
          onClick={endCall}
          aria-label="End Call"
        />
      </span>
      <span className='bg-gray-800 rounded-full hover:bg-slate-700 duration-200'>
  {isCameraOn ? (
          <FaVideo
            className="p-2 text-3xl text-white cursor-pointer hover:text-green-500"
            onClick={toggleCamera}
            aria-label="Turn Off Camera"
          />
        ) : (
          <FaVideoSlash
            className="p-2 text-3xl text-gray-400 cursor-pointer hover:text-red-500"
            onClick={toggleCamera}
            aria-label="Turn On Camera"
          />
        )}
      </span>
      <span className='bg-gray-800 rounded-full hover:bg-slate-700 duration-200'> 
        <FaShareSquare
          className={`p-2 text-3xl cursor-pointer transition duration-300 ease-in-out ${
            isScreenSharing ? 'text-blue-500 hover:text-blue-400' : 'text-white hover:text-blue-400'
          }`}
          onClick={toggleScreenShare}
          aria-label="Toggle Screen Share"
        />
      </span>
      </div>
     
<div className='flex gap-2'>
  {/* Participants Button */}
      <button
        className="flex items-center p-2  rounded-full opacity-50 bg-blue-50 text-gray-800 hover:bg-blue-200 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transform transition-all duration-200 ease-out"
        aria-label="View Participants"
      >
        <IoHandRight className=" " />
        <span className="hidden md:inline text-xs  font-semibold hover:"> </span>
      </button>

      {/* Inbox Button */}
      <button
       
        className={`flex items-center p-2  rounded-full opacity-50 bg-gray-500 text-gray-800 hover:bg-gray-400 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transform transition-all duration-200 ease-out`}
        aria-label="Toggle Inbox"
      >
        <FcLikePlaceholder  className="" />
        <span className="hidden md:inline text-xs font-semibold"></span>
      </button>
</div>
      

      </div>

      
    </div>
  </div>
</div>
          {/* Right Panel */}
          <div className="w-1/3 flex flex-col space-y-2">
            {isViewing ? (
              <>
                {/* Participants Section */}
                <Participants 
  transcript={transcript} 
  userName={userName}
 
/>

                {/* Host's Screen 
                <Host localVideoRef={localVideoRef} isMicOn={isMicOn} toggleMic={toggleMic} isCameraOn={isCameraOn} endCall={endCall} toggleCamera={toggleCamera} isScreenSharing={isScreenSharing} toggleScreenShare={toggleScreenShare} />
                
                */}
                
              </>
            ) : (
              /* Messaging Section */
              <MessagingEnvironment userName={userName} roomId={roomId}
              messages={messages}
              userTypingStatus={userTypingStatus}
              currentMessage={currentMessage}
              isSendingMessage={isSendingMessage}
              setIsEmojiPickerOpen={setIsEmojiPickerOpen}
              handleMessageSend={handleMessageSend}
              handleEmojiSelect={handleEmojiSelect}
              handleDoubleTap={handleDoubleTap}/>
   )}
          </div>
        </div>
      </div>
    </div>
  );
  
  
  
};

export default Chat;
