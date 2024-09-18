// NavBar.jsx
import React from 'react';
import { useRoomContext } from '../RoomContext';

const NavBar = () => {
  const { visibility, toggleVisibility } = useRoomContext();

  const navStyle = {
    position: 'fixed',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: '#0028F8',
    padding: '10px',
    height: '100vh',
    width: '62px',
    boxShadow: '2px 0 5px rgba(0, 0, 0, 0.1)',
    zIndex: 1000,
  };

  const iconStyle = {
    margin: '20px 0',
    color: '#ffffff',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'transform 0.2s ease',
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
    textAlign: 'center',
  };

  return (
    <div style={{ display: 'flex' }}>
      <div style={navStyle}>
        {Object.keys(visibility).map((name) => (
          <div
            key={name}
            style={{
              ...iconStyle,
              backgroundColor: visibility[name] ? '#ffffff' : '#0028F8',
              color: visibility[name] ? '#0028F8' : '#ffffff',
            }}
            onClick={() => toggleVisibility(name)}
          >
            {name}
          </div>
        ))}
      </div>
    </div>
  );
};

export default NavBar;
