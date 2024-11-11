import React, { useEffect, useRef, useState } from 'react';
import socket from '../socket'; // Ensure socket.io client setup
import { useLocation, useNavigate } from 'react-router-dom';
import TopMenu from '../components/TopMenu';
import { FaVideo, FaVideoSlash, FaShareSquare } from 'react-icons/fa';
import { VscUnmute } from 'react-icons/vsc';
import { MdCallEnd } from 'react-icons/md';
import { IoIosRecording } from 'react-icons/io';
import { FaUsers, FaComments } from 'react-icons/fa';
import { IoHandRight } from 'react-icons/io5';
import { FcLikePlaceholder } from 'react-icons/fc';

const iceServersConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
  ],
};

const Chat = () => {
  const location = useLocation(); 
  const { roomId, userName } = location.state || {};
  const navigate = useNavigate();
  
  // State for local and remote streams
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [peerConnections, setPeerConnections] = useState({});

  const localVideoRef = useRef(null);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then((stream) => {
        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        socket.emit('join-room', { roomId, userName });
      })
      .catch(console.error);
  }, []);
  
  useEffect(() => {
    socket.on('user-joined', handleUserJoined);
    socket.on('offer', handleOffer);
    socket.on('answer', handleAnswer);
    socket.on('ice-candidate', handleICECandidate);
  
    return () => {
      socket.off('user-joined', handleUserJoined);
      socket.off('offer', handleOffer);
      socket.off('answer', handleAnswer);
      socket.off('ice-candidate', handleICECandidate);
    };
  }, [peerConnections, localStream]);
  
  const handleUserJoined = ({ userId }) => {
    if (peerConnections[userId]) return;
  
    const peerConnection = new RTCPeerConnection(iceServersConfig);
    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
  
    peerConnection.onicecandidate = event => {
      if (event.candidate) {
        socket.emit('ice-candidate', { to: userId, candidate: event.candidate });
      }
    };
  
    peerConnection.ontrack = event => {
      console.log('Received remote stream from', userId);
      setRemoteStreams((prev) => ({ ...prev, [userId]: event.streams[0] }));
    };
  
    peerConnection.onnegotiationneeded = async () => {
      try {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        socket.emit('offer', { to: userId, offer });
      } catch (error) {
        console.error('Error during negotiation:', error);
      }
    };
  
    setPeerConnections((prev) => ({ ...prev, [userId]: peerConnection }));
  };
  
  
  
  

  const handleOffer = async ({ from, offer }) => {
    const peerConnection = new RTCPeerConnection(iceServersConfig);
    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

    peerConnection.onicecandidate = event => {
      if (event.candidate) {
        socket.emit('ice-candidate', { to: from, candidate: event.candidate });
      }
    };

    peerConnection.ontrack = event => {
      setRemoteStreams((prev) => ({ ...prev, [from]: event.streams[0] }));
    };

    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit('answer', { to: from, answer });

    setPeerConnections((prev) => ({ ...prev, [from]: peerConnection }));
  };

  const handleAnswer = async ({ from, answer }) => {
    const peerConnection = peerConnections[from];
    if (peerConnection) {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    }
  };

  const handleICECandidate = ({ from, candidate }) => {
    const peerConnection = peerConnections[from];
    if (peerConnection) {
      peerConnection.addIceCandidate(new RTCIceCandidate(candidate)).catch(console.error);
    }
  };

  const endCall = () => {
    Object.keys(peerConnections).forEach(userId => {
      peerConnections[userId].close(); // Close each peer connection
      delete peerConnections[userId];
    });
    setPeerConnections({});
    setRemoteStreams({});
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    navigate('/');
  };
  useEffect(() => {
    socket.on('user-left', ({ userId }) => {
      if (peerConnections[userId]) {
        peerConnections[userId].close();
        setPeerConnections(prev => {
          const updated = { ...prev };
          delete updated[userId];
          return updated;
        });
        setRemoteStreams(prev => {
          const updated = { ...prev };
          delete updated[userId];
          return updated;
        });
      }
    });
  
    return () => {
      socket.off('user-left');
    };
  }, [peerConnections]);
  
  

  // Function to format the call duration into minutes and seconds
  const formatDuration = (duration) => {
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  return (
    <div className="flex flex-col h-screen w-full border p-1 bg-gray-900 rounded-md overflow-hidden">
      <TopMenu
        isCallActive={!!localStream}
        startCall={() => {}}
        endCall={endCall}
        isViewing={false}
        toggleViewing={() => {}}
        callDuration={0}
        formatDuration={formatDuration}
      />
      <div className="flex flex-col h-full">
        <div className="flex flex-row h-full bg-gray-900 space-x-1">
          <div className="relative w-full bg-gray-800 rounded-md overflow-hidden shadow-lg justify-center flex flex-col items-center">
          <div className="flex flex-wrap justify-center items-start h-full w-full p-4 bg-gray-900 gap-4">
  {/* Local Video */}
  <div className="relative bg-gray-800 rounded-lg shadow-lg p-1 flex flex-col w-48 h-48 md:w-56 md:h-56 lg:w-64 lg:h-64 items-center justify-center">
    <video
      ref={localVideoRef}
      autoPlay
      muted
      playsInline
      className="w-full h-full rounded-lg object-cover transform -scale-x-100"
    />
    <div className="absolute top-1 left-1 bg-gray-900 bg-opacity-80 text-white text-xs font-semibold px-2 py-1 rounded-lg">
      {userName || "You"}
    </div>
  </div>

  {/* Remote Videos */}
  {Object.keys(remoteStreams).map((userId) => (
  <div
    key={userId}
    className="relative w-48 h-48 md:w-56 md:h-56 lg:w-64 lg:h-64 bg-gray-800 rounded-lg shadow-lg overflow-hidden flex flex-col justify-center items-center"
  >
    <video
      autoPlay
      playsInline
      className="w-full h-full rounded-lg object-cover"
      ref={(videoElement) => {
        if (videoElement && remoteStreams[userId]) {
          videoElement.srcObject = remoteStreams[userId];
        }
      }}
    />
    <div className="absolute top-1 left-1 bg-gray-900 bg-opacity-80 text-white text-xs font-semibold px-2 py-1 rounded-lg">
      {userId}
    </div>
  </div>
))}

</div>

          </div>
        </div>
        
      </div>
      
      <div className='h-14 bg-gradient-to-l w-full from-slate-700 to-gray-800 p-2 rounded-b-md ' >
    <div className='min-w-48 items-center  bg-gradient-to-r  bg-gray-800 border border-gray-700 rounded-full h-full shadow-md '>
    <div className="flex flex-row justify-between items-center space-x-5 m-1">

      <div className='flex space-x-3'>
      <span className='bg-gray-800 rounded-full hover:bg-slate-700 duration-200'>
        <IoIosRecording
          className={`p-2 text-3xl cursor-pointer 'text-white hover:text-green-500' : 'text-gray-400'}`}
          
          aria-label="Toggle Mic"
        />
        </span>
         {/* Inbox Button */}
      <button
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
          className={`p-2 text-3xl cursor-pointer text-white hover:text-green-500' : 'text-gray-400'}`}
          aria-label="Toggle Mic"
        />
      </span>
      <span  className='bg-gray-800 rounded-full hover:bg-slate-700 duration-200'>
        <MdCallEnd
          className="p-2 text-3xl text-red-500 cursor-pointer hover:text-red-700 transition duration-300 ease-in-out"
          aria-label="End Call"
        />
      </span>
      <span className='bg-gray-800 rounded-full hover:bg-slate-700 duration-200'>
 
          <FaVideo
            className="p-2 text-3xl text-white cursor-pointer hover:text-green-500"
            aria-label="Turn Off Camera"
          />
       
      </span>
      <span className='bg-gray-800 rounded-full text-white hover:bg-slate-700 duration-200'> 
        <FaShareSquare
          className={`p-2 text-3xl cursor-pointer transition duration-300 ease-in-out'text-blue-500 hover:text-blue-400' : 'text-white hover:text-blue-400'
          }`}
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
  );
};

export default Chat;
