import React, { useState, useRef, useEffect } from 'react';
import { useRoomContext } from '../RoomContext';
import { TiThMenu } from 'react-icons/ti';

const NavBar = () => {
  const { visibility, toggleVisibility } = useRoomContext();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        menuOpen &&
        menuRef.current &&
        !menuRef.current.contains(event.target) &&
        !event.target.closest('.menu-icon')
      ) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  return (
    <div className="nav-wrapper">
      <div data-component="NavBar">
        
        <div className="menu-icon" onClick={() => setMenuOpen(!menuOpen)}>
          <TiThMenu size={30} color="#ffffff" />
        </div>

       
        {menuOpen && (
          <div className="popup-menu" ref={menuRef}>
            {Object.keys(visibility).map((name) => (
              <div
                key={name}
                className={`menu-item ${visibility[name] ? 'active' : ''}`}
                onClick={() => toggleVisibility(name)}
              >
                {name}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NavBar;
