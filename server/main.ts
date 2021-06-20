import express from 'express';
import path from 'path';
import * as http from 'http';
import * as https from 'https';
import * as fs from 'fs';

import { g } from '../shared/globals';

import * as api from './api';
import * as sockets from './sockets';
import * as db from './db';
import * as runtime_settings from './runtime_settings';
import { logger, logger_http, info } from './log';

const keypath = (filename: string) => `/etc/letsencrypt/live/plaza.tooie.net/${filename}`;

async function main()
{
    await runtime_settings.load_all();
    await db.init();

    logger.info("Database successfully initiated");
    const app = express();

    if (g.server.logging.enabled)
        app.use(logger_http);

    app.use(express.json());
    app.use(express.static(path.join(__dirname, '../dist/plaza/')));
    api.register_all(app);

    var server: any = undefined;

    if (fs.existsSync(keypath('privkey.pem')))
    {
        logger.info("Key exists, hosting HTTPS");
        server = https.createServer({
                key: fs.readFileSync(keypath('privkey.pem')),
                cert: fs.readFileSync(keypath('cert.pem')),
                ca: fs.readFileSync(keypath('chain.pem')),
            },
            app);
    }
    else
    {
        logger.info("Key does not exist, hosting HTTP");
        server = http.createServer(app);
    }

    server.listen(g.server.port)

    sockets.init(server);

    info(`${g.title} version ${g.version} server started`);
}

main();
