// recorrido.entity.ts
import { Entity, Property, ManyToOne, type Rel } from '@mikro-orm/core';
import { BaseEntity } from '../shared/bdd/BaseEntity.js';
import { Planilla } from '../planilla/planilla.entity.js';

@Entity({ tableName: 'recorridos' })
export class Recorrido extends BaseEntity {
  @ManyToOne(() => Planilla, { fieldName: 'planilla_id' })
  planilla!: Rel<Planilla>;

  @Property({ nullable: true })
  horario?: string; // "06:30"

  @Property({ nullable: true })
  numero_recorrido?: string; // "0301"

  @Property({ type: 'decimal', precision: 10, scale: 2 })
  importe!: number;
}