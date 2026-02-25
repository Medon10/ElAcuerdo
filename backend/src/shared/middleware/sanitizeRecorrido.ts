import { Request, Response, NextFunction } from 'express';

export function sanitizeRecorridoInput(req: Request, res: Response, next: NextFunction) {
  const b = req.body || {};
  const input = {
    planilla_id: b.planilla_id ? Number(b.planilla_id) : undefined,
    horario: typeof b.horario === 'string' ? b.horario.trim() : undefined,
    numero_recorrido: typeof b.numero_recorrido === 'string' ? b.numero_recorrido.trim() : undefined,
    importe: b.importe != null ? Number(b.importe) : undefined,
    discap_nombre: typeof b.discap_nombre === 'string' ? b.discap_nombre.trim() : undefined,
    discap_apellido: typeof b.discap_apellido === 'string' ? b.discap_apellido.trim() : undefined,
    discap_dni: typeof b.discap_dni === 'string' ? b.discap_dni.trim() : undefined,
  } as any;
  (req as any).body.sanitizedInput = input;
  next();
}
