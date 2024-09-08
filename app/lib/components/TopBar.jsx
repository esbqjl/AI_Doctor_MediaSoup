
import React from 'react';

const TopBar = () => {
  const topBarStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 20px',
    backgroundColor: '#f8f8f8',
    boxShadow: '0px 1px 5px rgba(0, 0, 0, 0.1)',
    position: 'fixed',
    top: 0,
    width: '100%',
    height: '60px',
    zIndex: 1000,
  };

  const logoStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  };

  const logoTextStyle = {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#0028F8',
  };

  const timeStyle = {
    fontSize: '14px',
    color: '#555',
  };

  const userSectionStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
  };

  const userImageStyle = {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: '#ccc',
  };

  const iconStyle = {
    fontSize: '18px',
    cursor: 'pointer',
  };

  return (
    <div style={topBarStyle}>
      <div style={logoStyle}>
        <div className="logo">
          <img src="/path/to/logo.png" alt="Healthi AI Logo" style={{ height: '30px' }} />
        </div>
        <span style={logoTextStyle}>Healthi AI</span>
      </div>
      <div style={timeStyle}>July 2024, 08:23 am</div>
      <div style={userSectionStyle}>
        <div style={userImageStyle}></div>
        <i className="fas fa-bell" style={iconStyle}></i>
        <i className="fas fa-cog" style={iconStyle}></i>
      </div>
    </div>
  );
};

export default TopBar;
