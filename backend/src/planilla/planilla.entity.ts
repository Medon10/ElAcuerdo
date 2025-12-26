// planilla.entity.ts
import { Entity, Property, ManyToOne, OneToMany, Collection, Cascade, Enum, type Rel } from '@mikro-orm/core';
import { BaseEntity } from '../shared/bdd/BaseEntity.js';
import { Usuario } from '../usuario/usuario.entity.js';
import { Recorrido } from '../recorrido/recorrido.entity.js';
import { PlanillaEfectivo } from '../planilla-efectivo/planilla-efectivo.entity.js';

export enum PlanillaStatus {
  ENVIADO = 'enviado',
  REVISADO = 'revisado',
  RECHAZADO = 'rechazado'
}

@Entity({ tableName: 'planilla' })
export class Planilla extends BaseEntity {
  @ManyToOne(() => Usuario, { fieldName: 'chofer_id' })
  chofer!: Rel<Usuario>;

  @Property()
  numero_coche!: string;

  @Property()
  fecha_hora_planilla!: Date;

  @Property({ type: 'decimal', precision: 12, scale: 2 })
  total_recorrido!: number;

  @Property({ type: 'decimal', precision: 12, scale: 2 })
  total_efectivo!: number;

  @Property({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  diferencia: number = 0;

  @Property({ type: 'text', nullable: true })
  comentarios?: string;

  @Enum(() => PlanillaStatus)
  status: PlanillaStatus = PlanillaStatus.ENVIADO;

  @OneToMany(() => Recorrido, recorrido => recorrido.planilla, { cascade: [Cascade.REMOVE] })
  recorridos = new Collection<Recorrido>(this);

  @OneToMany(() => PlanillaEfectivo, (efectivo: PlanillaEfectivo) => efectivo.planilla, { cascade: [Cascade.REMOVE] })
  efectivos = new Collection<PlanillaEfectivo>(this);
}