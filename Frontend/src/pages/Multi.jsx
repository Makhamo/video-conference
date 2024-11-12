import React, { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useLocation, useNavigate } from 'react-router-dom';
import { FaVideo, FaVideoSlash, FaShareSquare } from 'react-icons/fa';
import { VscUnmute } from 'react-icons/vsc';
import { MdCallEnd } from 'react-icons/md';
import { IoIosRecording } from 'react-icons/io';
import { FaComments } from 'react-icons/fa';
import { IoHandRight } from 'react-icons/io5';
import { FcLikePlaceholder } from 'react-icons/fc';

const iceServersConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
  ],
};

const Multi = () => {
  const location = useLocation(); 
  const { roomId, userName } = location.state || {};
  const navigate = useNavigate();
  const socket = io('http://localhost:3011');


  return (
    <div className="flex flex-col h-screen w-full border p-1 bg-gray-900 rounded-md overflow-hidden">
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

export default Multi;
