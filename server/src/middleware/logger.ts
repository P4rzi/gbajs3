import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';

const logsDir = path.resolve(process.cwd(), 'logs');

if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const logFilePath = path.join(logsDir, 'requests.log');

function appendLog(entry: string) {
  try {
    fs.appendFileSync(logFilePath, entry + '\n', 'utf8');
  } catch {
    // if we can't write the log, don't crash the server
  }
}

export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const startedAt = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startedAt;
    const status = res.statusCode;
    const level = status >= 500 ? 'ERROR' : status >= 400 ? 'WARN' : 'INFO';
    const timestamp = new Date().toISOString();

    const entry = `[${timestamp}] ${level} ${req.method} ${req.originalUrl} → ${status} (${duration}ms)`;

    console.log(entry);
    appendLog(entry);
  });

  next();
}
