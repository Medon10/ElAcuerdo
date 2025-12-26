// planilla-efectivo.entity.ts
import { Entity, Property, ManyToOne, type Rel } from '@mikro-orm/core';
import { BaseEntity } from '../shared/bdd/BaseEntity.js';
import { Planilla } from '../planilla/planilla.entity.js';

@Entity({ tableName: 'planilla_efectivo' })
export class PlanillaEfectivo extends BaseEntity {
  @ManyToOne(() => Planilla, { fieldName: 'planilla_id' })
  planilla!: Rel<Planilla>;

  @Property()
  denominacion!: number; // 20000, 10000, 1000, etc.

  @Property()
  cantidad!: number;

  @Property({ type: 'decimal', precision: 12, scale: 2 })
  subtotal!: number; // denominacion * cantidad
}