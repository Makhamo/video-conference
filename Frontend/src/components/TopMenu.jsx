import React from 'react';
import { FaUsers, FaComments, FaVideo, FaVideoSlash } from 'react-icons/fa';

const formatDuration = (duration) => {
  const minutes = Math.floor(duration / 60);
  const seconds = duration % 60;
  return `${minutes}:${seconds < 10 ? `0${seconds}` : seconds}`; // Format as mm:ss
};

const TopMenu = ({ isCallActive, startCall, endCall, isViewing, toggleViewing, callDuration }) => {
  return (
    <div className="flex flex-wrap  items-center justify-between p-3 bg-gradient-to-r from-gray-700 via-gray-800 to-gray-900 rounded-t-lg shadow-xl text-gray-200 space-x-2 transition duration-300">
      

      {/* Call Control Buttons */}
      <div className="flex space-x-2">
        {!isCallActive ? (
          <button
            onClick={startCall}
            className="flex items-center px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 active:scale-95 transform transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-md"
            aria-label="Start Call"
          >
            <FaVideo className="mr-2 text-lg" />
            <span className="hidden md:inline text-sm font-semibold">Start Call</span>
          </button>
        ) : (
          <button
            onClick={endCall}
            className="flex items-center px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 active:scale-95 transform transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 shadow-md"
            aria-label="Leave Meeting"
          >
            <FaVideoSlash className="mr-2 text-lg" />
            <span className="hidden md:inline text-sm font-semibold">Leave Meeting</span>
          </button>
        )}
      </div>

      {/* Call Duration Display */}
      {isCallActive && (
        <div className="flex items-center mt-2 md:mt-0 text-lg font-semibold text-blue-200">
          <span className="mr-2">Call Duration:</span>
          <span className="bg-gray-700 px-3 py-1 rounded-md">{formatDuration(callDuration)}</span>
        </div>
      )}
    </div>
  );
};

export default TopMenu;
