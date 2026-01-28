import { Entity, ManyToOne, Property, Unique, type Rel } from '@mikro-orm/core';
import { BaseEntity } from '../shared/bdd/BaseEntity.js';
import { Usuario } from '../usuario/usuario.entity.js';

// Pre-asignación de pasajero discapacitado a un recorrido futuro.
// Se vincula por chofer + fecha (YYYY-MM-DD) + horario (HH:mm) + numero_recorrido.
@Entity({ tableName: 'discap_programados' })
@Unique({ properties: ['chofer', 'fecha', 'horario', 'numero_recorrido'] })
export class DiscapProgramado extends BaseEntity {
  @ManyToOne(() => Usuario, { fieldName: 'chofer_id' })
  chofer!: Rel<Usuario>;

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
