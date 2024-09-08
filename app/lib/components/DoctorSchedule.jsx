
import React from 'react';

// fake data
const fakeData = Array.from({ length: 52 }, () =>
  Array.from({ length: 7 }, () => Math.floor(Math.random() * 3))
);

const DoctorSchedule = () => {
  
  const containerStyle = {
    padding: '20px',
    borderRadius: '12px',
    backgroundColor: '#f9f9f9',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    fontFamily: 'Arial, sans-serif',
    width: '100%',
  };

  const headerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
  };

  const titleStyle = {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#333',
  };

  const subTitleStyle = {
    fontSize: '12px',
    color: '#666',
  };

  const gridContainerStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(53, 12px)',
    gap: '4px',
    marginTop: '10px',
  };

  const cellStyle = (status) => ({
    width: '12px',
    height: '12px',
    borderRadius: '3px',
    backgroundColor: status === 0 ? '#d3e0ff' : status === 1 ? '#4b6ef3' : '#0028f8',
  });

  const labelContainerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '10px',
    fontSize: '12px',
    color: '#333',
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div>
          <div style={titleStyle}>Doctor's Schedule</div>
          <div style={subTitleStyle}>Doctor’s weekly consultation availability</div>
        </div>
        <button
          style={{
            background: 'none',
            border: 'none',
            color: '#0028f8',
            fontSize: '12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          + Book a Session
        </button>
      </div>
      <div style={gridContainerStyle}>
        
        <div style={{ gridColumn: 'span 1' }}>W</div>
        {fakeData.map((week, index) => (
          <React.Fragment key={index}>
            {week.map((day, i) => (
              <div key={i} style={cellStyle(day)}></div>
            ))}
          </React.Fragment>
        ))}
      </div>
      
      <div style={labelContainerStyle}>
        <span>Jan</span>
        <span>May</span>
        <span>Oct</span>
      </div>
    </div>
  );
};

export default DoctorSchedule;
