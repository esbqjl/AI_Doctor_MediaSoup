// Widget.jsx
import React from 'react';
import { CloseOutlined, LockOutlined, UnlockOutlined } from '@ant-design/icons';
import PropTypes from 'prop-types';

const Widget = ({
  widget,
  locked,
  lockWidget,
  unlockWidget,
  onRemoveWidget,
  children,
  isDragging,
}) => {
  // 阻止事件冒泡的方法
  const stopPropagation = (event) => {
    event.stopPropagation();
  };

  return (
    <div
      className={`widget-wrapper ${locked ? 'locked' : ''}`}
      data-grid={widget.layout}
      style={{
        transform: isDragging ? 'translate(0, 0)' : 'none',
        transition: 'transform 0.005s ease',
        boxShadow: isDragging ? '0 4px 10px rgba(0, 0, 0, 0.8)' : 'none',
        cursor: isDragging ? 'grabbing' : locked ? 'default' : 'grab', // 当锁定时鼠标样式变化
        pointerEvents: locked ? 'none' : 'auto' // 锁定时禁用交互
      }}
    >
      <span className='widget-header' onMouseDown={stopPropagation}>
        {/* 锁定和解锁按钮的事件被阻止冒泡，防止触发拖动 */}
        {locked ? (
          <LockOutlined
            className='widget-header-icon'
            onClick={(event) => {
              stopPropagation(event); // 阻止冒泡
              unlockWidget(widget);
            }}
          />
        ) : (
          <UnlockOutlined
            className='widget-header-icon'
            onClick={(event) => {
              stopPropagation(event); // 阻止冒泡
              lockWidget(widget);
            }}
          />
        )}
        <CloseOutlined
          className='widget-header-icon'
          onClick={(event) => {
            stopPropagation(event); // 阻止冒泡
            onRemoveWidget(widget);
          }}
        />
      </span>
      <div
        className={`widget-content ${locked ? 'locked' : ''}`}
        onMouseDown={stopPropagation} // 阻止内容区域的点击事件触发拖动
      >
        {children}
      </div>
    </div>
  );
};

Widget.propTypes = {
  widget: PropTypes.object.isRequired,
  locked: PropTypes.bool.isRequired,
  lockWidget: PropTypes.func.isRequired,
  unlockWidget: PropTypes.func.isRequired,
  onRemoveWidget: PropTypes.func.isRequired,
  children: PropTypes.node.isRequired,
  isDragging: PropTypes.bool,
};

export default Widget;
