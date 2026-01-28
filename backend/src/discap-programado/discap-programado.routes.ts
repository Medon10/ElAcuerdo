import { Router } from 'express';
import { verifyToken } from '../shared/middleware/verifytoken.js';
import { verifyAdmin } from '../shared/middleware/verifyAdmin.js';
import { sanitizeDiscapProgramadoInput } from '../shared/middleware/sanitizeDiscapProgramado.js';
import { findByFecha, upsert, update, remove } from './discap-programado.controller.js';

export const discapProgramadoRouter = Router();

// Autenticado (chofer/admin): ver asignaciones por fecha
discapProgramadoRouter.get('/por-fecha', verifyToken, findByFecha);

// Admin: crear/actualizar por clave (fecha+horario+recorrido)
discapProgramadoRouter.post('/', verifyToken, verifyAdmin, sanitizeDiscapProgramadoInput, upsert);

// Admin: actualizar por id (permite corregir horario/recorrido también)
discapProgramadoRouter.patch('/:id', verifyToken, verifyAdmin, sanitizeDiscapProgramadoInput, update);
discapProgramadoRouter.put('/:id', verifyToken, verifyAdmin, sanitizeDiscapProgramadoInput, update);

// Admin: borrar

discapProgramadoRouter.delete('/:id', verifyToken, verifyAdmin, remove);

export default discapProgramadoRouter;
