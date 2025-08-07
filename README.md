 ## Demo Exam System API
This project is my solution for the Node.js Take-Home Challenge. It's a RESTful API built with TypeScript, Express, and a PostgreSQL database hosted on Supabase, simulating a simple time-limited exam.


 ## Live Demo
This API is deployed and available to test live.
# Base URL: https://demo-exam.onrender.com
You can use this base URL with Postman to test all the endpoints described below.

## Key Features
1. Timed Sessions: Each exam starts a 10-minute timer, managed on the server.
2. Stateless Application: All session and answer state is stored in the database, allowing the API to be scaled or restarted without data loss.
3. Robust Error Handling: The API gracefully handles common issues like duplicate submissions and provides a recovery endpoint for clients to re-synchronize.
4. Automatic Grading: Scores, pass/fail status, and performance remarks are calculated automatically upon completion or timeout.


 ## Setup & Installation
This project uses a free-tier Supabase instance for the database, so you do not need to have PostgreSQL installed locally.


## Prerequisites:
Node.js
A free Supabase account
# 1. Clone the Repository
git clone https://github.com/Faith-600/NodeJs-Challenge.git
cd Demo Test

# 2. Install Dependencies
npm install

# 3. Set Up the Supabase Database
1. Log in to your Supabase account and create a new project.
2. Once the project is ready, navigate to the SQL Editor.
3. Open the database/init.sql file from this project, copy its entire contents.
4. Paste the SQL into the Supabase SQL Editor and click "RUN". This will create and seed your tables.

# 4. Configure Environment Variables
1. In your Supabase project settings, go to Database -> Connection string.
2. Copy the string that starts with postgres://.
3. Back in the project code, create a .env file
4. Open the new .env file and paste your Supabase connection string, replacing [YOUR-PASSWORD] with the password you set when creating the Supabase project.
 # DATABASE_URL=postgres://postgres:[YOUR-PASSWORD]@db.random-chars.supabase.co:5432/postgres


## Running the Application
To start the development server with auto-reloading:
npm run start:dev
# The API will be available at http://localhost:3000.

### API Endpoints
1. Start a New Exam
POST /start-exam
Description: Begins a new exam session and returns the first question.
# Request Body: None
# Success Response (201 Created):
## {
  "message": "Exam started!",
  "sessionId": 1,
  "question": {
    "id": 1,
    "text": "What does `console.log` do in JavaScript?",
    "options": { "A": "...", "B": "..." }
  }
 ## }


2. Submit an Answer
POST /answer
Description: Submits an answer for a question. Returns the next question or the final results.

# Request Body:
## {
  "sessionId": 1,
  "questionId": 1,
  "answer": "A"
 ## }

# Success Response (Next Question):
## {
  "message": "Answer submitted successfully.",
  "nextQuestion": {
    "id": 2,
    "text": "...",
    "options": { ... }
  }
## }

# Success Response (Exam Finished):
## {
  "message": "Congratulations! You have completed the exam.",
  "score": "90%",
  "correctAnswers": 9,
  "totalQuestions": 10,
  "status": "Pass",
  "remark": "Excellent work!"
 ## }

3. Get Current Exam Status (Recovery)
GET /exam-status/:sessionId
Description: Allows a client to recover its state if it gets "stuck" (e.g., after a network error or page refresh). It returns the next question the user should be on.
# URL Parameter: sessionId - The ID of the exam session.

# Success Response (200 OK):
## {
  "message": "Successfully retrieved current exam state.",
  "nextQuestion": {
    "id": 5,
    "text": "Which HTTP method is typically used to create a new resource on a server?",
    "options": { ... }
 }
 ## }

## Architectural Decisions & Key Features
# I made a few key decisions while building this API to ensure it was robust and production-ready:

1. Database-Level Integrity: To prevent bugs from duplicate submissions (e.g., a user double-clicking), I enforced a UNIQUE constraint on the (session_id, question_id) columns in the database. This guarantees data integrity at the lowest level.
2. Resilient API Design: During testing, I realized a client could get "stuck" after a network error. I added the GET /exam-status/:sessionId endpoint to provide a recovery mechanism, a common requirement for robust, real-world applications.
3. Stateless Service: The Node.js application is completely stateless. All information related to an ongoing exam is stored in the database, which makes the service more resilient and easier to scale.
4. Lightweight Dependencies: I chose to use the raw pg library instead of a heavier ORM. For this project's scope, it provides direct control over the SQL and avoids unnecessary overhead, while still allowing for clean, organized database logic.