
import React, { useState, useEffect } from 'react';

const Highlights = () => {
  const [duration, setDuration] = useState(0); 
  const [rating, setRating] = useState(1); 

  useEffect(() => {
   
    const timer = setInterval(() => {
      setDuration((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer); 
  }, []);


  const formatDuration = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes < 10 ? '0' : ''}${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };


  const containerLayout = {
    position: 'absolute',               
    right: 0,  
    bottom:0,  
    zIndex: 1000,             
    paddingBottom: '30px',  
    paddingRight: '10px', 
    width: '400px',

  }
  const containerStyle = {
    padding: '20px',
    borderRadius: '12px',
    backgroundColor: '#fff',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    fontFamily: 'Arial, sans-serif',
    width: '250px',
  };

  const headerStyle = {
    fontSize: '16px',
    fontWeight: 'bold',
    marginBottom: '10px',
  };

  const rowStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
  };

  const ratingStars = [1, 2, 3, 4, 5];

  return (
    <div style={containerLayout}>
      <div style={containerStyle}>
        <div style={headerStyle}>Highlights</div>
        <div style={rowStyle}>
          <div>
            <div>Duration</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{formatDuration(duration)}</div>
            <span style={{ fontSize: '12px', color: '#888', padding: '2px 6px', backgroundColor: '#ececec', borderRadius: '12px' }}>
              Ongoing
            </span>
          </div>
          <div>
            <div>Ratings</div>
            <div>
              {ratingStars.map((star) => (
                <span
                  key={star}
                  onClick={() => setRating(star)}
                  style={{
                    cursor: 'pointer',
                    fontSize: '20px',
                    color: star <= rating ? '#FFD700' : '#ccc',
                  }}
                >
                  ★
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Highlights;
