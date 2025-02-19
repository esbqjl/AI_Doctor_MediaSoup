import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import PeerView from './PeerView';
import Me from './Me';
import { IoIosMic, IoIosMicOff } from 'react-icons/io';
import { FaVideo, FaVideoSlash } from 'react-icons/fa6';

const VideoChatWindow = ({ peers, roomClient, isAudioMuted, isVideoOff, activeSpeakerId }) => {
  const videoChatWindowStyle = {
    border: '3px solid #000', // Optional border for debugging
    boxSizing: 'border-box',
  };

  const mainSpeakerViewStyle = {
    flex: 1,
    width: '100%',
    maxWidth: '600px',
    maxHeight: '400px',
    backgroundColor: '#222',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
    marginBottom: '1px',
    borderRadius: '0px', // Remove border-radius here
  };

  const videoControlsStyle = {
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: '100%',
    padding: '10px',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: '0px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
    marginTop: 'auto',
    position: 'relative'
  };

  const videoControlButtonStyle = {
    backgroundColor: '#fff',
    border: 'none',
    borderRadius: '50%',
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  };

  return (
    <div style={videoChatWindowStyle}>
      {/* Thumbnails for other participants */}
      <div className="thumbnail-grid">
        {peers.filter(peer => peer.id !== activeSpeakerId).map(peer => (
          <div key={peer.id} className="thumbnail-view">
            <PeerView peer={peer} />
          </div>
        ))}
      </div>

      {/* Main Speaker or "Me" view */}
      <div style={mainSpeakerViewStyle}>
        {activeSpeakerId ? (
          <PeerView peer={peers.find(peer => peer.id === activeSpeakerId)} />
        ) : (
          <Me />
        )}
      </div>

      {/* Controls */}
      <div style={videoControlsStyle}>
        <button
          style={videoControlButtonStyle}
          onClick={() => {
            isAudioMuted ? roomClient.unmuteMic() : roomClient.muteMic();
          }}
        >
          {isAudioMuted ? <IoIosMicOff /> : <IoIosMic />}
        </button>
        <button
          style={videoControlButtonStyle}
          onClick={() => {
            isVideoOff ? roomClient.enableWebcam() : roomClient.disableWebcam();
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
  activeSpeakerId: PropTypes.string
};

const mapStateToProps = (state) => ({
  peers: Object.values(state.peers),
  activeSpeakerId: state.room.activeSpeakerId,
});

export default connect(mapStateToProps)(VideoChatWindow);
