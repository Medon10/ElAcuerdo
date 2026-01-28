import { Request, Response } from 'express';
import { orm } from '../shared/bdd/orm.js';
import { DiscapProgramado } from './discap-programado.entity.js';
import { normalizeHorario } from '../shared/middleware/sanitizeDiscapProgramado.js';

const BUSINESS_TIME_ZONE = process.env.BUSINESS_TIME_ZONE || 'America/Argentina/Buenos_Aires';

function getTimeZoneOffsetMs(date: Date, timeZone: string) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = dtf.formatToParts(date);
  const values: Record<string, number> = {};
  for (const p of parts) {
    if (p.type === 'literal') continue;
    values[p.type] = Number(p.value);
  }
  const asUTC = Date.UTC(values.year, (values.month || 1) - 1, values.day || 1, values.hour || 0, values.minute || 0, values.second || 0);
  return asUTC - date.getTime();
}

function zonedTimeToUtc(
  parts: { year: number; month: number; day: number; hour?: number; minute?: number; second?: number },
  timeZone: string
) {
  const utcTs = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour || 0, parts.minute || 0, parts.second || 0);
  const guess = new Date(utcTs);
  const offset1 = getTimeZoneOffsetMs(guess, timeZone);
  const guess2 = new Date(utcTs - offset1);
  const offset2 = getTimeZoneOffsetMs(guess2, timeZone);
  return new Date(utcTs - offset2);
}

function parseFechaISO(fechaISO: string): { year: number; month: number; day: number } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaISO)) return null;
  const [yyyyS, mmS, ddS] = fechaISO.split('-');
  const year = Number(yyyyS);
  const month = Number(mmS);
  const day = Number(ddS);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  return { year, month, day };
}

function assertFutureBusinessDateTimeOrThrow(fechaISO: string, horarioHHmm: string) {
  const dateParts = parseFechaISO(fechaISO);
  if (!dateParts) {
    const err: any = new Error('Formato de fecha inválido. Use YYYY-MM-DD');
    err.status = 400;
    throw err;
  }

  const normalized = normalizeHorario(horarioHHmm);
  if (!normalized) {
    const err: any = new Error('Horario inválido. Use HH:mm');
    err.status = 400;
    throw err;
  }

  const [hhS, mmS] = normalized.split(':');
  const hour = Number(hhS);
  const minute = Number(mmS);

  const scheduledUtc = zonedTimeToUtc(
    { year: dateParts.year, month: dateParts.month, day: dateParts.day, hour, minute, second: 0 },
    BUSINESS_TIME_ZONE
  );

  if (Number.isNaN(scheduledUtc.getTime())) {
    const err: any = new Error('No se pudo interpretar fecha/horario');
    err.status = 400;
    throw err;
  }

  if (scheduledUtc.getTime() <= Date.now()) {
    const err: any = new Error('No se puede asignar: el horario ya pasó (debe cargarse antes de que suceda el recorrido)');
    err.status = 400;
    throw err;
  }

  return { normalizedHorario: normalized, scheduledUtc };
}

async function findByChoferFecha(req: Request, res: Response) {
  try {
    const choferId = Number(req.query.choferId);
    const fecha = String(req.query.fecha || '').trim();

    if (!Number.isFinite(choferId) || choferId <= 0) return res.status(400).json({ message: 'Parámetro choferId inválido' });
    if (!fecha) return res.status(400).json({ message: 'Falta parámetro: fecha (YYYY-MM-DD)' });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return res.status(400).json({ message: 'Formato de fecha inválido. Use YYYY-MM-DD' });

    const em = orm.em.fork();
    const data = await em.find(
      DiscapProgramado as any,
      { chofer: choferId, fecha } as any,
      { orderBy: { horario: 'asc', numero_recorrido: 'asc' } as any } as any
    );

    return res.json({ data });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error al obtener discapacitados programados', error: error?.message || String(error) });
  }
}

async function findMine(req: Request, res: Response) {
  try {
    const user = (req as any).user as { id: number; rol: string } | undefined;
    if (!user?.id) return res.status(401).json({ message: 'No autenticado' });

    const fecha = String(req.query.fecha || '').trim();
    if (!fecha) return res.status(400).json({ message: 'Falta parámetro: fecha (YYYY-MM-DD)' });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return res.status(400).json({ message: 'Formato de fecha inválido. Use YYYY-MM-DD' });

    const em = orm.em.fork();
    const data = await em.find(
      DiscapProgramado as any,
      { chofer: user.id, fecha } as any,
      { orderBy: { horario: 'asc', numero_recorrido: 'asc' } as any } as any
    );

    return res.json({ data });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error al obtener discapacitados programados', error: error?.message || String(error) });
  }
}

async function upsert(req: Request, res: Response) {
  try {
    const em = orm.em.fork();
    const input = (req.body as any).sanitizedInput || req.body;

    const choferId = Number(input.chofer_id);
    const fecha = String(input.fecha || '').trim();
    const horario = String(input.horario || '').trim();
    const numero_recorrido = typeof input.numero_recorrido === 'string' ? input.numero_recorrido.trim() : '';

    if (!Number.isFinite(choferId) || choferId <= 0) return res.status(400).json({ message: 'Falta chofer_id válido' });
    if (!fecha) return res.status(400).json({ message: 'Falta fecha (YYYY-MM-DD)' });
    if (!horario) return res.status(400).json({ message: 'Falta horario (HH:mm)' });
    if (!numero_recorrido) return res.status(400).json({ message: 'Falta numero_recorrido' });

    const { normalizedHorario } = assertFutureBusinessDateTimeOrThrow(fecha, horario);

    const payload = {
      chofer: choferId,
      fecha,
      horario: normalizedHorario,
      numero_recorrido,
      discap_nombre: typeof input.discap_nombre === 'string' ? input.discap_nombre.trim() : undefined,
      discap_apellido: typeof input.discap_apellido === 'string' ? input.discap_apellido.trim() : undefined,
      discap_dni: typeof input.discap_dni === 'string' ? input.discap_dni.trim() : undefined,
    } as any;

    const existing = await em.findOne(DiscapProgramado as any, {
      chofer: choferId,
      fecha,
      horario: normalizedHorario,
      numero_recorrido,
    } as any);

    if (existing) {
      em.assign(existing, payload);
      await em.flush();
      return res.status(200).json({ message: 'Asignación actualizada', data: existing });
    }

    const created = em.create(DiscapProgramado as any, payload);
    await em.flush();
    return res.status(201).json({ message: 'Asignación creada', data: created });
  } catch (error: any) {
    const status = Number(error?.status) || 500;
    return res.status(status).json({ message: error?.message || 'Error al guardar asignación', error: error?.message || String(error) });
  }
}

async function update(req: Request, res: Response) {
  try {
    const em = orm.em.fork();
    const id = Number.parseInt(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ message: 'ID inválido' });

    const item = await em.findOne(DiscapProgramado as any, { id } as any);
    if (!item) return res.status(404).json({ message: 'No encontrado' });

    const input = (req.body as any).sanitizedInput || req.body;

    const choferId = input.chofer_id != null ? Number(input.chofer_id) : (item as any).chofer?.id;
    const fecha = typeof input.fecha === 'string' ? input.fecha.trim() : (item as any).fecha;
    const horario = typeof input.horario === 'string' ? input.horario.trim() : (item as any).horario;
    const numero_recorrido = typeof input.numero_recorrido === 'string' ? input.numero_recorrido.trim() : (item as any).numero_recorrido;

    if (!Number.isFinite(choferId) || choferId <= 0) return res.status(400).json({ message: 'chofer_id inválido' });
    if (!fecha) return res.status(400).json({ message: 'fecha inválida' });
    if (!horario) return res.status(400).json({ message: 'horario inválido' });
    if (!numero_recorrido) return res.status(400).json({ message: 'numero_recorrido inválido' });

    const { normalizedHorario } = assertFutureBusinessDateTimeOrThrow(fecha, horario);

    const payload = {
      chofer: choferId,
      fecha,
      horario: normalizedHorario,
      numero_recorrido,
      discap_nombre: typeof input.discap_nombre === 'string' ? input.discap_nombre.trim() : (item as any).discap_nombre,
      discap_apellido: typeof input.discap_apellido === 'string' ? input.discap_apellido.trim() : (item as any).discap_apellido,
      discap_dni: typeof input.discap_dni === 'string' ? input.discap_dni.trim() : (item as any).discap_dni,
    } as any;

    em.assign(item, payload);
    await em.flush();
    return res.status(200).json({ message: 'Asignación actualizada', data: item });
  } catch (error: any) {
    const status = Number(error?.status) || 500;
    return res.status(status).json({ message: error?.message || 'Error al actualizar asignación', error: error?.message || String(error) });
  }
}

async function remove(req: Request, res: Response) {
  try {
    const em = orm.em.fork();
    const id = Number.parseInt(req.params.id);
    const item = await em.findOne(DiscapProgramado as any, { id } as any);
    if (!item) return res.status(404).send({ message: 'No encontrado' });
    await em.removeAndFlush(item);
    return res.status(200).send({ message: 'Asignación borrada', data: item });
  } catch (error: any) {
    return res.status(500).send({ message: 'Error al borrar asignación', error: error?.message || String(error) });
  }
}

export { findByChoferFecha, findMine, upsert, update, remove };
