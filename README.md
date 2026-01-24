# Twitter Clone

Twitter-like social media app. Database Management Systems course project.

## Tech

- Backend: Flask, PostgreSQL
- Frontend: React

## Setup

### Database

Create PostgreSQL database. Add `.env` in `/backend`:

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

Runs on http://localhost:5000

### Frontend

```bash
cd frontend/twitter-frontend
npm install
npm start
```

Runs on http://localhost:3000

## Features

- User auth (register/login)
- Post tweets with images
- Like, comment, retweet
- Follow/unfollow
- Dark/light theme

## Structure

```
 backend/
    app.py       # Flask API
    uploads/     # User uploads
 frontend/
     twitter-frontend/src/
```

## License

MIT
