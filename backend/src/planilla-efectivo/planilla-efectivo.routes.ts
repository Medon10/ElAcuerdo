import { Router } from 'express';
import { findAll, findOne, add, update, remove } from './planilla-efectivo.controller.js';
import { sanitizePlanillaEfectivoInput } from '../shared/middleware/sanitizePlanillaEfectivo.js';
import { verifyToken } from '../shared/middleware/verifytoken.js';
import { verifyAdmin } from '../shared/middleware/verifyAdmin.js';

export const planillaEfectivoRouter = Router();

planillaEfectivoRouter.get('/', findAll);
planillaEfectivoRouter.get('/:id', findOne);

planillaEfectivoRouter.post('/', verifyToken, verifyAdmin, sanitizePlanillaEfectivoInput, add);
planillaEfectivoRouter.put('/:id', verifyToken, verifyAdmin, sanitizePlanillaEfectivoInput, update);
planillaEfectivoRouter.patch('/:id', verifyToken, verifyAdmin, sanitizePlanillaEfectivoInput, update);
planillaEfectivoRouter.delete('/:id', verifyToken, verifyAdmin, remove);

export default planillaEfectivoRouter;

