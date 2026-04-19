import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './config';
import { setupRoutes } from './routes';
import { requestLogger } from './middleware/logger';

const app = express();

app.use(
  cors({
    origin: config.clientOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS']
  })
);

app.use(express.json());
app.use(cookieParser());
app.use(requestLogger);

setupRoutes(app);

app.listen(config.port, () => {
  console.log(`Server running on http://localhost:${config.port}`);
});
