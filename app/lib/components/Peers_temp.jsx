import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { WidthProvider, Responsive } from 'react-grid-layout';
import { useRoomContext } from '../RoomContext';
import DateDisplay from './DateDisplay';
import DoctorSchedule from './DoctorSchedule';
import Highlights from './Highlights';
import HealthSummary from './HealthSummary';
import SuggestedQuestion from './SuggestedQuestion';
import Widget from './Widget';

const ResponsiveGridLayout = WidthProvider(Responsive);

const Peers = (props) => {
  const { peers, activeSpeakerId } = props;
  const { visibility } = useRoomContext();

  const [isDragging, setIsDragging] = React.useState(false);
  const [lockedWidgets, setLockedWidgets] = React.useState({}); // 用于存储锁定状态的 widget

  const handleDragStart = () => {
    setIsDragging(true);
  };

  const handleDragStop = () => {
    setIsDragging(false);
  };

  const onLayoutChange = (layout, layouts) => {
    // 处理布局变化
  };

  const handleLockWidget = (widget) => {
    setLockedWidgets({ ...lockedWidgets, [widget.i]: true });
  };

  const handleUnlockWidget = (widget) => {
    const updatedLocks = { ...lockedWidgets };
    delete updatedLocks[widget.i];
    setLockedWidgets(updatedLocks);
  };

  const handleRemoveWidget = (widget) => {
    // 移除组件逻辑
  };

  const peerLayout = peers.map((peer, index) => ({
    i: peer.id,
    x: (index * 4) % 24,
    y: Math.floor(index / 4),
    w: 8.4,
    h: 5.5,
  }));

  const defaultLayout = [
    visibility.DateDisplay && { i: 'dateDisplay', w: 6, h: 1.5, x: 18, y: 0, minW: 6, minH: 1.5 },
    visibility.DoctorSchedule && { i: 'doctorSchedule', w: 8, h: 4, x: 8, y: 8, minW: 8, minH: 4 },
    visibility.HealthSummary && { i: 'healthSummary', w: 6, h: 10.2, x: 18, y: 1, minW: 6, minH: 10.2 },
    visibility.Highlights && { i: 'highlights', w: 3.38, h: 2.4, x: 18, y: 10, minW: 3.38, minH: 2.4 },
    visibility.SuggestedQuestion && { i: 'suggestedQuestion', w: 5, h: 3.4, x: 8, y: 3, minW: 5, minH: 3.5 },
  ].filter(Boolean);

  const combinedLayout = [...defaultLayout, ...peerLayout];

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
        preventCollision={true}
        isBounded={false}
        verticalCompact={false}
      >
        {visibility.DateDisplay && (
          <div
            key='dateDisplay'
            data-grid={{ ...combinedLayout.find((layout) => layout.i === 'dateDisplay'), draggable: !lockedWidgets['dateDisplay'], resizable: !lockedWidgets['dateDisplay'] }}
          >
            <Widget
              widget={{ i: 'dateDisplay' }}
              locked={lockedWidgets['dateDisplay']}
              lockWidget={handleLockWidget}
              unlockWidget={handleUnlockWidget}
              onRemoveWidget={handleRemoveWidget}
              isDragging={isDragging}
            >
              <DateDisplay />
            </Widget>
          </div>
        )}

        {visibility.DoctorSchedule && (
          <div
            key='doctorSchedule'
            data-grid={{ ...combinedLayout.find((layout) => layout.i === 'doctorSchedule'), draggable: !lockedWidgets['doctorSchedule'], resizable: !lockedWidgets['doctorSchedule'] }}
          >
            <Widget
              widget={{ i: 'doctorSchedule' }}
              locked={lockedWidgets['doctorSchedule']}
              lockWidget={handleLockWidget}
              unlockWidget={handleUnlockWidget}
              onRemoveWidget={handleRemoveWidget}
              isDragging={isDragging}
            >
              <DoctorSchedule />
            </Widget>
          </div>
        )}

        {visibility.HealthSummary && (
          <div
            key='healthSummary'
            data-grid={{ ...combinedLayout.find((layout) => layout.i === 'healthSummary'), draggable: !lockedWidgets['healthSummary'], resizable: !lockedWidgets['healthSummary'] }}
          >
            <Widget
              widget={{ i: 'healthSummary' }}
              locked={lockedWidgets['healthSummary']}
              lockWidget={handleLockWidget}
              unlockWidget={handleUnlockWidget}
              onRemoveWidget={handleRemoveWidget}
              isDragging={isDragging}
            >
              <HealthSummary />
            </Widget>
          </div>
        )}

        {visibility.Highlights && (
          <div
            key='highlights'
            data-grid={{ ...combinedLayout.find((layout) => layout.i === 'highlights'), draggable: !lockedWidgets['highlights'], resizable: !lockedWidgets['highlights'] }}
          >
            <Widget
              widget={{ i: 'highlights' }}
              locked={lockedWidgets['highlights']}
              lockWidget={handleLockWidget}
              unlockWidget={handleUnlockWidget}
              onRemoveWidget={handleRemoveWidget}
              isDragging={isDragging}
            >
              <Highlights />
            </Widget>
          </div>
        )}

        {visibility.SuggestedQuestion && (
          <div
            key='suggestedQuestion'
            data-grid={{ ...combinedLayout.find((layout) => layout.i === 'suggestedQuestion'), draggable: !lockedWidgets['suggestedQuestion'], resizable: !lockedWidgets['suggestedQuestion'] }}
          >
            <Widget
              widget={{ i: 'suggestedQuestion' }}
              locked={lockedWidgets['suggestedQuestion']}
              lockWidget={handleLockWidget}
              unlockWidget={handleUnlockWidget}
              onRemoveWidget={handleRemoveWidget}
              isDragging={isDragging}
            >
              <SuggestedQuestion />
            </Widget>
          </div>
        )}

        {peers.map((peer, index) => (
          <div
            key={peer.id}
            data-grid={{ ...peerLayout[index], draggable: !lockedWidgets[peer.id], resizable: !lockedWidgets[peer.id] }}
          >
            <Widget
              widget={{ i: peer.id }}
              locked={lockedWidgets[peer.id]}
              lockWidget={handleLockWidget}
              unlockWidget={handleUnlockWidget}
              onRemoveWidget={handleRemoveWidget}
              isDragging={isDragging}
            >
              <Appear key={peer.id} duration={1000}>
                <div
                  className={`peer-container ${
                    peer.id === activeSpeakerId ? 'active-speaker' : ''
                  }`}
                >
                  <Peer id={peer.id} />
                </div>
              </Appear>
            </Widget>
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

const PeersContainer = connect(mapStateToProps, null, null, {
  areStatesEqual: (next, prev) => {
    return (
      prev.peers === next.peers &&
      prev.room.activeSpeakerId === next.room.activeSpeakerId
    );
  },
})(Peers);

export default PeersContainer;
