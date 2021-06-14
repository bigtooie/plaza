 
import { v4 as uuidv4 } from 'uuid';
import * as jwt from 'jsonwebtoken';

import { Token, TokenString, is_valid_token } from '../shared/Token';
import { ID, UserID, SessionID } from '../shared/ID';
import { g } from '../shared/globals';
import * as Settings from '../shared/RuntimeSettings';

import * as logger from './log';
import * as runtime_settings from './runtime_settings';
import { jwt_signing_key } from './secret/secret';

export class LoginSession
{
    constructor(
        public token: Token,
        public user: UserID
    )
    {}

    get is_expired() { return this.token.is_expired; }
}

export function is_verified_token(token: Token): boolean
{
    if (!is_valid_token(token))
        return false;

    try
    {
        jwt.verify(token.jwt, jwt_signing_key);
    }
    catch (err)
    {
        return false;
    }

    return true;
}

const active_sessions = new Map<string, LoginSession>();

const gc = setInterval(
    () =>
    {
        logger.info("Login session garbage collection started");

        for (const [token, sess] of active_sessions)
            if (!is_verified_token(sess.token))
                active_sessions.delete(token);

        logger.info("Login session garbage collection ended");
    },
    g.server.login_session_gc_interval*60*60*1000
);

export function create_new_session(user: UserID): Token
{
    const tokstr = uuidv4();
    const jt = jwt.sign({value: tokstr}, jwt_signing_key, {expiresIn: `${runtime_settings.get(Settings.max_login_session_duration.key)}h`});

    const tok = new Token(jt);
    const ls = new LoginSession(tok, user);

    logger.info(`creating new login session for user ${user.readable} with value ${tokstr}`);
    active_sessions.set(tokstr, ls);

    return tok;
}

export function delete_session_by_tokenstring(token: TokenString)
{
    const usr = active_sessions.get(token).user;
    logger.info(`deleting login session of user ${usr.readable} by token ${token}`);

    active_sessions.delete(token);
}

export function session_exists(token: TokenString): boolean
{
    return active_sessions.has(token);
}

export function get_session_by_tokenstring(token: TokenString): LoginSession | undefined
{
    if (!session_exists(token))
        return undefined;

    return active_sessions.get(token);
}
