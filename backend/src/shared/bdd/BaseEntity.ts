import { PrimaryKey, Property } from '@mikro-orm/core';

export abstract class BaseEntity {
    @PrimaryKey({ autoincrement: true, type: Number })
    id!: number;

    @Property({ fieldName: 'created_at', type: 'datetime', nullable: true, onCreate: () => new Date() })
    createdAt?: Date = new Date();
}