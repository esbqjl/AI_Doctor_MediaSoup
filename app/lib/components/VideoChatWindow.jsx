// VideoChatWindow.js
import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import PeerView from './PeerView'; // Component for individual peer video
import './VideoChatWindow.css';

const VideoChatWindow = ({ peers }) => {
  return (
    <div className="video-chat-window">
      {peers.map((peer) => (
        <PeerView key={peer.id} peer={peer} />
      ))}
    </div>
  );
};

VideoChatWindow.propTypes = {
  peers: PropTypes.array.isRequired
};

const mapStateToProps = (state) => ({
  peers: Object.values(state.peers) // Assuming peers are stored in Redux
});

export default connect(mapStateToProps)(VideoChatWindow);
