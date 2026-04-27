import express   from 'express';
import cors      from 'cors';
import mongoose  from 'mongoose';
import dotenv    from 'dotenv';
import players   from './routes/players.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api', players);
app.get('/health', (_, res) => res.json({ ok: true }));

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/adamskingdom';
const PORT      = process.env.PORT || 3001;

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    app.listen(PORT, () => console.log(`Server on http://localhost:${PORT}`));
  })
  .catch(err => { console.error('DB error:', err.message); process.exit(1); });
