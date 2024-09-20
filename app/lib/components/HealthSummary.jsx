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
  return (
    <div data-component="HealthSummary">
      {/* Doctor's Notes */}
      <div className="container">
        <div className="section-title">Doctor's Notes</div>
        <ul className="notes">
          {fakeNotes.map((note, index) => (
            <li key={index} className="note-item">
              <div className="dot"></div>
              {note}
            </li>
          ))}
        </ul>
      </div>

      {/*Digital Twin */}
      <div className="container">
        <div className="section-title">Your Digital Twin</div>
        <div className="digital-twin">
          {fakeDigitalTwinData.map((item, index) => (
            <span
              key={index}
              className="twin-label"
              style={{ backgroundColor: item.color, ...item.position }}
            >
              {item.label}
            </span>
          ))}
        </div>
      </div>

      {/* Past Medical History */}
      <div className="container">
        <div className="section-title">Past Medical History</div>
        <div className="history">
          {fakeMedicalHistory.map((record, index) => (
            <div key={index} className="history-row">
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
