import React from 'react';
import { FaVideo, FaVideoSlash, FaShareSquare } from 'react-icons/fa';
import { VscUnmute } from 'react-icons/vsc';
import { MdCallEnd } from 'react-icons/md';

const Host = ({
  localVideoRef,
  isMicOn,
  toggleMic,
  isCameraOn,
  endCall,
  toggleCamera,
  isScreenSharing,
  toggleScreenShare,
}) => {
  return (
    <div className="bg-gray-800 rounded-md shadow-md p-2 flex flex-col items-center text-gray-400">
      <div className="font-bold text-sm mb-2">Your Screen</div>
      <video
        ref={localVideoRef}
        autoPlay
        muted
        className="h-auto w-full rounded-md transform -scale-x-100"
      />
      <div className="flex justify-center items-center mt-4 space-x-4">
        <VscUnmute
          className={`p-2 text-3xl cursor-pointer ${isMicOn ? 'text-white hover:text-green-500' : 'text-gray-400'}`}
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
  );
};

export default Host;
