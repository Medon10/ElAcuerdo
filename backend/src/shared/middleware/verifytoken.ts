import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
type JwtUsuarioPayload = {
  id: number;
  rol: string;
  nombre?: string;
  iat?: number;
  exp?: number;
};

declare global {
  namespace Express {
    interface Request {
      user?: JwtUsuarioPayload;
    }
  }
}

export function verifyToken(req: Request, res: Response, next: NextFunction): void {
  // Soportar cookie o encabezado Authorization: Bearer <token>
  const authHeader = req.headers['authorization'];
  const bearer = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.substring('Bearer '.length)
    : undefined;
  const token = bearer || (req as any).cookies?.token;
  const secret = process.env.JWT_SECRET || process.env.TOKEN_SECRET || 'supersecret';

  if (!token) {
    res.status(401).json({ message: 'token no proporcionado' });
    return;
  }

  try {
    const decoded = jwt.verify(token, secret) as JwtUsuarioPayload;
    req.user = decoded;
    next();
  } catch (error: any) {
    res.status(403).json({ message: 'token inválido', error: error.message });
    return;
  }
}
