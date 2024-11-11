import React from 'react';
import { MdCallEnd } from 'react-icons/md';
import { FaUsers, FaUser, FaVideo, FaVideoSlash, FaMicrophone, FaMicrophoneSlash } from 'react-icons/fa';
import { FiSettings } from 'react-icons/fi';

const VideoConference = ({
  leaveRoom,
  showParticipants,
  participants,
  connectionStatus,
  toggleParticipantsPanel,
  isJoined,
  roomId,
  setRoomId,
  username,
  setUsername,
  joinRoom,
  localStreamRef,
  isVideoEnabled,
  toggleVideo,
  isAudioEnabled,
  toggleAudio,
  videoRefs,
}) => {
  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="flex justify-between items-center p-4 bg-gray-100 border-b border-gray-200 shadow-md">
        <h1 className="text-2xl font-semibold text-gray-800">Video Conference</h1>
        <button
          onClick={leaveRoom}
          className="flex items-center px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition duration-200"
        >
          <MdCallEnd className="mr-2" />
          Leave Room
        </button>
      </header>

      {/* Main Content */}
      <div className="flex flex-grow overflow-hidden">
        {/* Participants Sidebar */}
        {showParticipants && (
          <aside className="w-64 bg-white border-r border-gray-200 shadow-lg">
            <h2 className="text-lg font-semibold text-gray-700 bg-gray-200 p-3 text-center">Participants</h2>
            <ul className="p-3 space-y-2">
              {participants.map((participant) => (
                <li key={participant.id} className="flex items-center space-x-3 p-2 hover:bg-gray-100 rounded-md">
                  <img
                    src={participant.avatar}
                    alt={`${participant.username}'s avatar`}
                    className="w-10 h-10 rounded-full border border-gray-300"
                  />
                  <span className="text-gray-800 font-medium">{participant.username}</span>
                </li>
              ))}
            </ul>
          </aside>
        )}

        {/* Video and Control Area */}
        <main className="flex-1 flex flex-col items-center justify-center p-6 space-y-6 bg-gray-50">
          <p className="text-sm text-gray-500">{connectionStatus}</p>

          <button
            onClick={toggleParticipantsPanel}
            className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition"
          >
            <FaUsers className="mr-2" />
            {showParticipants ? 'Hide Participants' : 'Show Participants'}
          </button>

          {!isJoined ? (
            <div className="w-full max-w-sm p-5 bg-white rounded-md shadow-md space-y-4">
              <input
                type="text"
                placeholder="Room ID"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="w-full p-3 border rounded-md focus:border-blue-500 focus:outline-none"
              />
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full p-3 border rounded-md focus:border-blue-500 focus:outline-none"
              />
              <button
                onClick={joinRoom}
                className="w-full flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md"
              >
                <FaUser className="mr-2" />
                Join Room
              </button>
            </div>
          ) : (
            <div className="w-full max-w-6xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 p-4">
              {/* Local Video Container */}
              <div className="flex flex-col items-center bg-white rounded-md shadow-lg p-4">
                <video
                  ref={localStreamRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-60 border border-gray-300 rounded-md"
                />
                <div className="mt-4 flex space-x-3">
                  <button
                    onClick={toggleVideo}
                    className={`flex items-center px-4 py-2 ${isVideoEnabled ? 'bg-blue-500' : 'bg-gray-400'} text-white rounded-md transition`}
                  >
                    {isVideoEnabled ? <FaVideo className="mr-2" /> : <FaVideoSlash className="mr-2" />}
                    {isVideoEnabled ? 'Turn Off Video' : 'Turn On Video'}
                  </button>
                  <button
                    onClick={toggleAudio}
                    className={`flex items-center px-4 py-2 ${isAudioEnabled ? 'bg-green-500' : 'bg-gray-400'} text-white rounded-md transition`}
                  >
                    {isAudioEnabled ? <FaMicrophone className="mr-2" /> : <FaMicrophoneSlash className="mr-2" />}
                    {isAudioEnabled ? 'Mute' : 'Unmute'}
                  </button>
                </div>
              </div>

              {/* Remote Participants Container */}
              <div className="flex flex-col items-center bg-white rounded-md shadow-lg p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
                  {participants.map((participant) => (
                    <video
                      key={participant.id}
                      ref={(el) => (videoRefs.current[participant.id] = el)}
                      autoPlay
                      playsInline
                      className="w-full h-60 border border-gray-300 rounded-md"
                    />
                  ))}
                </div>
                <div className="mt-4">
                  <button className="flex items-center px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-md transition">
                    <FiSettings className="mr-2" />
                    Settings
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default VideoConference;
