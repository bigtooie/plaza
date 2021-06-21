 
import { Writable } from 'stream';
import path from 'path';
import pino from 'pino';
import pino_http from 'pino-http';

import { g } from '../shared/globals';
import * as dbcon from './db_connection';

const stream = new Writable();
stream._write = (data, encoding, next) =>
{
    dbcon.logs().insertOne(JSON.parse(data));
    next();
}

const logger = pino(
    {
        level: g.server.logging.level
    },
    stream
);

const logger_http = pino_http({logger: logger, useLevel: 'debug'});
export { logger, logger_http }

export function debug(...args: any[])
{
    if (g.debug.console_output)
        console.log(...args);

    logger.debug(args);
}

export function info(...args: any[])
{
    if (g.debug.console_output)
        console.log(...args);

    logger.info(args);
}

export function warn(...args: any[])
{
    if (g.debug.console_output)
        console.log(...args);

    logger.warn(args);
}

export function error(...args: any[])
{
    if (g.debug.console_output)
        console.log(...args);

    logger.error(args);
}
