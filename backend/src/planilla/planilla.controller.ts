import { Request, Response } from 'express';
import { orm } from '../shared/bdd/orm.js';
import { Planilla } from './planilla.entity.js';
import { Recorrido } from '../recorrido/recorrido.entity.js';
import { PlanillaEfectivo } from '../planilla-efectivo/planilla-efectivo.entity.js';
import { PlanillaStatus } from './planilla.entity.js';
import { Usuario } from '../usuario/usuario.entity.js';
import { sendPlanillaSubmittedEmail } from '../notifications/planillaEmail.js';

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

function formatDateISOInTimeZone(d: Date, timeZone: string) {
  const dtf = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' });
  return dtf.format(d); // YYYY-MM-DD
}

function parseLocalDayRange(fechaISO: string): { start: Date; end: Date } | null {
  // Espera 'YYYY-MM-DD' (día del negocio, no el del server)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaISO)) return null;
  const [yyyyS, mmS, ddS] = fechaISO.split('-');
  const year = Number(yyyyS);
  const month = Number(mmS);
  const day = Number(ddS);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;

  const start = zonedTimeToUtc({ year, month, day, hour: 0, minute: 0, second: 0 }, BUSINESS_TIME_ZONE);

  // next day parts (in UTC midday to avoid DST edge cases)
  const tmp = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  tmp.setUTCDate(tmp.getUTCDate() + 1);
  const nextY = tmp.getUTCFullYear();
  const nextM = tmp.getUTCMonth() + 1;
  const nextD = tmp.getUTCDate();
  const end = zonedTimeToUtc({ year: nextY, month: nextM, day: nextD, hour: 0, minute: 0, second: 0 }, BUSINESS_TIME_ZONE);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  return { start, end };
}

async function totalDia(req: Request, res: Response) {
  try {
    const em = orm.em.fork();
    const fecha = String(req.query.fecha || '');
    const choferIdRaw = req.query.choferId;
    const choferId = typeof choferIdRaw === 'undefined' || choferIdRaw === null ? null : Number(choferIdRaw);
    if (!fecha) {
      return res.status(400).json({ message: 'Falta parámetro: fecha (YYYY-MM-DD)' });
    }

    if (choferIdRaw && !Number.isFinite(choferId)) {
      return res.status(400).json({ message: 'Parámetro choferId inválido' });
    }

    // `fecha` llega como 'YYYY-MM-DD' desde el input type=date.
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      return res.status(400).json({ message: 'Formato de fecha inválido. Use YYYY-MM-DD' });
    }

    const range = parseLocalDayRange(fecha);
    if (!range) {
      return res.status(400).json({ message: 'Formato de fecha inválido. Use YYYY-MM-DD' });
    }

    const hasChofer = Number.isFinite(choferId as number);
    const sql = hasChofer
      ? 'select coalesce(sum(total_recorrido), 0) as total from planilla where fecha_hora_planilla >= ? and fecha_hora_planilla < ? and chofer_id = ?'
      : 'select coalesce(sum(total_recorrido), 0) as total from planilla where fecha_hora_planilla >= ? and fecha_hora_planilla < ?';

    const params = hasChofer ? [range.start, range.end, choferId] : [range.start, range.end];
    const result = await em.getConnection().execute<any>(sql, params);
    const rows = Array.isArray(result) && Array.isArray(result[0]) ? result[0] : result;
    const total = rows?.[0]?.total ?? 0;
    return res.json({ data: { total } });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error al calcular total del día', error: error?.message || String(error) });
  }
}

function formatLocalDateISO(d: Date) {
  return formatDateISOInTimeZone(d, BUSINESS_TIME_ZONE);
}

function toNumber(v: unknown) {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

type RecorridoInput = {
  horario?: string;
  numero_recorrido?: string;
  importe: number;
};

type EfectivoInput = {
  denominacion: number;
  cantidad: number;
};

async function submitByChofer(req: Request, res: Response) {
  try {
    const user = (req as any).user as { id: number; rol: string } | undefined;
    if (!user?.id) return res.status(401).json({ message: 'No autenticado' });

    const body = req.body || {};
    const numero_coche = String(body.numero_coche ?? body.coche ?? '').trim();
    if (!numero_coche) {
      return res.status(400).json({ message: 'Falta numero_coche' });
    }

    const fechaISO = typeof body.fecha === 'string' && body.fecha ? String(body.fecha) : formatLocalDateISO(new Date());
    const range = parseLocalDayRange(fechaISO);
    if (!range) {
      return res.status(400).json({ message: 'Formato de fecha inválido. Use YYYY-MM-DD' });
    }

    const recorridosRaw = Array.isArray(body.recorridos) ? body.recorridos : [];
    const recorridos: RecorridoInput[] = recorridosRaw
      .map((r: any) => ({
        horario: typeof r?.horario === 'string' ? r.horario.trim() : undefined,
        numero_recorrido: typeof r?.numero_recorrido === 'string' ? r.numero_recorrido.trim() : undefined,
        importe: toNumber(r?.importe),
      }))
      .filter((r: RecorridoInput) => r.importe > 0 && Boolean(r.horario) && Boolean(r.numero_recorrido));

    if (recorridos.length === 0) {
      return res.status(400).json({ message: 'La planilla debe tener al menos un recorrido completo (horario, recorrido e importe)' });
    }

    const efectivosRaw = Array.isArray(body.efectivos) ? body.efectivos : [];
    const efectivos: EfectivoInput[] = efectivosRaw
      .map((e: any) => ({
        denominacion: Math.trunc(toNumber(e?.denominacion)),
        cantidad: Math.trunc(toNumber(e?.cantidad)),
      }))
      .filter((e: EfectivoInput) => e.denominacion > 0 && e.cantidad > 0);

    const total_recorrido = recorridos.reduce((sum, r) => sum + toNumber(r.importe), 0);
    const total_efectivo = efectivos.reduce((sum, e) => sum + e.denominacion * e.cantidad, 0);
    const diferencia = total_recorrido - total_efectivo;

    const em = orm.em.fork();

    const created = await em.transactional(async (tem) => {
      // Permitir múltiples planillas por día.
      // Para "hoy", guardamos el timestamp real (así se pueden ordenar por hora).
      // Para fechas manuales, usamos un horario fijo para evitar problemas de zona horaria.
      const todayISO = formatLocalDateISO(new Date());
      let fecha_hora_planilla: Date;
      if (fechaISO === todayISO) {
        fecha_hora_planilla = new Date();
      } else {
        const [yyyyS, mmS, ddS] = fechaISO.split('-');
        fecha_hora_planilla = zonedTimeToUtc(
          {
            year: Number(yyyyS),
            month: Number(mmS),
            day: Number(ddS),
            hour: 12,
            minute: 0,
            second: 0,
          },
          BUSINESS_TIME_ZONE
        );
      }
      const planilla = tem.create(Planilla as any, {
        chofer: user.id,
        numero_coche,
        fecha_hora_planilla,
        total_recorrido,
        total_efectivo,
        diferencia,
        status: PlanillaStatus.ENVIADO,
        comentarios: typeof body.comentarios === 'string' ? body.comentarios.trim() : undefined,
      });

      for (const r of recorridos) {
        tem.create(Recorrido as any, {
          planilla,
          horario: r.horario || null,
          numero_recorrido: r.numero_recorrido || null,
          importe: toNumber(r.importe),
        });
      }

      for (const e of efectivos) {
        tem.create(PlanillaEfectivo as any, {
          planilla,
          denominacion: e.denominacion,
          cantidad: e.cantidad,
          subtotal: e.denominacion * e.cantidad,
        });
      }

      await tem.flush();
      return planilla as any;
    });

    // Enviar email al jefe (si está configurado). No bloquea la respuesta.
    setImmediate(() => {
      void (async () => {
        try {
          const chofer = await em.findOne(
            Usuario as any,
            { id: user.id } as any,
            { fields: ['id', 'usuario', 'nombre', 'apellido'] as any } as any
          );

          await sendPlanillaSubmittedEmail({
            planillaId: Number((created as any).id),
            fechaISO,
            numeroCoche: numero_coche,
            chofer: {
              id: user.id,
              usuario: (chofer as any)?.usuario,
              nombre: (chofer as any)?.nombre,
              apellido: (chofer as any)?.apellido,
            },
            totalRecorrido: total_recorrido,
            totalEfectivo: total_efectivo,
            diferencia,
            comentarios: typeof body.comentarios === 'string' ? body.comentarios.trim() : null,
          });
        } catch (err: any) {
          console.error('[mail] Error preparando email de planilla:', err?.message || err);
        }
      })();
    });

    return res.status(201).json({
      message: 'Planilla enviada',
      data: {
        id: (created as any).id,
        total_recorrido,
        total_efectivo,
        diferencia,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error al enviar planilla', error: error?.message || error });
  }
}

async function findByChoferFecha(req: Request, res: Response) {
  try {
    const em = orm.em.fork();
    const choferId = Number.parseInt(String(req.query.choferId || ''));
    const fecha = String(req.query.fecha || '');

    if (!choferId || !fecha) {
      return res.status(400).json({ message: 'Faltan parámetros: choferId y fecha (YYYY-MM-DD)' });
    }

    const range = parseLocalDayRange(fecha);
    if (!range) {
      return res.status(400).json({ message: 'Formato de fecha inválido. Use YYYY-MM-DD' });
    }

    const items = await em.find(
      Planilla as any,
      {
        chofer: choferId,
        fecha_hora_planilla: { $gte: range.start, $lt: range.end },
      } as any,
      { populate: ['chofer', 'recorridos', 'efectivos'] as any, orderBy: { fecha_hora_planilla: 'DESC' } as any } as any
    );

    return res.json({ data: items || [] });
  } catch (error) {
    return res.status(500).json({ message: 'Error al buscar planilla', error: (error as any)?.message || String(error) });
  }
}

async function findAll(req: Request, res: Response) {
  try {
    const em = orm.em.fork();
    const user = (req as any).user as { id: number; rol: string } | undefined;
    if (!user?.id) return res.status(401).json({ message: 'No autenticado' });

    const where = user.rol === 'admin' ? {} : { chofer: user.id };
    const data = await em.find(Planilla as any, where, {
      orderBy: { fecha_hora_planilla: 'DESC' },
    } as any);
    res.json({ data });
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener planillas', error: (error as any)?.message || String(error) });
  }
}

async function findOne(req: Request, res: Response) {
  try {
    const em = orm.em.fork();
    const user = (req as any).user as { id: number; rol: string } | undefined;
    if (!user?.id) return res.status(401).json({ message: 'No autenticado' });

    const id = Number.parseInt(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ message: 'ID inválido' });
    const where = user.rol === 'admin' ? { id } : { id, chofer: user.id };
    const item = await em.findOne(Planilla as any, where);
    if (!item) return res.status(404).send({ message: 'No encontrado' });
    res.status(200).json({ message: 'Planilla encontrada', data: item });
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener planilla', error: (error as any)?.message || String(error) });
  }
}

async function add(req: Request, res: Response) {
  try {
    const em = orm.em.fork();
    const input = (req.body as any).sanitizedInput || req.body;
    const nuevo = em.create(Planilla as any, input);
    await em.flush();
    res.status(201).json({ message: 'Planilla creada', data: nuevo });
  } catch (error: any) {
    res.status(500).json({ message: 'Error al crear planilla', error: error.message });
  }
}

async function update(req: Request, res: Response) {
  try {
    const em = orm.em.fork();
    const id = Number.parseInt(req.params.id);
    const item = await em.findOne(Planilla as any, { id });
    if (!item) return res.status(404).send({ message: 'No encontrada' });
    em.assign(item, (req.body as any).sanitizedInput || req.body);
    await em.flush();
    res.status(200).send({ message: 'Planilla actualizada', data: item });
  } catch (error) {
    res.status(500).send({ message: 'Error al actualizar planilla', error: (error as any)?.message || String(error) });
  }
}

async function remove(req: Request, res: Response) {
  try {
    const em = orm.em.fork();
    const id = Number.parseInt(req.params.id);
    const item = await em.findOne(Planilla as any, { id });
    if (!item) return res.status(404).send({ message: 'No encontrada' });

    await em.transactional(async (tem) => {
      // Delete children first to avoid FK constraint errors (DB-level cascades may not exist).
      await tem.nativeDelete(Recorrido as any, { planilla: id } as any);
      await tem.nativeDelete(PlanillaEfectivo as any, { planilla: id } as any);
      await tem.nativeDelete(Planilla as any, { id } as any);
    });

    // Return minimal payload (avoid serializing ORM entities).
    res.status(200).send({ message: 'Planilla borrada', data: { id } });
  } catch (error) {
    res.status(500).send({ message: 'Error al borrar planilla', error: (error as any)?.message || String(error) });
  }
}

export { findAll, findOne, add, update, remove, findByChoferFecha }

export { submitByChofer };

export { totalDia };