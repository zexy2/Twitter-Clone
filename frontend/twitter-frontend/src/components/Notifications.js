import React, { useState, useEffect } from 'react';

function Notifications() {
  const [notifications, setNotifications] = useState([]);
  
  // Gerçek zamanlı bildirimler için WebSocket kullanımı
  useEffect(() => {
    const ws = new WebSocket('ws://localhost:5000/notifications');
    
    ws.onmessage = (event) => {
      const notification = JSON.parse(event.data);
      setNotifications(prev => [notification, ...prev]);
    };
    
    return () => ws.close();
  }, []);

  return (
    <div className="notifications-container">
      {notifications.map(notification => (
        <div className="notification-item">
          {/* Bildirim içeriği */}
        </div>
      ))}
    </div>
  );
}

export default Notifications; 