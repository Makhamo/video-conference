const toggleUserMute = (peerId) => {
  const peerConnection = peerConnections.current.get(peerId);
  const track = peerConnection?.getSenders().find((sender) => sender.track.kind === 'audio')?.track;
  if (track) {
    track.enabled = !track.enabled;
    socket.emit('user-muted', { roomId, peerId, muteStatus: track.enabled });
  }
};

const toggleUserVideo = (peerId) => {
  const peerConnection = peerConnections.current.get(peerId);
  const track = peerConnection?.getSenders().find((sender) => sender.track.kind === 'video')?.track;
  if (track) {
    track.enabled = !track.enabled;
    socket.emit('user-video-status', { roomId, peerId, videoStatus: track.enabled });
  }
};
