import express from 'express';
import dotenv from 'dotenv';
import {query} from './db'

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.get('/test', (req, res) => {
  res.status(200).send({ status: 'ok' });
});


// Start-Exam Endpoint

app.post('/start-exam', async (req, res) => {
  try {
    const sessionResult = await query(
      'INSERT INTO exam_sessions DEFAULT VALUES RETURNING id, start_time'
    );
    const session = sessionResult.rows[0];

    const questionResult = await query(
      'SELECT id, text, options FROM questions ORDER BY id ASC LIMIT 1'
    );
    const firstQuestion = questionResult.rows[0];

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

//  ENDPOINT FOR RECOVERY 

app.get('/exam-status/:sessionId', async (req, res) => {
  const { sessionId } = req.params;

  try {
    const sessionResult = await query(
      'SELECT id, is_finished FROM exam_sessions WHERE id = $1',
      [sessionId]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).send({ message: 'Exam session not found.' });
    }
    if (sessionResult.rows[0].is_finished) {
      return res.status(403).send({ message: 'This exam has already been completed.' });
    }

    const lastAnswerResult = await query(
      'SELECT question_id FROM exam_answers WHERE session_id = $1 ORDER BY question_id DESC LIMIT 1',
      [sessionId]
    );

    let nextQuestion;

    if (lastAnswerResult.rows.length > 0) {
      const lastQuestionId = lastAnswerResult.rows[0].question_id;
      const nextQuestionResult = await query(
        'SELECT id, text, options FROM questions WHERE id > $1 ORDER BY id ASC LIMIT 1',
        [lastQuestionId]
      );
      nextQuestion = nextQuestionResult.rows[0];
    } else {
      const firstQuestionResult = await query(
        'SELECT id, text, options FROM questions ORDER BY id ASC LIMIT 1'
      );
      nextQuestion = firstQuestionResult.rows[0];
    }

    if (!nextQuestion) {
      return res.status(200).send({ message: 'All questions have been answered. The exam is complete.' });
    }

    return res.status(200).send({
      message: 'Successfully retrieved current exam state.',
      nextQuestion: nextQuestion,
    });

  } catch (error) {
    console.error('Error fetching exam status:', error);
    return res.status(500).send({ message: 'Internal Server Error' });
  }
});


// Post-Answer End-point

app.post('/answer', async (req, res) => {
  const { sessionId, questionId, answer } = req.body;
  const EXAM_DURATION_MS = 10 * 60 * 1000; 

  if (!sessionId || !questionId || !answer) {
    return res.status(400).send({ message: 'Missing required fields: sessionId, questionId, answer.' });
  }

  try {
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
      const finalResult = await gradeAndFinishExam(sessionId);
      return res.status(408).send({
        message: 'Time limit exceeded. Exam has ended.',
        ...finalResult,
      });
    }

    //  Saving the Answer 

    await query(
      'INSERT INTO exam_answers (session_id, question_id, submitted_answer) VALUES ($1, $2, $3)',
      [sessionId, questionId, answer]
    );

    const answerCountResult = await query('SELECT COUNT(*) FROM exam_answers WHERE session_id = $1', [sessionId]);
    const answeredQuestions = parseInt(answerCountResult.rows[0].count, 10);

    const TOTAL_QUESTIONS = 10;
    if (answeredQuestions < TOTAL_QUESTIONS) {
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
  await query('UPDATE exam_sessions SET is_finished = TRUE WHERE id = $1', [sessionId]);

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
  console.log(`Server is running on http://localhost:${port}`);
});