import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './config';
import { setupRoutes } from './routes';
import { requestLogger } from './middleware/logger';

const app = express();

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (!origin || config.clientOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`Origin ${origin} is not allowed by CORS`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json());
app.use(cookieParser());
app.use(requestLogger);

setupRoutes(app);

app.listen(config.port, () => {
  console.log(`Server running on http://localhost:${config.port}`);
});
