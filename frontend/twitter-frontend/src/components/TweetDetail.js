import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './TweetDetail.css';

function TweetDetail() {
  const [tweet, setTweet] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const { tweetId } = useParams();
  const navigate = useNavigate();
  const userId = localStorage.getItem('user_id');

  useEffect(() => {
    const fetchTweetDetails = async () => {
      try {
        setIsLoading(true);
        console.log("Fetching tweet:", tweetId);
        
        const response = await axios.get(
          `http://localhost:5000/tweet/${tweetId}?user_id=${userId}`
        );
        
        console.log("Tweet response:", response.data);
        
        if (response.data.success) {
          setTweet(response.data.tweet);
          // Yorumları da getir
          const commentsResponse = await axios.get(`http://localhost:5000/comments/${tweetId}`);
          setComments(commentsResponse.data);
        }
      } catch (error) {
        console.error('Error fetching tweet details:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (tweetId && userId) {
      fetchTweetDetails();
    }
  }, [tweetId, userId]);

  const handleLike = async () => {
    try {
      const response = await axios.post('http://localhost:5000/toggle_like', {
        user_id: parseInt(userId),
        tweet_id: parseInt(tweetId)
      });
      if (response.data.success) {
        setTweet(prev => ({
          ...prev,
          likes: prev.user_liked ? prev.likes - 1 : prev.likes + 1,
          user_liked: !prev.user_liked
        }));
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleRetweet = async () => {
    try {
      const endpoint = tweet.is_retweeted ? 'undo_retweet' : 'retweet';
      const response = await axios.post(`http://localhost:5000/${endpoint}`, {
        user_id: parseInt(userId),
        tweet_id: parseInt(tweetId)
      });
      if (response.data.success) {
        setTweet(prev => ({
          ...prev,
          retweet_count: tweet.is_retweeted ? prev.retweet_count - 1 : prev.retweet_count + 1,
          is_retweeted: !prev.is_retweeted
        }));
      }
    } catch (error) {
      console.error('Error handling retweet:', error);
    }
  };

  const handleComment = async () => {
    if (!newComment.trim()) return;

    try {
      const response = await axios.post('http://localhost:5000/comment', {
        user_id: parseInt(userId),
        tweet_id: parseInt(tweetId),
        content: newComment.trim()
      });

      if (response.data.success) {
        // Yeni yorumu ekle ve input'u temizle
        const commentResponse = await axios.get(`http://localhost:5000/comments/${tweetId}`);
        setComments(commentResponse.data);
        setNewComment('');
      }
    } catch (error) {
      console.error('Error posting comment:', error);
    }
  };

  if (isLoading) {
    return <div className="loading">Loading tweet...</div>;
  }

  if (!tweet) {
    return <div className="error">Tweet not found</div>;
  }

  return (
    <div className="tweet-detail-container">
      <div className="tweet-detail-header">
        <button onClick={() => navigate(-1)} className="back-button">
          <i className="fas fa-arrow-left"></i>
          <span>Tweet</span>
        </button>
      </div>

      <div className="tweet-detail-content">
        <div className="tweet-author">
          <img
            src={tweet.profile_picture 
              ? `http://localhost:5000/uploads/profile_pictures/${tweet.profile_picture}`
              : `https://ui-avatars.com/api/?name=${tweet.first_name}+${tweet.last_name}&background=random`
            }
            alt="avatar"
            className="avatar"
            onClick={() => navigate(`/user/${tweet.user_id}`)}
          />
          <div className="author-info">
            <span className="name">{tweet.first_name} {tweet.last_name}</span>
            <span className="username">@{tweet.username}</span>
          </div>
        </div>

        <div className="tweet-text">{tweet.content}</div>

        <div className="tweet-metrics">
          <div className="metric">
            <span className="count">{tweet.retweet_count}</span>
            <span className="label">Retweets</span>
          </div>
          <div className="metric">
            <span className="count">{tweet.likes}</span>
            <span className="label">Likes</span>
          </div>
          <div className="metric">
            <span className="count">{tweet.comments}</span>
            <span className="label">Comments</span>
          </div>
        </div>

        <div className="tweet-actions">
          <button 
            onClick={handleLike}
            className={`action-button like-button ${tweet.user_liked ? 'liked' : ''}`}
            title={tweet.user_liked ? 'Unlike' : 'Like'}
          >
            <i className={tweet.user_liked ? "fas fa-heart" : "far fa-heart"}></i>
            <span>{tweet.likes}</span>
          </button>

          <button 
            onClick={handleRetweet}
            className={`action-button retweet-button ${tweet.is_retweeted ? 'retweeted' : ''}`}
            title={tweet.is_retweeted ? 'Undo Retweet' : 'Retweet'}
          >
            <i className="fas fa-retweet"></i>
            <span>{tweet.retweet_count}</span>
          </button>

          <button 
            className="action-button comment-button"
            onClick={() => document.querySelector('.comment-input').focus()}
            title="Comment"
          >
            <i className="far fa-comment"></i>
            <span>{tweet.comments}</span>
          </button>
        </div>

        <div className="comment-section">
          <div className="comment-input-container">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Tweet your reply"
              maxLength={280}
            />
            <button 
              onClick={handleComment}
              disabled={!newComment.trim()}
              className="reply-button"
            >
              Reply
            </button>
          </div>

          <div className="comments-list">
            {comments.map((comment) => (
              <div key={comment.comment_id} className="comment-item">
                <img
                  src={comment.profile_picture 
                    ? `http://localhost:5000/uploads/profile_pictures/${comment.profile_picture}`
                    : `https://ui-avatars.com/api/?name=${comment.first_name}+${comment.last_name}&background=random`
                  }
                  alt="avatar"
                  className="comment-avatar"
                  onClick={() => navigate(`/user/${comment.user_id}`)}
                />
                <div className="comment-content">
                  <div className="comment-author">
                    <span className="name">{comment.first_name} {comment.last_name}</span>
                    <span className="username">@{comment.username}</span>
                  </div>
                  <p>{comment.content}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default TweetDetail; 