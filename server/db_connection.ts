import { MongoClient } from 'mongodb';

import { g } from '../shared/globals';

import { db_full_uri } from './secret/secret';
import * as schema from './db_schema';

export const client = new MongoClient(db_full_uri,
{
    useUnifiedTopology: true
});

async function init_database()
{
    const db_name = g.server.database.name;
    const db = client.db(db_name);

    console.log(`DB: using database ${db_name}`);

    for (const [colname, indices] of schema.indices)
    {
        const col = db.collection(colname);

        console.log(`DB: using collection ${colname}`);

        for (const index of indices)
        {
            var i: any = {};
            i[index.field] = 1;
            
            if (index.unique)
                await col.createIndex(i, { unique: true });
            else
                await col.createIndex(i);
            
            console.log(`DB: created index ${index.field} in ${colname}`);
        }
    }
}

export function get_db()
{
    return client.db(g.server.database.name);
}

export function users()
{
    return get_db().collection(schema.users._id);
}

export function sessions()
{
    return get_db().collection(schema.sessions._id);
}

export function dodo_history()
{
    return get_db().collection(schema.dodo_history._id);
}

export function leaked_dodos()
{
    return get_db().collection(schema.leaked_dodos._id);
}

export function logs()
{
    return get_db().collection(schema.logs._id);
}

export async function connect()
{
    try
    {
        await client.connect();
        console.log("DB: successfully connected");

        await init_database();
    }
    catch (e)
    {
        console.log(e);
    }
}

export async function disconnect()
{
    await client.close();
}

