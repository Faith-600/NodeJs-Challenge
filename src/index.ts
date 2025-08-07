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


// Post-Answer End-point


// Answering a question
app.post('/answer', async (req, res) => {
  const { sessionId, questionId, answer } = req.body;
  const EXAM_DURATION_MS = 10 * 60 * 1000; 

  // Basic input validation
  if (!sessionId || !questionId || !answer) {
    return res.status(400).send({ message: 'Missing required fields: sessionId, questionId, answer.' });
  }

  try {
    // --- 1. Check Session and Timeout ---
    const sessionResult = await query('SELECT start_time, is_finished FROM exam_sessions WHERE id = $1', [sessionId]);
    if (sessionResult.rows.length === 0) {
      return res.status(404).send({ message: 'Exam session not found.' });
    }
    const session = sessionResult.rows[0];

    if (session.is_finished) {
      return res.status(403).send({ message: 'This exam has already been completed.' });
    }

    const elapsedTime = Date.now() - new Date(session.start_time).getTime();
    if (elapsedTime > EXAM_DURATION_MS) {
      // If time is up, grade whatever they have and end the exam.
      const finalResult = await gradeAndFinishExam(sessionId);
      return res.status(408).send({
        message: 'Time limit exceeded. Exam has ended.',
        ...finalResult,
      });
    }

    //  Saving the Answer 
    // We can add a check here to prevent answering the same question twice if we want
    await query(
      'INSERT INTO exam_answers (session_id, question_id, submitted_answer) VALUES ($1, $2, $3)',
      [sessionId, questionId, answer]
    );

    //  Checking if Exam is Over 
    const answerCountResult = await query('SELECT COUNT(*) FROM exam_answers WHERE session_id = $1', [sessionId]);
    const answeredQuestions = parseInt(answerCountResult.rows[0].count, 10);

    const TOTAL_QUESTIONS = 10;
    if (answeredQuestions < TOTAL_QUESTIONS) {
      //  Getting the Next Question
      const nextQuestionResult = await query(
        'SELECT id, text, options FROM questions WHERE id > $1 ORDER BY id ASC LIMIT 1',
        [questionId]
      );
      const nextQuestion = nextQuestionResult.rows[0];
      return res.status(200).send({
        message: 'Answer submitted successfully.',
        nextQuestion: nextQuestion,
      });
    } else {
      //  All questions answered, Grade and Finish 
      const finalResult = await gradeAndFinishExam(sessionId);
      return res.status(200).send({
        message: 'Congratulations! You have completed the exam.',
        ...finalResult,
      });
    }
 } catch (error) {
   if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as any).code === '23505'
  ) {
    return res.status(409).send({ message: 'This question has already been answered.' });
  }
    console.error('Error processing answer:', error);
    return res.status(500).send({ message: 'Internal Server Error' });
  }
});

//  Function for Grading 
async function gradeAndFinishExam(sessionId: number) {
  // Marking the exam as finished
  await query('UPDATE exam_sessions SET is_finished = TRUE WHERE id = $1', [sessionId]);

  // Get all correct answers and submitted answers for this session
  const gradingResult = await query(
    `SELECT q.correct_answer, ea.submitted_answer
     FROM exam_answers ea
     JOIN questions q ON ea.question_id = q.id
     WHERE ea.session_id = $1`,
    [sessionId]
  );

  let correctCount = 0;
  gradingResult.rows.forEach(row => {
    if (row.correct_answer === row.submitted_answer) {
      correctCount++;
    }
  });

  const totalAnswered = gradingResult.rows.length;
  const score = totalAnswered > 0 ? (correctCount / 10) * 100 : 0;
  const status = score >= 50 ? 'Pass' : 'Fail';

  let remark = 'Good effort!';
  if (score >= 90) remark = 'Excellent work!';
  else if (score >= 70) remark = 'Very good!';
  else if (score < 50) remark = 'Needs improvement, but keep trying!';

  return {
    score: `${score}%`,
    correctAnswers: correctCount,
    totalQuestions: 10,
    status,
    remark,
  };
}




app.listen(port, () => {
  console.log(`🚀 Server is running on http://localhost:${port}`);
});