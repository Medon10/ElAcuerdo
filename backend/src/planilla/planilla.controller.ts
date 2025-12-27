import { Request, Response } from 'express';
import { orm } from '../shared/bdd/orm.js';
import { Planilla } from './planilla.entity.js';
import { Recorrido } from '../recorrido/recorrido.entity.js';
import { PlanillaEfectivo } from '../planilla-efectivo/planilla-efectivo.entity.js';
import { PlanillaStatus } from './planilla.entity.js';
import { Usuario } from '../usuario/usuario.entity.js';
import { sendPlanillaSubmittedEmail } from '../notifications/planillaEmail.js';

function parseLocalDayRange(fechaISO: string): { start: Date; end: Date } | null {
  // Espera 'YYYY-MM-DD'
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaISO)) return null;
  const start = new Date(`${fechaISO}T00:00:00`);
  if (Number.isNaN(start.getTime())) return null;
  const end = new Date(start);
  end.setDate(start.getDate() + 1);
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

    // Usar DATE(...) para evitar problemas de zona horaria/rangos.
    // `fecha` llega como 'YYYY-MM-DD' desde el input type=date.
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      return res.status(400).json({ message: 'Formato de fecha inválido. Use YYYY-MM-DD' });
    }

    const hasChofer = Number.isFinite(choferId as number);
    const sql = hasChofer
      ? 'select coalesce(sum(total_recorrido), 0) as total from planilla where date(fecha_hora_planilla) = ? and chofer_id = ?'
      : 'select coalesce(sum(total_recorrido), 0) as total from planilla where date(fecha_hora_planilla) = ?';

    const params = hasChofer ? [fecha, choferId] : [fecha];
    const result = await em.getConnection().execute<any>(sql, params);
    const rows = Array.isArray(result) && Array.isArray(result[0]) ? result[0] : result;
    const total = rows?.[0]?.total ?? 0;
    return res.json({ data: { total } });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error al calcular total del día', error: error?.message || String(error) });
  }
}

function formatLocalDateISO(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
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
      .filter((r: RecorridoInput) => r.importe > 0);

    if (recorridos.length === 0) {
      return res.status(400).json({ message: 'La planilla debe tener al menos un recorrido con importe' });
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

    const existing = await em.findOne(
      Planilla as any,
      {
        chofer: user.id,
        fecha_hora_planilla: { $gte: range.start, $lt: range.end },
      } as any
    );

    if (existing) {
      return res.status(409).json({ message: 'Ya existe una planilla para ese chofer y esa fecha' });
    }

    const created = await em.transactional(async (tem) => {
      const fecha_hora_planilla = new Date(`${fechaISO}T12:00:00`);
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

    const item = await em.findOne(
      Planilla as any,
      {
        chofer: choferId,
        fecha_hora_planilla: { $gte: range.start, $lt: range.end },
      } as any,
      { populate: ['chofer', 'recorridos', 'efectivos'] as any, orderBy: { fecha_hora_planilla: 'DESC' } as any } as any
    );

    return res.json({ data: item || null });
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