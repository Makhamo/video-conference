import React, { useEffect, useRef, useState } from 'react';
import socket from '../socket';
import { VscUnmute } from 'react-icons/vsc';
import { MdCallEnd } from 'react-icons/md';
import { useLocation } from 'react-router-dom';
import EmojiPicker from 'emoji-picker-react';
import { IoIosClose } from 'react-icons/io';
import { FaUsers, FaComments, FaVideo, FaVideoSlash, FaShareSquare, FaExpand, FaCompress, FaMicrophone, FaMicrophoneSlash } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { FaPaperclip } from 'react-icons/fa';


declare global {

  interface SpeechRecognitionEvent extends Event {
    results: SpeechRecognitionResultList;
    resultIndex: number;
  }
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}
const iceServersConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    // Additional STUN/TURN servers can be added here
  ],
};


const Chat: React.FC = () => {
  const location = useLocation();
  const { roomId, userName } = location.state || {};

  const [isCallActive, setIsCallActive] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isMessagingOpen, setIsMessagingOpen] = useState(false);
  const [messages, setMessages] = useState<{ sender: string; text: string; isNew?: boolean }[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const navigate = useNavigate();
  const [volume, setVolume] = useState(1);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const recognitionRef = useRef<any>(null);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  const videoRefs = useRef<{ [key: string]: HTMLVideoElement | null }>({});

  useEffect(() => {
    // Initialize Speech Recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onresult = (event: SpeechRecognitionEvent) => {
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
    socket.on('message', (data) => {
      setMessages((prevMessages) => [...prevMessages, { ...data, isNew: true }]);
      setUnreadCount((prevCount) => prevCount + 1);
    });

    const handleReconnect = () => {
      if (!socket.connected) {
        socket.connect();
      }
    };

    socket.on('disconnect', handleReconnect);

    return () => {
      socket.off('message');
      socket.off('disconnect', handleReconnect);
    };
  }, []);
  

  useEffect(() => {
    peerConnection.current = new RTCPeerConnection(iceServersConfig);

    peerConnection.current.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('candidate', { candidate: event.candidate, roomId });
      }
    };

    peerConnection.current.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
        const remoteAudio = new Audio();
        remoteAudio.srcObject = event.streams[0];
        remoteAudio.volume = volume;
        remoteAudio.play();
      }
    };

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

    return () => {
      socket.off('offer');
      socket.off('answer');
      socket.off('candidate');
    };
  }, [roomId, volume]);


  const videoConstraints = {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 30, max: 60 },
  };

 const audioConstraints = {
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      sampleRate: 48000,
    },
  };

  const startCall = async () => {
    setIsCallActive(true);

    localStream.current = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30, max: 60 } },
      audio: { echoCancellation: true, noiseSuppression: true },
    });

    localStream.current.getTracks().forEach((track) => {
      peerConnection.current?.addTrack(track, localStream.current!);
    });

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = localStream.current;
    }

    const offer = await peerConnection.current?.createOffer();
    await peerConnection.current?.setLocalDescription(offer);
    socket.emit('offer', { offer, roomId });

    // Start Speech Recognition
    if (recognitionRef.current) {
      recognitionRef.current.start();
      setIsTranscribing(true);
    }
  };


  const endCall = () => {
    peerConnection.current?.close();
    setIsCallActive(false);

    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    localStream.current?.getTracks().forEach((track) => track.stop());

    // Stop Speech Recognition
    if (recognitionRef.current && isTranscribing) {
      recognitionRef.current.stop();
      setIsTranscribing(false);
    }
  };

  const toggleMic = () => {
    const audioTrack = localStream.current?.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMicOn(audioTrack.enabled);
    }
  };

  const replaceVideoTrack = (newTrack: MediaStreamTrack) => {
    const sender = peerConnection.current?.getSenders().find(s => s.track?.kind === 'video');
    if (sender) {
      sender.replaceTrack(newTrack);
    }
  };
  
  // Inside toggleCamera
  const toggleCamera = () => {
    const videoTrack = localStream.current?.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsCameraOn(videoTrack.enabled);
      replaceVideoTrack(videoTrack); // Reuse the helper function
    }
  };
  
  // Inside toggleScreenShare
  const toggleScreenShare = async () => {
    if (!isScreenSharing) {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const screenTrack = screenStream.getTracks()[0];
      replaceVideoTrack(screenTrack); // Reuse the helper function
      screenTrack.onended = () => toggleScreenShare();
      setIsScreenSharing(true);
    } else {
      const videoTrack = localStream.current?.getVideoTracks()[0];
      replaceVideoTrack(videoTrack); // Reuse the helper function
      setIsScreenSharing(false);
    }
  };
  

  const handleSendMessage = () => {
    if (currentMessage.trim()) {
      const messageData = { sender: userName, text: currentMessage };
      socket.emit('message', messageData);
      setMessages((prev) => [...prev, messageData]);
      setCurrentMessage('');
    }
  };

 
  const handleEmojiSelect = (emoji: any) => {
    setCurrentMessage((prev) => prev + emoji.emoji);
    setIsEmojiPickerOpen(false);
  };
  // stop everything and liv meeting
  const back = () => {
    
    if (localStream.current) {
      localStream.current.getTracks().forEach((track) => track.stop());
    }
  
    // WebRTC peer connection
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
      
    }
  
    // Disconnect from the WebSocket server
    if (socket && socket.connected) {
      socket.disconnect();
    }
    navigate('/');
  };

  return (
    <div className=" flex flex-col h-screen w-full border bg-gray-900 rounded-md overflow-hidden">
      <div className="flex flex-wrap m-1 items-center bg-gray-900  rounded-md p-2 border border-gray-600 space-x-2">
            <button className="flex items-center p-2 border rounded-md text-gray-800 h-10 bg-blue-50 hover:bg-blue-100 hover:text-blue-300 duration-300 transition-all">
              <FaUsers className="mr-2 text-xl" />
              <span className="text-sm font-medium">Participants</span>
            </button>
            <button
              onClick={() => setIsMessagingOpen(true)}
              className="flex items-center p-2 border rounded-md text-gray-800 h-10 w-24 bg-blue-50 hover:bg-blue-100 hover:text-blue-300 duration-300 transition-all"
            >
              <FaComments className="mr-2 text-xl" />
              <span className="text-sm font-medium">Inbox</span>
            </button>
            <div className="flex space-x-4">
              {!isCallActive ? (
                <button
                  onClick={startCall}
                  className="px-4 p-2 bg-blue-500 text-sm text-white rounded hover:bg-blue-700"
                >
                  Start Call
                </button>
              ) : (
                <button
                  onClick={back}
                  className="px-4 p-2 bg-red-500 text-white rounded text-sm hover:bg-red-700"
                >
                  Leave Meeting
                </button>
              )}
            </div>
          </div>

      <div className="flex flex-col ">
        
{/*flex-raw */}
          <div className="flex flex-row h-full bg-gray-900">
            {/*flex-col */}
          <div className="w-1/3 bg-gray-900  flex flex-col justify-between  mx-1">

          
             {/* Transcript */}
            <div className="h-full bg-slate-400 rounded-md">
              <h1 className="p-1 text-gray-400 font-bold  bg-gray-800 border border-gray-600 text-center rounded-t-md">Transcript</h1>
              <div className="p-2 overflow-y-auto h-[34vh]">
                <p className="whitespace-pre-wrap text-xs">{transcript}</p>
              </div>
              <div className="p-2 overflow-y-auto max-h-[calc(100vh-25rem)]">
                {/* Add script here */}
                <h1></h1>
              </div>
            </div>

            {/* Host's Screen */}
            <div className="bg-gray-800 border border-gray-500 rounded-md text-center shadow-md mt-1  h-full ">
              <div className="flex justify-center items-center py-1 rounded-md text-gray-400">
                <div className="font-bold bg">Your Screen
                  <video
                ref={localVideoRef}
                autoPlay
                muted
                className="h-1/2 p-2 w-full rounded-md transform -scale-x-100"
              />
              <div className="flex justify-center items-center mt-4 space-x-4">
                <VscUnmute
                  className={`p-2 text-3xl cursor-pointer ${isMicOn ? 'text-white hover:text-green-500' : 'text-gray-400'
                  }`}
                  onClick={toggleMic}
                  aria-label="Toggle Mic"
                />
                <MdCallEnd
                  className="p-2 text-3xl text-red-500 cursor-pointer hover:text-red-700 transition duration-300 ease-in-out"
                  onClick={endCall}
                  aria-label="End Call"
                />
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

                <FaShareSquare
                  className={`p-2 text-3xl cursor-pointer transition duration-300 ease-in-out ${
                    isScreenSharing ? 'text-blue-500 hover:text-blue-400' : 'text-white hover:text-blue-400'
                  }`}
                  onClick={toggleScreenShare}
                  aria-label="Toggle Screen Share"
                />
              </div>
                </div>
              </div>
              
            </div>
          </div>
  
          {/* Participant Screens */}
          <div className="w-screen bg-gray-900 rounded-md mr-1 border border-gray-600">
            <video ref={remoteVideoRef} autoPlay className="rounded-md  w-full " />
          </div>
        </div>

         {/* Messaging modal dialog */}
      {isMessagingOpen && (
      <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex justify-center items-center z-50">
        <div className="bg-gray-200 w-3/4 h-3/4 rounded-md shadow-lg p-4 bg-opacity-50">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Messaging Environment</h2>
            <button
              className="text-red-500 hover:text-red-700"
              onClick={() => setIsMessagingOpen(false)}
            >
              <IoIosClose className="text-red-500 text-3xl hover:bg-red-500 hover:text-white duration-200" />
            </button>
          </div>
          <div className="overflow-y-auto h-full">
            <div className="p-4">
              <div className="h-80 overflow-y-auto bg-gray-100 p-2 border border-blue-200 rounded-md ">
                {messages.map((msg, index) => (
                  <div key={index} className="mb-2 break-words">
                    <strong>{msg.sender}:</strong> {msg.text}
                    
                  </div>
                ))}
              </div>

              <div className="flex items-center mt-4">
                

                <input
                  type="text"
                  placeholder="Type a message..."
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  className="flex-grow p-2 border border-blue-300 rounded-l-lg focus:outline-none hover:border-blue-600 duration-300"
                />

                <button
                  className="bg-blue-500 text-white px-4 p-2 rounded-r-md hover:bg-blue-600 ml-2"
                  onClick={handleSendMessage }
                >
                  Send
                </button>

                <button
                  onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)}
                  className="ml-2"
                >
                  😊
                </button>
                {isEmojiPickerOpen && (
                  <div className="absolute bottom-16 right-0">
                    <EmojiPicker onEmojiClick={handleEmojiSelect } />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    )}
        
      </div>
      
      
    </div>
  );
  
};

export default Chat;
