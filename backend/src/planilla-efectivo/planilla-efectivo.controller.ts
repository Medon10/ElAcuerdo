import { Request, Response } from 'express';
import { orm } from '../shared/bdd/orm.js';
import { PlanillaEfectivo } from './planilla-efectivo.entity.js';

async function findAll(req: Request, res: Response) {
  try {
    const em = orm.em.fork();
    const rows = await em.find(PlanillaEfectivo, {});
    res.json({ data: rows });
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener planilla efectivo', error });
  }
}

async function findOne(req: Request, res: Response) {
  try {
    const em = orm.em.fork();
    const id = Number.parseInt(req.params.id);
    const item = await em.findOne(PlanillaEfectivo, { id });
    if (!item) return res.status(404).json({ message: 'No encontrado' });
    res.status(200).json({ message: 'Registro encontrado', data: item });
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener registro', error });
  }
}

async function add(req: Request, res: Response) {
  try {
    const em = orm.em.fork();
    const input = (req.body as any).sanitizedInput || req.body;
    const nuevo = em.create(PlanillaEfectivo, input);
    await em.flush();
    res.status(201).json({ message: 'Registro creado', data: nuevo });
  } catch (error: any) {
    res.status(500).json({ message: 'Error al crear registro', error: error.message });
  }
}

async function update(req: Request, res: Response) {
  try {
    const em = orm.em.fork();
    const id = Number.parseInt(req.params.id);
    const item = await em.findOne(PlanillaEfectivo, { id });
    if (!item) return res.status(404).json({ message: 'No encontrado' });
    em.assign(item, (req.body as any).sanitizedInput || req.body);
    await em.flush();
    res.status(200).json({ message: 'Registro actualizado', data: item });
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar registro', error });
  }
}

async function remove(req: Request, res: Response) {
  try {
    const em = orm.em.fork();
    const id = Number.parseInt(req.params.id);
    const item = await em.findOne(PlanillaEfectivo, { id });
    if (!item) return res.status(404).json({ message: 'No encontrado' });
    await em.removeAndFlush(item);
    res.status(200).json({ message: 'Registro borrado', data: item });
  } catch (error) {
    res.status(500).json({ message: 'Error al borrar registro', error });
  }
}

export { findAll, findOne, add, update, remove }