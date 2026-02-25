import { Router } from 'express';
import { findAll, findOne, add, update, remove, findByChoferFecha, submitByChofer, totalDia, totalMes, resumenDia } from './planilla.controller.js';
import { sanitizePlanillaInput } from '../shared/middleware/sanitizePlanilla.js';
import { verifyToken } from '../shared/middleware/verifytoken.js';
import { verifyAdmin } from '../shared/middleware/verifyAdmin.js';

export const planillaRouter = Router();

// Para dashboard admin: buscar planilla de un chofer en una fecha (YYYY-MM-DD)
planillaRouter.get('/por-chofer-fecha', verifyToken, verifyAdmin, findByChoferFecha);

// Para dashboard admin: total recaudado del día (YYYY-MM-DD)
planillaRouter.get('/total-dia', verifyToken, verifyAdmin, totalDia);

// Para dashboard admin: total recaudado del mes (YYYY-MM)
planillaRouter.get('/total-mes', verifyToken, verifyAdmin, totalMes);

// Para dashboard admin: resumen de planillas del día (quién envió)
planillaRouter.get('/resumen-dia', verifyToken, verifyAdmin, resumenDia);

// Para chofer: enviar planilla del día (crea planilla + recorridos + efectivo)
planillaRouter.post('/submit', verifyToken, submitByChofer);

planillaRouter.get('/', verifyToken, findAll);
planillaRouter.get('/:id', verifyToken, findOne);

planillaRouter.post('/', verifyToken, verifyAdmin, sanitizePlanillaInput, add);
planillaRouter.put('/:id', verifyToken, verifyAdmin, sanitizePlanillaInput, update);
planillaRouter.patch('/:id', verifyToken, verifyAdmin, sanitizePlanillaInput, update);
planillaRouter.delete('/:id', verifyToken, verifyAdmin, remove);

export default planillaRouter;

