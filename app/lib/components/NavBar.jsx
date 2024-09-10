import React from 'react';

const NavBar = () => {
  const navStyle = {
    position: 'fixed',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: '#0028F8',
    padding: '10px',
    height: '916px',
    width: '62px',
    boxShadow: '2px 0 5px rgba(0, 0, 0, 0.1)',
  };

  const iconStyle = {
    margin: '20px 0',
    color: '#ffffff',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'transform 0.2s ease',
  };

  return (
    <div style={navStyle}>
      <div style={iconStyle}>Home</div>
      <div style={iconStyle}>Doctor</div>
      <div style={iconStyle}>Calendar</div>
      <div style={iconStyle}>Settings</div>
    </div>
  );
};

export default NavBar;
