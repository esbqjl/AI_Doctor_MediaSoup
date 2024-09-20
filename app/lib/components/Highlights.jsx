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
    return `${minutes < 10 ? '0' : ''}${minutes}:${
      remainingSeconds < 10 ? '0' : ''
    }${remainingSeconds}`;
  };

  const ratingStars = [1, 2, 3, 4, 5];

  return (
    <div data-component="Highlights">
      <div className="container">
        <div className="header">Highlights</div>
        <div className="row">
          <div className="duration">
            <div>Duration</div>
            <div className="time">{formatDuration(duration)}</div>
            <span className="status">Ongoing</span>
          </div>
          <div className="ratings">
            <div>Ratings</div>
            <div className="stars">
              {ratingStars.map((star) => (
                <span
                  key={star}
                  onClick={() => setRating(star)}
                  className={`star ${star <= rating ? 'active' : ''}`}
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
