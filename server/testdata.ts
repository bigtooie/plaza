import { SHA3 } from 'sha3';
import { ID, UserID, SessionID } from '../shared/ID';
import { g } from '../shared/globals';
import * as User from '../shared/User';
import * as Session from '../shared/Session';

import * as dbcon from './db_connection';
import * as logger from './log';

export async function generate_test_data()
{
    logger.debug("DB: Generating Test data");

    const test_user_count = g.debug.test_users;
    const test_session_count = g.debug.test_sessions;

    const current_user_count = await dbcon.users().countDocuments({}, {});
    const current_session_count = await dbcon.sessions().countDocuments({}, {});

    var remaining_users = test_user_count - current_user_count;
    var remaining_sessions = test_session_count - current_session_count;

    if (remaining_users < 0)
    {
        logger.debug("DB: no need to generate testdata");
        return;
    }

    for (var _i = 0; _i < remaining_users; ++_i)
    {
        const i = _i + current_user_count;
        const seed = Math.random() * 100;
        const seedi = Math.trunc(seed);
        const half: boolean = seedi % 2 == 0;
        const third: boolean = seedi % 3 == 0;
        const seventh: boolean = seedi % 7 == 0;

        const id = new UserID();


        await dbcon.users().insertOne({
            uuid: id.value,
            rid: id.readable,
            username: `user${i}`,
            playername: `veryfirst${i}`,
            playername_hidden: half,
            islandname: `avalon${i}`,
            islandname_hidden: third,
            password: '', // cant login
            registered: new Date(Date.now() - seed*24*60*60*1000),
            level: User.Level.Normal,
            banned: seventh,
            starred: [],
            blocked: [],
            verification_post: "",
            verifier_uuid: undefined,
            verifier_rid: undefined
        });

        if (remaining_sessions > 0)
        {
            remaining_sessions -= 1;
            const sid = new SessionID();

            await dbcon.sessions().insertOne({
                uuid: sid.value,
                rid: sid.readable,
                host: {
                    uuid: id.value,
                    rid: id.readable
                },
                created: new Date(Date.now() - seed*60*1000),
                updated: new Date(Date.now() - seed*10*1000),
                requesters: [],

                dodo: "D1CK5",
                title: `hosting ${i}`,
                description: "doing the host",
                turnip_prices: i % 700,
                status: half ? Session.SessionStatus.Open : (third ? Session.SessionStatus.Full : Session.SessionStatus.Closed),
                unlisted: seventh,
                public_requesters: third,
                verified_only: half
            });
        }

        logger.debug(`DB: generated test user 'user${i}'`);
    }

    logger.debug("DB: Done generating test data");
}
