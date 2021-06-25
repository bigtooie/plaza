import * as sio from 'socket.io';
 
import { Token, TokenString } from '../shared/Token';
import { ID, UserID, SessionID, is_valid_readable_id, is_valid_id, is_valid_uuid } from '../shared/ID';
import { g } from '../shared/globals';
import { copy_from, empty_or_nothing } from '../shared/utils';

import * as User from '../shared/User';
import * as Session from '../shared/Session';
import * as Msg from '../shared/SocketMessages';

import * as logger from './log';
import * as login_sessions from './login_sessions';
import * as db from './db';

const USER_ROOM = (uid: UserID) => uid.value;
const WATCH_SESSION_ROOM = (sid: SessionID) => sid.value;
const WATCH_SESSION_REQUESTORS_ROOM = (sid: SessionID) => sid.value + "-req";
const WATCH_SESSION_REQUESTORS_CHANGES_ROOM = (sid: SessionID) => sid.value + "-req-chg";

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

function get_userid_from_socket(socket: sio.Socket): UserID
{
    if ('auth' in socket.handshake && 'token' in socket.handshake.auth)
    {
        const token_ = socket.handshake.auth.token;

        if (token_ !== undefined)
        {
            const token = new Token(token_);

            if (login_sessions.is_verified_token(token))
                return get_userid_by_tokenstring(token.value);
        }
    }

    return undefined;
}

async function get_user_from_socket(socket: sio.Socket): Promise<User.User>
{
    if ('auth' in socket.handshake && 'token' in socket.handshake.auth)
    {
        const token_ = socket.handshake.auth.token;

        if (token_ !== undefined)
        {
            const token = new Token(token_);

            if (login_sessions.is_verified_token(token))
                return get_user_by_tokenstring(token.value);
        }
    }

    return Promise.resolve(undefined);
}

var io: sio.Server = undefined;

function socket_callback<T>(socket: sio.Socket,
                            type: Msg.Message<T>,
                            cb: (msg: T) => void): void
{
    socket.on(type.ID, (msg_: any) =>
    {
        try
        {
            const msg = copy_from<T>(type, msg_);

            if (msg === undefined)
            {
                socket.emit(Msg.ErrorID, "invalid socket message");
                return;
            }

            cb(msg);
        }
        catch (err)
        {
            socket.emit(Msg.ErrorID, "something happened");
            logger.error(err);
        }
    });
}

function register_watch_session_callbacks(socket: sio.Socket, usr: User.User)
{
    socket_callback(socket, Msg.WatchSession, async (msg: Msg.WatchSession) =>
    {
        if (!is_valid_id(msg.session))
        {
            socket.emit(Msg.ErrorID, `invalid session ID`);
            return;
        }

        const sess = await db.get_session_by_id(msg.session);

        if (sess === undefined)
        {
            socket.emit(Msg.ErrorID, `no session found with ID ${msg.session.readable}`);
            return;
        }

        logger.info(`user ${usr ? usr.id.readable : '<anonymous>'} is now watching session ${sess.id.readable}`);
        socket.join(WATCH_SESSION_ROOM(sess.id));
    });

    socket_callback(socket, Msg.UnwatchSession, async (msg: Msg.UnwatchSession) =>
    {
        if (!is_valid_id(msg.session))
        {
            socket.emit(Msg.ErrorID, `invalid session ID`);
            return;
        }

        const sess = await db.get_session_by_id(msg.session);

        if (sess === undefined)
        {
            socket.emit(Msg.ErrorID, `no session found with ID ${msg.session.readable}`);
            return;
        }

        logger.info(`user ${usr ? usr.id.readable : '<anonymous>'} stopped watching session ${sess.id.readable}`);
        socket.leave(WATCH_SESSION_ROOM(sess.id));
    });

    socket_callback(socket, Msg.WatchSessionRequesters, async (msg: Msg.WatchSessionRequesters) =>
    {
        if (!is_valid_id(msg.session))
        {
            socket.emit(Msg.ErrorID, `invalid session ID`);
            return;
        }

        const sess = await db.get_session_by_id(msg.session);

        if (sess === undefined)
        {
            socket.emit(Msg.ErrorID, `no session found with ID ${msg.session.readable}`);
            return;
        }

        if (sess.public_requesters
         || (usr !== undefined && (usr.id.value === sess.host.value || usr.level >= User.Level.Moderator)))
        {
            logger.info(`user ${usr ? usr.id.readable : '<anonymous>'} is now watching requesters of session ${sess.id.readable}`);
            socket.join(WATCH_SESSION_REQUESTORS_ROOM(sess.id));
        }
        else
        {
            socket.emit(Msg.ErrorID, `you do not have permission to view requesters of this session`);
            return;
        }
    });

    socket_callback(socket, Msg.UnwatchSessionRequesters, async (msg: Msg.UnwatchSessionRequesters) =>
    {
        if (!is_valid_id(msg.session))
        {
            socket.emit(Msg.ErrorID, `invalid session ID`);
            return;
        }

        const sess = await db.get_session_by_id(msg.session);

        if (sess === undefined)
        {
            socket.emit(Msg.ErrorID, `no session found with ID ${msg.session.readable}`);
            return;
        }

        logger.info(`user ${usr ? usr.id.readable : '<anonymous>'} stopped watching requesters of session ${sess.id.readable}`);
        socket.leave(WATCH_SESSION_REQUESTORS_ROOM(sess.id));
    });

    socket_callback(socket, Msg.WatchSessionRequestersChanges, async (msg: Msg.WatchSessionRequestersChanges) =>
    {
        if (!is_valid_id(msg.session))
        {
            socket.emit(Msg.ErrorID, `invalid session ID`);
            return;
        }

        const sess = await db.get_session_by_id(msg.session);

        if (sess === undefined)
        {
            socket.emit(Msg.ErrorID, `no session found with ID ${msg.session.readable}`);
            return;
        }

        logger.info(`user ${usr.id.readable} is now watching changes of requesters of session ${sess.id.readable}`);
        socket.join(WATCH_SESSION_REQUESTORS_CHANGES_ROOM(sess.id));
    });

    socket_callback(socket, Msg.UnwatchSessionRequestersChanges, async (msg: Msg.UnwatchSessionRequestersChanges) =>
    {
        if (!is_valid_id(msg.session))
        {
            socket.emit(Msg.ErrorID, `invalid session ID`);
            return;
        }

        const sess = await db.get_session_by_id(msg.session);

        if (sess === undefined)
        {
            socket.emit(Msg.ErrorID, `no session found with ID ${msg.session.readable}`);
            return;
        }

        logger.info(`user ${usr.id.readable} stopped watching requesters of session ${sess.id.readable}`);
        socket.leave(WATCH_SESSION_REQUESTORS_CHANGES_ROOM(sess.id));
    });

}

async function notify_new_requester(req: Session.Requester)
{
    const room = WATCH_SESSION_REQUESTORS_ROOM(req.session);
    const sess = await db.get_session_by_id(req.session);

    const reqc = db.get_requester_count(sess);
    const publicreqc = db.get_public_requester_count(sess);

    for (const [_, socket] of io.sockets.sockets)
    {
        const uid = get_userid_from_socket(socket);
        const is_host = (uid !== undefined && uid.value === sess.host.value);

        if (!socket.rooms.has(room) && !is_host)
            continue;

        const usr = await get_user_from_socket(socket);
        const rv = await db.get_requesterview(usr, req);

        if (rv === undefined)
            continue;

        if (usr.level >= User.Level.Moderator
         || is_host)
            socket.emit(Msg.SessionChanged.ID, new Msg.SessionChanged(sess.id, {'requester_count': reqc}));
        else if (sess.public_requester_count)
            socket.emit(Msg.SessionChanged.ID, new Msg.SessionChanged(sess.id, {'requester_count': publicreqc}));

        socket.emit(Msg.NewRequester.ID, new Msg.NewRequester(rv));
    }
}

async function notify_requester_status_changed(req: Session.Requester)
{
    const room = WATCH_SESSION_REQUESTORS_CHANGES_ROOM(req.session);
    const sess = await db.get_session_by_id(req.session);

    const reqc = db.get_requester_count(sess);
    const publicreqc = db.get_public_requester_count(sess);

    for (const [_, socket] of io.sockets.sockets)
    {
        const uid = get_userid_from_socket(socket);
        const is_host = (uid !== undefined && uid.value === sess.host.value);
        const is_requester = (uid !== undefined && uid.value === req.user.value);

        if (!socket.rooms.has(room) && !is_host)
            continue;

        const usr = await get_user_from_socket(socket);
        const is_at_least_mod = (usr !== undefined && usr.level >= User.Level.Moderator);

        if (is_at_least_mod || is_host)
            socket.emit(Msg.SessionChanged.ID, new Msg.SessionChanged(sess.id, {'requester_count': reqc}));
        else if (sess.public_requester_count)
            socket.emit(Msg.SessionChanged.ID, new Msg.SessionChanged(sess.id, {'requester_count': publicreqc}));

        if (sess.public_requesters
         || is_at_least_mod
         || is_requester
         || is_host)
        {
            logger.info(`notifying user ${usr ? usr.id.readable : '<anonymous>'} that requester ${req.user.readable} of session ${sess.host.readable} changed state to ${req.status}`);
            socket.emit(Msg.RequesterUpdate.ID, new Msg.RequesterUpdate(req.session, req.user, { status: req.status }));
        }
    }
}

export async function notify_requester_got_dodo_changed(req: Session.Requester)
{
    const room = WATCH_SESSION_REQUESTORS_CHANGES_ROOM(req.session);
    const sess = await db.get_session_by_id(req.session);

    for (const [_, socket] of io.sockets.sockets)
    {
        const uid = get_userid_from_socket(socket);
        const is_host = (uid !== undefined && uid.value === sess.host.value);
        const is_requester = (uid !== undefined && uid.value === req.user.value);

        if (!socket.rooms.has(room) && !is_host)
            continue;

        const usr = await get_user_from_socket(socket);
        const is_at_least_mod = (usr !== undefined && usr.level >= User.Level.Moderator);

        if (sess.public_requesters
         || is_at_least_mod
         || is_requester
         || is_host)
        {
            logger.info(`notifying user ${usr ? usr.id.readable : '<anonymous>'} that requester ${req.user.readable} of session ${sess.host.readable} ${req.got_dodo ? 'got' : 'ungot'} dodo`);
            socket.emit(Msg.RequesterUpdate.ID, new Msg.RequesterUpdate(req.session, req.user, { got_dodo: req.got_dodo }));
        }
    }
}

function register_dodo_request_callbacks(socket: sio.Socket, usr: User.User)
{
    if (usr === undefined)
        return;

    socket_callback(socket, Msg.RequestDodo, async (msg: Msg.RequestDodo) =>
    {
        if (!is_valid_id(msg.session))
        {
            socket.emit(Msg.ErrorID, `invalid session ID`);
            return;
        }

        const sess = await db.get_session_by_id(msg.session);

        if (sess === undefined)
        {
            socket.emit(Msg.ErrorID, `no session found with ID ${msg.session.readable}`);
            return;
        }

        if (sess.status === Session.SessionStatus.Closed)
        {
            socket.emit(Msg.ErrorID, `this session is closed`);
            return;
        }

        const verified = await db.get_user_verified(usr.id);

        if (sess.verified_only)
        {
            if (!verified)
            {
                socket.emit(Msg.ErrorID, `cannot join because this session is verified-only`);
                return;
            }
        }

        const blocked = await db.has_user_blocked_id(sess.host, usr.id);
        if (blocked)
        {
            socket.emit(Msg.ErrorID, `cannot join because the host has blocked you`);
            return;
        }

        const requested = await db.has_user_requested_dodo(usr.id, sess.id)
        if (requested)
        {
            socket.emit(Msg.ErrorID, `you already requested dodo of this session`);
            return;
        }

        logger.info(`user ${usr.id.readable} requested dodo of session ${sess.id.readable}`);

        var auto_accept = false;

        if (verified && sess.auto_accept_verified)
        {
            auto_accept = true;
            logger.info(`user ${usr.id.readable} got auto-accepted to session ${sess.id.readable}`);
        }

        await db.user_requests_dodo(usr.id, sess.id, auto_accept);
        socket.join(WATCH_SESSION_REQUESTORS_CHANGES_ROOM(sess.id));

        // notify people
        const req = await db.get_requester_by_id(sess.id, usr.id);
        notify_new_requester(req);
        socket.emit(Msg.RequesterUpdate.ID, new Msg.RequesterUpdate(req.session, req.user, req.status));
    });

    socket_callback(socket, Msg.RequesterUpdate, async (msg: Msg.RequesterUpdate) =>
    {
        if (!is_valid_id(msg.session))
        {
            socket.emit(Msg.ErrorID, `invalid session ID`);
            return;
        }

        if (!is_valid_id(msg.user))
        {
            socket.emit(Msg.ErrorID, `invalid user ID`);
            return;
        }

        var status = msg.changes.status;

        if (status === undefined)
            return;

        const req = await db.get_requester_by_id(msg.session, msg.user);

        if (req === undefined)
        {
            // commented out to prevent brute force of requesters
            // socket.emit(Msg.ErrorID, `requester does not exist`);
            return;
        }

        const sess = await db.get_session_by_id(msg.session);

        if (sess === undefined)
        {
            socket.emit(Msg.ErrorID, `no session found with ID ${msg.session.readable}`);
            return;
        }

        if (status === Session.RequesterStatus.None)
        {
            socket.emit(Msg.ErrorID, `cant set requester status to none`);
            return;
        }

        if (usr.id.value === sess.host.value)
        {
            if (req.status === Session.RequesterStatus.None
             || req.status === Session.RequesterStatus.Withdrawn)
            {
                socket.emit(Msg.ErrorID, `player withdrew request`);
                return;
            }

            if (req.status === Session.RequesterStatus.Sent)
            if (status !== Session.RequesterStatus.Accepted
             && status !== Session.RequesterStatus.Rejected)
            {
                socket.emit(Msg.ErrorID, `invalid requester status`);
                return;
            }

            if (req.status === Session.RequesterStatus.Accepted
             || req.status === Session.RequesterStatus.Rejected)
            if (status !== Session.RequesterStatus.Withdrawn)
            {
                socket.emit(Msg.ErrorID, `invalid requester status`);
                return;
            }
        }
        else
        {
            // requester normal user
            if (req.user.value !== usr.id.value)
            {
                // commented out to prevent brute force of requesters
                // socket.emit(Msg.ErrorID, `cannot change requester status of other ppl`);
                return;
            }

            if (req.status === Session.RequesterStatus.Accepted
             || req.status === Session.RequesterStatus.Rejected)
            {
                socket.emit(Msg.ErrorID, `invalid requester status`);
                return;
            }

            if (req.status === Session.RequesterStatus.None
             || req.status === Session.RequesterStatus.Withdrawn)
            if (status !== Session.RequesterStatus.Sent)
            {
                socket.emit(Msg.ErrorID, `invalid requester status`);
                return;
            }

            if (req.status === Session.RequesterStatus.Sent
             && status !== Session.RequesterStatus.Withdrawn)
            {
                socket.emit(Msg.ErrorID, `invalid requester status`);
                return;
            }

            // auto-accept
            if ((req.status === Session.RequesterStatus.Withdrawn
                 || req.status === Session.RequesterStatus.None)
              && status === Session.RequesterStatus.Sent
              && sess.auto_accept_verified)
            {
                const verified = await db.get_user_verified(usr.id);
                if (verified)
                {
                    logger.info(`user ${usr.id.readable} got auto-accepted to session ${msg.session.readable}`);
                    status = Session.RequesterStatus.Accepted;
                }
            }
        }

        await db.set_requester_status(msg.session, msg.user, status);

        const req_ = await db.get_requester_by_id(msg.session, msg.user);
        notify_requester_status_changed(req_);

        logger.info(`user ${usr.id.readable} set requester status of ${req.user.readable} of session ${msg.session.readable} to ${status}`);
    });
}

export function init(server: any)
{
    io = new sio.Server(server, { path: g.socket_path });

    io.on("connection", async (socket: sio.Socket) =>
    {
        const usr = await get_user_from_socket(socket);

        logger.info(`user ${usr ? usr.id.readable : '<anonymous>'} connected to socket`);

        if (usr !== undefined)
            socket.join(USER_ROOM(usr.id));

        register_watch_session_callbacks(socket, usr);
        register_dodo_request_callbacks(socket, usr);
    });
}

function notify_public_session_settings_changed(changer: UserID, sid: SessionID, changes: any)
{
    io.to(WATCH_SESSION_ROOM(sid)) //.except(changer.value)
      .emit(Msg.SessionChanged.ID, new Msg.SessionChanged(sid, changes));
}

async function notify_dodo_changed(changer: UserID, sid: SessionID, changes: any)
{
    const room = WATCH_SESSION_ROOM(sid);
    const sess = await db.get_session_by_id(sid);
    const dodo = changes.dodo;

    if (sess === undefined)
        return;

    for (const [_, socket] of io.sockets.sockets)
    {
        if (!socket.rooms.has(room))
            continue;

        const usr = await get_user_from_socket(socket);

        if (usr.level >= User.Level.Moderator || usr.id.value === sess.host.value)
            socket.emit(Msg.SessionChanged.ID, new Msg.SessionChanged(sid, { updated: changes.updated, dodo: dodo }));
        else
            for (const req of sess.requesters)
                if (req.user.value === usr.id.value && req.status === Session.RequesterStatus.Accepted)
                {
                    socket.emit(Msg.SessionChanged.ID, new Msg.SessionChanged(sid, { updated:changes.updated, dodo: "" }));
                    break;
                }
    }
}

export async function session_changed(changer: UserID, sid: SessionID, changes: any)
{
    var public_changes: any = {};

    if ('unlisted' in changes)
        public_changes.unlisted = changes.unlisted;

    if ('title' in changes)
        public_changes.title = changes.title;

    if ('description' in changes)
        public_changes.description = changes.description;

    if ('turnip_prices' in changes)
        public_changes.turnip_prices = changes.turnip_prices;

    if ('public_requesters' in changes)
        public_changes.public_requesters = changes.public_requesters;

    if ('public_requester_count' in changes)
        public_changes.public_requester_count = changes.public_requester_count;

    if ('verified_only' in changes)
        public_changes.verified_only = changes.verified_only;

    if ('auto_accept_verified' in changes)
        public_changes.auto_accept_verified = changes.auto_accept_verified;

    if ('status' in changes)
        public_changes.status = changes.status;

    if ('updated' in changes)
        public_changes.updated = changes.updated;

    if ('dodo' in changes)
    {
        public_changes.dodo = changes.dodo;
        await notify_dodo_changed(changer, sid, changes);
    }
    else
    {
        // public
        if (!empty_or_nothing(public_changes))
            notify_public_session_settings_changed(changer, sid, public_changes);
    }
}
