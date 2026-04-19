import dotenv from 'dotenv';
dotenv.config();

const parseAllowedOrigins = (value?: string) =>
  (value ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  jwtSecret: process.env.JWT_SECRET || 'change-me-in-production',
  clientOrigins: parseAllowedOrigins(process.env.CLIENT_ORIGIN),
  isProduction: process.env.NODE_ENV === 'production'
};
