// VideoChatWindow.js
import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import PeerView from './PeerView'; // Component for individual peer video
import Me from './Me'; // Component for current user video feed
import { IoIosMic, IoIosMicOff } from 'react-icons/io';
import { FaVideo, FaVideoSlash } from 'react-icons/fa6';

const VideoChatWindow = ({ peers, roomClient, isAudioMuted, isVideoOff }) => {
  return (
    <div className="video-chat-window">
      {/* Main video grid for Me and peers */}
      <div className="video-grid">
        <div className="me-container">
          <Me /> {/* Current user video feed */}
        </div>

        {/* Peers' video feeds */}
        {peers.map((peer) => (
          <PeerView key={peer.id} peer={peer} />
        ))}
      </div>

      {/* Controls aligned at the bottom */}
      <div className="controls">
        <button
          className="control-button"
          onClick={() => {
            isAudioMuted
              ? roomClient.unmuteMic()
              : roomClient.muteMic();
          }}
        >
          {isAudioMuted ? <IoIosMicOff /> : <IoIosMic />}
        </button>
        <button
          className="control-button"
          onClick={() => {
            isVideoOff
              ? roomClient.enableWebcam()
              : roomClient.disableWebcam();
          }}
        >
          {isVideoOff ? <FaVideoSlash /> : <FaVideo />}
        </button>
      </div>
    </div>
  );
};

VideoChatWindow.propTypes = {
  peers: PropTypes.array.isRequired,
  roomClient: PropTypes.object.isRequired,
  isAudioMuted: PropTypes.bool.isRequired,
  isVideoOff: PropTypes.bool.isRequired,
};

const mapStateToProps = (state) => ({
  peers: Object.values(state.peers),
  isAudioMuted: state.me.audioMuted,
  isVideoOff: !state.me.videoVisible,
});

export default connect(mapStateToProps)(VideoChatWindow);
