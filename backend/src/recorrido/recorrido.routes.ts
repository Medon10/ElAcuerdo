import { Router } from 'express';
import { findAll, findOne, add, update, remove } from './recorrido.controller.js';
import { sanitizeRecorridoInput } from '../shared/middleware/sanitizeRecorrido.js';
import { verifyToken } from '../shared/middleware/verifytoken.js';
import { verifyAdmin } from '../shared/middleware/verifyAdmin.js';

export const recorridoRouter = Router();

recorridoRouter.get('/', findAll);
recorridoRouter.get('/:id', findOne);

recorridoRouter.post('/', verifyToken, verifyAdmin, sanitizeRecorridoInput, add);
recorridoRouter.put('/:id', verifyToken, verifyAdmin, sanitizeRecorridoInput, update);
recorridoRouter.patch('/:id', verifyToken, verifyAdmin, sanitizeRecorridoInput, update);
recorridoRouter.delete('/:id', verifyToken, verifyAdmin, remove);

export default recorridoRouter;

