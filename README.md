# Database Management Systems Project

## About the Project
This project is the development of a social media platform similar to Twitter, which is a database management system application. The application allows users to post tweets, like, comment, and follow other users.

## Technologies
- **Backend**: Flask, PostgreSQL
- **Frontend**: React
- **Others**: Git, Node.js

## Frontend Technologies
- **HTML**: Used to create the basic structure of the application. The `public/index.html` file contains the HTML that serves as the entry point for the application.
- **CSS**: Used for styling and design. Various CSS files and style libraries (e.g., Bootstrap or Font Awesome) can be utilized to enhance the appearance of the application.
- **JavaScript**: Used to provide dynamic content and interactivity. The React library is used to build the user interface and interact with the API.
- **React**: A JavaScript library used to create the user interface. Its component-based architecture allows for a more modular and manageable application.

## HTML Usage
- The `public/index.html` file contains the basic HTML structure of the application. This file serves as the entry point when the React application is run.
- The HTML file includes important components such as meta tags, favicon, style files, and JavaScript links.

## CSS and Styling
- CSS files and style libraries can be used to enhance the appearance of the application. For example, links for Font Awesome icons have been included.

## JavaScript and React
- React is used to build the user interface. The application is managed through components.
- Libraries such as Axios or Fetch API can be used for interaction with the API.

## Backend Technologies
- **Flask**: A lightweight WSGI web application framework in Python. It is used to create the backend of the application.
- **PostgreSQL**: A powerful, open-source object-relational database system used to store application data.
- **SQLAlchemy**: An ORM (Object Relational Mapper) used for database interactions in a more Pythonic way.

## API Endpoints
- The backend provides various API endpoints for user registration, login, posting tweets, and more. These endpoints are defined in the `app.py` file in the backend directory.

## Database Structure
- The database schema includes tables for users, tweets, likes, comments, and followers. This structure allows for efficient data management and retrieval.

## Installation
1. **Backend Setup**:
   - `cd backend`
   - `pip install -r requirements.txt` (Install the required Python libraries)
   - Configure the database settings.

2. **Frontend Setup**:
   - `cd frontend/twitter-frontend`
   - `npm install` (Install the required Node.js packages)
   - `npm start` (Start the application)

## Environment Variables
To run this application, create a `.env` file in the root directory with the following variables:


## Usage
- You can use the relevant API endpoints for user registration, login, and posting tweets.
- The frontend application provides the user interface and interacts with the API.

## Contributors
- Zeki Akgül - Project Owner

## License
This project is licensed under the [MIT License](LICENSE).
