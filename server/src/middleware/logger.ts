import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';

const isServerlessRuntime =
  process.env.VERCEL === '1' || process.env.AWS_LAMBDA_FUNCTION_NAME !== undefined;

const logsDir = isServerlessRuntime
  ? path.resolve('/tmp', 'gbajs3-logs')
  : path.resolve(process.cwd(), 'logs');

const logFilePath = path.join(logsDir, 'requests.log');

let canWriteToFile = !isServerlessRuntime;

function ensureLogDirectory() {
  if (!canWriteToFile) {
    return false;
  }

  try {
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    return true;
  } catch {
    canWriteToFile = false;
    return false;
  }
}

function appendLog(entry: string) {
  if (!ensureLogDirectory()) {
    return;
  }

  try {
    fs.appendFileSync(logFilePath, entry + '\n', 'utf8');
  } catch {
    canWriteToFile = false;
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
