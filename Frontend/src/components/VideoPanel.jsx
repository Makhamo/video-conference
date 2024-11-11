import React from 'react';
import { FaVideo, FaVideoSlash, FaShareSquare } from 'react-icons/fa';
import { VscUnmute } from 'react-icons/vsc';
import { MdCallEnd } from 'react-icons/md';

const VideoPanel = ({
  isMicOn,
  toggleMic,
  isCameraOn,
  toggleCamera,
  isScreenSharing,
  toggleScreenShare,
  localVideoRef,
  remoteVideoRef,
}) => {
  return (
    <div className="relative w-full bg-gray-800 rounded-md overflow-hidden shadow-lg flex justify-center items-center">
      <div className="relative w-fit h-[50vh] bg-gray-800 rounded-md overflow-hidden shadow-lg">
        <video ref={remoteVideoRef} autoPlay className="rounded-md w-full h-full object-cover" />
        <div className="absolute inset-0 flex justify-center items-center space-x-4">
          <VscUnmute onClick={toggleMic} className={`text-3xl ${isMicOn ? 'text-white' : 'text-gray-400'}`} />
          <MdCallEnd className="text-3xl text-red-500" />
          {isCameraOn ? (
            <FaVideo onClick={toggleCamera} className="text-3xl text-white" />
          ) : (
            <FaVideoSlash onClick={toggleCamera} className="text-3xl text-gray-400" />
          )}
          <FaShareSquare onClick={toggleScreenShare} className={`text-3xl ${isScreenSharing ? 'text-blue-500' : 'text-white'}`} />
        </div>
      </div>
      <div className="absolute bottom-0 right-0 w-[10vw] h-[20vh] bg-gray-600 p-1 m-1">
        <video ref={localVideoRef} autoPlay muted className="rounded-md w-full h-full object-cover" />
      </div>
    </div>
  );
};

export default VideoPanel;
