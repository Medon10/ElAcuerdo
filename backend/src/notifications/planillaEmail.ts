import nodemailer from 'nodemailer';
import sgMail from '@sendgrid/mail';

export type PlanillaEmailPayload = {
  planillaId: number;
  fechaISO: string;
  numeroCoche: string;
  chofer: {
    id: number;
    usuario?: string | null;
    nombre?: string | null;
    apellido?: string | null;
  };
  totalRecorrido: number;
  totalEfectivo: number;
  diferencia: number;
  comentarios?: string | null;
};

let cachedTransport: nodemailer.Transporter | null = null;
let sendgridConfigured = false;

function getTransporter() {
  if (cachedTransport) return cachedTransport;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 0);
  const secureEnv = String(process.env.SMTP_SECURE || '').toLowerCase();
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  // Sensible defaults for Gmail if only user/pass are set.
  const resolvedHost = host || (user?.includes('@gmail.com') ? 'smtp.gmail.com' : undefined);
  const resolvedPort = Number.isFinite(port) && port > 0 ? port : resolvedHost === 'smtp.gmail.com' ? 465 : 587;
  const resolvedSecure = secureEnv ? secureEnv === 'true' : resolvedPort === 465;

  if (!resolvedHost || !user || !pass) {
    throw new Error('SMTP no configurado: falta SMTP_HOST/SMTP_USER/SMTP_PASS');
  }

  cachedTransport = nodemailer.createTransport({
    host: resolvedHost,
    port: resolvedPort,
    secure: resolvedSecure,
    auth: { user, pass },
  });

  return cachedTransport;
}

function ensureSendgrid() {
  if (sendgridConfigured) return;
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) throw new Error('SENDGRID_API_KEY no configurado');
  sgMail.setApiKey(apiKey);
  sendgridConfigured = true;
}

function getDiferenciaEstado(diferencia: number) {
  if (diferencia === 0) return 'CUADRA';
  // diferencia = total_recorrido - total_efectivo
  return diferencia > 0 ? 'FALTAN' : 'SOBRA';
}

function formatMoneyARS(value: number) {
  try {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value);
  } catch {
    return `$${value.toFixed(2)}`;
  }
}

export async function sendPlanillaSubmittedEmail(payload: PlanillaEmailPayload) {
  const enabled = String(process.env.MAIL_ENABLED || 'true').toLowerCase() !== 'false';
  if (!enabled) return;

  const to = (process.env.MAIL_TO || '').trim();
  if (!to) {
    console.warn('[mail] MAIL_TO no configurado; no se envía email');
    return;
  }

  const from = (process.env.MAIL_FROM || process.env.SMTP_USER || '').trim();
  if (!from) {
    console.warn('[mail] MAIL_FROM/SMTP_USER no configurado; no se envía email');
    return;
  }

  const choferNombre = [payload.chofer.nombre, payload.chofer.apellido].filter(Boolean).join(' ').trim();
  const choferLabel = choferNombre || payload.chofer.usuario || `Chofer #${payload.chofer.id}`;

  const estado = getDiferenciaEstado(payload.diferencia);
  const subject = `Nueva planilla enviada - ${choferLabel} - ${payload.fechaISO} (${estado})`;

  const text = [
    'Se cargó una nueva planilla.',
    '',
    `Planilla ID: ${payload.planillaId}`,
    `Fecha: ${payload.fechaISO}`,
    `Chofer: ${choferLabel}`,
    `Coche: ${payload.numeroCoche}`,
    '',
    `Total recorridos: ${formatMoneyARS(payload.totalRecorrido)}`,
    `Total efectivo:  ${formatMoneyARS(payload.totalEfectivo)}`,
    `Diferencia:     ${formatMoneyARS(payload.diferencia)} (${estado})`,
    payload.comentarios ? '' : null,
    payload.comentarios ? `Comentarios: ${payload.comentarios}` : null,
  ]
    .filter((l) => l !== null)
    .join('\n');

  try {
    // Prefer SendGrid API (HTTP) over everything else if configured
    if (process.env.SENDGRID_API_KEY) {
      ensureSendgrid();
      await sgMail.send({
        from,
        to,
        subject,
        text,
      });
      console.log('[mail] Email enviado via SendGrid a', to, 'planillaId=', payload.planillaId);
      return;
    }

    const transporter = getTransporter();
    await transporter.sendMail({
      from,
      to,
      subject,
      text,
    });
    console.log('[mail] Email enviado via SMTP a', to, 'planillaId=', payload.planillaId);
  } catch (err: any) {
    console.error('[mail] Error enviando email:', err?.message || err);
  }
}
