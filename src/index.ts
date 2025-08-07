import express from 'express';
import dotenv from 'dotenv';
import {query} from './db'

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.get('/health', (req, res) => {
  res.status(200).send({ status: 'ok' });
});

// Start-Exam Endpoint

app.post('/start-exam', async (req, res) => {
  try {
    // Create a new session in the database
    const sessionResult = await query(
      'INSERT INTO exam_sessions DEFAULT VALUES RETURNING id, start_time'
    );
    const session = sessionResult.rows[0];

    // Fetch the very first question
    const questionResult = await query(
      'SELECT id, text, options FROM questions ORDER BY id ASC LIMIT 1'
    );
    const firstQuestion = questionResult.rows[0];

    // Send the response back to the user
    res.status(201).send({
      message: 'Exam started!',
      sessionId: session.id,
      question: firstQuestion,
    });
  } catch (error) {
    console.error('Error starting exam:', error);
    res.status(500).send({ message: 'Internal Server Error' });
  }
});







app.listen(port, () => {
  console.log(`🚀 Server is running on http://localhost:${port}`);
});