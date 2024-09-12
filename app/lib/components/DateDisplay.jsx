
import React, { useState, useEffect } from 'react';

const DateDisplay = () => {
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDate(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const day = currentDate.getDate();
  const dayOfWeek = currentDate.getDay();
  const month = currentDate.getMonth();
  const year = currentDate.getFullYear();
  const hours = currentDate.getHours();
  const minutes = currentDate.getMinutes();
  const ampm = hours >= 12 ? 'pm' : 'am';
  const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
  const formattedHours = hours % 12 || 12;

  const containerLayout = {
    position: 'absolute',
    top: 0,
    right: 0,
    zIndex: 1000,
    width: '400px',
    height: 'auto',
    paddingRight: '10px',
    paddingTop: '80px',
  };

  const containerStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '10px 20px',
    borderRadius: '12px',
    backgroundColor: '#f0f0f0',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    fontFamily: 'Arial, sans-serif',
  };

  const headerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    width: '100%',
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#333',
  };

  const timeStyle = {
    fontSize: '12px',
    color: '#666',
  };

  const calendarStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: '10px',
    fontSize: '14px',
    color: '#333',
  };

  const activeDayStyle = {
    color: '#0028F8',
    textDecoration: 'underline',
  };

  return (
    <div>
      <div style={containerStyle}>
        <div style={headerStyle}>
          <span>{`${monthNames[month]} ${year}`}</span>
          <span style={timeStyle}>{`${formattedHours}:${formattedMinutes} ${ampm}`}</span>
        </div>
        <div style={calendarStyle}>
          {dayNames.map((name, index) => (
            <div
              key={index}
              style={index === dayOfWeek ? activeDayStyle : undefined}
            >
              <div>{name}</div>
              <div>{day - (dayOfWeek - index)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DateDisplay;
