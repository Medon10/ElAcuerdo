import { Request, Response } from 'express';
import { orm } from '../shared/bdd/orm.js';
import { Usuario } from './usuario.entity.js';

async function listChoferes(req: Request, res: Response) {
  try {
    const em = orm.em.fork();
    // Devuelve solo choferes (no admin) y campos mínimos para selector.
    const data = await em.find(
      Usuario as any,
      { rol: { $ne: 'admin' } } as any,
      { fields: ['id', 'usuario', 'nombre', 'apellido', 'rol'] as any, orderBy: { nombre: 'ASC' } as any } as any
    );
    res.json({ data });
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener choferes', error });
  }
}

async function findAll(req: Request, res: Response) {
  try {
    const em = orm.em.fork();
    const data = await em.find(Usuario as any, {});
    res.json({ data });
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener usuarios', error });
  }
}

async function findOne(req: Request, res: Response) {
  try {
    const em = orm.em.fork();
    const id = Number.parseInt(req.params.id);
    const item = await em.findOne(Usuario as any, { id });
    if (!item) return res.status(404).send({ message: 'No encontrado' });
    res.status(200).json({ message: 'Usuario encontrado', data: item });
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener usuario', error });
  }
}

async function add(req: Request, res: Response) {
  try {
    const em = orm.em.fork();
    const input = (req.body as any).sanitizedInput || req.body;
    const nuevo = em.create(Usuario as any, input);
    await em.flush();
    res.status(201).json({ message: 'Usuario creado', data: nuevo });
  } catch (error: any) {
    res.status(500).json({ message: 'Error al crear usuario', error: error.message });
  }
}

async function update(req: Request, res: Response) {
  try {
    const em = orm.em.fork();
    const id = Number.parseInt(req.params.id);
    const item = await em.findOne(Usuario as any, { id });
    if (!item) return res.status(404).send({ message: 'No encontrado' });
    em.assign(item, (req.body as any).sanitizedInput || req.body);
    await em.flush();
    res.status(200).send({ message: 'Usuario actualizado', data: item });
  } catch (error) {
    res.status(500).send({ message: 'Error al actualizar usuario', error });
  }
}

async function remove(req: Request, res: Response) {
  try {
    const em = orm.em.fork();
    const id = Number.parseInt(req.params.id);
    const item = await em.findOne(Usuario as any, { id });
    if (!item) return res.status(404).send({ message: 'No encontrado' });
    await em.removeAndFlush(item);
    res.status(200).send({ message: 'Usuario borrado', data: item });
  } catch (error) {
    res.status(500).send({ message: 'Error al borrar usuario', error });
  }
}

export { findAll, findOne, add, update, remove, listChoferes }