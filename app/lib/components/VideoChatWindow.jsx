import React from 'react';
import Me from './Me';
import Peer from './Peer'; // Import the individual Peer component
import { connect } from 'react-redux'; // Assuming peers are stored in the Redux state

const VideoChatWindow = ({ peers }) => {
  console.log('######### Rendering VideoChatWindow with peers:', peers);

  // We include "Me" as part of the peers list, effectively making it part of the grid
  const allPeers = [{ id: 'me', isMe: true }, ...peers];

  return (
    <div
      data-component="VideoChatWindow"
      style={{
        backgroundColor: 'red',
        color: 'black',
        minHeight: '100vh',
        width: '100%',
        display: 'grid',
        gridTemplateColumns: `repeat(auto-fill, minmax(250px, 1fr))`, // Ensure each peer has a min width and adjusts to fit the container
        gap: '10px', // Space between peers
        padding: '20px',
        boxSizing: 'border-box',
        justifyItems: 'center',
        alignItems: 'center',
      }}
    >
      {allPeers.map((peer, index) => (
        <div
          key={peer.id}
          style={{
            backgroundColor: 'transparent',
            borderRadius: '8px',
            padding: '10px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '350px', // Ensure minimum height for peer videos
            maxHeight: '500px', // Set max height
            minWidth: '250px',  // Ensure minimum width for peer videos
            maxWidth: '400px',  // Set max width
            overflow: 'hidden',  // Ensure content stays within bounds
          }}
        >
          {peer.isMe ? <Me style={{ position: 'static', height: '100%', width: '100%' }} /> : <Peer id={peer.id} />}
        </div>
      ))}
    </div>
  );
};

// Map peers from the Redux state to props
const mapStateToProps = (state) => ({
  peers: Object.values(state.peers), // Assuming peers are in the Redux state
});

export default connect(mapStateToProps)(VideoChatWindow);
