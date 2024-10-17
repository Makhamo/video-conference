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

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  

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
  const startTranscription = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptText = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          setTranscript((prev) => prev + `${userName}: ${transcriptText}\n`);
        } else {
          interimTranscript += transcriptText;
        }
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error detected: ' + event.error);
    };

    recognition.onend = () => {
      console.log('Speech recognition ended.');
    };

    recognition.start();
  };

  const startCall = async () => {
    setIsCallActive(true);

    localStream.current = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30, max: 60 } },
      audio: audioConstraints,
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
  };

  const endCall = () => {
    peerConnection.current?.close();
    setIsCallActive(false);
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    localStream.current?.getTracks().forEach((track) => track.stop());
  };

  const toggleMic = () => {
    const audioTrack = localStream.current?.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMicOn(audioTrack.enabled);
    }
  };

  const toggleCamera = () => {
    const videoTrack = localStream.current?.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsCameraOn(videoTrack.enabled);
    }
  };

  const toggleScreenShare = async () => {
    if (!isScreenSharing) {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const screenTrack = screenStream.getTracks()[0];
      const sender = peerConnection.current?.getSenders().find((s) => s.track?.kind === 'video');

      sender?.replaceTrack(screenTrack);
      screenTrack.onended = () => toggleScreenShare();

      setIsScreenSharing(true);
    } else {
      const videoTrack = localStream.current?.getVideoTracks()[0];
      const sender = peerConnection.current?.getSenders().find((s) => s.track?.kind === 'video');
      sender?.replaceTrack(videoTrack);
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
  };

  const handleSendFile = () => {
    if (selectedFile) {
      const fileData = { sender: userName, fileName: selectedFile.name };
      socket.emit('file', fileData);
      setSelectedFile(null);
    }
  };

  const handleEmojiSelect = (emoji: any) => {
    setCurrentMessage((prev) => prev + emoji.emoji);
    setIsEmojiPickerOpen(false);
  };
  
  const back = () => {
    navigate('/');
    socket.close;
  };
  const adjustVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (remoteVideoRef.current) {
      remoteVideoRef.current.volume = newVolume;
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-900">
      <div className="w-full h-full max-h-screen overflow-hidden">
        <div className="p-1">
          <div className="flex flex-wrap items-center bg-gray-700 rounded-md p-3 border border-gray-400 space-x-2">
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
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-700"
                >
                  Start Call
                </button>
              ) : (
                <button
                  onClick={back}
                  className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-700"
                >
                  Leave Meeting
                </button>
              )}
            </div>
          </div>
        </div>
  
        <div className="flex overflow-hidden ">
          <div className="w-1/3 bg-gray-900 p-1  overflow-y-auto h-fit ">
            {/* Transcript */}
            <div className="lg:h-[45vh] sm:h-40  bg-slate-400 rounded-md">
              <h1 className="p-1 text-gray-700 font-bold underline">Transcript:</h1>
              <div className="p-2 overflow-y-auto h-[34vh]">
                <p className="whitespace-pre-wrap">{transcript}</p>
              </div>
              <div className="p-2 overflow-y-auto max-h-[calc(100vh-25rem)]">
                {/* Add script here */}
                <h1></h1>
              </div>
            </div>
  
            {/* Host's Screen */}
            <div className="bg-gray-800 rounded-md text-center shadow-md mt-1 lg:mt-2 p-1 sm:mt-6">
              <div className="flex justify-center items-center py-1 text-gray-400">
                <span className="font-semibold">Your Screen</span>
              </div>
              <video
                ref={localVideoRef}
                autoPlay
                muted
                className="h-full w-full rounded-md transform -scale-x-100"
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
  
          {/* Participant Screens */}
          <div className="flex justify-center items-center w-full h-full bg-gray-900 rounded-md mb-2 p-2">
            <video ref={remoteVideoRef} autoPlay className="rounded-md h-full w-full border border-gray-600" />
          </div>
        </div>
      </div>
  
      {/* Messaging modal dialog */}
      {isMessagingOpen && (
      <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex justify-center items-center z-50">
        <div className="bg-white w-3/4 h-3/4 rounded-md shadow-lg p-4">
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
              <div className="h-80 overflow-y-auto bg-gray-100 p-2">
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
                  className="flex-grow p-2 border rounded-l-lg focus:outline-none hover:border-blue-600 duration-300"
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
  );
  
};

export default Chat;
