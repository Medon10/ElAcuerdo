import { Request, Response, NextFunction } from 'express';

// Este middleware se usa DESPUÉS de verifyToken
export function verifyAdmin(req: Request, res: Response, next: NextFunction) {
  
  // Asumimos que verifyToken ya añadió el usuario a req
  const user = (req as any).user;

  if (!user) {
    return res.status(401).json({ message: 'No autenticado' });
  }

  if (user.rol !== 'admin') {
    return res.status(403).json({ message: 'Acceso denegado. Se requiere rol de administrador.' });
  }

  // Si es admin, permite continuar
  next();
}