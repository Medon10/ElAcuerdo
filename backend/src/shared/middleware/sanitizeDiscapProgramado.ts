import { Request, Response, NextFunction } from 'express';

function normalizeHorario(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const s = raw.trim();
  if (!s) return undefined;

  const m = /^([0-9]{1,2}):([0-9]{2})$/.exec(s);
  if (!m) return undefined;

  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return undefined;
  if (hh < 0 || hh > 23) return undefined;
  if (mm < 0 || mm > 59) return undefined;

  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

export function sanitizeDiscapProgramadoInput(req: Request, res: Response, next: NextFunction) {
  const b = req.body || {};

  const fecha = typeof b.fecha === 'string' ? b.fecha.trim() : undefined;
  const input = {
    fecha: fecha,
    horario: normalizeHorario(b.horario),
    numero_recorrido: typeof b.numero_recorrido === 'string' ? b.numero_recorrido.trim() : undefined,
    discap_nombre: typeof b.discap_nombre === 'string' ? b.discap_nombre.trim() : undefined,
    discap_apellido: typeof b.discap_apellido === 'string' ? b.discap_apellido.trim() : undefined,
    discap_dni: typeof b.discap_dni === 'string' ? b.discap_dni.trim() : undefined,
  } as any;

  (req as any).body.sanitizedInput = input;
  next();
}

export { normalizeHorario };
