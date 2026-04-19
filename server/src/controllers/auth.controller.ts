import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { prisma } from '../prisma';
import { config } from '../config';

const ACCESS_TOKEN_EXPIRY = '5m';
const REFRESH_TOKEN_EXPIRY = '7h';
const REFRESH_COOKIE_MAX_AGE = 7 * 60 * 60 * 1000; // 7 hours in ms
const BCRYPT_ROUNDS = 10;

export async function register(req: Request, res: Response) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    if (typeof username !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Invalid input' });
    }

    if (username.length < 3 || username.length > 50) {
      return res.status(400).json({ error: 'Username must be between 3 and 50 characters' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    const passHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    await prisma.user.create({
      data: { username, passHash }
    });

    return res.status(201).json({ message: 'User created' });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.passHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Rotate token fields for refresh token security
    const tokenId = randomUUID();
    const tokenSlug = randomUUID();
    await prisma.user.update({
      where: { id: user.id },
      data: { tokenId, tokenSlug }
    });

    const accessToken = jwt.sign(
      { userId: user.id, username: user.username },
      config.jwtSecret,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );

    const refreshToken = jwt.sign(
      { userId: user.id, username: user.username, tokenId },
      config.jwtSecret + tokenSlug,
      { expiresIn: REFRESH_TOKEN_EXPIRY }
    );

    res.cookie('refresh-tok', refreshToken, {
      path: '/api/tokens/refresh',
      httpOnly: true,
      maxAge: REFRESH_COOKIE_MAX_AGE,
      sameSite: 'lax'
    });

    return res.json(accessToken);
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function logout(_req: Request, res: Response) {
  try {
    res.cookie('refresh-tok', '', {
      path: '/api/tokens/refresh',
      httpOnly: true,
      maxAge: 0,
      sameSite: 'lax'
    });

    return res.sendStatus(200);
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function refresh(req: Request, res: Response) {
  try {
    const refreshTok = req.cookies?.['refresh-tok'];
    if (!refreshTok) {
      return res.status(401).json({ error: 'No refresh token' });
    }

    // Decode without verification to extract tokenId
    const decoded = jwt.decode(refreshTok) as {
      userId: number;
      username: string;
      tokenId: string;
    } | null;

    if (!decoded?.tokenId || !decoded?.userId) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Look up user by id and tokenId
    const user = await prisma.user.findFirst({
      where: { id: decoded.userId, tokenId: decoded.tokenId }
    });

    if (!user || !user.tokenSlug) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Verify signature with user-specific secret
    try {
      jwt.verify(refreshTok, config.jwtSecret + user.tokenSlug);
    } catch {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const accessToken = jwt.sign(
      { userId: user.id, username: user.username },
      config.jwtSecret,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );

    return res.json(accessToken);
  } catch (error) {
    console.error('Refresh error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
