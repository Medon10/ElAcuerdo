import { Request, Response, NextFunction } from 'express';

export function sanitizeUsuarioInput(req: Request, res: Response, next: NextFunction) {
  const b = req.body || {};
  const input = {
    usuario: typeof b.usuario === 'string' ? b.usuario.trim() : undefined,
    nombre: typeof b.nombre === 'string' ? b.nombre.trim() : undefined,
    apellido: typeof b.apellido === 'string' ? b.apellido.trim() : undefined,
    contraseña: typeof b.contraseña === 'string' ? b.contraseña : undefined,
    // DB column is `rol`. Keep backward compat with `role` input.
    rol: typeof b.rol === 'string' ? b.rol : (typeof b.role === 'string' ? b.role : undefined),
    is_active: typeof b.is_active === 'number' ? b.is_active : (typeof b.is_active === 'boolean' ? (b.is_active ? 1 : 0) : undefined),
  } as any;
  (req as any).body.sanitizedInput = input;
  next();
}
