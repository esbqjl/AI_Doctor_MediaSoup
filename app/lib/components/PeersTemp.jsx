import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import * as appPropTypes from './appPropTypes';
import { Appear } from './transitions';
import Peer from './Peer';
import { WidthProvider, Responsive } from 'react-grid-layout';
import DateDisplay from './DateDisplay';
import DoctorSchedule from './DoctorSchedule';
import Highlights from './Highlights';
import HealthSummary from './HealthSummary';

const ResponsiveGridLayout = WidthProvider(Responsive);

// Helper function to get layouts from localStorage
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

// Helper function to save layouts to localStorage
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

class Peers extends React.Component {
  constructor(props) {
    super(props);

    // Load the layout from localStorage
    const savedLayouts = getFromLS('peersLayouts') || {};

    this.state = {
      isDragging: false,
      layouts: savedLayouts || {}, // 初始化布局，从 localStorage 中获取
    };
  }

  handleDragStart = () => {
    this.setState({ isDragging: true });
  };

  handleDragStop = () => {
    this.setState({ isDragging: false });
  };

  // 在布局变化时保存到 localStorage
  onLayoutChange = (layout, layouts) => {
    saveToLS('peersLayouts', layouts); // 保存更新的布局到 localStorage
    this.setState({ layouts });
  };

  render() {
    const { peers, activeSpeakerId } = this.props;

    // 根据 peers 动态生成默认布局
    const peerLayout = peers.map((peer, index) => ({
      i: peer.id,  
      x: (index * 4) % 24,  
      y: Math.floor(index / 5),  
      w: 5,  
      h: 5,  
    }));

    // 其他组件的默认布局
    const defaultLayout = [
      { i: 'dateDisplay', w: 6, h: 2, x: 18, y: 1, minW: 3, minH: 2 },
      { i: 'doctorSchedule', w: 8, h: 5, x: 8, y: 18, minW: 4, minH: 2 },
      { i: 'highlights', w: 6, h: 2, x: 18, y: 18, minW: 3, minH: 2  },
      { i: 'healthSummary', w: 6, h: 10, x: 18, y: 3, minW: 3, minH: 5 }
    ];

    // 合并 Peer 组件布局和其他组件布局
    const combinedLayout = [...defaultLayout, ...peerLayout];

    const draggableItemStyle = {
      transition: 'transform 0.04s ease',
      boxShadow: this.state.isDragging
        ? '0 4px 10px rgba(0, 0, 0, 0.2)'
        : 'none',
      cursor: this.state.isDragging ? 'grabbing' : 'grab',
    };

    return (
      	<div data-component='Peers'>
        

			<ResponsiveGridLayout
				className={`layout ${this.state.isDragging ? 'dragging' : ''}`}
				layouts={this.state.layouts || { lg: combinedLayout }}  
				cols={{ lg: 24 }}  // 一行分为24列
				rowHeight={50}  // 每行高度50px
				breakpoints={{ lg: 1200 }}
				onDragStart={this.handleDragStart}
				onDragStop={this.handleDragStop}
				preventCollision={true}
				isBounded={false}
				verticalCompact={false}
				draggableHandle=".drag-handle"  
			>
			{/* 渲染 DateDisplay */}
			<div key="dateDisplay" className ="draggable-item" style={this.state.isDragging ? draggableItemStyle : {}}>
				<div className="drag-handle" >
		
				</div>
				<DateDisplay />
			</div>

			{/* 渲染 DoctorSchedule */}
			<div key="doctorSchedule" className ="draggable-item" style={this.state.isDragging ? draggableItemStyle : {}}>
				<div className="drag-handle" >
				
				</div>
				<DoctorSchedule />
			</div>

			{/* 渲染 Highlights */}
			<div key="highlights" className ="draggable-item" style={this.state.isDragging ? draggableItemStyle : {}}>
				<div className="drag-handle" >
				
				</div>
				<Highlights />
			</div>

			{/* 渲染 HealthSummary */}
			<div key="healthSummary" className ="draggable-item" style={this.state.isDragging ? draggableItemStyle : {}}>
				<div className="drag-handle" >
				
				</div>
				<HealthSummary />
			</div>

			{/* 渲染 Peers */}
			{peers.map((peer, index) => (
			<div 
				key={peer.id} 
				data-grid={peerLayout[index]}  // 动态生成的 peer 布局
				className="draggable-item" 
				style={this.state.isDragging ? draggableItemStyle : {}}
			>
				<div className="drag-handle"></div>
				<Appear key={peer.id} duration={1000}>
				<div className={classnames('peer-container', {
					'active-speaker': peer.id === activeSpeakerId,
				})}>
					<Peer id={peer.id} />
				</div>
				</Appear>
			</div>
			))}
			</ResponsiveGridLayout>
    	</div>
    );
  }
}

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

const PeersContainer = connect(
  mapStateToProps,
  null,
  null,
  {
    areStatesEqual: (next, prev) => {
      return (
        prev.peers === next.peers &&
        prev.room.activeSpeakerId === next.room.activeSpeakerId
      );
    },
  }
)(Peers);

export default PeersContainer;