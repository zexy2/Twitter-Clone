import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './Explore.css';

function Explore() {
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState([]);
  const [tweets, setTweets] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showComments, setShowComments] = useState({});
  const [comments, setComments] = useState({});
  const [newComments, setNewComments] = useState({});
  const userId = localStorage.getItem('user_id');
  const navigate = useNavigate();

  // Keşfet tweet'lerini getir
  const fetchExploreTweets = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`http://localhost:5000/explore_tweets/${userId}`);
      if (response.data.success) {
        setTweets(response.data.tweets);
      }
    } catch (error) {
      console.error('Error fetching explore tweets:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Kullanıcı arama fonksiyonu
  const searchUsers = async (term) => {
    if (!term.trim()) {
      setUsers([]);
      return;
    }

    try {
      const response = await axios.get(`http://localhost:5000/search_users`, {
        params: { term }
      });
      setUsers(response.data);
    } catch (error) {
      console.error('Error searching users:', error);
    }
  };

  // Kullanıcıyı takip et/takipten çık
  const handleFollow = async (followingId) => {
    try {
      const response = await axios.post('http://localhost:5000/follow', {
        follower_id: parseInt(userId),
        following_id: parseInt(followingId)
      });

      if (response.data.success) {
        // Kullanıcı listesini hemen güncelle
        setUsers(users.map(user => {
          if (user.user_id === followingId) {
            return { 
              ...user, 
              is_following: !user.is_following // Durumu hemen değiştir
            };
          }
          return user;
        }));

        // Takip durumuna göre tweet listesini güncelle
        if (!response.data.is_following) {
          // Takipten çıkıldıysa, o kullanıcının tweetlerini explore'a ekle
          fetchExploreTweets();
        } else {
          // Takip edildiyse, o kullanıcının tweetlerini explore'dan kaldır
          setTweets(tweets.filter(tweet => tweet.user_id !== followingId));
        }
      }
    } catch (error) {
      console.error('Error following user:', error);
    }
  };

  // Like fonksiyonu
  const handleLike = async (tweetId) => {
    try {
      const response = await axios.post('http://localhost:5000/toggle_like', {
        user_id: parseInt(userId),
        tweet_id: parseInt(tweetId)
      });

      if (response.data.success) {
        setTweets(prevTweets => prevTweets.map(tweet => {
          if (tweet.tweet_id === tweetId) {
            return {
              ...tweet,
              likes: response.data.liked ? tweet.likes + 1 : tweet.likes - 1,
              user_liked: response.data.liked
            };
          }
          return tweet;
        }));
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  // Yorum fonksiyonları
  const fetchComments = async (tweetId) => {
    try {
      const response = await axios.get(`http://localhost:5000/comments/${tweetId}`);
      if (response.data) {
        setComments(prev => ({
          ...prev,
          [tweetId]: response.data
        }));
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const handleComment = async (tweetId) => {
    try {
      const commentText = newComments[tweetId]?.trim();
      if (!commentText) return;

      const response = await axios.post('http://localhost:5000/comment', {
        user_id: parseInt(userId),
        tweet_id: parseInt(tweetId),
        content: commentText
      });

      if (response.data.success) {
        setNewComments(prev => ({ ...prev, [tweetId]: '' }));
        await fetchComments(tweetId);
        setTweets(prevTweets => prevTweets.map(tweet => {
          if (tweet.tweet_id === tweetId) {
            return { ...tweet, comments: tweet.comments + 1 };
          }
          return tweet;
        }));
      }
    } catch (error) {
      console.error('Error posting comment:', error);
    }
  };

  // Kullanıcı profiline gitme fonksiyonu
  const handleProfileClick = (clickedUserId) => {
    if (clickedUserId) {
      navigate(`/user/${clickedUserId}`);
    }
  };

  // Retweet fonksiyonunu güncelle
  const handleRetweet = async (tweetId) => {
    try {
      // Mevcut retweet durumunu kontrol et
      const currentTweet = tweets.find(t => t.tweet_id === tweetId);
      const isCurrentlyRetweeted = currentTweet.is_retweeted;

      // Önce UI'ı güncelle
      const updatedTweets = tweets.map(tweet => {
        if (tweet.tweet_id === tweetId) {
          return {
            ...tweet,
            retweet_count: (tweet.retweet_count || 0) + (isCurrentlyRetweeted ? -1 : 1),
            is_retweeted: !isCurrentlyRetweeted
          };
        }
        return tweet;
      });
      setTweets(updatedTweets);

      // API çağrısı yap
      const endpoint = isCurrentlyRetweeted ? 'undo_retweet' : 'retweet';
      const response = await axios.post(`http://localhost:5000/${endpoint}`, {
        user_id: parseInt(userId),
        tweet_id: parseInt(tweetId)
      });

      if (!response.data.success) {
        await fetchExploreTweets();
      }
    } catch (error) {
      console.error("Error handling retweet:", error);
      await fetchExploreTweets();
    }
  };

  useEffect(() => {
    fetchExploreTweets();
  }, []);

  useEffect(() => {
    const delaySearch = setTimeout(() => {
      searchUsers(searchTerm);
    }, 300);

    return () => clearTimeout(delaySearch);
  }, [searchTerm]);

  return (
    <div className="explore-container">
      {/* Arama kutusu */}
      <div className="search-section">
        <div className="search-box">
          <i className="fas fa-search"></i>
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Arama sonuçları */}
      {searchTerm && (
        <div className="search-results">
          {users.map((user) => (
            <div 
              key={user.user_id} 
              className="user-card"
            >
              <div className="user-info-section" onClick={() => handleProfileClick(user.user_id)}>
                <img 
                  src={user.profile_picture 
                    ? `http://localhost:5000/uploads/profile_pictures/${user.profile_picture}`
                    : `https://ui-avatars.com/api/?name=${user.first_name}+${user.last_name}&background=random`
                  }
                  alt="avatar"
                  className="user-avatar"
                />
                <div className="user-info">
                  <span className="user-name">{user.first_name} {user.last_name}</span>
                  <span className="user-username">@{user.username}</span>
                </div>
              </div>
              {parseInt(userId) !== parseInt(user.user_id) && (
                <button
                  onClick={() => handleFollow(user.user_id)}
                  className={`follow-button ${user.is_following ? 'following' : ''}`}
                >
                  {user.is_following ? 'Following' : 'Follow'}
                </button>
              )}
            </div>
          ))}
          {users.length === 0 && searchTerm && (
            <div className="no-results">No users found</div>
          )}
        </div>
      )}

      {/* Tweet listesi */}
      <div className="explore-tweets">
        <h2>Explore Tweets</h2>
        {tweets.map(tweet => (
          <div key={tweet.tweet_id} className="tweet">
            {/* Retweet header */}
            {tweet.is_retweet && (
              <div className={`retweet-header ${parseInt(userId) === tweet.user_id ? 'own-retweet' : ''}`}>
                <div className="retweet-info">
                  <i className="fas fa-retweet"></i>
                  <span 
                    className="retweeted-by"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/user/${tweet.user_id}`);
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    {parseInt(userId) === tweet.user_id 
                      ? 'You Retweeted'
                      : `${tweet.first_name} ${tweet.last_name} Retweeted`
                    }
                  </span>
                </div>
              </div>
            )}
            
            <div className="tweet-content">
              {tweet.is_retweet ? (
                <div className="original-tweet">
                  <div 
                    className="tweet-header"
                    onClick={(e) => handleProfileClick(tweet.original_user_id, e)}
                    style={{ cursor: 'pointer' }}
                  >
                    <img 
                      src={tweet.original_profile_picture 
                        ? `http://localhost:5000/uploads/profile_pictures/${tweet.original_profile_picture}`
                        : `https://ui-avatars.com/api/?name=${tweet.original_first_name}+${tweet.original_last_name}&background=random`
                      }
                      alt="avatar"
                      className="avatar"
                    />
                    <div className="user-info">
                      <span className="name">{tweet.original_first_name} {tweet.original_last_name}</span>
                      <span className="username">@{tweet.original_username}</span>
                    </div>
                  </div>
                  <div className="tweet-text">{tweet.original_content}</div>
                </div>
              ) : (
                <>
                  <div 
                    className="tweet-header"
                    onClick={(e) => handleProfileClick(tweet.user_id, e)}
                    style={{ cursor: 'pointer' }}
                  >
                    <img 
                      src={tweet.profile_picture 
                        ? `http://localhost:5000/uploads/profile_pictures/${tweet.profile_picture}`
                        : `https://ui-avatars.com/api/?name=${tweet.first_name}+${tweet.last_name}&background=random`
                      }
                      alt="avatar"
                      className="avatar"
                    />
                    <div className="user-info">
                      <span className="name">{tweet.first_name} {tweet.last_name}</span>
                      <span className="username">@{tweet.username}</span>
                    </div>
                  </div>
                  <div className="tweet-text">{tweet.content}</div>
                </>
              )}
            </div>

            <div className="tweet-footer">
              <button 
                onClick={() => handleLike(tweet.tweet_id)}
                className={`like-button ${tweet.user_liked ? 'liked' : ''}`}
              >
                <i className={tweet.user_liked ? "fas fa-heart" : "far fa-heart"}></i>
                <span>{tweet.likes}</span>
              </button>
              
              <button 
                onClick={() => handleRetweet(tweet.tweet_id)}
                className={`retweet-button ${tweet.is_retweeted ? 'retweeted' : ''}`}
              >
                <i className="fas fa-retweet"></i>
                <span>{tweet.retweet_count || ''}</span>
              </button>

              <button 
                className="comment-button"
                onClick={() => {
                  setShowComments(prev => ({
                    ...prev,
                    [tweet.tweet_id]: !prev[tweet.tweet_id]
                  }));
                  if (!comments[tweet.tweet_id]) {
                    fetchComments(tweet.tweet_id);
                  }
                }}
              >
                <i className="far fa-comment"></i>
                <span>{tweet.comments}</span>
              </button>
            </div>

            {showComments[tweet.tweet_id] && (
              <div className="comments-container">
                {/* Yorum yazma kutusu */}
                <div className="comment-input-container">
                  <textarea
                    className="comment-input"
                    placeholder="Write a comment..."
                    value={newComments[tweet.tweet_id] || ''}
                    onChange={(e) => setNewComments(prev => ({
                      ...prev,
                      [tweet.tweet_id]: e.target.value
                    }))}
                  />
                  <button 
                    className="comment-submit-btn"
                    onClick={() => handleComment(tweet.tweet_id)}
                    disabled={!newComments[tweet.tweet_id]?.trim()}
                  >
                    Comment
                  </button>
                </div>

                {/* Yorumlar listesi */}
                <div className="comments-list">
                  {comments[tweet.tweet_id]?.length > 0 ? (
                    comments[tweet.tweet_id].map((comment) => (
                      <div key={comment.comment_id} className="comment-item">
                        <div 
                          className="comment-user"
                          onClick={() => handleProfileClick(comment.user_id)}
                          style={{ cursor: 'pointer' }}
                        >
                          <img 
                            src={comment.profile_picture 
                              ? `http://localhost:5000/uploads/profile_pictures/${comment.profile_picture}`
                              : `https://ui-avatars.com/api/?name=${comment.first_name}+${comment.last_name}`}
                            alt="avatar"
                            className="comment-avatar"
                          />
                          <div className="comment-user-info">
                            <span className="comment-user-name">
                              {comment.first_name} {comment.last_name}
                            </span>
                            <span className="comment-username">@{comment.username}</span>
                          </div>
                        </div>
                        <p className="comment-text">{comment.content}</p>
                      </div>
                    ))
                  ) : (
                    <div className="no-comments">No comments yet</div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default Explore; 