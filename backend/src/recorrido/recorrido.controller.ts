import { Request, Response } from 'express';
import { orm } from '../shared/bdd/orm.js';
import { Recorrido } from './recorrido.entity.js';

async function findAll(req: Request, res: Response) {
  try {
    const em = orm.em.fork();
    const data = await em.find(Recorrido as any, {});
    res.json({ data });
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener recorridos', error });
  }
}

async function findOne(req: Request, res: Response) {
  try {
    const em = orm.em.fork();
    const id = Number.parseInt(req.params.id);
    const item = await em.findOne(Recorrido as any, { id });
    if (!item) return res.status(404).send({ message: 'No encontrado' });
    res.status(200).json({ message: 'Recorrido encontrado', data: item });
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener recorrido', error });
  }
}

async function add(req: Request, res: Response) {
  try {
    const em = orm.em.fork();
    const input = (req.body as any).sanitizedInput || req.body;
    const nuevo = em.create(Recorrido as any, input);
    await em.flush();
    res.status(201).json({ message: 'Recorrido creado', data: nuevo });
  } catch (error: any) {
    res.status(500).json({ message: 'Error al crear recorrido', error: error.message });
  }
}

async function update(req: Request, res: Response) {
  try {
    const em = orm.em.fork();
    const id = Number.parseInt(req.params.id);
    const item = await em.findOne(Recorrido as any, { id });
    if (!item) return res.status(404).send({ message: 'No encontrado' });
    em.assign(item, (req.body as any).sanitizedInput || req.body);
    await em.flush();
    res.status(200).send({ message: 'Recorrido actualizado', data: item });
  } catch (error) {
    res.status(500).send({ message: 'Error al actualizar recorrido', error });
  }
}

async function remove(req: Request, res: Response) {
  try {
    const em = orm.em.fork();
    const id = Number.parseInt(req.params.id);
    const item = await em.findOne(Recorrido as any, { id });
    if (!item) return res.status(404).send({ message: 'No encontrado' });
    await em.removeAndFlush(item);
    res.status(200).send({ message: 'Recorrido borrado', data: item });
  } catch (error) {
    res.status(500).send({ message: 'Error al borrar recorrido', error });
  }
}

export { findAll, findOne, add, update, remove }