// app/lib/components/NavBar.jsx
import React from 'react';
import { useRoomContext } from '../RoomContext';

const NavBar = () => {
  const { visibility, toggleVisibility } = useRoomContext();

  return (
    <div className="nav-wrapper">
      <div data-component="NavBar">
        {Object.keys(visibility).map((name) => (
          <div
            key={name}
            className={`icon ${visibility[name] ? 'active' : ''}`}
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
