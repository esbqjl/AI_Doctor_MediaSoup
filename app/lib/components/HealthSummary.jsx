import React from 'react';

// fake data
const fakeNotes = ['Missed Dosage', 'Medications', 'ATP', 'Back Pain'];
const fakeDigitalTwinData = [
  { label: 'Migraine', position: { top: '10px', left: '120px' }, color: '#FFD700' },
  { label: 'Back Pain', position: { top: '60px', left: '80px' }, color: '#4b6ef3' },
  { label: 'Abdominal Pain', position: { top: '120px', left: '150px' }, color: '#32CD32' },
];
const fakeMedicalHistory = [
  { condition: 'Back Pains', timeAgo: '4 weeks ago' },
  { condition: 'Back Pains', timeAgo: '4 weeks ago' },
  { condition: 'Back Pains', timeAgo: '4 weeks ago' },
  { condition: 'Back Pains', timeAgo: '4 weeks ago' },
];

const HealthSummary = () => {

  const containerLayout = {
    position: 'absolute',    
    top: 0,               
    right: 0,   
    zIndex: 999,               
    paddingBottom: '10px',  
    paddingRight: '10px', 
    paddingTop:'170px',
    width: '400px',

  }
  const containerStyle = {
    padding: '20px',
    borderRadius: '12px',
    backgroundColor: '#fff',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    fontFamily: 'Arial, sans-serif',
    marginBottom: '20px',
  };

  const sectionTitleStyle = {
    fontSize: '16px',
    fontWeight: 'bold',
    marginBottom: '10px',
  };

  const notesStyle = {
    listStyleType: 'none',
    padding: 0,
  };

  const noteItemStyle = {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '5px',
  };

  const dotStyle = {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: '#4b6ef3',
    marginRight: '10px',
  };

  const digitalTwinStyle = {
    position: 'relative',
    marginTop: '10px',
    marginBottom: '20px',
    height: '150px',
    backgroundImage: 'url("/path/to/digital-twin-image.png")', // 这个是模拟的图像路径
    backgroundSize: 'cover',
    borderRadius: '12px',
  };

  const twinLabelStyle = (color, position) => ({
    position: 'absolute',
    backgroundColor: color,
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '10px',
    color: '#fff',
    ...position,
  });

  const historyStyle = {
    marginTop: '10px',
  };

  const historyRowStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    borderBottom: '1px solid #eee',
    padding: '5px 0',
  };

  return (
    <div style={containerLayout}>
      {/* Doctor's Notes */}
      <div style={containerStyle}>
        <div style={sectionTitleStyle}>Doctor's Notes</div>
        <ul style={notesStyle}>
          {fakeNotes.map((note, index) => (
            <li key={index} style={noteItemStyle}>
              <div style={dotStyle}></div>
              {note}
            </li>
          ))}
        </ul>
      </div>

      {/* Your Digital Twin */}
      <div style={containerStyle}>
        <div style={sectionTitleStyle}>Your Digital Twin</div>
        <div style={digitalTwinStyle}>
          {fakeDigitalTwinData.map((item, index) => (
            <span key={index} style={twinLabelStyle(item.color, item.position)}>
              {item.label}
            </span>
          ))}
        </div>
      </div>

      {/* Past Medical History */}
      <div style={containerStyle}>
        <div style={sectionTitleStyle}>Past Medical History</div>
        <div style={historyStyle}>
          {fakeMedicalHistory.map((record, index) => (
            <div key={index} style={historyRowStyle}>
              <span>{record.condition}</span>
              <span>{record.timeAgo}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HealthSummary;
