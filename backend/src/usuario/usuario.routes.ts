import { Router } from 'express';
import { findAll, findOne, add, update, remove, listChoferes } from './usuario.controller.js';
import { sanitizeUsuarioInput } from '../shared/middleware/sanitizeUsuario.js';
import { verifyToken } from '../shared/middleware/verifytoken.js';
import { verifyAdmin } from '../shared/middleware/verifyAdmin.js';

export const usuarioRouter = Router();

// Para dashboard admin: listado acotado de choferes
usuarioRouter.get('/choferes', verifyToken, verifyAdmin, listChoferes);

usuarioRouter.get('/', findAll);
usuarioRouter.get('/:id', findOne);

usuarioRouter.post('/', verifyToken, verifyAdmin, sanitizeUsuarioInput, add);
usuarioRouter.put('/:id', verifyToken, verifyAdmin, sanitizeUsuarioInput, update);
usuarioRouter.patch('/:id', verifyToken, verifyAdmin, sanitizeUsuarioInput, update);
usuarioRouter.delete('/:id', verifyToken, verifyAdmin, remove);

export default usuarioRouter;

