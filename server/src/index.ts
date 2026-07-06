import express from 'express';

const app = express();
const PORT = Number(process.env.BACKEND_PORT ?? 3000);

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
