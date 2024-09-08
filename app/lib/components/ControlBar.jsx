
import React from 'react';

const ControlBar = () => {
  const containerStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 20px',
    borderRadius: '20px',
    backgroundColor: '#1c1c1c',
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
  };

  const buttonStyle = {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    margin: '0 5px',
    fontSize: '20px',
  };

  const greenButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#32CD32',
  };

  const whiteButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#FFFFFF',
  };

  const redButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#FF0000',
  };

  const badgeStyle = {
    position: 'absolute',
    top: '-5px',
    right: '-5px',
    backgroundColor: '#FF0000',
    color: '#FFFFFF',
    borderRadius: '50%',
    padding: '2px 5px',
    fontSize: '12px',
  };

  return (
    <div style={containerStyle}>
      
      <button style={greenButtonStyle}>
        📝
      </button>
      <button style={whiteButtonStyle}>
        🔊
      </button>
      <button style={{ ...whiteButtonStyle, position: 'relative' }}>
        🎤
        
        <span style={badgeStyle}>12</span>
      </button>
      <button style={whiteButtonStyle}>...</button>
      <button style={redButtonStyle}>
        📞
      </button>
    </div>
  );
};

export default ControlBar;
