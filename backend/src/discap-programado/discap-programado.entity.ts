import { Entity, Property, Unique } from '@mikro-orm/core';
import { BaseEntity } from '../shared/bdd/BaseEntity.js';

// Pre-asignación de pasajero discapacitado a un recorrido futuro.
// Se vincula por fecha (YYYY-MM-DD) + horario (HH:mm) + numero_recorrido.
@Entity({ tableName: 'discap_programados' })
@Unique({ properties: ['fecha', 'horario', 'numero_recorrido'] })
export class DiscapProgramado extends BaseEntity {
  @Property({ length: 10 })
  fecha!: string; // 'YYYY-MM-DD'

  @Property({ nullable: true })
  horario?: string; // 'HH:mm'

  @Property({ nullable: true })
  numero_recorrido?: string; // '0301'

  @Property({ nullable: true })
  discap_nombre?: string;

  @Property({ nullable: true })
  discap_apellido?: string;

  @Property({ nullable: true })
  discap_dni?: string;
}
