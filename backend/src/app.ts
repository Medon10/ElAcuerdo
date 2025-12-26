import 'reflect-metadata';
import './env.js';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { orm, syncSchema } from './shared/bdd/orm.js';
import { RequestContext } from '@mikro-orm/core';

import { planillaRouter } from './planilla/planilla.routes.js';
import { recorridoRouter } from './recorrido/recorrido.routes.js';
import { planillaEfectivoRouter } from './planilla-efectivo/planilla-efectivo.routes.js';
import authRouter from './shared/middleware/auth.routes.js';
import { usuarioRouter } from './usuario/usuario.routes.js';

const app = express();
const PORT = 3000;

app.disable('x-powered-by');

app.use(cookieParser());

// CORS configuration.
// - In prod: set FRONTEND_ORIGINS (comma separated) to the exact allowed origins.
// - In dev: allow localhost / 127.0.0.1 on any port (Vite can change ports).
const defaultOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173'];
const allowedOrigins = (process.env.FRONTEND_ORIGINS || defaultOrigins.join(','))
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

function isLocalDevOrigin(origin: string) {
  try {
    const url = new URL(origin);
    return (
      (url.protocol === 'http:' || url.protocol === 'https:') &&
      (url.hostname === 'localhost' || url.hostname === '127.0.0.1')
    );
  } catch {
    return false;
  }
}

app.use(cors({
  origin: (origin, callback) => {
    // Allow server-to-server or curl (no origin)
    if (!origin) return callback(null, true);

    // Dev convenience: allow any localhost origin
    if (isLocalDevOrigin(origin)) return callback(null, true);

    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`Not allowed by CORS: ${origin}`));
  },
  credentials: true,
}));

app.use(express.json());

app.use((req, res, next) => {
  RequestContext.create(orm.em, next);
});


app.use('/auth', authRouter);
app.use('/usuarios', usuarioRouter);
app.use('/planillas', planillaRouter);
app.use('/recorridos', recorridoRouter);
app.use('/planilla-efectivo', planillaEfectivoRouter);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicPath = path.join(__dirname, '..', 'public');
app.use('/uploads', express.static(path.join(publicPath, 'uploads')));


app.use((req, res) => {
  res.status(404).json({ message: 'Recurso no encontrado' });
});

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || 'Error interno del servidor' });
});


syncSchema().then(() => {
  app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
  });
}).catch((error) => {
  console.error('Error al iniciar el servidor:', error);
});
