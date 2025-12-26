import { Request, Response, NextFunction } from 'express';

export function sanitizePlanillaInput(req: Request, res: Response, next: NextFunction) {
  const b = req.body || {};
  const input = {
    chofer_id: b.chofer_id ? Number(b.chofer_id) : undefined,
    numero_coche: typeof b.numero_coche === 'string' ? b.numero_coche.trim() : undefined,
    fecha_hora_planilla: typeof b.fecha_hora_planilla === 'string' ? b.fecha_hora_planilla : undefined,
    comentarios: typeof b.comentarios === 'string' ? b.comentarios.trim() : undefined,
  } as any;
  (req as any).body.sanitizedInput = input;
  next();
}
