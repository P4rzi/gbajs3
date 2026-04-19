import { Request, Response } from 'express';
import path from 'path';
import { prisma } from '../prisma';

const ALLOWED_ROM_EXTENSIONS = ['.gba', '.gbc', '.gb', '.zip', '.7z'];

export async function listRoms(req: Request, res: Response) {
  try {
    const userId = req.user!.userId;

    const roms = await prisma.rom.findMany({
      where: { userId },
      select: { filename: true }
    });

    return res.json(roms.map((r) => r.filename));
  } catch (error) {
    console.error('List ROMs error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function downloadRom(req: Request, res: Response) {
  try {
    const userId = req.user!.userId;
    const romName = req.query.rom as string;

    if (!romName) {
      return res.status(400).json({ error: 'rom query parameter is required' });
    }

    const rom = await prisma.rom.findUnique({
      where: { userId_filename: { userId, filename: romName } }
    });

    if (!rom) {
      return res.status(404).json({ error: 'ROM not found' });
    }

    res.setHeader('Content-Type', 'application/x-gba-rom');
    res.setHeader('Content-Disposition', `attachment; filename="${romName}"`);
    return res.send(Buffer.from(rom.data));
  } catch (error) {
    console.error('Download ROM error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function uploadRom(req: Request, res: Response) {
  try {
    const userId = req.user!.userId;

    if (!req.file) {
      return res.status(400).json({ error: 'No ROM file provided' });
    }

    const ext = path.extname(req.file.originalname).toLowerCase();
    if (!ALLOWED_ROM_EXTENSIONS.includes(ext)) {
      return res
        .status(400)
        .json({ error: `Invalid file extension. Allowed: ${ALLOWED_ROM_EXTENSIONS.join(', ')}` });
    }

    const romBytes = Uint8Array.from(req.file.buffer);

    await prisma.rom.upsert({
      where: {
        userId_filename: { userId, filename: req.file.originalname }
      },
      update: { data: romBytes },
      create: {
        userId,
        filename: req.file.originalname,
        data: romBytes
      },
      select: { id: true }
    });

    return res.sendStatus(200);
  } catch (error) {
    console.error('Upload ROM error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
