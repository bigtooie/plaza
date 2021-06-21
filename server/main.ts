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

function redirect_http_to_https()
{
    const redirect = express();

    redirect.get('*', (req: express.Request, res: express.Response) =>
    {  
        res.redirect('https://' + req.headers.host + req.url);
    });

    redirect.listen(80);
}

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

    if (fs.existsSync(g.server.privkey))
    {
        logger.info("Key exists, hosting HTTPS");
        server = https.createServer({
                key: fs.readFileSync(g.server.privkey),
                cert: fs.readFileSync(g.server.cert),
                ca: fs.readFileSync(g.server.chain),
            },
            app);

        redirect_http_to_https();
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
