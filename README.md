# Twitter Clone

A Twitter-like social media app built with Flask and React. Made for a Database Management Systems course project.

## Features

- User registration and login
- Post tweets (with image support)
- Like, comment, retweet
- Follow/unfollow users
- User profiles with follower counts
- Explore page with trending content
- Dark/light theme toggle

## Tech Stack

**Backend:** Flask, PostgreSQL, psycopg2  
**Frontend:** React, React Router, Axios

## Setup

### Database

You'll need PostgreSQL running. Create a database and set up the schema (tables for Users, Tweets, Likes, Comments, Followers).

Create a `.env` file in `/backend`:

```
DATABASE_NAME=twitter_db
DATABASE_USER=postgres
DATABASE_PASSWORD=yourpassword
DATABASE_HOST=localhost
DATABASE_PORT=5432
```

### Backend

```bash
cd backend
pip install flask flask-cors psycopg2-binary python-dotenv bcrypt werkzeug
python app.py
```

Runs on `http://localhost:5000`

### Frontend

```bash
cd frontend/twitter-frontend
npm install
npm start
```

Runs on `http://localhost:3000`

## Project Structure

```
├── backend/
│   ├── app.py              # Flask API (all routes)
│   └── uploads/            # User uploads (profile pics, tweet images)
├── frontend/
│   └── twitter-frontend/
│       └── src/
│           ├── components/ # React components
│           └── App.js      # Main app with routing
└── README.md
```

## API Endpoints

Some key endpoints in `app.py`:

- `POST /register` - Create new user
- `POST /login` - User login
- `GET /tweets` - Get feed
- `POST /tweet` - Create tweet
- `POST /like` - Like a tweet
- `POST /comment` - Add comment
- `POST /follow` - Follow user
- `GET /user/<id>` - Get user profile

## Notes

- No JWT auth yet, just simple session handling with localStorage
- Profile pictures and tweet images are stored in `/backend/uploads`
- The frontend polls for new tweets every 30 seconds

## License

MIT
