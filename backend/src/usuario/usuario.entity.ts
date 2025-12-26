// usuario.entity.ts
import { Entity, Property, OneToMany, Collection, Cascade, Enum } from '@mikro-orm/core';
import { BaseEntity } from '../shared/bdd/BaseEntity.js';
import { Planilla } from '../planilla/planilla.entity.js';

export enum UserRole {
  CHOFER = 'chofer',
  ADMIN = 'admin'
}

@Entity({ tableName: 'usuario' })
export class Usuario extends BaseEntity {
  @Property()
  usuario!: string;

  @Property()
  nombre!: string;

  @Property()
  apellido!: string;

  @Property()
  contraseña!: string; // Hasheada con bcrypt

  @Enum(() => UserRole)
  rol: UserRole = UserRole.CHOFER;

  @Property()
  is_active: boolean = true;

  @OneToMany(() => Planilla, planilla => planilla.chofer, { cascade: [Cascade.REMOVE] })
  planillas = new Collection<Planilla>(this);
}