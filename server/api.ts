import * as express from 'express';

import { Token, TokenString } from '../shared/Token';
import { ID, UserID, SessionID, is_valid_readable_id, is_valid_id, is_valid_uuid } from '../shared/ID';
import { g } from '../shared/globals';
import { APIEndpointType, APIEndpoint, endpoints } from '../shared/APIEndpoints';
import { copy_from } from '../shared/utils';

import { BASE58pattern } from '../shared/ID';
import * as User from '../shared/User';
import * as Session from '../shared/Session';
import * as Req from '../shared/RequestResponse';
import * as Settings from '../shared/RuntimeSettings';

import * as logger from './log';
import * as login_sessions from './login_sessions';
import * as sock from './sockets';
import * as db from './db';
import * as runtime_settings from './runtime_settings';

function error_handler(err: any, res: express.Response)
{
    logger.error(err);
    res.status(500).send(new Req.FailedResponse("something happened ;)"));
}

function get_userid_by_tokenstring(token: TokenString): UserID
{
    const sess = login_sessions.get_session_by_tokenstring(token);

    if (sess === undefined)
        return undefined;

    return sess.user;
}

async function get_user_by_tokenstring(token: TokenString): Promise<User.User>
{
    const sess = login_sessions.get_session_by_tokenstring(token);

    if (sess === undefined)
        return undefined;

    return db.get_user_by_id(sess.user);
}

function request_failure(request: string, res: express.Response, msg: string, force_logout: boolean = false, log: boolean = true)
{
    res.status(403).json(new Req.FailedResponse(msg, force_logout));

    if (log)
    {
        var uid = undefined;

        if ('locals' in res && 'user' in res.locals)
            uid = res.locals.user.id;

        logger.warn(`${request} request of user ${uid !== undefined ? uid.readable : '<anonymous>'} failed: ${msg}`);
    }
}

export async function optional_user(req: express.Request, res: express.Response, next: any)
{
    try
    {
        const rreq = copy_from(Req.AuthenticatedRequest, req.body);

        if (rreq === undefined)
        {
            next();
            return;
        }

        const token: Token = rreq.token;

        if (!login_sessions.is_verified_token(token))
        {
            next();
            return;
        }

        res.locals.user = await get_user_by_tokenstring(token.value);
    }
    catch (e)
    {}

    next();
}

export async function authenticate(req: express.Request, res: express.Response, next: any)
{
    try
    {
        const rreq = copy_from(Req.AuthenticatedRequest, req.body);

        if (rreq === undefined)
        {
            request_failure("authenticate", res, "invalid request");
            return;
        }

        const token: Token = rreq.token;

        if (!login_sessions.is_verified_token(token))
        {
            request_failure("authenticate", res, "invalid or expired session token", true);
            return;
        }

        const tv = token.value;
        const sess = login_sessions.get_session_by_tokenstring(tv);

        if (sess === undefined)
        {
            request_failure("authenticate", res, "invalid or expired session token", true);
            return;
        }

        // just double check to be sure :^)
        if (sess.is_expired || sess.token.jwt !== token.jwt)
        {
            login_sessions.delete_session_by_tokenstring(tv);
            request_failure("authenticate", res, "invalid or expired session token", true);
            return;
        }

        const usr = await get_user_by_tokenstring(tv);
        
        if (usr === undefined)
        {
            login_sessions.delete_session_by_tokenstring(tv);
            request_failure("authenticate", res, "invalid or expired session token", true);
            return;
        }

        if (usr.level < User.Level.Admin && usr.banned)
        {
            login_sessions.delete_session_by_tokenstring(tv);
            request_failure("authenticate", res, "ur banned lmao", true);
            return;
        }

        res.locals.user = usr;
    }
    catch (err)
    {
        error_handler(err, res);
        return;
    }

    next();
}

export async function is_admin(req: express.Request, res: express.Response, next: any)
{
    try
    {
        const usr = res.locals.user;

        if (usr === undefined || usr.level < User.Level.Admin)
        {
            request_failure("is_admin", res, "unauthorized", true);
            return;
        }
    }
    catch (err)
    {
        error_handler(err, res);
        return;
    }

    next();
}

export async function is_mod_or_admin(req: express.Request, res: express.Response, next: any)
{
    try
    {
        const usr = res.locals.user;

        if (usr === undefined || usr.level < User.Level.Moderator)
        {
            request_failure("is_mod_or_admin", res, "unauthorized", true);
            return;
        }
    }
    catch (err)
    {
        error_handler(err, res);
        return;
    }

    next();
}

export async function Login(req: express.Request, res: express.Response)
{
    try
    {
        const rreq = copy_from(Req.LoginRequest, req.body);

        if (rreq === undefined)
        {
            request_failure("Login", res, "invalid request");
            return;
        }

        try
        {
            User.validate_username(rreq.username);
            User.validate_password_hash(rreq.password);
        }
        catch (err)
        {
            request_failure("Login", res, err.message);
            return;
        }

        const usr = await db.get_user_by_username(rreq.username);

        if (usr === undefined)
        {
            request_failure("Login", res, "user doesnt exist or password is wrong");
            return;
        }

        const pw = rreq.password;
        const password_ok = await db.check_user_password(usr, pw);

        if (!password_ok)
        {
            request_failure("Login", res, "user doesnt exist or password is wrong");
            return;
        }

        if (usr.banned && usr.level < User.Level.Admin)
        {
            request_failure("Login", res, "this user is banned lmao");
            return;
        }

        // we ignore existing login sessions of users because multiple devices, etc
        const tok = login_sessions.create_new_session(usr.id);
        const view = await db.get_userview(usr, usr);

        logger.info(`user ${usr.id.readable} successfully logged in`);
        res.status(200).json(new Req.LoginResponse(view, tok));
    }
    catch (err)
    {
        error_handler(err, res);
        return;
    }
}

export async function Register(req: express.Request, res: express.Response)
{
    try
    {
        if (!runtime_settings.get(Settings.registrations_enabled.key))
        {
            request_failure("Register", res, "registrations are closed");
            return;
        }

        const rreq = copy_from(Req.RegisterRequest, req.body);

        if (rreq === undefined)
        {
            request_failure("Register", res, "invalid request");
            return;
        }

        try
        {
            User.validate_username(rreq.username);
            User.validate_playername(rreq.playername);
            User.validate_islandname(rreq.islandname);
            User.validate_password_hash(rreq.password);
        }
        catch (err)
        {
            request_failure("Register", res, err.message);
            return;
        }

        if (runtime_settings.get(Settings.register_require_security_question.key))
        {
            const ra = rreq.security_question_answer;

            if (ra === undefined || ra.length <= 0 ||
                ra.match(runtime_settings.get(Settings.register_security_question_answer.key)) === null)
            {
                logger.warn(`incorrect security question answer: ${ra}`);
                request_failure("Register", res, "incorrect security question answer");
                return;
            }
        }

        const taken = await db.username_taken(rreq.username);

        if (taken)
        {
            request_failure("Register", res, "username already taken");
            return;
        }

        const pw = rreq.password;
        const usr = await db.register_user(rreq.username,
                                           rreq.playername,
                                           rreq.islandname,
                                           pw
                                          );
        
        const tok = login_sessions.create_new_session(usr.id);
        const view = await db.get_userview(usr, usr);

        logger.info(`user ${usr.id.readable} successfully registered`);
        res.status(200).json(new Req.LoginResponse(view, tok));
    }
    catch (err)
    {
        error_handler(err, res);
        return;
    }
}

export async function AdvancedRegister(req: express.Request, res: express.Response)
{
    try
    {
        const rreq = copy_from(Req.AdvancedRegisterRequest, req.body);

        if (rreq === undefined)
        {
            request_failure("AdvancedRegister", res, "invalid request");
            return;
        }

        const creator = res.locals.user;

        try
        {
            User.validate_username(rreq.username);
            User.validate_playername(rreq.playername);
            User.validate_islandname(rreq.islandname);
            User.validate_password_hash(rreq.password);
            User.validate_level(rreq.level);
        }
        catch (err)
        {
            request_failure("AdvancedRegister", res, err.message);
            return;
        }

        if (rreq.id_prefix !== undefined
         && rreq.id_prefix.length > 0
         && rreq.id_prefix.match(BASE58pattern) === null)
        {
            request_failure("AdvancedRegister", res, "illegal ID prefix");
            return;
        }

        if (creator.level < User.Level.Admin
         && creator.level <= rreq.level)
        {
            request_failure("AdvancedRegister", res, "you are not authorized to create an account of this level");
            return;
        }

        const taken = await db.username_taken(rreq.username);

        if (taken)
        {
            request_failure("AdvancedRegister", res, "username already taken");
            return;
        }

        const pw = rreq.password;
        const usr = await db.register_user(rreq.username,
                                           rreq.playername,
                                           rreq.islandname,
                                           pw,
                                           rreq.id_prefix,
                                           rreq.level
                                          );

        const view = await db.get_userview(creator, usr);

        logger.info(`${User.LevelNames[creator.level]} ${creator.id.readable} successfully registered user ${usr.id.readable}`);
        res.status(200).json(new Req.AdvancedRegisterResponse(view));
    }
    catch (err)
    {
        error_handler(err, res);
        return;
    }
}

export function Logout(req: express.Request, res: express.Response)
{
    try
    {
        const rreq = copy_from(Req.LogoutRequest, req.body);

        if (rreq === undefined)
        {
            request_failure("Logout", res, "invalid request");
            return;
        }

        const token = rreq.token;
        const uid = get_userid_by_tokenstring(token.value);

        login_sessions.delete_session_by_tokenstring(token.value);

        logger.info(`user ${uid.readable} successfully logged out`);
        res.status(200).send();
    }
    catch (err)
    {
        error_handler(err, res);
        return;
    }
}

export async function UsernameTaken(req: express.Request, res: express.Response)
{
    try
    {
        const rreq = copy_from(Req.UsernameTakenRequest, req.body);

        if (rreq === undefined)
        {
            request_failure("UsernameTaken", res, "invalid request");
            return;
        }

        try
        {
            User.validate_username(rreq.username);
        }
        catch (err)
        {
            request_failure("UsernameTaken", res, err.message);
            return;
        }

        const username_taken = await db.username_taken(rreq.username);

        logger.debug(`checking if username ${rreq.username} is taken, and it ${username_taken ? 'is' : 'is not'}`);
        res.status(200).json(new Req.UsernameTakenResponse(username_taken));
    }
    catch (err)
    {
        error_handler(err, res);
        return;
    }
}

export async function DodoInUse(req: express.Request, res: express.Response)
{
    try
    {
        const rreq = copy_from(Req.DodoInUseRequest, req.body);

        if (!runtime_settings.get(Settings.dodo_in_use_api.key))
        {
            res.status(200).json(new Req.DodoInUseResponse(false));
            return;
        }

        if (rreq === undefined)
        {
            request_failure("DodoInUse", res, "invalid request");
            return;
        }

        try
        {
            Session.validate_session_dodo(rreq.dodo);
        }
        catch (err)
        {
            request_failure("DodoInUse", res, err.message);
            return;
        }

        const dodo_in_use = await db.dodo_in_use(rreq.dodo);

        const uid = get_userid_by_tokenstring(rreq.token.value);
        logger.info(`user ${uid.readable} checking if dodo ${rreq.dodo} is in use, and it ${dodo_in_use ? 'is' : 'is not'}`);
        res.status(200).json(new Req.DodoInUseResponse(dodo_in_use));
    }
    catch (err)
    {
        error_handler(err, res);
        return;
    }
}

export async function GetUser(req: express.Request, res: express.Response)
{
    try
    {
        const rreq = copy_from(Req.GetUserRequest, req.body);

        if (rreq === undefined)
        {
            request_failure("GetUser", res, "invalid request");
            return;
        }

        const id: string = rreq.id;

        if (!is_valid_readable_id(id))
        {
            request_failure("GetUser", res, "invalid ID");
            return;
        }

        const rusr = await db.get_user_by_readable_id(id);

        if (rusr === undefined)
        {
            request_failure("GetUser", res, "user not found");
            return;
        }

        const usr = res.locals.user;
        const v = await db.get_userview(usr, rusr);

        logger.info(`user ${usr.id.readable} requested profile of user ${id}`);
        res.status(200).json(new Req.GetUserResponse(v));
    }
    catch (err)
    {
        error_handler(err, res);
        return;
    }
}

export async function GetSelf(req: express.Request, res: express.Response)
{
    try
    {
        const rreq = copy_from(Req.AuthenticatedRequest, req.body);

        if (rreq === undefined)
        {
            request_failure("GetSelf", res, "invalid request");
            return;
        }

        const usr = res.locals.user;
        const v = await db.get_userview(usr, usr);

        logger.info(`user ${usr.id.readable} requested profile of self`);
        res.status(200).json(new Req.GetUserResponse(v));
    }
    catch (err)
    {
        error_handler(err, res);
        return;
    }
}

export async function GetUsers(req: express.Request, res: express.Response)
{
    try
    {
        const rreq = copy_from(Req.GetUsersRequest, req.body);

        if (rreq === undefined)
        {
            request_failure("GetUsers", res, "invalid request");
            return;
        }

        if (!Number.isSafeInteger(rreq.page) || rreq.page < 0)
        {
            request_failure("GetUsers", res, "invalid page");
            return;
        }

        if (rreq.search_text.length > Req.MAX_GET_USERS_SEARCH_TEXT_LENGTH)
        {
            request_failure("GetUsers", res, `search text too long (max is ${Req.MAX_GET_USERS_SEARCH_TEXT_LENGTH} characters)`);
            return;
        }
        
        const usr = res.locals.user;
        var resp: Req.GetUsersResponse = undefined;

        try
        {
            resp = await db.get_users(usr, rreq);
        }
        catch (err)
        {
            request_failure("GetUsers", res, err.message);
            return;
        }

        const uid = get_userid_by_tokenstring(rreq.token.value);
        logger.info(`user ${uid.readable} requested users ('${rreq.search_text}')`);
        res.status(200).json(resp);
    }
    catch (err)
    {
        error_handler(err, res);
        return;
    }
}

export async function GetSession(req: express.Request, res: express.Response)
{
    try
    {
        const rreq = copy_from(Req.GetSessionRequest, req.body);

        if (rreq === undefined)
        {
            request_failure("GetSession", res, "invalid request");
            return;
        }

        const id: string = rreq.id;

        if (!is_valid_readable_id(id))
        {
            request_failure("GetSession", res, "invalid ID");
            return;
        }

        const sess = await db.get_session_by_readable_id(id);

        if (sess === undefined)
        {
            request_failure("GetSession", res, "session not found");
            return;
        }

        if (res.locals.user !== undefined)
        {
            const usr = res.locals.user;
            const v = await db.get_sessionview(usr, sess);

            logger.info(`user ${usr.id.readable} requested session ${id}`);
            res.status(200).json(new Req.GetSessionResponse(v));
        }
        else
        {
            const v = await db.get_public_sessionview(sess);
            logger.info(`guest user requested session ${id}`);
            res.status(200).json(new Req.GetSessionResponse(v));
        }
    }
    catch (err)
    {
        error_handler(err, res);
        return;
    }
}

export async function GetSessionRequesters(req: express.Request, res: express.Response)
{
    try
    {
        const rreq = copy_from(Req.GetSessionRequestersRequest, req.body);

        if (rreq === undefined)
        {
            request_failure("GetSessionRequesters", res, "invalid request");
            return;
        }

        const id: SessionID = rreq.id;

        if (!is_valid_id(id))
        {
            request_failure("GetSessionRequesters", res, "invalid ID");
            return;
        }

        const sess = await db.get_session_by_id(id);

        if (sess === undefined)
        {
            request_failure("GetSessionRequesters", res, "session not found");
            return;
        }

        if (rreq.token !== undefined)
        {
            const usr = res.locals.user;
            const rvs = await db.get_requesterviews_of_session(usr, sess);

            logger.info(`user ${usr.id.readable} requested requesters of session ${id.readable}`);
            res.status(200).json(new Req.GetSessionRequestersResponse(rvs));
        }
        else
        {
            const rvs = await db.get_requesterviews_of_session(undefined, sess);
            logger.info(`guest user requested requesters of session ${id.readable}`);
            res.status(200).json(new Req.GetSessionRequestersResponse(rvs));
        }
    }
    catch (err)
    {
        error_handler(err, res);
        return;
    }
}

export async function GetSessionOfUser(req: express.Request, res: express.Response)
{
    try
    {
        const rreq = copy_from(Req.GetSessionOfUserRequest, req.body);

        if (rreq === undefined || !is_valid_readable_id(rreq.id))
        {
            request_failure("GetSessionOfUser", res, "invalid request");
            return;
        }

        const sess = await db.get_session_of_user_by_rid(rreq.id);
        const requester = res.locals.user;

        if (sess === undefined)
        {
            logger.info(`user ${requester.id.readable} requested session of user ${rreq.id} and got no session because user is not hosting`);
            res.status(200).json(new Req.GetSessionOfUserResponse(undefined));
            return;
        }

        const v = await db.get_sessionview(requester, sess);

        logger.info(`user ${requester.id.readable} requested session of user ${rreq.id} and got session ${sess.id.readable}`);
        res.status(200).json(new Req.GetSessionOfUserResponse(v));
    }
    catch (err)
    {
        error_handler(err, res);
        return;
    }
}

export async function GetSessions(req: express.Request, res: express.Response)
{
    try
    {
        const rreq = copy_from(Req.GetSessionsRequest, req.body);

        if (rreq === undefined)
        {
            request_failure("GetSessions", res, "invalid request");
            return;
        }

        if (!Number.isSafeInteger(rreq.page) || rreq.page < 0)
        {
            request_failure("GetSessions", res, "invalid page");
            return;
        }

        if (!Number.isSafeInteger(rreq.min_turnip_price))
        {
            request_failure("GetSessions", res, "invalid turnip price");
            return;
        }

        if (rreq.search_text.length > Req.MAX_GET_SESSIONS_SEARCH_TEXT_LENGTH)
        {
            request_failure("GetSessions", res, `search text too long (max is ${Req.MAX_GET_SESSIONS_SEARCH_TEXT_LENGTH} characters)`);
            return;
        }
        
        const usr = res.locals.user;
        const resp = await db.get_sessions(usr, rreq);

        logger.info(`user ${usr.id.readable} requested sessions ('${rreq.search_text}')`);
        res.status(200).json(resp);
    }
    catch (err)
    {
        error_handler(err, res);
        return;
    }
}

export async function NewSession(req: express.Request, res: express.Response)
{
    try
    {
        const rreq = copy_from(Req.NewSessionRequest, req.body);

        if (rreq === undefined)
        {
            request_failure("NewSession", res, "invalid request");
            return;
        }

        try
        {
            Session.validate_session_dodo(rreq.dodo);
            Session.validate_session_title(rreq.title);
            Session.validate_session_description(rreq.description);
            Session.validate_session_turnip_prices(rreq.turnips);
        }
        catch (err)
        {
            request_failure("NewSession", res, err.message);
            return;
        }

        const uid = get_userid_by_tokenstring(rreq.token.value);
        const cursess = await db.get_session_of_user(uid);

        if (cursess !== undefined)
        {
            // logger.warn(`user ${uid.readable} attempted to create session while already hosting a session`);
            request_failure("NewSession", res, "you're already hosting");
            return;
        }

        const in_use = await db.dodo_in_use(rreq.dodo);
        if (in_use)
        {
            // logger.warn(`user ${uid.readable} attempted to create session with a dodo thats already in use`);
            request_failure("NewSession", res, "Dodo code is in use.");
            return;
        }

        const usr = res.locals.user;
        const sess = await db.new_session(uid, rreq);
        const sv = await db.get_sessionview(usr, sess);

        logger.info(`user ${uid.readable} created new session ${sess.id.readable}`);
        res.status(200).json(new Req.NewSessionResponse(sv));
    }
    catch (err)
    {
        error_handler(err, res);
        return;
    }
}

export async function UpdateUserSettings(req: express.Request, res: express.Response)
{
    try
    {
        const rreq = copy_from(Req.UpdateUserSettingsRequest, req.body);

        if (rreq === undefined || !is_valid_id(rreq.target))
        {
            request_failure("UpdateUserSettings", res, "invalid request");
            return;
        }

        const target = await db.get_user_by_id(rreq.target);

        if (target === undefined)
        {
            request_failure("UpdateUserSettings", res, "no user with that ID found");
            return;
        }

        const usr = res.locals.user;
        const set: any = rreq.settings;

        if ('level' in set && (typeof set.level === 'number'))
        {
            try
            {
                User.validate_level(set.level);
            }
            catch (err)
            {
                request_failure("UpdateUserSettings", res, err.message);
                return;
            }

            // non-admins cant change level
            // admins can change levels of others except for admins
            // admins can change levels to anything except admin (unless global setting is on)
            // moderators can only change levels of normal users and validators, to normal user or validator.
            if (usr.level <= User.Level.Verifier
             || target.level >= User.Level.Admin
             || (usr.level === User.Level.Moderator && set.level >= User.Level.Moderator)
             || (usr.level === User.Level.Moderator && target.level >= User.Level.Moderator)
             || (usr.level >= User.Level.Admin && set.level >= User.Level.Admin && !g.admin_can_make_users_admin)
               )
            {
                request_failure("UpdateUserSettings", res, "i'm afraid i can't let you do that");
                return;
            }

            logger.info(`user ${usr.id.readable} set level of user ${target.id.readable} to ${set.level}`);
            await db.set_user_level(target.id, set.level);
        }

        if ('banned' in set && (typeof set.banned === 'boolean'))
        {
            // non-admins cant ban
            // mods cant ban mods or admins
            // admins cant ban admins
            if (usr.level < User.Level.Moderator
             || usr.level <= target.level)
            {
                request_failure("UpdateUserSettings", res, "i'm afraid i can't let you do that");
                return;
            }

            logger.info(`user ${usr.id.readable} ${set.banned ? 'banned' : 'unbanned'} user ${target.id.readable}`);
            await db.set_user_banned(target.id, set.banned);
        }

        if ('starred' in set && (typeof set.starred === 'boolean'))
        {
            if (target.id.value === usr.id.value)
            {
                request_failure("UpdateUserSettings", res, "bruh");
                return;
            }

            logger.info(`user ${usr.id.readable} ${set.starred ? 'starred' : 'unstarred'} user ${target.id.readable}`);
            await db.set_user_starred(usr.id, target.id, set.starred);
        }

        if ('blocked' in set && (typeof set.blocked === 'boolean'))
        {
            if (target.id.value === usr.id.value)
            {
                request_failure("UpdateUserSettings", res, "bruh");
                return;
            }

            logger.info(`user ${usr.id.readable} ${set.blocked ? 'blocked' : 'unblocked'} user ${target.id.readable}`);
            await db.set_user_blocked(usr.id, target.id, set.blocked);
        }

        if ('playername_hidden' in set && (typeof set.playername_hidden === 'boolean'))
        {
            // non-admins can only set playername_hidden of self
            // admins and mods can set playername hidden of lower levels
            if ((target.id.value !== usr.id.value) &&
                (usr.level < User.Level.Moderator || usr.level <= target.level))
            {
                request_failure("UpdateUserSettings", res, "i'm afraid i can't let you do that");
                return;
            }

            logger.info(`user ${usr.id.readable} ${set.playername_hidden ? 'hid' : 'unhid'} the playername of user ${target.id.readable}`);
            await db.set_user_playername_hidden(target.id, set.playername_hidden);
        }

        if ('islandname_hidden' in set && (typeof set.islandname_hidden === 'boolean'))
        {
            // non-admins can only set islandname_hidden of self
            // admins can set islandname hidden of lower levels
            if ((target.id.value !== usr.id.value) &&
                (usr.level < User.Level.Admin || usr.level <= target.level))
            {
                request_failure("UpdateUserSettings", res, "i'm afraid i can't let you do that");
                return;
            }

            logger.info(`user ${usr.id.readable} ${set.islandname_hidden ? 'hid' : 'unhid'} the islandname of user ${target.id.readable}`);
            await db.set_user_islandname_hidden(target.id, set.islandname_hidden);
        }

        if ('playername' in set && (typeof set.playername === 'string'))
        {
            // only admins can set playername
            // admins can only set playername of non-admins
            if (usr.level < User.Level.Admin
             || usr.level <= target.level)
            {
                request_failure("UpdateUserSettings", res, "i'm afraid i can't let you do that");
                return;
            }

            try
            {
                User.validate_playername(set.playername);
            }
            catch (err)
            {
                request_failure("UpdateUserSettings", res, err.message);
            }

            logger.info(`user ${usr.id.readable} set the playername of user ${target.id.readable} to ${set.playername}`);
            await db.set_user_playername(target.id, set.playername);
        }

        if ('islandname' in set && (typeof set.islandname === 'string'))
        {
            // only admins can set islandname
            // admins can only set islandname of non-admins
            if (usr.level < User.Level.Admin
             || usr.level <= target.level)
            {
                request_failure("UpdateUserSettings", res, "i'm afraid i can't let you do that");
                return;
            }

            try
            {
                User.validate_islandname(set.islandname);
            }
            catch (err)
            {
                request_failure("UpdateUserSettings", res, err.message);
            }

            logger.info(`user ${usr.id.readable} set the islandname of user ${target.id.readable} to ${set.islandname}`);
            await db.set_user_islandname(target.id, set.islandname);
        }

        if ('verification_post' in set && (typeof set.verification_post === 'string'))
        {
            // admins and mods can always change verification
            // verifiers can change verification if:
            //   - target is normal user and
            //   - target not verified or target was verified by self
            if (usr.level <= User.Level.Normal
             || (usr.level === User.Level.Verifier &&
                 (target.level >= User.Level.Verifier ||
                  (target.verifier !== undefined && target.verifier.value !== usr.id.value)
             )))
            {
                request_failure("UpdateUserSettings", res, "i'm afraid i can't let you do that");
                return;
            }

            try
            {
                User.validate_verification_post(set.verification_post);
            }
            catch (err)
            {
                request_failure("UpdateUserSettings", res, err.message);
            }

            logger.info(`user ${usr.id.readable} verified user ${target.id.readable} (${set.verification_post})`);
            await db.set_user_verification(target.id, set.verification_post, usr.id);
        }

        if ('new_password' in set && (typeof set.new_password === 'string'))
        {
            // non-admins can only reset their own passwords
            // non-admins must provide their current password
            // admins cant reset passwords of other admins

            if (usr.level < User.Level.Moderator && target.id.value !== usr.id.value)
            {
                request_failure("UpdateUserSettings", res, "i'm afraid i can't let you do that");
                return;
            }

            if (usr.level >= User.Level.Moderator
             && target.level >= User.Level.Moderator
             && target.id.value !== usr.id.value)
            {
                request_failure("UpdateUserSettings", res, "i'm afraid i can't let you do that");
                return;
            }

            try
            {
                User.validate_password_hash(set.new_password);
            }
            catch (err)
            {
                request_failure("UpdateUserSettings", res, err.message);
                return;
            }

            if (usr.level < User.Level.Moderator
             && target.id.value === usr.id.value)
            {
                if (!('current_password' in set)
                 || (typeof set.current_password !== 'string'))
                {
                    request_failure("UpdateUserSettings", res, "missing or incorrect current password");
                    return;
                }

                try
                {
                    User.validate_password_hash(set.current_password);
                }
                catch (err)
                {
                    request_failure("UpdateUserSettings", res, "missing or incorrect current password");
                    return;
                }

                const current_ok = await db.check_user_password(target, set.current_password);
                if (!current_ok)
                {
                    request_failure("UpdateUserSettings", res, "missing or incorrect current password");
                    return;
                }
            }

            logger.info(`user ${usr.id.readable} reset the password of user ${target.id.readable}`);
            await db.set_user_password(target.id, set.new_password);
        }

        res.status(200).json(new Req.UpdateUserSettingsResponse());
    }
    catch (err)
    {
        error_handler(err, res);
        return;
    }
}

export async function UpdateSessionSettings(req: express.Request, res: express.Response)
{
    try
    {
        const rreq = copy_from(Req.UpdateSessionSettingsRequest, req.body);

        if (rreq === undefined || !is_valid_id(rreq.target))
        {
            request_failure("UpdateSessionSettings", res, "invalid request");
            return;
        }

        const target = await db.get_session_by_id(rreq.target);

        if (target === undefined)
        {
            request_failure("UpdateSessionSettings", res, "no session with that ID found");
            return;
        }

        const usr = res.locals.user;
        const set: any = rreq.settings;
        var leaked_dodo: string = "";

        // only host and mods or higher can change session properties
        if (usr.level < User.Level.Moderator && target.host.value !== usr.id.value)
        {
            request_failure("UpdateSessionSettings", res, "i'm afraid i can't let you do that");
            return;
        }

        if ('unlisted' in set && (typeof set.unlisted === 'boolean'))
        {
            // you can change unlisted status after a session is closed
            logger.debug(`user ${usr.id.readable} set session ${target.id.readable} to ${set.unlisted ? 'unlisted' : 'listed'}`);
            set.updated = await db.set_session_unlisted(target.id, set.unlisted);
        }

        if ('verified_only' in set && (typeof set.verified_only === 'boolean'))
        {
            // you can change verified_only after session is closed
            logger.debug(`user ${usr.id.readable} set session ${target.id.readable} to ${set.verified_only ? 'verified-only' : 'not verified-only'}`);
            set.updated = await db.set_session_verified_only(target.id, set.verified_only);
        }

        if ('auto_accept_verified' in set && (typeof set.auto_accept_verified === 'boolean'))
        {
            // you can change auto_accept_verified after session is closed
            logger.debug(`user ${usr.id.readable} set session ${target.id.readable} to ${set.auto_accept_verified ? 'auto-accept verified' : 'not auto-accept verified'}`);
            set.updated = await db.set_session_auto_accept_verified(target.id, set.auto_accept_verified);
        }

        if ('dodo' in set && (typeof set.dodo === 'string'))
        {
            if (target.status === Session.SessionStatus.Closed)
            {
                request_failure("UpdateSessionSettings", res, "session is already closed");
                return;
            }

            /*
            if (set.dodo === target.dodo)
            {
                res.status(400).json(new Req.FailedResponse("dodo is the same as before"));
                return;
            }
            */

            if ('dodo_leaked' in set
             && (typeof set.dodo_leaked === 'boolean')
             && set.dodo_leaked)
                leaked_dodo = target.dodo;

            try
            {
                Session.validate_session_dodo(set.dodo);
            }
            catch (err)
            {
                request_failure("UpdateSessionSettings", res, err.message);
                return;
            }

            logger.info(`user ${usr.id.readable} set dodo of session ${target.id.readable} to ${set.dodo}`);
            set.updated = await db.set_session_dodo(target.id, set.dodo);
        }

        if ('title' in set && (typeof set.title === 'string'))
        {
            if (target.status === Session.SessionStatus.Closed)
            {
                request_failure("UpdateSessionSettings", res, "session is already closed");
                return;
            }

            try
            {
                Session.validate_session_title(set.title);
            }
            catch (err)
            {
                request_failure("UpdateSessionSettings", res, err.message);
                return;
            }

            logger.debug(`user ${usr.id.readable} set title of session ${target.id.readable} to ${set.title}`);
            set.updated = await db.set_session_title(target.id, set.title);
        }

        if ('description' in set && (typeof set.description === 'string'))
        {
            if (target.status === Session.SessionStatus.Closed)
            {
                request_failure("UpdateSessionSettings", res, "session is already closed");
                return;
            }

            try
            {
                Session.validate_session_description(set.description);
            }
            catch (err)
            {
                request_failure("UpdateSessionSettings", res, err.message);
                return;
            }

            logger.debug(`user ${usr.id.readable} set description of session ${target.id.readable} to ${set.description}`);
            set.updated = await db.set_session_description(target.id, set.description);
        }

        if ('turnip_prices' in set && (typeof set.turnip_prices === 'number'))
        {
            if (target.status === Session.SessionStatus.Closed)
            {
                request_failure("UpdateSessionSettings", res, "session is already closed");
                return;
            }

            try
            {
                Session.validate_session_turnip_prices(set.turnip_prices);
            }
            catch (err)
            {
                request_failure("UpdateSessionSettings", res, err.message);
                return;
            }

            logger.debug(`user ${usr.id.readable} set turnip prices of session ${target.id.readable} to ${set.turnip_prices}`);
            set.updated = await db.set_session_turnip_prices(target.id, set.turnip_prices);
        }

        if ('public_requesters' in set && (typeof set.public_requesters === 'boolean'))
        {
            if (target.status === Session.SessionStatus.Closed)
            {
                request_failure("UpdateSessionSettings", res, "session is already closed");
                return;
            }

            logger.debug(`user ${usr.id.readable} set requesters of session ${target.id.readable} to ${set.public_requesters ? 'public' : 'private'}`);
            set.updated = await db.set_session_public_requesters(target.id, set.public_requesters);
        }

        if ('public_requester_count' in set && (typeof set.public_requester_count === 'boolean'))
        {
            if (target.status === Session.SessionStatus.Closed)
            {
                request_failure("UpdateSessionSettings", res, "session is already closed");
                return;
            }

            logger.debug(`user ${usr.id.readable} set requester count of session ${target.id.readable} to ${set.public_requester_count ? 'public' : 'private'}`);
            set.updated = await db.set_session_public_requester_count(target.id, set.public_requester_count);
        }

        if ('status' in set && (typeof set.status === 'number'))
        {
            if (target.status === Session.SessionStatus.Closed)
            {
                request_failure("UpdateSessionSettings", res, "session is already closed");
                return;
            }

            const status: Session.SessionStatus = set.status;

            /*
            if (status === target.status)
            {
                res.status(400).json(new Req.FailedResponse("status is the same as before"));
                return;
            }
            */

            if (Session.SessionStatusValues.indexOf(status) < 0)
            {
                request_failure("UpdateSessionSettings", res, "invalid status");
                return;
            }

            logger.info(`user ${usr.id.readable} set status of session ${target.id.readable} to ${status}`);
            set.updated = await db.set_session_status(target.id, status);

            if (status === Session.SessionStatus.Closed
             && 'dodo_leaked' in set && (typeof set.dodo_leaked === 'boolean')
             && set.dodo_leaked && leaked_dodo.length <= 0)
                leaked_dodo = target.dodo;
        }

        if (leaked_dodo.length > 0)
            await db.dodo_leaked(target.dodo, target.id);

        if ('dodo' in set)
        {
            const reqs = target.requesters.filter((r: Session.Requester) => r.got_dodo);

            for (const r of reqs)
                r.got_dodo = false;

            const updates = reqs.map((r: Session.Requester) => db.set_requester_got_dodo(r.session, r.user, false))
            await Promise.all(updates);

            // could be optimized...
            const notifs = reqs.map((r: Session.Requester) => sock.notify_requester_got_dodo_changed(r));
            await Promise.all(notifs);
        }

        await sock.session_changed(usr.id, target.id, set);

        res.status(200).json(new Req.UpdateSessionSettingsResponse());
    }
    catch (err)
    {
        error_handler(err, res);
        return;
    }
}

export async function GetDodo(req: express.Request, res: express.Response)
{
    try
    {
        const rreq = copy_from(Req.GetDodoRequest, req.body);

        if (rreq === undefined)
        {
            request_failure("GetDodo", res, "invalid request");
            return;
        }

        const id: SessionID = rreq.id;

        if (!is_valid_id(id))
        {
            request_failure("GetDodo", res, "invalid session ID");
            return;
        }

        const sess = await db.get_session_by_id(id);

        if (sess === undefined)
        {
            request_failure("GetDodo", res, "session not found");
            return;
        }

        const usr = res.locals.user;
        var isok = false;
        var got_dodo_already = false;

        for (const req of sess.requesters)
            if (req.user.value === usr.id.value)
            {
                isok = req.status === Session.RequesterStatus.Accepted;
                got_dodo_already = req.got_dodo;
                break;
            }

        // admins can always get dodo except when theyre blocked
        if (usr.level >= User.Level.Admin)
            isok = true

        if (!isok)
        {
            request_failure("GetDodo", res, "you do not have access to the dodo of this session");
            return;
        }

        const blocked = await db.has_user_blocked_id(sess.host, usr.id);

        if (blocked)
        {
            request_failure("GetDodo", res, "could not get dodo because the host has blocked you");
            return;
        }

        await db.register_dodo_obtained(usr.id, sess.id, sess.dodo);

        if (!got_dodo_already)
        {
            await db.set_requester_got_dodo(sess.id, usr.id, true);
            const req = await db.get_requester_by_id(sess.id, usr.id);

            await sock.notify_requester_got_dodo_changed(req);
        }

        logger.info(`user ${usr.id.readable} obtained dodo of session ${id.readable}`);
        res.status(200).json(new Req.GetDodoResponse(sess.dodo));
    }
    catch (err)
    {
        error_handler(err, res);
        return;
    }
}

export async function GetRuntimeSetting(req: express.Request, res: express.Response)
{
    try
    {
        const rreq = copy_from(Req.GetRuntimeSettingRequest, req.body);

        if (rreq === undefined)
        {
            request_failure("GetRuntimeSetting", res, "invalid request");
            return;
        }

        const usr: User.User = res.locals.user;

        const set = Settings.get_setting_by_key(rreq.key);

        if (set === undefined)
        {
            request_failure("GetRuntimeSetting", res, "setting does not exist");
            return;
        }

        if ((usr === undefined || usr.level < User.Level.Admin)
            && set.visibility === Settings.Visibility.AdminOnly)
        {
            request_failure("GetRuntimeSetting", res, "you do not have access to this setting");
            return;
        }

        const val = runtime_settings.get(set.key);

        logger.info(`user ${usr !== undefined ? usr.id.readable : '<anonymous>'} got runtime setting ${set.key}`);
        res.status(200).json(new Req.GetRuntimeSettingResponse(val));
    }
    catch (err)
    {
        error_handler(err, res);
        return;
    }
}

export async function SetRuntimeSetting(req: express.Request, res: express.Response)
{
    try
    {
        const rreq = copy_from(Req.SetRuntimeSettingRequest, req.body);

        if (rreq === undefined)
        {
            request_failure("SetRuntimeSetting", res, "invalid request");
            return;
        }

        const usr = res.locals.user;
        const set = Settings.get_setting_by_key(rreq.key);

        if (set === undefined)
        {
            request_failure("SetRuntimeSetting", res, "setting does not exist");
            return;
        }

        const val = copy_from(set.value_type, rreq.value);

        if (val === undefined)
        {
            request_failure("SetRuntimeSetting", res, "value type error / value is undefined");
            return;
        }

        runtime_settings.set(set.key, val);

        await runtime_settings.save_all();
        logger.info(`admin ${usr.id.readable} set setting ${set.key}`);
        res.status(200).json(new Req.SetRuntimeSettingResponse());
    }
    catch (err)
    {
        error_handler(err, res);
        return;
    }
}

export async function GetLogs(req: express.Request, res: express.Response)
{
    try
    {
        const rreq = copy_from(Req.GetLogsRequest, req.body);

        if (rreq === undefined)
        {
            request_failure("GetLogs", res, "invalid request");
            return;
        }

        if (!Number.isSafeInteger(rreq.page) || rreq.page < 0)
        {
            request_failure("GetLogs", res, "invalid page");
            return;
        }

        var resp: Req.GetLogsResponse = undefined;

        try
        {
            resp = await db.get_logs(rreq);
        }
        catch (err)
        {
            request_failure("GetLogs", res, err.message);
            return;
        }

        const uid = get_userid_by_tokenstring(rreq.token.value);
        logger.info(`user ${uid.readable} requested logs ('${rreq.search_text}')`);
        res.status(200).json(resp);
    }
    catch (err)
    {
        error_handler(err, res);
        return;
    }
}


class APIMethod
{
    constructor(
        public ep: APIEndpoint,
        public express_middlewares: any[]
    )
    {}

    register(app: express.Application)
    {
        let method = undefined;

        switch (this.ep.type)
        {
        case APIEndpointType.Get:
            method = app.get.bind(app);
            break;

        case APIEndpointType.Post:
            method = app.post.bind(app);
            break;
        }
        
        if (method !== undefined)
            method(this.ep.full_url, this.express_middlewares);
    }
}

const method = (ep: APIEndpoint, ...args: any[]): APIMethod =>
    new APIMethod(ep, args);

const methods: APIMethod[] = [
    method(endpoints.login, Login),
    method(endpoints.register, Register),
    method(endpoints.logout, authenticate, Logout),

    method(endpoints.username_taken, UsernameTaken),
    method(endpoints.dodo_in_use, authenticate, DodoInUse),

    method(endpoints.get_user, authenticate, GetUser),
    method(endpoints.get_self, authenticate, GetSelf),
    method(endpoints.get_users, authenticate, GetUsers),
    method(endpoints.get_session, optional_user, GetSession),
    method(endpoints.get_session_requesters, optional_user, GetSessionRequesters),
    method(endpoints.get_session_of_user, authenticate, GetSessionOfUser),
    method(endpoints.get_sessions, authenticate, GetSessions),
    method(endpoints.new_session, authenticate, NewSession),

    method(endpoints.get_dodo, authenticate, GetDodo),

    method(endpoints.update_user_settings, authenticate, UpdateUserSettings),
    method(endpoints.update_session_settings, authenticate, UpdateSessionSettings),

    method(endpoints.get_runtime_setting, optional_user, GetRuntimeSetting),
    method(endpoints.set_runtime_setting, authenticate, is_admin, SetRuntimeSetting),

    // admin stuff
    method(endpoints.advanced_register, authenticate, is_mod_or_admin, AdvancedRegister),
    method(endpoints.get_logs, authenticate, is_mod_or_admin, GetLogs)
];

export function register_all(app: express.Application)
{
    for (var ep of methods)
        ep.register(app);
}
