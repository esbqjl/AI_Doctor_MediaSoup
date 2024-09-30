import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import * as appPropTypes from './appPropTypes';
import { Appear } from './transitions';
import Peer from './Peer';
import { WidthProvider, Responsive } from 'react-grid-layout';
import { useRoomContext } from '../RoomContext';
import DateDisplay from './DateDisplay';
import DoctorSchedule from './DoctorSchedule';
import Highlights from './Highlights';
import HealthSummary from './HealthSummary';
import SuggestedQuestion from './SuggestedQuestion';
import ClinicalCodes from './ClinicalCodes';


const ResponsiveGridLayout = WidthProvider(Responsive);

const Peers = (props) => {
  const { peers, activeSpeakerId } = props;
  const { visibility } = useRoomContext();

  const [isDragging, setIsDragging] = React.useState(false);

  const handleDragStart = () => {
    setIsDragging(true);
  };

  const handleDragStop = () => {
    setIsDragging(false);
  };

  const onLayoutChange = (layout, layouts) => {
    // Handle layout changes here if needed
  };

  const onResizeStop = (layout, oldItem, newItem) => {
    // Optionally handle resize stop events
  };

  const peerLayout = peers.map((peer, index) => ({
    i: peer.id,
    x: (index * 4) % 24,
    y: Math.floor(index / 4),
    w: 8.4,
    h: 5.5,
    minW: 4,
    minH: 3,
    maxW: 12,
    maxH: 8,
  }));

  const defaultLayout = [
    visibility.DateDisplay && { i: 'dateDisplay', w: 6, h: 1.5, x: 18, y: 0, minW: 4, minH: 1.5, maxW:8, maxH: 2.5},
    visibility.DoctorSchedule && { i: 'doctorSchedule', w: 8, h: 4, x: 8, y: 8, minW: 6, minH: 4 },
    visibility.HealthSummary && { i: 'healthSummary', w: 6, h: 10.2, x: 18, y: 1, minW: 4, minH: 8 },
    visibility.Highlights && { i: 'highlights', w: 3.38, h: 2.4, x: 18, y: 10, minW: 2, minH: 2 },
    visibility.SuggestedQuestion && { i: 'suggestedQuestion', w: 5, h: 1.5, x: 8, y: 3, minW: 4, minH: 1.5 },
    visibility.ClinicalCodes && { i: 'clinicalcodes', w: 5, h: 1.5, x: 8, y: 5, minW: 4, minH: 1.5 },
  ].filter(Boolean); // Filter out those components not visible

  const combinedLayout = [...defaultLayout, ...peerLayout];

  const draggableItemStyle = {
    transform: isDragging ? 'translate(0, 0)' : 'none',
    transition: 'transform 0.005s ease',
    boxShadow: isDragging ? '0 4px 10px rgba(0, 0, 0, 0.8)' : 'none',
    cursor: isDragging ? 'grabbing' : 'grab',
  };

  return (
    <div data-component='Peers'>
      <ResponsiveGridLayout
        useCSSTransforms={true}
        className={`layout ${isDragging ? 'dragging' : ''}`}
        layouts={{ lg: combinedLayout }}
        cols={{ lg: 24 }}
        rowHeight={50}
        breakpoints={{ lg: 1200 }}
        onDragStart={handleDragStart}
        onDragStop={handleDragStop}
        onLayoutChange={onLayoutChange}
        onResizeStop={onResizeStop}
        preventCollision={true}
        isBounded={false}
        verticalCompact={false}
        draggableHandle='.drag-handle'
        isResizable={true} // Enable resizing
      >

        {visibility.DateDisplay && (
          <div key='dateDisplay' className='draggable-item' style={isDragging ? draggableItemStyle : {}}>
            <div className='drag-handle'></div>
            <DateDisplay />
          </div>
        )}

        {visibility.DoctorSchedule && (
          <div key='doctorSchedule' className='draggable-item' style={isDragging ? draggableItemStyle : {}}>
            <div className='drag-handle'></div>
            <DoctorSchedule />
          </div>
        )}

        {visibility.HealthSummary && (
          <div key='healthSummary' className='draggable-item' style={isDragging ? draggableItemStyle : {}}>
            <div className='drag-handle'></div>
            <HealthSummary />
          </div>
        )}

        {visibility.Highlights && (
          <div key='highlights' className='draggable-item' style={isDragging ? draggableItemStyle : {}}>
            <div className='drag-handle'></div>
            <Highlights />
          </div>
        )}

        {visibility.SuggestedQuestion && (
          <div key='suggestedQuestion' className='draggable-item' style={isDragging ? draggableItemStyle : {}}>
            <div className='drag-handle'></div>
            <SuggestedQuestion />
          </div>
        )}

        {visibility.ClinicalCodes && (
          <div key='clinicalcodes' className='draggable-item' style={isDragging ? draggableItemStyle : {}}>
            <div className='drag-handle'></div>
            <ClinicalCodes />
          </div>
        )}

        {peers.map((peer, index) => (
          <div
            key={peer.id}
            data-grid={peerLayout[index]}
            className='draggable-item'
            style={isDragging ? draggableItemStyle : {}}
          >
            <div className='drag-handle special-drag-handle'></div>
            <Appear key={peer.id} duration={1000}>
              <div
                className={classnames('peer-container', {
                  'active-speaker': peer.id === activeSpeakerId,
                })}
              >
                <Peer id={peer.id} />
              </div>
            </Appear>
          </div>
        ))}
      </ResponsiveGridLayout>
    </div>
  );
};

Peers.propTypes = {
  peers: PropTypes.arrayOf(appPropTypes.Peer).isRequired,
  activeSpeakerId: PropTypes.string,
};

const mapStateToProps = (state) => {
  const peersArray = Object.values(state.peers);

  return {
    peers: peersArray,
    activeSpeakerId: state.room.activeSpeakerId,
  };
};

const PeersContainer = connect(mapStateToProps, null, null, {
  areStatesEqual: (next, prev) => {
    return (
      prev.peers === next.peers &&
      prev.room.activeSpeakerId === next.room.activeSpeakerId
    );
  },
})(Peers);

export default PeersContainer;
