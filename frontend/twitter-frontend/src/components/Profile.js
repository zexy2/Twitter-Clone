import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import './Profile.css';
import EmojiPicker from 'emoji-picker-react';

function Profile() {
  const [userInfo, setUserInfo] = useState(null);
  const [userTweets, setUserTweets] = useState([]);
  const [followStats, setFollowStats] = useState({ followers: [], following: [] });
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [showComments, setShowComments] = useState({});
  const [comments, setComments] = useState({});
  const [newComments, setNewComments] = useState({});
  const [selectedFile, setSelectedFile] = useState(null);
  const [newTweet, setNewTweet] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  const { userId: profileUserId } = useParams();
  const loggedInUserId = localStorage.getItem("user_id");
  const currentProfileId = profileUserId || loggedInUserId;
  const navigate = useNavigate();

  // Profil verilerini getir
  const fetchProfileData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Minimum yükleme süresi için delay
      const minLoadingTime = new Promise(resolve => setTimeout(resolve, 1000));

      // Kullanıcı bilgilerini getir
      const userResponse = await axios.get(`http://localhost:5000/user/${currentProfileId}`);
      
      if (!userResponse.data.success || !userResponse.data.user) {
        throw new Error("User not found");
      }

      // Tweet'leri getir
      const tweetsResponse = await axios.get(`http://localhost:5000/user_tweets/${currentProfileId}`, {
        params: { current_user_id: loggedInUserId }
      });

      // Minimum yükleme süresini bekle
      await minLoadingTime;

      // Tüm veriler başarıyla geldiğinde state'leri güncelle
      setUserInfo(userResponse.data.user);
      setFollowStats({
        followers: userResponse.data.followers || [],
        following: userResponse.data.following || []
      });

      if (tweetsResponse.data.success) {
        setUserTweets(tweetsResponse.data.tweets);
      }

    } catch (error) {
      console.error("Failed to fetch profile data:", error);
      setError("Failed to load profile. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Takip durumunu kontrol et
  const checkFollowStatus = async () => {
    try {
      if (!loggedInUserId || !currentProfileId || loggedInUserId === currentProfileId) {
        return;
      }

      const response = await axios.get(`http://localhost:5000/check_follow_status`, {
        params: {
          follower_id: loggedInUserId,
          following_id: currentProfileId
        }
      });

      if (response.data.success) {
        setIsFollowing(response.data.is_following);
      }
    } catch (error) {
      console.error('Error checking follow status:', error);
    }
  };

  // Takip et/Takipten çık
  const handleFollow = async () => {
    try {
      const response = await axios.post('http://localhost:5000/follow', {
        follower_id: parseInt(loggedInUserId),
        following_id: parseInt(currentProfileId)
      });

      if (response.data.success) {
        setIsFollowing(!isFollowing);
        // Takipçi sayısını güncelle
        fetchProfileData();
      }
    } catch (error) {
      console.error('Error following user:', error);
    }
  };

  // Like fonksiyonu
  const handleLike = async (tweetId) => {
    try {
      // Önce UI'ı güncelle
      const updatedTweets = userTweets.map(tweet => {
        if (tweet.tweet_id === tweetId) {
          const willBeLiked = !tweet.user_liked;
          return {
            ...tweet,
            likes: willBeLiked ? tweet.likes + 1 : tweet.likes - 1,
            user_liked: willBeLiked
          };
        }
        return tweet;
      });
      setUserTweets(updatedTweets);

      const response = await axios.post('http://localhost:5000/toggle_like', {
        user_id: parseInt(loggedInUserId),
        tweet_id: parseInt(tweetId)
      });

      if (!response.data.success) {
        // UI'ı orijinal duruma döndür
        const tweetsResponse = await axios.get(`http://localhost:5000/user_tweets/${currentProfileId}`);
        if (tweetsResponse.data.success) {
          setUserTweets(tweetsResponse.data.tweets);
        }
      }
    } catch (error) {
      console.error("Failed to toggle like:", error);
      // Hata durumunda UI'ı orijinal duruma döndür
      const tweetsResponse = await axios.get(`http://localhost:5000/user_tweets/${currentProfileId}`);
      if (tweetsResponse.data.success) {
        setUserTweets(tweetsResponse.data.tweets);
      }
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
        user_id: parseInt(loggedInUserId),
        tweet_id: parseInt(tweetId),
        content: commentText
      });

      if (response.data.success) {
        setNewComments(prev => ({ ...prev, [tweetId]: '' }));
        await fetchComments(tweetId);
        setUserTweets(prevTweets => prevTweets.map(tweet => {
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

  // Kullanıcı profiline git
  const navigateToProfile = (userId) => {
    // Modal'ları kapat
    setShowFollowers(false);
    setShowFollowing(false);
    // Yeni profile git
    navigate(`/user/${userId}`);
  };

  // Tweet silme fonksiyonunu güncelle
  const handleDeleteTweet = async (tweetId) => {
    if (window.confirm('Are you sure you want to delete this tweet?')) {
      try {
        const response = await axios.post('http://localhost:5000/delete_tweet', {
          user_id: parseInt(loggedInUserId),
          tweet_id: parseInt(tweetId)
        });

        if (response.data.success) {
          // Tweet'i UI'dan kaldır
          setUserTweets(prevTweets => prevTweets.filter(tweet => tweet.tweet_id !== tweetId));
        }
      } catch (error) {
        console.error("Error deleting tweet:", error);
      }
    }
  };

  // handleProfileClick fonksiyonunu ekle
  const handleProfileClick = (clickedUserId, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (clickedUserId) {
      navigate(`/user/${clickedUserId}`);
    }
  };

  // handleRetweet fonksiyonunu ekle
  const handleRetweet = async (tweetId) => {
    try {
      const currentTweet = userTweets.find(t => t.tweet_id === tweetId);
      const isCurrentlyRetweeted = currentTweet.is_retweeted;

      // Önce UI'ı güncelle
      const updatedTweets = userTweets.map(tweet => {
        if (tweet.tweet_id === tweetId) {
          return {
            ...tweet,
            retweet_count: (tweet.retweet_count || 0) + (isCurrentlyRetweeted ? -1 : 1),
            is_retweeted: !isCurrentlyRetweeted
          };
        }
        return tweet;
      });
      setUserTweets(updatedTweets);

      // API çağrısı yap
      const endpoint = isCurrentlyRetweeted ? 'undo_retweet' : 'retweet';
      const response = await axios.post(`http://localhost:5000/${endpoint}`, {
        user_id: parseInt(loggedInUserId),
        tweet_id: parseInt(tweetId)
      });

      if (!response.data.success) {
        // Hata durumunda orijinal duruma dön
        const tweetsResponse = await axios.get(`http://localhost:5000/user_tweets/${currentProfileId}`);
        if (tweetsResponse.data.success) {
          setUserTweets(tweetsResponse.data.tweets);
        }
      }
    } catch (error) {
      console.error("Error handling retweet:", error);
      // Hata durumunda orijinal duruma dön
      const tweetsResponse = await axios.get(`http://localhost:5000/user_tweets/${currentProfileId}`);
      if (tweetsResponse.data.success) {
        setUserTweets(tweetsResponse.data.tweets);
      }
    }
  };

  // Profil resmi yükleme fonksiyonu
  const handleProfilePictureUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('user_id', loggedInUserId);

    try {
      const response = await axios.post('http://localhost:5000/upload_profile_picture', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        // Profil bilgilerini yeniden yükle
        const userResponse = await axios.get(`http://localhost:5000/user/${currentProfileId}`);
        if (userResponse.data.success) {
          setUserInfo(userResponse.data.user);
        }
      }
    } catch (error) {
      console.error('Error uploading profile picture:', error);
    }
  };

  const fetchUserTweets = async () => {
    try {
      const response = await axios.get(`http://localhost:5000/user_tweets/${currentProfileId}`, {
        params: {
          current_user_id: loggedInUserId
        }
      });
      if (response.data.success) {
        setUserTweets(response.data.tweets);
      }
    } catch (error) {
      console.error('Error fetching user tweets:', error);
    }
  };

  // Emoji seçme fonksiyonu
  const onEmojiClick = (emoji) => {
    setNewTweet((prevTweet) => prevTweet + emoji.emoji);
    setShowEmojiPicker(false);
  };

  // Resim boyutlandırma fonksiyonu
  const resizeImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          const MAX_WIDTH = 600;
          const MAX_HEIGHT = 400;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height = Math.round((height * MAX_WIDTH) / width);
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width = Math.round((width * MAX_HEIGHT) / height);
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob((blob) => {
            resolve(new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now()
            }));
          }, 'image/jpeg', 0.7);
        };
      };
    });
  };

  // Tweet gönderme fonksiyonu
  const handleTweet = async () => {
    if (!newTweet.trim() && !selectedImage) return;

    try {
      const formData = new FormData();
      formData.append('user_id', parseInt(loggedInUserId));
      formData.append('content', newTweet.trim());
      if (selectedImage) {
        formData.append('image', selectedImage);
      }

      const response = await axios.post(
        "http://localhost:5000/tweet",
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      if (response.data.success) {
        setNewTweet("");
        setSelectedImage(null);
        await fetchUserTweets(); // Tweet listesini güncelle
      }
    } catch (error) {
      console.error("Failed to post tweet:", error);
    }
  };

  // Resim seçme fonksiyonu
  const handleImageSelect = async (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size should be less than 5MB');
        return;
      }
      
      try {
        const resizedImage = await resizeImage(file);
        setSelectedImage(resizedImage);
      } catch (error) {
        console.error('Error resizing image:', error);
        alert('Error processing image');
      }
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      if (!currentProfileId) {
        navigate('/home');
        return;
      }

      // Yeni profile geçişte modal state'lerini sıfırla
      setShowFollowers(false);
      setShowFollowing(false);
      setIsLoading(true);
      setError(null);

      if (isMounted) {
        window.scrollTo(0, 0);
        await fetchProfileData();
      }
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [currentProfileId]); // currentProfileId değiştiğinde çalışacak

  useEffect(() => {
    if (currentProfileId && loggedInUserId && currentProfileId !== loggedInUserId) {
      checkFollowStatus();
    }
  }, [currentProfileId, loggedInUserId]);

  const renderFollowButton = () => {
    if (loggedInUserId && currentProfileId && loggedInUserId !== currentProfileId) {
      return (
        <button 
          className={`follow-button ${isFollowing ? 'following' : ''}`}
          onClick={handleFollow}
        >
          <span>{isFollowing ? 'Following' : 'Follow'}</span>
        </button>
      );
    }
    return null;
  };

  // Takipçiler/Takip edilenler listesi için kullanıcı kartı
  const UserCard = ({ user }) => (
    <div 
      className="user-card" 
      onClick={() => {
        setShowFollowers(false); // Modal'ı kapat
        setShowFollowing(false); // Modal'ı kapat
        navigate(`/user/${user.user_id}`); // Yeni profile git
      }}
    >
      <img
        src={user.profile_picture 
          ? `http://localhost:5000/uploads/profile_pictures/${user.profile_picture}`
          : `https://ui-avatars.com/api/?name=${user.first_name}+${user.last_name}&background=random`
        }
        alt="avatar"
        className="user-avatar"
      />
      <div className="user-info">
        <div className="user-name">{user.first_name} {user.last_name}</div>
        <div className="user-username">@{user.username}</div>
      </div>
    </div>
  );

  // Modal içeriği
  const FollowModal = ({ title, users, onClose }) => (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        <div className="users-list">
          {users.map(user => (
            <UserCard key={user.user_id} user={user} />
          ))}
        </div>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="profile-loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="profile-error">
        <div className="error-message">
          {error}
          <button onClick={fetchProfileData} className="retry-button">
            Try Again
          </button>
        </div>
      </div>
    );
  }
  if (!userInfo) return <div>User not found</div>;

  return (
    <div className="profile-container">
      <div className="profile-header">
        <div className="profile-cover"></div>
        <div className="profile-picture-container">
          <img
            src={userInfo?.profile_picture
              ? `http://localhost:5000/uploads/profile_pictures/${userInfo.profile_picture}`
              : `https://ui-avatars.com/api/?name=${userInfo?.first_name}+${userInfo?.last_name}&background=random&size=150`
            }
            alt="Profile"
            className="profile-picture"
          />
          {parseInt(currentProfileId) === parseInt(loggedInUserId) && (
            <label className="profile-picture-overlay" htmlFor="profile-picture-input">
              <i className="fas fa-camera profile-picture-icon"></i>
              <span className="profile-picture-text">Change Profile Picture</span>
              <input
                type="file"
                id="profile-picture-input"
                accept="image/*"
                onChange={handleProfilePictureUpload}
                style={{ display: 'none' }}
              />
            </label>
          )}
        </div>
        <div className="profile-info">
          <div className="profile-name-section">
            <h2 className="profile-name">{userInfo?.first_name} {userInfo?.last_name}</h2>
            {renderFollowButton()}
          </div>
          <p className="profile-username">@{userInfo?.username}</p>
          <div className="profile-stats">
            <div className="stat-item" onClick={() => setShowFollowers(true)}>
              <span className="stat-number">{followStats.followers.length}</span>
              <span>Followers</span>
            </div>
            <div className="stat-item" onClick={() => setShowFollowing(true)}>
              <span className="stat-number">{followStats.following.length}</span>
              <span>Following</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{userTweets.length}</span>
              <span>Tweets</span>
            </div>
          </div>
        </div>
      </div>

      {/* Takipçiler Modal */}
      {showFollowers && (
        <FollowModal
          title="Followers"
          users={followStats.followers}
          onClose={() => setShowFollowers(false)}
        />
      )}

      {/* Takip Edilenler Modal */}
      {showFollowing && (
        <FollowModal
          title="Following"
          users={followStats.following}
          onClose={() => setShowFollowing(false)}
        />
      )}

      {/* Tweet'ler */}
      <div className="profile-tweets">
        {parseInt(currentProfileId) === parseInt(loggedInUserId) && (
          <div className="tweet-compose-container">
            <div className="tweet-compose">
              <div className="compose-header">
                <img
                  src={userInfo?.profile_picture
                    ? `http://localhost:5000/uploads/profile_pictures/${userInfo.profile_picture}`
                    : `https://ui-avatars.com/api/?name=${userInfo?.first_name}+${userInfo?.last_name}&background=random`
                  }
                  alt="Your avatar"
                  className="user-avatar"
                />
                <div className="compose-input-area">
                  <textarea
                    value={newTweet}
                    onChange={(e) => setNewTweet(e.target.value)}
                    placeholder="What's happening?"
                    maxLength={280}
                    className="tweet-input"
                  />
                  {selectedImage && (
                    <div className="selected-image-preview">
                      <img 
                        src={URL.createObjectURL(selectedImage)} 
                        alt="Selected" 
                        className="preview-image"
                      />
                      <button onClick={() => setSelectedImage(null)} className="remove-image">
                        <i className="fas fa-times"></i>
                      </button>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="compose-footer">
                <div className="compose-tools">
                  <label className="tool-button">
                    <i className="far fa-image"></i>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      style={{ display: 'none' }}
                    />
                  </label>
                  <div className="emoji-picker-wrapper">
                    <button 
                      className="tool-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowEmojiPicker(!showEmojiPicker);
                      }}
                    >
                      <i className="far fa-smile"></i>
                    </button>
                    {showEmojiPicker && (
                      <div 
                        className="emoji-picker-container" 
                        onClick={e => e.stopPropagation()}
                      >
                        <EmojiPicker
                          onEmojiClick={onEmojiClick}
                          autoFocusSearch={false}
                          emojiStyle="native"
                        />
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="compose-actions">
                  <div className="character-counter">
                    {newTweet.length > 0 && (
                      <span className={newTweet.length > 260 ? "warning" : ""}>
                        {280 - newTweet.length}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={handleTweet}
                    disabled={!newTweet.trim() && !selectedImage}
                    className="tweet-submit-button"
                  >
                    Tweet
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        <div className="tweet-list">
          {userTweets.map((tweet) => (
            <div key={tweet.tweet_id} className={`tweet ${parseInt(loggedInUserId) === tweet.user_id ? 'own-tweet' : ''} ${tweet.is_retweet && parseInt(loggedInUserId) === tweet.user_id ? 'own-retweet' : ''}`}>
              {/* Retweet header */}
              {tweet.is_retweet && (
                <div className={`retweet-header ${parseInt(loggedInUserId) === tweet.user_id ? 'own-retweet' : ''}`}>
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
                      {parseInt(loggedInUserId) === tweet.user_id 
                        ? 'You Retweeted'
                        : `${tweet.first_name} ${tweet.last_name} Retweeted`
                      }
                    </span>
                  </div>
                </div>
              )}
              
              {/* Tweet header - Kendi tweet'lerimiz için */}
              {!tweet.is_retweet && parseInt(loggedInUserId) === tweet.user_id && (
                <div className="tweet-owner-header">
                  <div className="tweet-owner-info">
                    <i className="fas fa-pen"></i>
                    <span>You Tweeted</span>
                  </div>
                </div>
              )}

              <div className="tweet-content">
                {tweet.is_retweet ? (
                  <div className="retweeted-content">
                    <div
                      className="tweet-header"
                      onClick={() => navigate(`/user/${tweet.original_user_id}`)}
                      style={{ cursor: "pointer" }}
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
                        <span className="name">
                          {tweet.original_first_name} {tweet.original_last_name}
                        </span>
                        <span className="username">@{tweet.original_username}</span>
                      </div>
                    </div>
                    <div className="tweet-text">{tweet.original_content}</div>
                    {/* Orijinal tweet'in resmi */}
                    {tweet.original_image_url && (
                      <div className="tweet-image">
                        <img
                          src={`http://localhost:5000/uploads/tweet_images/${tweet.original_image_url}`}
                          alt="Tweet"
                          className="tweet-content-image"
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="tweet-content">
                    <div
                      className="tweet-header"
                      onClick={() => navigate(`/user/${tweet.user_id}`)}
                      style={{ cursor: "pointer" }}
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
                    {/* Tweet'in resmi */}
                    {tweet.image_url && (
                      <div className="tweet-image">
                        <img
                          src={`http://localhost:5000/uploads/tweet_images/${tweet.image_url}`}
                          alt="Tweet"
                          className="tweet-content-image"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="tweet-footer">
                <div className="action-button-container">
                  <button 
                    onClick={() => handleLike(tweet.tweet_id)}
                    className={`like-button ${tweet.user_liked ? 'liked' : ''}`}
                  >
                    <i className={tweet.user_liked ? "fas fa-heart" : "far fa-heart"}></i>
                    <span>{tweet.likes || 0}</span>
                  </button>
                </div>

                <div className="action-button-container">
                  <button 
                    onClick={() => handleRetweet(tweet.tweet_id)}
                    className={`retweet-button ${tweet.is_retweeted ? 'retweeted' : ''}`}
                  >
                    <i className="fas fa-retweet"></i>
                    <span>{tweet.retweet_count || 0}</span>
                  </button>
                </div>

                <div className="action-button-container">
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
                    <span>{tweet.comments || 0}</span>
                  </button>
                </div>

                {parseInt(loggedInUserId) === tweet.user_id && (
                  <button 
                    onClick={() => handleDeleteTweet(tweet.tweet_id)}
                    className="delete-button"
                  >
                    <i className="fas fa-trash"></i>
                  </button>
                )}
              </div>

              {/* Yorumlar bölümü */}
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
                          <div className="comment-user" onClick={() => handleProfileClick(comment.user_id)} style={{ cursor: 'pointer' }}>
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
    </div>
  );
}

export default Profile;