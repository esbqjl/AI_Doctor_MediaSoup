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

  return (
    <div data-component="DateDisplay">
      <div className="container">
        <div className="header">
          <span>{`${monthNames[month]} ${year}`}</span>
          <span className="time">{`${formattedHours}:${formattedMinutes} ${ampm}`}</span>
        </div>
        <div className="calendar">
          {dayNames.map((name, index) => (
            <div
              key={index}
              className={`day ${index === dayOfWeek ? 'active' : ''}`}
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
