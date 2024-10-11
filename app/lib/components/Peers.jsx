import React, { useState } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import Peer from './Peer';
import { WidthProvider, Responsive } from 'react-grid-layout';
import DateDisplay from './DateDisplay';
import DoctorSchedule from './DoctorSchedule';
import HealthSummary from './HealthSummary';
import Highlights from './Highlights';

const ResponsiveGridLayout = WidthProvider(Responsive);

const Peers = (props) => {
  const { peers, activeSpeakerId } = props;
  const [focusedPeerId, setFocusedPeerId] = useState(null); // For zooming in/out

  // Handles peer zooming functionality
  const handlePeerClick = (peerId) => {
    if (focusedPeerId === peerId) {
      setFocusedPeerId(null); // Zoom out if clicked again
    } else {
      setFocusedPeerId(peerId); // Zoom in on selected peer
    }
  };

  // Dynamically generate layout for peers based on the zoom/focus state
  const peerLayout = peers.map((peer, index) => ({
    i: peer.id,
    x: (index * 4) % 24,  
    y: Math.floor(index / 4),  
    w: focusedPeerId === peer.id ? 12 : 5, // Adjust size based on focus
    h: focusedPeerId === peer.id ? 8 : 5,  // Adjust size based on focus
  }));

  // Additional components layout (like DateDisplay, DoctorSchedule, etc.)
  const defaultLayout = [
    { i: 'dateDisplay', w: 6, h: 2, x: 18, y: 1, minW: 3, minH: 2 },
    { i: 'doctorSchedule', w: 8, h: 5, x: 8, y: 18, minW: 4, minH: 2 },
    { i: 'highlights', w: 6, h: 2, x: 18, y: 18, minW: 3, minH: 2  },
    { i: 'healthSummary', w: 6, h: 10, x: 18, y: 3, minW: 3, minH: 5 }
  ];

  const combinedLayout = [...defaultLayout, ...peerLayout];

  return (
    <div data-component="Peers" style={{ backgroundColor: '#f0f0f0', padding: '10px' }}>
      <ResponsiveGridLayout
        className="layout"
        layouts={{ lg: combinedLayout }}
        cols={{ lg: 24 }}
        rowHeight={50}
        breakpoints={{ lg: 1200 }}
        onLayoutChange={(layout) => {
          // Optional: save layout to local storage if needed
        }}
      >
        {/* Render DateDisplay */}
        <div key="dateDisplay" style={{ backgroundColor: '#e0e0e0', padding: '10px', borderRadius: '8px' }}>
          <DateDisplay />
        </div>

        {/* Render DoctorSchedule */}
        <div key="doctorSchedule" style={{ backgroundColor: '#d0d0d0', padding: '10px', borderRadius: '8px' }}>
          <DoctorSchedule />
        </div>

        {/* Render HealthSummary */}
        <div key="healthSummary" style={{ backgroundColor: '#c0c0c0', padding: '10px', borderRadius: '8px' }}>
          <HealthSummary />
        </div>

        {/* Render Highlights */}
        <div key="highlights" style={{ backgroundColor: '#b0b0b0', padding: '10px', borderRadius: '8px' }}>
          <Highlights />
        </div>

        {/* Render each peer dynamically */}
        {peers.map((peer) => (
          <div
            key={peer.id}
            data-grid={peerLayout.find((p) => p.i === peer.id)} // Dynamic peer layout
            onClick={() => handlePeerClick(peer.id)} // Zoom in/out on peer click
            className={classnames('peer-container', {
              'active-speaker': peer.id === activeSpeakerId,
              'focused-peer': peer.id === focusedPeerId, // Add focused-peer class if zoomed
            })}
            style={{
              backgroundColor: focusedPeerId === peer.id ? '#e53b17' : '#52e517',
              padding: '10px',
              borderRadius: '8px',
              border: focusedPeerId === peer.id ? '3px solid #52e517 ' : '1px solid #888'
            }}
          >
            <Peer id={peer.id} />
          </div>
        ))}
      </ResponsiveGridLayout>
    </div>
  );
};

Peers.propTypes = {
  peers: PropTypes.arrayOf(PropTypes.object).isRequired,
  activeSpeakerId: PropTypes.string,
};

const mapStateToProps = (state) => {
  const peersArray = Object.values(state.peers);
  return {
    peers: peersArray,
    activeSpeakerId: state.room.activeSpeakerId,
  };
};

export default connect(mapStateToProps)(Peers);
