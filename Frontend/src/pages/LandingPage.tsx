import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaUserFriends, FaUsers, FaVideo } from 'react-icons/fa';

const generateRoomId = () => Math.random().toString(36).substr(2, 9);

const LandingPage: React.FC = () => {
  const [roomId, setRoomId] = useState<string>(''); 
  const [userName, setUserName] = useState<string>('');
  const [cameraOn, setCameraOn] = useState(true);
  const [muted, setMuted] = useState(false);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [loadingCamera, setLoadingCamera] = useState(true);
  const [error, setError] = useState('');
  const [isReady, setIsReady] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const navigate = useNavigate(); 

  const toggleCamera = () => {
    if (videoStream) {
      videoStream.getVideoTracks().forEach(track => (track.enabled = !cameraOn));
      setCameraOn(!cameraOn);
    }
  };

  const toggleMute = () => {
    if (videoStream) {
      videoStream.getAudioTracks().forEach(track => (track.enabled = !muted));
      setMuted(!muted);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Join My Video Conference',
        text: `Join my video conference using Room ID: ${roomId}`,
        url: window.location.href
      }).catch((error) => console.error('Error sharing', error));
    } else {
      alert('Sharing is not supported on this browser');
    }
  };

  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setVideoStream(stream);
        if (videoRef.current) videoRef.current.srcObject = stream;
        setLoadingCamera(false);
        setIsReady(true);
      } catch (err) {
        setError('Unable to access camera. Please check permissions.');
        setLoadingCamera(false);
      }
    };
    startCamera();

    return () => videoStream?.getTracks().forEach(track => track.stop());
  }, []);

  const goToChat = () => {
    if (roomId && userName) {
      navigate('/chat', { state: { roomId, userName } });
    } else {
      alert('Please enter both Room ID and Username');
    }
  };

  const goToMChat = () => {
    if (roomId && userName) {
      navigate('/Multi', { state: { roomId, userName } });
    } else {
      alert('Please enter both Room ID and Username');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-700 via-slate-400 to-black overflow-hidden p-4" >
      <div className="bg-gradient-to-br from-white to-gray-300 rounded-lg shadow-xl w-full max-w-4xl flex flex-col md:flex-row items-center p-6 space-y-4 md:space-y-0 md:space-x-6 overflow-y-auto">
        
        <div className="relative w-full md:w-1/3 sticky top-0 bg-white z-10 shadow-sm">
          <video 
            ref={videoRef} 
            autoPlay 
            muted 
            className="w-full h-56 md:h-80 border-2 rounded-md shadow-md object-cover" 
            aria-label="Camera preview"
          />
          {loadingCamera && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 text-white text-sm">
              Loading camera...
            </div>
          )}
          {!cameraOn && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-800 bg-opacity-70 text-white text-sm">
              Camera Off
            </div>
          )}
        </div>

        <div className="md:w-2/3 w-full space-y-4">
          <h1 className="text-2xl font-semibold text-center md:text-left text-gray-800 ">Join a Video Conference
            
          </h1>

          {error && <div className="text-red-500 text-center text-xs">{error}</div>}

          <div className="space-y-1">
            <label className="block text-gray-700 text-sm font-medium">Username</label>
            <input 
              type="text" 
              placeholder="Your name" 
              value={userName} 
              onChange={(e) => setUserName(e.target.value)} 
              className="w-full p-2 border border-gray-300 rounded-md text-sm" 
              aria-label="Enter your username"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-gray-700 text-sm font-medium">Room ID</label>
            <div className="flex space-x-2">
            <input 
  type="text" 
  placeholder="Enter or Generate Room ID" 
  value={roomId} 
  onChange={(e) => setRoomId(e.target.value)} 
  className="w-full md:w-auto lg:flex-1 p-2 border border-gray-300 rounded-md text-sm" 
  aria-label="Room ID"
/>

              <button 
                onClick={() => setRoomId(generateRoomId())} 
                className="bg-blue-500 hover:bg-blue-500 text-white text-xs font-semibold px-3  transition rounded-lg"
                aria-label="Generate Room ID"
              >
                Generate
              </button>
              {roomId && (
                <button 
                  onClick={handleShare} 
                  className="bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold px-3 py-1 rounded transition"
                  aria-label="Share Room ID"
                >
                  Share
                </button>
              )}
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <button 
              onClick={toggleCamera} 
              className={`px-4 py-1 text-xs font-semibold rounded-md transition ${cameraOn ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'} text-white`}
              aria-label={cameraOn ? 'Turn Camera Off' : 'Turn Camera On'}
            >
              {cameraOn ? 'Turn Camera Off' : 'Turn Camera On'}
            </button>
            <button 
              onClick={toggleMute} 
              className={`px-4 py-1 text-xs font-semibold rounded-md transition ${muted ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'} text-white`}
              aria-label={muted ? 'Unmute' : 'Mute'}
            >
              {muted ? 'Unmute' : 'Mute'}
            </button>
          </div>
<div className='flex space-x-1'>


 {/* One-to-One Video Chat Button */}
 <button 
      onClick={goToChat} 
      disabled={!isReady || !userName || !roomId} 
      className={`w-full py-2 rounded-md font-bold text-white text-xs transition ${isReady && userName && roomId ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-400 cursor-not-allowed'} flex items-center justify-center`}
      aria-label="Start One-to-One Video Chat"
    >
      <FaUserFriends className="mr-2" /> One-to-One
    </button>

    {/* Multi-Participant Video Chat Button */}
    <button 
      onClick={goToMChat} 
      disabled={!isReady || !userName || !roomId} 
      className={`w-full py-2 rounded-md font-bold text-white text-xs transition ${isReady && userName && roomId ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-400 cursor-not-allowed'} flex items-center justify-center`}
      aria-label="Start Multi-Participant Video Chat"
    >
      <FaUsers className="mr-2" /> Multi-Participant
    </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
