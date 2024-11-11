import React, { useEffect, useRef, useState, useCallback } from 'react';
import EmojiPicker from 'emoji-picker-react';
import { IoIosClose } from 'react-icons/io';
import { FaSpinner, FaPaperPlane } from 'react-icons/fa';
import { BsEmojiSmile } from 'react-icons/bs';
import socket from '../socket';

const MessagingEnvironment = ({ userName, roomId, onClose }) => {
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const [currentMessage, setCurrentMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [userTypingStatus, setUserTypingStatus] = useState('');
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);

  const messagesRef = useRef([]);
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    socket.emit('joinRoom', { userName, roomId });

    socket.on('typing', (user) => {
      setUserTypingStatus(`${user} is typing...`);
      setTimeout(() => setUserTypingStatus(''), 2000);
    });

    socket.on('receiveMessage', (message) => {
      messagesRef.current = [...messagesRef.current, message];
      setMessages([...messagesRef.current]);
    });

    return () => {
      socket.emit('leaveRoom', { userName, roomId });
      socket.off('typing');
      socket.off('receiveMessage');
    };
  }, [roomId, userName]);

  const handleMessageSend = () => {
    if (!currentMessage.trim()) return;

    const messageData = {
      sender: userName,
      roomId,
      text: currentMessage.trim(),
      timestamp: new Date().toISOString(),
    };

    socket.emit('sendMessage', messageData);

    // Update the message list without status
    messagesRef.current = [...messagesRef.current, messageData];
    setMessages([...messagesRef.current]);
    setCurrentMessage('');
  };

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

  const handleEmojiSelect = (emoji) => {
    const cursorPosition = inputRef.current.selectionStart;
    const newMessage =
      currentMessage.slice(0, cursorPosition) +
      emoji.emoji +
      currentMessage.slice(cursorPosition);
    setCurrentMessage(newMessage);
    setIsEmojiPickerOpen(false);
  };

  const formatTimestamp = useCallback((timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, []);

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

  return (
    <div className="relative w-full h-full bg-gray-200 rounded-md p-2 flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Chat Room</h2>
        <button
          aria-label="Close messaging environment"
          className="text-red-500 hover:text-red-700"
          onClick={onClose}
        >
          <IoIosClose size={24} />
        </button>
      </div>

      {/* Messages Display */}
      <div
        className="h-full overflow-y-auto p-4 bg-gray-100 border border-blue-200 rounded-md"
        aria-live="polite"
      >
        {messages.length === 0 ? (
          <div className="text-center text-gray-500">No messages yet</div>
        ) : (
          messages.map((msg, index) => (
            <div
              key={`${msg.timestamp}-${msg.sender}`}
              className={`mb-2 p-2 rounded-md text-xs ${
                msg.sender === userName
                  ? 'bg-blue-100 text-right'
                  : 'bg-white text-left'
              }`}
              onDoubleClick={() => handleDoubleTap(index)}
            >
              <div className="flex justify-between items-center">
                <strong className="text-xs">{msg.sender}</strong>
                <span className="text-xs text-gray-500 ml-2">
                  {formatTimestamp(msg.timestamp)}
                </span>
              </div>
              <div className="mt-1">{msg.text}</div>
              {msg.reaction && (
                <span className="text-red-500 text-sm mt-1">{msg.reaction}</span>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing Indicator */}
      {userTypingStatus && (
        <div className="text-gray-500 text-xs mt-2">
          <em>{userTypingStatus}</em>
        </div>
      )}

      {/* Input Area */}
      <div className="flex items-center mt-4 relative">
        <button
          className="p-2 text-gray-500"
          onClick={() => setIsEmojiPickerOpen((prev) => !prev)}
        >
          <BsEmojiSmile size={20} />
        </button>
        <input
          ref={inputRef}
          type="text"
          placeholder="Type a message..."
          value={currentMessage}
          onChange={handleTyping}
          className="flex-grow p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs ml-2"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleMessageSend();
            }
          }}
        />
        <button
          onClick={handleMessageSend}
          className="ml-2 p-2 bg-blue-500 text-white rounded-md hover:bg-blue-700"
        >
          <FaPaperPlane />
        </button>
      </div>

      {/* Emoji Picker */}
      {isEmojiPickerOpen && (
        <div ref={emojiPickerRef} className="absolute bottom-16 left-2 z-10 bg-white shadow-md rounded-md p-2">
          <EmojiPicker onEmojiClick={handleEmojiSelect} />
        </div>
      )}
    </div>
  );
};

export default MessagingEnvironment;
