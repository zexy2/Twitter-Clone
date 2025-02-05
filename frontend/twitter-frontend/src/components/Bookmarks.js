import React, { useState } from 'react';

function Bookmarks() {
  const [bookmarks, setBookmarks] = useState([]);
  const [lists, setLists] = useState([]);
  
  return (
    <div className="bookmarks-container">
      <div className="saved-tweets">
        {/* Kaydedilen tweetler */}
      </div>
      <div className="user-lists">
        {/* Kullanıcı listeleri */}
      </div>
    </div>
  );
}

export default Bookmarks; 