import React, { useState } from 'react';

function Trends() {
  const [trends, setTrends] = useState([]);
  
  return (
    <div className="trends-container">
      <h2>Trends for you</h2>
      {trends.map(trend => (
        <div className="trend-item">
          <span className="trend-hashtag">#{trend.tag}</span>
          <span className="trend-count">{trend.tweet_count} Tweets</span>
        </div>
      ))}
    </div>
  );
}

export default Trends; 