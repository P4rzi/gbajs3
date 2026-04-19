import { Express } from 'express';
import multer from 'multer';
import { authMiddleware } from './middleware/auth';
import * as authController from './controllers/auth.controller';
import * as romController from './controllers/rom.controller';
import * as saveController from './controllers/save.controller';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

export function setupRoutes(app: Express) {
  // Auth routes (public)
  app.post('/api/account/register', authController.register);
  app.post('/api/account/login', authController.login);
  app.post('/api/tokens/refresh', authController.refresh);

  // Auth routes (protected)
  app.post('/api/account/logout', authMiddleware, authController.logout);

  // ROM routes (protected)
  app.get('/api/rom/list', authMiddleware, romController.listRoms);
  app.get('/api/rom/download', authMiddleware, romController.downloadRom);
  app.post('/api/rom/upload', authMiddleware, upload.single('rom'), romController.uploadRom);

  // Save routes (protected)
  app.get('/api/save/list', authMiddleware, saveController.listSaves);
  app.get('/api/save/download', authMiddleware, saveController.downloadSave);
  app.post('/api/save/upload', authMiddleware, upload.single('save'), saveController.uploadSave);
}
