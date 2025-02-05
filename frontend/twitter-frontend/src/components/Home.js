// src/components/Home.js
import React, { useState, useEffect, useCallback, memo } from "react";
import axios from "axios";
import "./Home.css";
import { useNavigate, Link } from "react-router-dom";
import EmojiPicker from 'emoji-picker-react';

function Home() {
  const [tweets, setTweets] = useState([]);
  const [newTweet, setNewTweet] = useState("");
  const [showComments, setShowComments] = useState({});
  const [comments, setComments] = useState({});
  const [newComments, setNewComments] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [userInfo, setUserInfo] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const navigate = useNavigate();
  const userId = localStorage.getItem("user_id");

  const fetchTweets = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(
        `http://localhost:5000/tweets?user_id=${userId}`
      );
      console.log("Tweets response:", response.data);

      if (response.data.success) {
        setTweets(response.data.tweets);
      } else {
        console.error("Failed to fetch tweets:", response.data.message);
      }
    } catch (error) {
      console.error("Error fetching tweets:", error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      navigate("/login");
      return;
    }

    fetchUserInfo();
    fetchTweets();

    const interval = setInterval(() => {
      fetchTweets();
    }, 30000);

    return () => {
      clearInterval(interval);
    };
  }, [userId, navigate, fetchTweets]);

  useEffect(() => {
    const closeEmojiPicker = () => setShowEmojiPicker(false);
    if (showEmojiPicker) {
      document.addEventListener('click', closeEmojiPicker);
    }
    return () => {
      document.removeEventListener('click', closeEmojiPicker);
    };
  }, [showEmojiPicker]);

  const fetchUserInfo = async () => {
    try {
      const response = await axios.get(`http://localhost:5000/user/${userId}`);
      if (response.data.success) {
        setUserInfo(response.data.user);
      }
    } catch (error) {
      console.error("Error fetching user info:", error);
    }
  };

  const handleTweet = async () => {
    if (!newTweet.trim() && !selectedImage) return;

    try {
      // FormData oluştur
      const formData = new FormData();
      formData.append('user_id', parseInt(userId));
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
        setSelectedImage(null); // Resmi sıfırla
        await fetchTweets();
      }
    } catch (error) {
      console.error("Failed to post tweet:", error);
      if (error.response?.status === 401) {
        navigate("/login");
      }
    }
  };

  const handleLike = async (tweetId) => {
    try {
      // Önce UI'ı güncelle
      const updatedTweets = tweets.map((tweet) => {
        if (tweet.tweet_id === tweetId) {
          const willBeLiked = !tweet.user_liked;
          return {
            ...tweet,
            likes: willBeLiked ? tweet.likes + 1 : tweet.likes - 1,
            user_liked: willBeLiked,
          };
        }
        return tweet;
      });
      setTweets(updatedTweets);

      const response = await axios.post("http://localhost:5000/toggle_like", {
        user_id: parseInt(userId),
        tweet_id: parseInt(tweetId),
      });

      if (!response.data.success) {
        await fetchTweets(); // UI'ı orijinal duruma döndür
      }
    } catch (error) {
      console.error("Failed to toggle like:", error);
      await fetchTweets(); // Hata durumunda UI'ı orijinal duruma döndür
    }
  };

  if (isLoading) {
    return <div className="loading">Loading tweets...</div>;
  }

  const handleRetweet = async (tweetId) => {
    try {
      const currentTweet = tweets.find((t) => t.tweet_id === tweetId);
      const isCurrentlyRetweeted = currentTweet.is_retweeted;

      // API çağrısı yap
      const endpoint = isCurrentlyRetweeted ? "undo_retweet" : "retweet";
      const response = await axios.post(`http://localhost:5000/${endpoint}`, {
        user_id: parseInt(userId),
        tweet_id: parseInt(tweetId),
      });

      if (response.data.success) {
        // Retweet başarılı olduğunda hemen tweet listesini güncelle
        const tweetsResponse = await axios.get(
          `http://localhost:5000/tweets?user_id=${userId}`
        );
        
        if (tweetsResponse.data.success) {
          setTweets(tweetsResponse.data.tweets);
        }
      } else {
        console.error("Failed to retweet:", response.data.message);
      }
    } catch (error) {
      console.error("Error handling retweet:", error);
    }
  };

  // Undo Retweet fonksiyonunu da benzer şekilde güncelleyelim
  const handleUndoRetweet = async (tweetId) => {
    try {
      const response = await axios.post(`http://localhost:5000/undo_retweet`, {
        user_id: parseInt(userId),
        tweet_id: parseInt(tweetId),
      });

      if (response.data.success) {
        // Undo retweet başarılı olduğunda hemen tweet listesini güncelle
        const tweetsResponse = await axios.get(
          `http://localhost:5000/tweets?user_id=${userId}`
        );
        
        if (tweetsResponse.data.success) {
          setTweets(tweetsResponse.data.tweets);
        }
      }
    } catch (error) {
      console.error("Error undoing retweet:", error);
    }
  };

  const fetchComments = async (tweetId) => {
    try {
      console.log("Fetching comments for tweet:", tweetId);
      const response = await axios.get(
        `http://localhost:5000/comments/${tweetId}`
      );
      console.log("Comments response:", response.data);

      setComments((prev) => ({
        ...prev,
        [tweetId]: response.data,
      }));
    } catch (error) {
      console.error("Failed to fetch comments:", error);
    }
  };

  const handleComment = async (tweetId) => {
    try {
      const commentText = newComments[tweetId]?.trim();
      if (!commentText) return;

      const response = await axios.post("http://localhost:5000/comment", {
        user_id: parseInt(userId),
        tweet_id: parseInt(tweetId),
        content: commentText,
      });

      if (response.data.success) {
        setNewComments((prev) => ({ ...prev, [tweetId]: "" }));
        await fetchComments(tweetId);
        await fetchTweets();
      }
    } catch (error) {
      console.error("Failed to post comment:", error);
    }
  };

  // Kullanıcı profiline gitme fonksiyonu
  const handleProfileClick = (userId) => {
    if (userId) {
      navigate(`/user/${userId}`);
    }
  };

  // Tweet silme fonksiyonunu ekle
  const handleDeleteTweet = async (tweetId) => {
    if (window.confirm("Are you sure you want to delete this tweet?")) {
      try {
        const response = await axios.post(
          "http://localhost:5000/delete_tweet",
          {
            user_id: parseInt(userId),
            tweet_id: parseInt(tweetId),
          }
        );

        if (response.data.success) {
          // Tweet'i UI'dan kaldır
          setTweets((prevTweets) =>
            prevTweets.filter((tweet) => tweet.tweet_id !== tweetId)
          );
        }
      } catch (error) {
        console.error("Error deleting tweet:", error);
      }
    }
  };

  // Yorum bileşeni
  const CommentItem = ({ comment, tweetId, onLike, onReply }) => {
    const [showReplyInput, setShowReplyInput] = useState(false);
    const [replyContent, setReplyContent] = useState('');

    return (
      <div className="comment-item">
        <div className="comment-user">
          <img
            src={comment.profile_picture
              ? `http://localhost:5000/uploads/profile_pictures/${comment.profile_picture}`
              : `https://ui-avatars.com/api/?name=${comment.first_name}+${comment.last_name}`
            }
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
        
        <div className="comment-actions">
          <button 
            className={`comment-like-button ${comment.user_liked ? 'liked' : ''}`}
            onClick={() => onLike(comment.comment_id, tweetId)}
          >
            <i className={comment.user_liked ? "fas fa-heart" : "far fa-heart"}></i>
            <span>{comment.like_count || 0}</span>
          </button>

          <button 
            className="comment-reply-button"
            onClick={() => setShowReplyInput(!showReplyInput)}
          >
            <i className="far fa-comment"></i>
            <span>{comment.reply_count || 0}</span>
          </button>
        </div>

        {showReplyInput && (
          <div className="reply-input-container">
            <textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Write a reply..."
              className="reply-input"
            />
            <button
              onClick={() => {
                onReply(comment.comment_id, replyContent, tweetId);
                setReplyContent('');
                setShowReplyInput(false);
              }}
              disabled={!replyContent.trim()}
              className="reply-submit-btn"
            >
              Reply
            </button>
          </div>
        )}
      </div>
    );
  };

  const handleCommentLike = async (commentId, tweetId) => {
    try {
      const response = await axios.post('http://localhost:5000/like_comment', {
        user_id: parseInt(userId),
        comment_id: parseInt(commentId)
      });

      if (response.data.success) {
        // Yorumları yeniden yükle
        await fetchComments(tweetId);
      }
    } catch (error) {
      console.error('Error liking comment:', error);
    }
  };

  const handleCommentReply = async (commentId, content, tweetId) => {
    try {
      const response = await axios.post('http://localhost:5000/reply_comment', {
        user_id: parseInt(userId),
        comment_id: parseInt(commentId),
        content: content
      });

      if (response.data.success) {
        // Yorumları yeniden yükle
        await fetchComments(tweetId);
      }
    } catch (error) {
      console.error('Error replying to comment:', error);
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
          
          // Maksimum boyutlar
          const MAX_WIDTH = 600;
          const MAX_HEIGHT = 400;

          // En boy oranını koru
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
          }, 'image/jpeg', 0.7); // 0.7 kalite oranı
        };
      };
    });
  };

  // Input onChange fonksiyonunu güncelle
  const handleImageSelect = async (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB kontrol
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

  return (
    <div className="home-container">
      {userId ? (
        <>
          {/* Tweet Oluşturma Kutusu */}
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
                    disabled={!newTweet.trim() || newTweet.length > 280}
                    className="tweet-submit-button"
                  >
                    Tweet
        </button>
      </div>
              </div>
            </div>
          </div>

          {/* Tweet Listesi */}
          <div className="tweet-list">
        {tweets.map((tweet) => (
              <div
                key={tweet.tweet_id}
                className={`tweet ${
                  parseInt(userId) === tweet.user_id ? "own-tweet" : ""
                } ${
                  tweet.is_retweet && parseInt(userId) === tweet.user_id
                    ? "own-retweet"
                    : ""
                }`}
              >
                {/* Retweet header'ı en üstte göster */}
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

                {/* Tweet içeriği */}
                {tweet.is_retweet ? (
                  <div className="retweeted-content">
                    <div
                      className="tweet-header"
                      onClick={() => navigate(`/user/${tweet.original_user_id}`)}
                      style={{ cursor: "pointer" }}
                    >
                      <img
                        src={
                          tweet.original_profile_picture
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
                        <span className="username">
                          @{tweet.original_username}
                        </span>
                      </div>
                    </div>
                    <div className="tweet-text">{tweet.original_content}</div>
                  </div>
                ) : (
                  <div className="tweet-content">
                    <div
                      className="tweet-header"
                      onClick={() => navigate(`/user/${tweet.user_id}`)}
                      style={{ cursor: "pointer" }}
                    >
                      <img
                        src={
                          tweet.profile_picture
                            ? `http://localhost:5000/uploads/profile_pictures/${tweet.profile_picture}`
                            : `https://ui-avatars.com/api/?name=${tweet.first_name}+${tweet.last_name}&background=random`
                        }
                        alt="avatar"
                        className="avatar"
                      />
                      <div className="user-info">
                        <span className="name">
                          {tweet.first_name} {tweet.last_name}
                        </span>
                        <span className="username">@{tweet.username}</span>
                      </div>
                    </div>
                    <div className="tweet-text">{tweet.content}</div>
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

                {/* Tweet footer */}
                <div className="tweet-footer">
                  <div className="action-buttons">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLike(tweet.tweet_id);
                      }}
                      className={`like-button ${
                        tweet.user_liked ? "liked" : ""
                      }`}
                    >
                      <i
                        className={
                          tweet.user_liked ? "fas fa-heart" : "far fa-heart"
                        }
                      ></i>
                      <span>{tweet.likes || 0}</span>
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRetweet(tweet.tweet_id);
                      }}
                      className={`retweet-button ${
                        tweet.is_retweeted ? "retweeted" : ""
                      }`}
                    >
                      <i className="fas fa-retweet"></i>
                      <span>{tweet.retweet_count || 0}</span>
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowComments((prev) => ({
                          ...prev,
                          [tweet.tweet_id]: !prev[tweet.tweet_id],
                        }));
                        if (!comments[tweet.tweet_id]) {
                          fetchComments(tweet.tweet_id);
                        }
                      }}
                      className="comment-button"
                    >
                      <i className="far fa-comment"></i>
                      <span>{tweet.comments || 0}</span>
                    </button>

                    {/* Silme butonu - Sadece kullanıcının kendi tweet'leri için göster */}
                    {!tweet.is_retweet && parseInt(userId) === tweet.user_id && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTweet(tweet.tweet_id);
                        }}
                        className="delete-button"
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    )}
                  </div>

                  {/* Undo Retweet butonu */}
                  {tweet.is_retweet && parseInt(userId) === tweet.user_id && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUndoRetweet(tweet.RetweetID || tweet.tweet_id);
                      }}
                      className="undo-retweet-button"
                    >
                      <span>Undo Retweet</span>
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
                        value={newComments[tweet.tweet_id] || ""}
                        onChange={(e) =>
                          setNewComments((prev) => ({
                            ...prev,
                            [tweet.tweet_id]: e.target.value,
                          }))
                        }
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
                          <CommentItem
                            key={comment.comment_id}
                            comment={comment}
                            tweetId={tweet.tweet_id}
                            onLike={handleCommentLike}
                            onReply={handleCommentReply}
                          />
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
        </>
      ) : (
        <div className="login-prompt">
          Please <Link to="/login">login</Link> to view tweets.
        </div>
      )}
    </div>
  );
}

export default memo(Home);
