import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  jwtSecret: process.env.JWT_SECRET || 'change-me-in-production',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173'
};
