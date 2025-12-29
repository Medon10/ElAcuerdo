import { MikroORM } from '@mikro-orm/core';
import { SqlHighlighter } from '@mikro-orm/sql-highlighter';
import { MySqlDriver } from '@mikro-orm/mysql';

import '../../env.js';

import { Usuario } from '../../usuario/usuario.entity.js';
import { Planilla } from '../../planilla/planilla.entity.js';
import { Recorrido } from '../../recorrido/recorrido.entity.js';
import { PlanillaEfectivo } from '../../planilla-efectivo/planilla-efectivo.entity.js';

function buildClientUrlFromEnv() {
    if (process.env.DB_URL && process.env.DB_URL.trim()) return process.env.DB_URL;

    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || '3306';
    const user = process.env.DB_USER || 'root';
    const password = process.env.DB_PASSWORD || '';
    const database = process.env.DB_NAME || 'el_acuerdo';

    const encodedPassword = encodeURIComponent(password);
    const authPart = password ? `${encodeURIComponent(user)}:${encodedPassword}` : encodeURIComponent(user);
    return `mysql://${authPart}@${host}:${port}/${database}`;
}

const dbSslEnabled = String(process.env.DB_SSL || '').toLowerCase() === 'true';
const dbSslRejectUnauthorized = String(process.env.DB_SSL_REJECT_UNAUTHORIZED || 'true').toLowerCase() !== 'false';

export const orm = await MikroORM.init({
    entities: [Usuario, Planilla, Recorrido, PlanillaEfectivo],
    entitiesTs: [Usuario, Planilla, Recorrido, PlanillaEfectivo],
    driver: MySqlDriver,
    clientUrl: buildClientUrlFromEnv(),
        driverOptions: dbSslEnabled
            ? ({
                    connection: {
                        ssl: { rejectUnauthorized: dbSslRejectUnauthorized },
                    },
                } as any)
            : undefined,
    debug: false,
    schemaGenerator: { //nunca en producción, solo desarrollo
        disableForeignKeys: true,
        createForeignKeyConstraints: true,
        ignoreSchema: [],
    }
});

export const syncSchema = async () => {
    const generator = orm.getSchemaGenerator();
    // In development, keep the DB schema aligned with entities.
    // This avoids runtime 500s due to missing tables/columns.
    if (process.env.NODE_ENV !== 'production') {
        try {
            await generator.updateSchema({ safe: true });
        } catch (e: any) {
            console.error('[syncSchema] No se pudo actualizar el esquema automáticamente:', e?.message || e);
            // Continue booting the server; schema might be managed manually.
        }
    }
    console.log('Esquema actualizado');
}