// Peers.jsx
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

const ResponsiveGridLayout = WidthProvider(Responsive);

function getFromLS(key) {
  let ls = {};
  if (global.localStorage) {
    try {
      ls = JSON.parse(global.localStorage.getItem('rgl-layouts')) || {};
    } catch (e) {
      console.error('Error reading from localStorage', e);
    }
  }
  return ls[key];
}

function saveToLS(key, value) {
  if (global.localStorage) {
    global.localStorage.setItem(
      'rgl-layouts',
      JSON.stringify({
        [key]: value,
      })
    );
  }
}

const Peers = (props) => {
  const { peers, activeSpeakerId } = props;
  const { visibility } = useRoomContext();

  // Load the layout from localStorage
  const savedLayouts = getFromLS('peersLayouts') || {};

  const [isDragging, setIsDragging] = React.useState(false);
  const [layouts, setLayouts] = React.useState(savedLayouts || {});

  const handleDragStart = () => {
    setIsDragging(true);
  };

  const handleDragStop = () => {
    setIsDragging(false);
  };

  const onLayoutChange = (layout, layouts) => {
    saveToLS('peersLayouts', layouts);
    setLayouts(layouts);
  };

  // 根据 peers 动态生成默认布局
  const peerLayout = peers.map((peer, index) => ({
    i: peer.id,
    x: (index * 4) % 24,
    y: Math.floor(index / 4),
    w: 8.4,
    h: 5.5,
  }));

  // 其他组件的默认布局
  const defaultLayout = [
    visibility.DateDisplay && { i: 'dateDisplay', w: 6, h: 1.5, x: 18, y: 0, minW: 3, minH: 2 },
    visibility.DoctorSchedule && { i: 'doctorSchedule', w: 8, h: 4, x: 8, y: 8, minW: 4, minH: 2 },
    visibility.HealthSummary && { i: 'healthSummary', w: 6, h: 10.2, x: 18, y: 1, minW: 3, minH: 5 },
    visibility.Highlights && { i: 'highlights', w: 3.38, h: 2.4, x: 18, y: 10, minW: 3, minH: 2 },
  ].filter(Boolean); // 过滤掉值为 false 的项

  // 合并 Peer 组件布局和其他组件布局
  const combinedLayout = [...defaultLayout, ...peerLayout];

  const draggableItemStyle = {
    transition: 'transform 0.005s ease',
    boxShadow: isDragging ? '0 4px 10px rgba(0, 0, 0, 0.8)' : 'none',
    cursor: isDragging ? 'grabbing' : 'grab',
  };

  return (
    <div data-component='Peers'>
      <ResponsiveGridLayout
        className={`layout ${isDragging ? 'dragging' : ''}`}
        layouts={{ lg: combinedLayout }}
        cols={{ lg: 24 }}
        rowHeight={50}
        breakpoints={{ lg: 1200 }}
        onDragStart={handleDragStart}
        onDragStop={handleDragStop}
        onLayoutChange={onLayoutChange}
        preventCollision={true}
        isBounded={false}
        verticalCompact={false}
        draggableHandle='.drag-handle'
      >
        {/* 渲染可见的组件 */}
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

        {/* 渲染 Peers */}
        {peers.map((peer, index) => (
          <div
            key={peer.id}
            data-grid={peerLayout[index]} // 动态生成的 peer 布局
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
