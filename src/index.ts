import express from 'express';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.get('/health', (req, res) => {
  res.status(200).send({ status: 'ok' });
});

app.listen(port, () => {
  console.log(`🚀 Server is running on http://localhost:${port}`);
});