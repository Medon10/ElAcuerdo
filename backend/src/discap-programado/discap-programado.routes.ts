import { Router } from 'express';
import { verifyToken } from '../shared/middleware/verifytoken.js';
import { verifyAdmin } from '../shared/middleware/verifyAdmin.js';
import { sanitizeDiscapProgramadoInput } from '../shared/middleware/sanitizeDiscapProgramado.js';
import { findByChoferFecha, findMine, upsert, update, remove } from './discap-programado.controller.js';

export const discapProgramadoRouter = Router();

// Chofer: ver sus asignaciones del día (o fecha)
discapProgramadoRouter.get('/mis', verifyToken, findMine);

// Admin: ver asignaciones por chofer y fecha
discapProgramadoRouter.get('/por-chofer-fecha', verifyToken, verifyAdmin, findByChoferFecha);

// Admin: crear/actualizar por clave (chofer+fecha+horario+recorrido)
discapProgramadoRouter.post('/', verifyToken, verifyAdmin, sanitizeDiscapProgramadoInput, upsert);

// Admin: actualizar por id (permite corregir horario/recorrido también)
discapProgramadoRouter.patch('/:id', verifyToken, verifyAdmin, sanitizeDiscapProgramadoInput, update);
discapProgramadoRouter.put('/:id', verifyToken, verifyAdmin, sanitizeDiscapProgramadoInput, update);

// Admin: borrar

discapProgramadoRouter.delete('/:id', verifyToken, verifyAdmin, remove);

export default discapProgramadoRouter;
