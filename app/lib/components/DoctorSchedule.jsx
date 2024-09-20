import React from 'react';

// fake data
const fakeData = Array.from({ length: 52 }, () =>
  Array.from({ length: 7 }, () => Math.floor(Math.random() * 3))
);

const DoctorSchedule = () => {
  return (
    <div data-component="DoctorSchedule">
      <div className="container">
        <div className="header">
          <div>
            <div className="title">Doctor's Schedule</div>
            <div className="sub-title">Doctor’s weekly consultation availability</div>
          </div>
          <button className="book-button">+ Book a Session</button>
        </div>
        <div className="grid-container">
          <div className="week-label">W</div>
          {fakeData.map((week, index) => (
            <React.Fragment key={index}>
              {week.map((day, i) => (
                <div key={i} className={`cell status-${day}`}></div>
              ))}
            </React.Fragment>
          ))}
        </div>
        <div className="label-container">
          <span>Jan</span>
          <span>May</span>
          <span>Oct</span>
        </div>
      </div>
    </div>
  );
};

export default DoctorSchedule;
