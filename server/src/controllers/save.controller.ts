import { Request, Response } from 'express';
import { prisma } from '../prisma';

const isSaveStateFilename = (filename: string) =>
  /\.ss\d+$/i.test(filename) || /_auto\.ss$/i.test(filename);

const getGameBaseName = (gameName?: string) =>
  gameName?.trim().replace(/\.[^.]+$/, '');

export async function listSaves(req: Request, res: Response) {
  try {
    const userId = req.user!.userId;
    const gameName = typeof req.query.game === 'string' ? req.query.game : '';
    const gameBaseName = getGameBaseName(gameName);

    const saves = await prisma.save.findMany({
      where: {
        userId,
        ...(gameBaseName
          ? {
              filename: {
                startsWith: gameBaseName,
                mode: 'insensitive'
              }
            }
          : {})
      },
      select: { filename: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' }
    });

    return res.json(
      saves
        .filter((s) => isSaveStateFilename(s.filename))
        .map((s) => ({ filename: s.filename, updatedAt: s.updatedAt.toISOString() }))
    );
  } catch (error) {
    console.error('List saves error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function downloadSave(req: Request, res: Response) {
  try {
    const userId = req.user!.userId;
    const saveName = req.query.save as string;

    if (!saveName) {
      return res.status(400).json({ error: 'save query parameter is required' });
    }

    if (!isSaveStateFilename(saveName)) {
      return res.status(400).json({ error: 'Only save state files (.ssN) are allowed' });
    }

    const save = await prisma.save.findUnique({
      where: { userId_filename: { userId, filename: saveName } }
    });

    if (!save) {
      return res.status(404).json({ error: 'Save not found' });
    }

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${saveName}"`);
    return res.send(Buffer.from(save.data));
  } catch (error) {
    console.error('Download save error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function uploadSave(req: Request, res: Response) {
  try {
    const userId = req.user!.userId;

    if (!req.file) {
      return res.status(400).json({ error: 'No save file provided' });
    }

    if (!isSaveStateFilename(req.file.originalname)) {
      return res.status(400).json({ error: 'Only save state files (.ssN) are allowed' });
    }

    const saveBytes = Uint8Array.from(req.file.buffer);

    await prisma.save.upsert({
      where: {
        userId_filename: { userId, filename: req.file.originalname }
      },
      update: { data: saveBytes },
      create: {
        userId,
        filename: req.file.originalname,
        data: saveBytes
      },
      select: { id: true }
    });

    return res.sendStatus(200);
  } catch (error) {
    console.error('Upload save error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
