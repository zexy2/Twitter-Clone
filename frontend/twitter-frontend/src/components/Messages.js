import React, { useState } from 'react';

function Messages() {
  const [conversations, setConversations] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  
  return (
    <div className="messages-container">
      <div className="conversations-list">
        {/* Sohbet listesi */}
      </div>
      <div className="chat-window">
        {/* Aktif sohbet */}
      </div>
    </div>
  );
}

export default Messages; 