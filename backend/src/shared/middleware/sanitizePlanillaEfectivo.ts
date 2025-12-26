import { Request, Response, NextFunction } from 'express';

export function sanitizePlanillaEfectivoInput(req: Request, res: Response, next: NextFunction) {
  const b = req.body || {};
  const input = {
    planilla_id: b.planilla_id ? Number(b.planilla_id) : undefined,
    denominacion: b.denominacion ? Number(b.denominacion) : undefined,
    cantidad: b.cantidad ? Number(b.cantidad) : undefined,
    subtotal: b.subtotal ? Number(b.subtotal) : undefined,
  } as any;
  (req as any).body.sanitizedInput = input;
  next();
}
