import { Request, Response, NextFunction } from 'express';

// Middleware para sanitizar y validar el login (usuario + contraseña)
export function sanitizeLogin(req: Request, res: Response, next: NextFunction) {
  try {
    const rawUsuario = (req.body?.usuario ?? req.body?.nombre_usuario ?? '').toString();
    const rawPass = (req.body?.contraseña ?? req.body?.password ?? '').toString();

    const usuario = rawUsuario.trim();
    const contraseña = rawPass;

    if (!usuario || !contraseña) {
      return res.status(400).json({ error: 'Faltan credenciales' });
    }

    // Validaciones básicas de tamaño y caracteres (ajustables)
    if (usuario.length < 3 || usuario.length > 100) {
      return res.status(400).json({ error: 'El nombre de usuario debe tener entre 3 y 100 caracteres' });
    }
    if (contraseña.length < 4 || contraseña.length > 255) {
      return res.status(400).json({ error: 'La contraseña debe tener entre 4 y 255 caracteres' });
    }

    // Evitar caracteres de control/whitespace extraños en el usuario
    if (/\s{2,}/.test(usuario) || /[\r\n\t]/.test(usuario)) {
      return res.status(400).json({ error: 'Nombre de usuario inválido' });
    }

    (req as any).body.sanitizedInput = { usuario, contraseña };
    next();
  } catch (e) {
    return res.status(400).json({ error: 'Solicitud inválida' });
  }
}