import React, { useState } from 'react';
import DateDisplay from './DateDisplay';
import DoctorSchedule from './DoctorSchedule';
import HealthSummary from './HealthSummary';
import Highlights from './Highlights';

const NavBar = () => {
  const [active, setActive] = useState({ 
    DateDisplay: false, 
    DoctorSchedule: false, 
    HealthSummary: false, 
    Highlights: false 
  });

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

  // Toggle the active state and only allow one component to be active at a time
  const toggleActive = (name) => {
    setActive(prev => ({
      DateDisplay: false,
      DoctorSchedule: false,
      HealthSummary: false,
      Highlights: false,
      [name]: !prev[name]
    }));
  };

  return (
    <div style={{ display: 'flex' }}>
      <div style={navStyle}>
        {Object.keys(active).map((name) => (
          <div 
            key={name}
            style={{
              ...iconStyle,
              backgroundColor: active[name] ? '#ffffff' : '#0028F8',
              color: active[name] ? '#0028F8' : '#ffffff'
            }}
            onClick={() => toggleActive(name)}
          >
            {name}
          </div>
        ))}
      </div>
      <div style={{ marginLeft: '70px' }}>
        {active.DateDisplay && <DateDisplay />}
        {active.DoctorSchedule && <DoctorSchedule />}
        {active.HealthSummary && <HealthSummary />}
        {active.Highlights && <Highlights />}
      </div>
    </div>
  );
};

export default NavBar;
