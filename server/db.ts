// database connection

import * as util from 'util';
import { SHA3 } from 'sha3';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { ID, UserID, SessionID, prefix_uuid } from '../shared/ID';
import { g } from '../shared/globals';
import { clamp, remove_if, abbreviate_name, empty_or_nothing } from '../shared/utils';
import * as User from '../shared/User';
import * as Session from '../shared/Session';
import * as Logs from '../shared/Logs';
import * as Req from '../shared/RequestResponse';
import * as Settings from '../shared/RuntimeSettings';

import { default_admin_username, default_admin_password, db_password_bcrypt_rounds } from './secret/secret';
import { generate_test_data } from './testdata';
import * as dbcon from './db_connection';
import * as schema from './db_schema';
import * as runtime_settings from './runtime_settings';
import * as logger from './log';

async function hash_user_password(pw: string)
{
    const password = new SHA3(256).update(pw).digest('hex')
    return bcrypt.hash(password, db_password_bcrypt_rounds);
}

function current_expiration_date()
{
    const session_dur: number = runtime_settings.get(Settings.max_session_duration.key);
    return Date.now() - session_dur*60*60*1000;
}

export async function get_userview(viewer: User.User,
                                   viewed: User.User
                                  ): Promise<User.UserView>
{
    var uv = new User.UserView();
    uv.settings = new User.UserViewSettings();

    uv.id = viewed.id;
    uv.registered = viewed.registered;
    uv.settings.banned = viewed.banned;
    uv.settings.level = viewed.level;
    uv.settings.playername_hidden = viewed.playername_hidden;
    uv.settings.islandname_hidden = viewed.islandname_hidden;
    uv.verification_post = viewed.verification_post;
    uv.verifier = viewed.verifier;
    uv.username = "";

    if (viewed.playername_hidden)
        uv.playername = abbreviate_name(viewed.playername);
    else
        uv.playername = viewed.playername;

    if (viewed.islandname_hidden)
        uv.islandname = abbreviate_name(viewed.islandname);
    else
        uv.islandname = viewed.islandname;

    if (viewer !== undefined)
    {
        uv.settings.starred = await has_user_starred(viewer, viewed.id);
        uv.settings.blocked = await has_user_blocked(viewer, viewed.id);

        if (viewer.level >= User.Level.Admin
         || viewer.id.value === viewed.id.value)
        {
            // admin and self should see all
            uv.username = viewed.username;
            uv.playername = viewed.playername;
            uv.islandname = viewed.islandname;
        }
        else if (viewer.level >= User.Level.Moderator)
        {
            // mods can see playername and islandname
            uv.playername = viewed.playername;
            uv.islandname = viewed.islandname;
        }
    }
    else
    {
        uv.settings.starred = false;
        uv.settings.blocked = false;
    }

    return uv;
}

export function get_requester_count(sess: Session.Session): number[]
{
    const ret: number[] = [0, 0, 0, 0, 0];

    for (const req of sess.requesters)
        ret[req.status] += 1;

    return ret;
}

export function get_public_requester_count(sess: Session.Session): number[]
{
    const ret = get_requester_count(sess);
    ret[Session.RequesterStatus.None] = 0;
    ret[Session.RequesterStatus.Withdrawn] = 0;
    ret[Session.RequesterStatus.Rejected] = 0;

    return ret;
}

export async function get_sessionview(viewer: User.User,
                                      sess: Session.Session
                                     ): Promise<Session.SessionView>
{
    var sv = new Session.SessionView();
    sv.settings = new Session.SessionViewSettings();
    sv.settings.title = sess.title;
    sv.settings.description = sess.description;
    sv.settings.turnip_prices = sess.turnip_prices;
    sv.settings.status = sess.status;
    sv.settings.unlisted = sess.unlisted;
    sv.settings.public_requesters = sess.public_requesters;
    sv.settings.public_requester_count = sess.public_requester_count;
    sv.settings.verified_only = sess.verified_only;
    sv.settings.auto_accept_verified = sess.auto_accept_verified;
    sv.settings.dodo = '';

    sv.id = sess.id;
    sv.created = sess.created;
    sv.updated = sess.updated;
    sv.requester_status = Session.RequesterStatus.None;
    sv.requester_count = [0, 0, 0, 0, 0];

    if (sess.public_requester_count)
        sv.requester_count = get_public_requester_count(sess);

    if (viewer !== undefined)
    {
        const host_or_mod = (viewer.id.value === sess.host.value
                          || viewer.level >= User.Level.Moderator);

        if (host_or_mod)
        {
            sv.settings.dodo = sess.dodo;
            sv.requester_count = get_requester_count(sess);
        }

        for (const req of sess.requesters)
            if (req.user.value === viewer.id.value)
                sv.requester_status = req.status;
    }

    const host = await get_user_by_id(sess.host);
    sv.host = await get_userview(viewer, host);

    return sv;
}

export async function get_requesterview_of_session(viewer: User.User,
                                                   session: Session.Session,
                                                   req: Session.Requester
                                                  ): Promise<Session.RequesterView>
{
    if (viewer === undefined || req === undefined)
        return undefined;

    var rv = new Session.RequesterView();

    if (viewer.id.value === req.user.value)
    {
        rv.user = await get_userview(viewer, viewer);
        rv.session = req.session;
        rv.status = req.status;
        rv.got_dodo = req.got_dodo;
    }
    else if (session.public_requesters
          || (viewer.id.value === session.host.value)
          || viewer.level >= User.Level.Admin)
    {
        const viewed = await get_user_by_id(req.user);
        rv.user = await get_userview(viewer, viewed);
        rv.session = req.session;
        rv.status = req.status;
        rv.got_dodo = req.got_dodo;
    }
    else
        return undefined;

    return rv;
}

export async function get_requesterview(viewer: User.User, req: Session.Requester): Promise<Session.RequesterView>
{
    if (viewer === undefined || req === undefined)
        return undefined;

    const sess = await get_session_by_id(req.session);

    return get_requesterview_of_session(viewer, sess, req);
}

export async function get_user_verified(uid: UserID): Promise<boolean>
{
    const usr = await get_user_by_id(uid);

    if (usr === undefined)
        return false;

    return usr.verification_post.length > 0 || usr.level > User.Level.Moderator;
}

export function has_user_starred_u(user: User.User, target: UserID): boolean
{
    for (const u of user.starred)
        if (u.value === target.value)
            return true;

    return false;
}

export async function has_user_starred_id(uid: UserID, target: UserID): Promise<boolean>
{
    var filterDoc: any = {};
    filterDoc[schema.users.uuid] = uid.value;
    filterDoc[`${schema.users.starred}.uuid`] = target.value;

    const c = await dbcon.users().findOne(filterDoc);

    return (c !== null && c !== undefined);
}

export async function has_user_starred(user: User.User, target: UserID): Promise<boolean>
{
    if (user.starred.length > 100)
        return has_user_starred_id(user.id, target);
    else
        return has_user_starred_u(user, target);
}

export function has_user_blocked_u(user: User.User, target: UserID): boolean
{
    for (const u of user.blocked)
        if (u.value === target.value)
            return true;

    return false;
}

export async function has_user_blocked_id(uid: UserID, target: UserID): Promise<boolean>
{
    var filterDoc: any = {};
    filterDoc[schema.users.uuid] = uid.value;
    filterDoc[`${schema.users.blocked}.uuid`] = target.value;

    const c = await dbcon.users().findOne(filterDoc);

    return (c !== null && c !== undefined);
}

export async function has_user_blocked(user: User.User, target: UserID): Promise<boolean>
{
    if (user.blocked.length > 100)
        return has_user_blocked_id(user.id, target);
    else
        return has_user_blocked_u(user, target);
}

export async function get_public_sessionview(sess: Session.Session): Promise<Session.SessionView>
{
    return get_sessionview(undefined, sess);
}

export async function register_user(username: string,
                                    playername: string,
                                    islandname: string,
                                    password: string,
                                    id_prefix: string = "",
                                    level: User.Level = User.Level.Normal
                                   ): Promise<User.User>
{
    var id = uuidv4();

    if (id_prefix !== undefined && id_prefix.length > 0)
        id = prefix_uuid(id, id_prefix);

    var usr = new User.User();
    usr.id = new UserID(id);
    usr.username = username;
    usr.playername = playername;
    usr.playername_hidden = true;
    usr.islandname = islandname;
    usr.islandname_hidden = true;
    
    usr.password = await hash_user_password(password);
    usr.registered = new Date();
    usr.level = level
    usr.banned = false;
    usr.starred = [];
    usr.blocked = [];
    usr.verification_post = "";
    usr.verifier = undefined;

    await dbcon.users().insertOne({
        uuid: usr.id.value,
        rid: usr.id.readable,
        username: usr.username,
        playername: usr.playername,
        playername_hidden: usr.playername_hidden,
        islandname: usr.islandname,
        islandname_hidden: usr.islandname_hidden,
        password: usr.password,
        registered: usr.registered,
        level: usr.level,
        banned: usr.banned,
        starred: usr.starred,
        blocked: usr.blocked,
        verification_post: usr.verification_post,
        verifier_uuid: undefined,
        verifier_rid: undefined
    });

    return usr;
}

export async function check_user_password(usr: User.User, pw: string)
{
    const hash = new SHA3(256).update(pw).digest('hex');
    return bcrypt.compare(hash, usr.password);
}

function get_user_from_result(c: any): User.User
{
    if (c === null || c === undefined)
        return undefined;

    if ('uuid' in c && 'rid' && c)
        c.id = new UserID(c.uuid, c.rid);

    const nstars: UserID[] = [];

    if ('starred' in c)
        for (const star of c.starred)
            nstars.push(new UserID(star.uuid, star.rid));

    c.starred = nstars;

    const nblocks: UserID[] = [];

    if ('blocked' in c)
        for (const block of c.blocked)
            nblocks.push(new UserID(block.uuid, block.rid));
            
    c.blocked = nblocks;

    if ('verifier_uuid' in c && c.verifier_uuid
     && 'verifier_rid' in c && c.verifier_rid)
        c.verifier = new UserID(c.verifier_uuid, c.verifier_rid);

    return User.User.copy(c);
}

export async function get_user_by_id(id: UserID): Promise<User.User>
{
    const c: any = await dbcon.users().findOne({uuid: id.value});

    return get_user_from_result(c);
}

export async function get_user_by_readable_id(id: string): Promise<User.User>
{
    const c: any = await dbcon.users().findOne({rid: id});

    return get_user_from_result(c);
}

export async function get_user_by_username(username: string): Promise<User.User>
{
    const c: any = await dbcon.users().findOne({username: username});

    return get_user_from_result(c);
}

export async function username_taken(username: string): Promise<boolean>
{
    const r = await get_user_by_username(username);
    return r !== undefined;
}

export async function dodo_in_use(dodo: string): Promise<boolean>
{
    if (!runtime_settings.get(Settings.dodo_in_use_api.key))
        return false;

    const max_dur_date = current_expiration_date();

    var filterDoc: any = {};
    filterDoc[schema.sessions.dodo] = dodo.toUpperCase();
    filterDoc[schema.sessions.status] = { $ne: Session.SessionStatus.Closed };
    filterDoc[schema.sessions.created] = { $gt: new Date(max_dur_date) };

    const c = await dbcon.sessions().findOne(filterDoc);
    return (c !== null && c !== undefined);
}

export async function get_users(usr: User.User,
                                rreq: Req.GetUsersRequest
                               ): Promise<Req.GetUsersResponse>
{
    const perpage = g.results_per_page;

    var filterDoc: any = {};
    var and_conditions: any[] = [];

    if (rreq.search_text.length > 0)
    {
        const regexDoc: any = { $regex: rreq.search_text, $options: 'i' };
        var cd: any = {};

        switch (rreq.search_text_category)
        {
        case Req.GetUsersSearchTextCategory.ID:
        {
            cd[schema.users.rid] = regexDoc;
            break;
        }
        case Req.GetUsersSearchTextCategory.Name:
        {
            var playername: string = "";
            var islandname: string = "";
            var combined: boolean = false;

            if (rreq.search_text.trim().toLowerCase() === "from")
            {
                playername = rreq.search_text;
                islandname = rreq.search_text;
                combined = false;
            }
            else
            {
                // split if by "from" to get the parts to search for
                const split = rreq.search_text.split(" from ").map(s => s.trim());

                if (split.length === 1)
                {
                    playername = rreq.search_text;
                    islandname = rreq.search_text;
                    combined = false;
                }
                else if (split.length === 2)
                {
                    playername = split[0];
                    islandname = split[1];
                    combined = true;
                }
                else
                    break;
            }

            if (playername.length <= 0 || islandname.length <= 0)
                break;

            if (playername === "*" && islandname === "*")
                break;

            if (playername !== "*")
                var r1 = new RegExp(playername);

            if (islandname !== "*")
                var r2 = new RegExp(islandname);

            const playernameDoc: any = { $regex: playername, $options: 'i' };
            const playernameDoc_first: any = { $regex: `^${playername}`, $options: 'i' };
            const islandnameDoc: any = { $regex: islandname, $options: 'i' };
            const islandnameDoc_first: any = { $regex: `^${islandname}`, $options: 'i' };

            if (usr.level < User.Level.Moderator)
            {
                var playername_searchDoc: any = {};
                var islandname_searchDoc: any = {};

                if (playername !== "*")
                {
                    var playername_orDoc: any[] = [{}, {}];
                    playername_orDoc[0][schema.users.uuid] = { $eq: usr.id.value };
                    playername_orDoc[1][schema.users.playername_hidden] = { $eq: false };

                    var playername_andDoc: any[] = [{}, {}];
                    playername_andDoc[0]['$or'] = playername_orDoc;
                    playername_andDoc[1][schema.users.playername] = playernameDoc;

                    // sorry multi-word-name people
                    if (playername.length === 1)
                    {
                        var playername_andDoc2: any[] = [{}, {}];
                        playername_andDoc2[0][schema.users.playername_hidden] = { $eq: true };
                        playername_andDoc2[1][schema.users.playername] = playernameDoc_first;

                        var playername_orDoc2: any[] = [{}, {}];
                        playername_orDoc2[0]['$and'] = playername_andDoc;
                        playername_orDoc2[1]['$and'] = playername_andDoc2;
                        playername_searchDoc['$or'] = playername_orDoc2;
                    }
                    else
                        playername_searchDoc['$and'] = playername_andDoc;
                }

                if (islandname !== "*")
                {
                    var islandname_orDoc: any[] = [{}, {}];
                    islandname_orDoc[0][schema.users.uuid] = { $eq: usr.id.value };
                    islandname_orDoc[1][schema.users.islandname_hidden] = { $eq: false };

                    var islandname_andDoc: any[] = [{}, {}];
                    islandname_andDoc[0]['$or'] = islandname_orDoc;
                    islandname_andDoc[1][schema.users.islandname] = islandnameDoc;

                    // sorry multi-word-island people
                    if (islandname.length === 1)
                    {
                        var islandname_andDoc2: any[] = [{}, {}];
                        islandname_andDoc2[0][schema.users.islandname_hidden] = { $eq: true };
                        islandname_andDoc2[1][schema.users.islandname] = islandnameDoc_first;

                        var islandname_orDoc2: any[] = [{}, {}];
                        islandname_orDoc2[0]['$and'] = islandname_andDoc;
                        islandname_orDoc2[1]['$and'] = islandname_andDoc2;
                        islandname_searchDoc['$or'] = islandname_orDoc2;
                    }
                    else
                        islandname_searchDoc['$and'] = islandname_andDoc;
                }

                if (combined)
                {
                    if (playername !== "*")
                        and_conditions.push(playername_searchDoc);

                    if (islandname !== "*")
                        and_conditions.push(islandname_searchDoc);
                }
                else if (playername !== "*" && islandname !== "*")
                {
                    var orDoc: any[] = [{}, {}];
                    orDoc[0] = playername_searchDoc;
                    orDoc[1] = islandname_searchDoc;

                    and_conditions.push({ $or: orDoc });
                }
                else if (playername !== "*")
                    and_conditions.push(playername_searchDoc)
                else if (islandname !== "*")
                    and_conditions.push(islandname_searchDoc)
            }
            else
            {
                if (combined)
                {
                    if (playername !== "*")
                        cd[schema.users.playername] = playernameDoc;

                    if (islandname !== "*")
                        cd[schema.users.islandname] = islandnameDoc;
                }
                else if (playername !== "*" && islandname !== "*")
                {
                    var orDoc: any[] = [{}, {}];
                    orDoc[0][schema.users.playername] = playernameDoc;
                    orDoc[1][schema.users.islandname] = islandnameDoc;

                    and_conditions.push({ $or: orDoc });
                }
                else if (playername !== "*")
                    cd[schema.users.playername] = playernameDoc;
                else if (islandname !== "*")
                    cd[schema.users.islandname] = islandnameDoc;
            }

            break;
        }
        case Req.GetUsersSearchTextCategory.Username:
        {
            if (usr.level < User.Level.Admin)
                break;

            cd[schema.users.username] = regexDoc;
            break;
        }
        }

        if (!empty_or_nothing(cd))
            and_conditions.push(cd);
    }

    /*
     * sincerely: fuck mongodb devs, what the fuck went through your tiny pea brains
     * when you fucking made aggregate()? why are there no joins in find()?
     * what the fuck is your problem?
     * you're not developers. you're pathetic. stop using computers.
     */
    const get_pipeline = (type: string): any[] =>
    {
        const match: any = {};
        match[schema.users.uuid] = usr.id.value;

        const set1: any = { };
        set1[`join-${type}`] = { $first: `\$join-${type}-result` };
        const set2: any = {};
        set2[`${type}_by_x`] = { $in: [`\$${schema.users.uuid}`, `\$join-${type}.${type}.uuid`] };

        const projection: any = {};
        projection[type] = 1;
        projection['_id'] = 0;
        
        return [
            { $lookup:
                { from: 'users',
                  pipeline: [
                      { $match: match },
                      { $project: projection }
                  ],
                  as: `join-${type}-result`
                }
            },
            { $set: set1 },
            { $set: set2 }
        ]
    };

    const starred_pipeline: any[] = get_pipeline(schema.users.starred);
    const blocked_pipeline: any[] = get_pipeline(schema.users.blocked);

    switch (rreq.starred_filter)
    {
    case (Req.SearchFilter.None):
        starred_pipeline.splice(0, starred_pipeline.length);
        break;
    case (Req.SearchFilter.Only):
        starred_pipeline.push({ $match: { 'starred_by_x': true } });
        break;
    case (Req.SearchFilter.Hide):
        starred_pipeline.push({ $match: { 'starred_by_x': false } });
        break;
    }

    switch (rreq.blocked_filter)
    {
    case (Req.SearchFilter.None):
        blocked_pipeline.splice(0, blocked_pipeline.length);
        break;
    case (Req.SearchFilter.Only):
        blocked_pipeline.push({ $match: { 'blocked_by_x': true } });
        break;
    case (Req.SearchFilter.Hide):
        blocked_pipeline.push({ $match: { 'blocked_by_x': false } });
        break;
    }

    if (and_conditions.length > 0)
    {
        if (and_conditions.length === 1 && Array.isArray(and_conditions[0]))
            and_conditions = and_conditions[0]; // ????????????????

        filterDoc['$and'] = and_conditions;
    }

    // response
    var resp = new Req.GetUsersResponse();
    resp.users = [];
    resp.page = 0;
    resp.pages = 0;

    const sortDoc: any = {};
    sortDoc[schema.users.registered] = rreq.reversed ? -1 : 1;

    const pipeline: any[] = [];

    if (!empty_or_nothing(filterDoc))
        pipeline.push({ $match: filterDoc });

    pipeline.push({ $sort: sortDoc });

    pipeline.push.apply(pipeline, starred_pipeline);
    pipeline.push.apply(pipeline, blocked_pipeline);
    pipeline.push({
        $facet:
        {
            totalcount: [{$count: "count"}],
            matches: [{ $skip: rreq.page * perpage }, { $limit: perpage }]
        }
    });

    const agg = await dbcon.users().aggregate(pipeline);

    for await (const a of agg)
    {
        if (!('totalcount' in a) || !Array.isArray(a.totalcount) || a.totalcount.length < 1)
            return resp;

        const count: number = a.totalcount[0].count;
        const cur = a.matches;

        if (count === undefined || count === null || count <= 0)
            return resp;

        const pages = Math.max(Math.ceil(count / perpage), 1);
        var page = clamp(rreq.page, 0, pages - 1);

        resp.pages = pages;
        resp.page = page;

        for (const c of cur)
        {
            const u = get_user_from_result(c);

            if (u === undefined)
                continue;

            const uv = await get_userview(usr, u);
            resp.users.push(uv);
        }

        break;
    }

    return resp;
}

export async function get_sessions(viewer: User.User,
                                   rreq: Req.GetSessionsRequest
                                  ): Promise<Req.GetSessionsResponse>
{
    const perpage = g.results_per_page;

    var filterDoc: any = {};
    var and_conditions: any[] = [];

    // mods and above can see all sessions
    // and hosts can see their own sessions
    if (viewer.level < User.Level.Moderator)
    {
        var orDoc: any[] = [{}, {}];
        orDoc[0][schema.sessions.unlisted] = false;
        orDoc[1][schema.sessions.host.uuid] = viewer.id.value;

        and_conditions.push({ $or: orDoc });
    }

    if (rreq.min_turnip_price > 0)
    {
        var fdoc: any = {};
        fdoc[schema.sessions.turnip_prices] = { $gte: rreq.min_turnip_price };
        and_conditions.push(fdoc)
    }

    var status_filterDoc: any = {}
    const max_dur_date = current_expiration_date();
    
    switch (rreq.status_filter)
    {
    case (Req.SessionStatusSearchFilter.All):
        break;
    case (Req.SessionStatusSearchFilter.Open):
    {
        status_filterDoc[schema.sessions.status] = Session.SessionStatus.Open;
        status_filterDoc[schema.sessions.created] = { $gt: new Date(max_dur_date) };
        break;
    }
    case (Req.SessionStatusSearchFilter.Full):
    {
        status_filterDoc[schema.sessions.status] = Session.SessionStatus.Full;
        status_filterDoc[schema.sessions.created] = { $gt: new Date(max_dur_date) };
        break;
    }
    case (Req.SessionStatusSearchFilter.OpenOrFull):
    {
        status_filterDoc[schema.sessions.status] = { $in: [Session.SessionStatus.Open, Session.SessionStatus.Full] };
        status_filterDoc[schema.sessions.created] = { $gt: new Date(max_dur_date) };
        break;
    }
    case (Req.SessionStatusSearchFilter.Closed):
    {
        var orDoc: any[] = [{}, {}];
        orDoc[0][schema.sessions.status] = Session.SessionStatus.Closed;
        orDoc[1][schema.sessions.created] = { $lte: new Date(max_dur_date) };

        status_filterDoc['$or'] = orDoc;
    }
    }

    if (!empty_or_nothing(status_filterDoc))
        and_conditions.push(status_filterDoc);
    
    const get_pipeline = (type: string): any[] =>
    {
        const match: any = {};
        match[schema.users.uuid] = viewer.id.value;

        const set1: any = { };
        set1[`join-${type}`] = { $first: `\$join-${type}-result` };
        const set2: any = {};
        set2[`${type}_by_x`] = { $in: [`\$${schema.sessions.host.uuid}`, `\$join-${type}.${type}.uuid`] };

        const projection: any = {};
        projection[type] = 1;
        projection['_id'] = 0;
        
        return [
            { $lookup:
                { from: 'users',
                  pipeline: [
                      { $match: match },
                      { $project: projection }
                  ],
                  as: `join-${type}-result`
                }
            },
            { $set: set1 },
            { $set: set2 }
        ]
    };

    const starred_pipeline: any[] = get_pipeline(schema.users.starred);
    const blocked_pipeline: any[] = get_pipeline(schema.users.blocked);

    switch (rreq.host_starred_filter)
    {
    case (Req.SearchFilter.None):
        starred_pipeline.splice(0, starred_pipeline.length);
        break;
    case (Req.SearchFilter.Only):
        starred_pipeline.push({ $match: { 'starred_by_x': true } });
        break;
    case (Req.SearchFilter.Hide):
        starred_pipeline.push({ $match: { 'starred_by_x': false } });
        break;
    }

    switch (rreq.host_blocked_filter)
    {
    case (Req.SearchFilter.None):
        blocked_pipeline.splice(0, blocked_pipeline.length);
        break;
    case (Req.SearchFilter.Only):
        blocked_pipeline.push({ $match: { 'blocked_by_x': true } });
        break;
    case (Req.SearchFilter.Hide):
        blocked_pipeline.push({ $match: { 'blocked_by_x': false } });
        break;
    }

    var host_joinDoc: any[] = [
        {
            $lookup:
            {
                from: 'users',
                let: { hostid: `\$${schema.sessions.host.uuid}` },
                pipeline: [
                    { $match: { $expr: { $eq: [`\$${schema.users.uuid}`, '$$hostid']} } }
                ],
                as: 'host_user_result'
            }
        },
        {
            $set: { 'host_user': { $first: '$host_user_result' } },
        }
    ];

    if (viewer.level < User.Level.Moderator)
    {
        host_joinDoc.push({
            $set: { 'blocked_by_host': { $in: [viewer.id.value, `\$host_user.${schema.users.blocked}.${schema.users.uuid}`] } }
        });

        host_joinDoc.push({ $match: { 'blocked_by_host': false } });
    }

    const host_verifiedDoc: any = {};

    switch (rreq.host_verified_filter)
    {
    case (Req.OnlySearchFilter.None):
        break;
    case (Req.OnlySearchFilter.Only):
        host_verifiedDoc['$match'] = 
            {
                $or:
                [
                    {'host_user.level': { $gte: User.Level.Verifier }},
                    { $expr: { $gt: [ {'$strLenCP': '$host_user.verification_post'}, 0] }}
                ]
            };
        break;
    }

    var session_searchDoc: any = {};

    if (rreq.search_text.length > 0)
    {
        const regexDoc: any = { $regex: rreq.search_text, $options: 'i' };

        switch (rreq.search_text_category)
        {
            case Req.GetSessionsSearchTextCategory.ID:
            {
                session_searchDoc[schema.sessions.rid] = regexDoc;
                break;
            }
            case Req.GetSessionsSearchTextCategory.HostID:
            {
                session_searchDoc[`host_user.${schema.users.rid}`] = regexDoc;
                break;
            }
            case Req.GetSessionsSearchTextCategory.Host:
            {
                var playername: string = "";
                var islandname: string = "";
                var combined: boolean = false;

                if (rreq.search_text.trim().toLowerCase() === "from")
                {
                    playername = rreq.search_text;
                    islandname = rreq.search_text;
                    combined = false;
                }
                else
                {
                    // split if by "from" to get the parts to search for
                    const split = rreq.search_text.split(" from ").map(s => s.trim());

                    if (split.length === 1)
                    {
                        playername = rreq.search_text;
                        islandname = rreq.search_text;
                        combined = false;
                    }
                    else if (split.length === 2)
                    {
                        playername = split[0];
                        islandname = split[1];
                        combined = true;
                    }
                    else
                        break;
                }

                if (playername.length <= 0 || islandname.length <= 0)
                    break;

                if (playername === "*" && islandname === "*")
                    break;

                if (playername !== "*")
                    var r1 = new RegExp(playername);

                if (islandname !== "*")
                    var r2 = new RegExp(islandname);

                const playernameDoc: any = { $regex: playername, $options: 'i' };
                const playernameDoc_first: any = { $regex: `^${playername}`, $options: 'i' };
                const islandnameDoc: any = { $regex: islandname, $options: 'i' };
                const islandnameDoc_first: any = { $regex: `^${islandname}`, $options: 'i' };

                if (viewer.level < User.Level.Moderator)
                {
                    var playername_searchDoc: any = {};
                    var islandname_searchDoc: any = {};

                    if (playername !== "*")
                    {
                        var playername_orDoc: any[] = [{}, {}];
                        playername_orDoc[0][`host_user.${schema.users.uuid}`] = { $eq: viewer.id.value };
                        playername_orDoc[1][`host_user.${schema.users.playername_hidden}`] = { $eq: false };

                        var playername_andDoc: any[] = [{}, {}];
                        playername_andDoc[0]['$or'] = playername_orDoc;
                        playername_andDoc[1][`host_user.${schema.users.playername}`] = playernameDoc;

                        // sorry multi-word-name people
                        if (playername.length === 1)
                        {
                            var playername_andDoc2: any[] = [{}, {}];
                            playername_andDoc2[0][`host_user.${schema.users.playername_hidden}`] = { $eq: true };
                            playername_andDoc2[1][`host_user.${schema.users.playername}`] = playernameDoc_first;

                            var playername_orDoc2: any[] = [{}, {}];
                            playername_orDoc2[0]['$and'] = playername_andDoc;
                            playername_orDoc2[1]['$and'] = playername_andDoc2;
                            playername_searchDoc['$or'] = playername_orDoc2;
                        }
                        else
                            playername_searchDoc['$and'] = playername_andDoc;
                    }

                    if (islandname !== "*")
                    {
                        var islandname_orDoc: any[] = [{}, {}];
                        islandname_orDoc[0][`host_user.${schema.users.uuid}`] = { $eq: viewer.id.value };
                        islandname_orDoc[1][`host_user.${schema.users.islandname_hidden}`] = { $eq: false };

                        var islandname_andDoc: any[] = [{}, {}];
                        islandname_andDoc[0]['$or'] = islandname_orDoc;
                        islandname_andDoc[1][`host_user.${schema.users.islandname}`] = islandnameDoc;

                        // sorry multi-word-island people
                        if (islandname.length === 1)
                        {
                            var islandname_andDoc2: any[] = [{}, {}];
                            islandname_andDoc2[0][`host_user.${schema.users.islandname_hidden}`] = { $eq: true };
                            islandname_andDoc2[1][`host_user.${schema.users.islandname}`] = islandnameDoc_first;

                            var islandname_orDoc2: any[] = [{}, {}];
                            islandname_orDoc2[0]['$and'] = islandname_andDoc;
                            islandname_orDoc2[1]['$and'] = islandname_andDoc2;
                            islandname_searchDoc['$or'] = islandname_orDoc2;
                        }
                        else
                            islandname_searchDoc['$and'] = islandname_andDoc;
                    }

                    if (combined)
                    {
                        if (playername !== "*")
                            session_searchDoc['$and'] = [playername_searchDoc];

                        if (islandname !== "*")
                            session_searchDoc['$and'] = [islandname_searchDoc];
                    }
                    else if (playername !== "*" && islandname !== "*")
                    {
                        var orDoc: any[] = [{}, {}];
                        orDoc[0] = playername_searchDoc;
                        orDoc[1] = islandname_searchDoc;

                        session_searchDoc['$or'] = [playername_searchDoc];
                    }
                    else if (playername !== "*")
                        session_searchDoc['$and'] = [playername_searchDoc];
                    else if (islandname !== "*")
                        session_searchDoc['$and'] = [islandname_searchDoc];
                }
                else
                {
                    if (combined)
                    {
                        if (playername !== "*")
                            session_searchDoc[`host_user.${schema.users.playername}`] = playernameDoc;

                        if (islandname !== "*")
                            session_searchDoc[`host_user.${schema.users.islandname}`] = islandnameDoc;
                    }
                    else if (playername !== "*" && islandname !== "*")
                    {
                        var orDoc: any[] = [{}, {}];
                        orDoc[0][`host_user.${schema.users.playername}`] = playernameDoc;
                        orDoc[1][`host_user.${schema.users.islandname}`] = islandnameDoc;

                        session_searchDoc['$or'] = orDoc;
                    }
                    else if (playername !== "*")
                        session_searchDoc[`host_user.${schema.users.playername}`] = playernameDoc;
                    else if (islandname !== "*")
                        session_searchDoc[`host_user.${schema.users.islandname}`] = playernameDoc;
                }

                break;
            }
            case Req.GetSessionsSearchTextCategory.Title:
            {
                session_searchDoc[schema.sessions.title] = regexDoc;
                break;
            }
            case Req.GetSessionsSearchTextCategory.Description:
            {
                session_searchDoc[schema.sessions.description] = regexDoc;
                break;
            }
            case Req.GetSessionsSearchTextCategory.Username:
            {
                // only admin can see usernames
                if (viewer.level < User.Level.Admin)
                    break;

                session_searchDoc[`host_user.${schema.users.username}`] = regexDoc;

                break;
            }
        }
    }

    // response
    var resp = new Req.GetSessionsResponse();
    resp.sessions = [];
    resp.page = 0;
    resp.pages = 0;

    const sortDoc: any = {};

    switch (rreq.order_by)
    {
    case (Req.GetSessionsOrderCategory.Created):
        sortDoc[schema.sessions.created] = rreq.reversed ? -1 : 1;
        break;
    case (Req.GetSessionsOrderCategory.Updated):
        sortDoc[schema.sessions.updated] = rreq.reversed ? -1 : 1;
        break;
    }

    const pipeline: any[] = [];

    if (and_conditions.length > 0)
    {
        if (and_conditions.length === 1 && Array.isArray(and_conditions[0]))
            and_conditions = and_conditions[0]; // ????????????????

        filterDoc['$and'] = and_conditions;
    }

    if (!empty_or_nothing(filterDoc))
        pipeline.push({ $match: filterDoc });

    pipeline.push.apply(pipeline, host_joinDoc);

    if (!empty_or_nothing(host_verifiedDoc))
        pipeline.push(host_verifiedDoc);

    if (!empty_or_nothing(session_searchDoc))
        pipeline.push({ $match: session_searchDoc});

    pipeline.push.apply(pipeline, starred_pipeline);
    pipeline.push.apply(pipeline, blocked_pipeline);
    pipeline.push({ $sort: sortDoc });

    pipeline.push({
        $facet:
        {
            totalcount: [{$count: "count"}],
            matches: [{ $skip: rreq.page * perpage }, { $limit: perpage }]
        }
    });

    const agg = await dbcon.sessions().aggregate(pipeline);

    for await (const a of agg)
    {
        if (!('totalcount' in a) || !Array.isArray(a.totalcount) || a.totalcount.length < 1)
            return resp;

        const count: number = a.totalcount[0].count;
        const cur = a.matches;

        if (count === undefined || count === null || count <= 0)
            return resp;

        const pages = Math.max(Math.ceil(count / perpage), 1);
        var page = clamp(rreq.page, 0, pages - 1);

        resp.pages = pages;
        resp.page = page;

        for (const c of cur)
        {
            const s = await get_session_from_result(c);

            if (s === undefined)
                continue;

            const sv = await get_sessionview(viewer, s);
            resp.sessions.push(sv);
        }

        break;
    }

    return resp;
}

async function post_process_session(sess: Session.Session)
{
    const updateDoc: any = {};
    updateDoc['$set'] = {};

    // post 0.9.0
    if (sess.public_requester_count === null || sess.public_requester_count === undefined)
    {
        sess.public_requester_count = false;

        updateDoc['$set'][schema.sessions.public_requester_count] = sess.public_requester_count;
        logger.info(`DB: Session ${sess.id.readable} updated to have public_requester_count`);
    }

    if (sess.verified_only === null || sess.verified_only === undefined)
    {
        sess.verified_only = false;

        updateDoc['$set'][schema.sessions.verified_only] = sess.verified_only;
        logger.info(`DB: Session ${sess.id.readable} updated to have verified_only`);
    }

    if (sess.auto_accept_verified === null || sess.auto_accept_verified === undefined)
    {
        sess.auto_accept_verified = false;

        updateDoc['$set'][schema.sessions.auto_accept_verified] = sess.auto_accept_verified;
        logger.info(`DB: Session ${sess.id.readable} updated to have auto_accept_verified`);
    }

    if (sess.status !== Session.SessionStatus.Closed)
    {
        const max_dur_date = current_expiration_date();

        if (sess.created.getTime() <= max_dur_date)
        {
            sess.status = Session.SessionStatus.Closed;

            updateDoc['$set'][schema.sessions.status] = sess.status;
            logger.info(`DB: Session ${sess.id.readable} expired`);
        }
    }

    if (!empty_or_nothing(updateDoc['$set']))
        await modify_session(sess.id, updateDoc, false);

    return sess;
}

async function get_session_from_result(c: any): Promise<Session.Session>
{
    if (c === null || c === undefined)
        return undefined;

    if ('uuid' in c && 'rid' && c)
        c.id = new SessionID(c.uuid, c.rid);
    else
        return undefined;

    if ('host' in c)
        c.host = new UserID(c.host.uuid, c.host.rid);

    if ('requesters' in c)
    {
        const reqs = c.requesters.map((c2: any) => get_requester_from_result(c2));
        c.requesters = reqs;
    }
    else
        c.requesters = [];

    return post_process_session(Session.Session.copy(c));
}

export async function get_session_by_id(id: SessionID): Promise<Session.Session>
{
    const c = await dbcon.sessions().findOne({uuid: id.value});

    return get_session_from_result(c);
}

export async function get_session_by_readable_id(id: string): Promise<Session.Session>
{
    const c = await dbcon.sessions().findOne({rid: id});

    return get_session_from_result(c);
}

export async function get_session_of_user(uid: UserID): Promise<Session.Session>
{
    const max_dur_date = current_expiration_date();

    const c = await dbcon.sessions().findOne({'host.uuid': uid.value,
                                             status: { $in: [Session.SessionStatus.Open, Session.SessionStatus.Full] },
                                             created: { $gt: new Date(max_dur_date) }
    });

    return get_session_from_result(c);
}

export async function get_session_of_user_by_rid(rid: string): Promise<Session.Session>
{
    const max_dur_date = current_expiration_date();

    const c = await dbcon.sessions().findOne({'host.rid': rid,
                                             status: { $in: [Session.SessionStatus.Open, Session.SessionStatus.Full] },
                                             created: { $gt: new Date(max_dur_date) }
    });

    return get_session_from_result(c);
}

export async function new_session(uid: UserID,
                                  rreq: Req.NewSessionRequest
                                 ): Promise<Session.Session>
{
    var sess = new Session.Session();
    sess.host = uid;
    sess.dodo = rreq.dodo.toUpperCase();
    sess.title = rreq.title;
    sess.description = rreq.description;
    sess.turnip_prices = rreq.turnips;
    sess.unlisted = rreq.unlisted;
    sess.status = Session.SessionStatus.Open;
    sess.public_requesters = rreq.public_requesters;
    sess.public_requester_count = rreq.public_requester_count;
    sess.verified_only = rreq.verified_only;
    sess.auto_accept_verified = rreq.auto_accept_verified;
    sess.created = new Date();
    sess.updated = new Date();
    sess.requesters = [];

    await dbcon.sessions().insertOne({
        uuid: sess.id.value,
        rid: sess.id.readable,
        host: {
            uuid: sess.host.value,
            rid: sess.host.readable
        },
        created: sess.created,
        updated: sess.updated,
        requesters: sess.requesters,

        dodo: sess.dodo,
        title: sess.title,
        description: sess.description,
        turnip_prices: sess.turnip_prices,
        status: sess.status,
        unlisted: sess.unlisted,
        public_requesters: sess.public_requesters,
        public_requester_count: sess.public_requester_count,
        verified_only: sess.verified_only,
        auto_accept_verified: sess.auto_accept_verified
    });

    return sess;
}

export async function register_dodo_obtained(uid: UserID,
                                             sid: SessionID,
                                             dodo: string
                                            )
{
    await dbcon.dodo_history().insertOne({
        user:
        {
            uuid: uid.value,
            rid: uid.readable
        },
        session:
        {
            uuid: sid.value,
            rid: sid.readable
        },
        dodo: dodo,
        obtained_at: new Date()
    });
}

export async function dodo_leaked(dodo: string, sid: SessionID)
{
    await dbcon.leaked_dodos().insertOne({
        dodo: dodo,
        session:
        {
            uuid: sid.value,
            rid: sid.readable
        },
        leaked_at: new Date()
    });
}

const modify_user = async (id: UserID, updateDoc: any) =>
    dbcon.users().updateOne({ uuid: id.value}, updateDoc);

export const set_user_playername = async (id: UserID, playername: string) =>
    modify_user(id, { $set: { playername: playername } });

export const set_user_islandname = async (id: UserID, islandname: string) =>
    modify_user(id, { $set: { islandname: islandname } });

export const set_user_level = async (id: UserID, level: User.Level) =>
    modify_user(id, { $set: { level: level } });

export const set_user_banned = async (id: UserID, banned: boolean) =>
    modify_user(id, { $set: { banned: banned } });

export const set_user_verification = async (id: UserID, post: string, verifier: UserID) =>
    modify_user(id, { $set: { verification_post: post, verifier_uuid: verifier.value, verifier_rid: verifier.readable } });

export async function set_user_starred(starrer: UserID, starred: UserID, value: boolean)
{
    if (value)
    {
        const b = await has_user_starred_id(starrer, starred);
        if (b)
            return Promise.resolve();

        return modify_user(starrer,
        {
            $push:
            {
                starred:
                {
                    uuid: starred.value,
                    rid: starred.readable
                }
            }
        });
    }
    else
        return modify_user(starrer,
        {
            $pull:
            {
                starred:
                {
                    uuid: starred.value
                }
            }
        });
}

export async function set_user_blocked(blocker: UserID, blocked: UserID, value: boolean)
{
    if (value)
    {
        const b = await has_user_blocked_id(blocker, blocked);
        if (b)
            return Promise.resolve();

        return modify_user(blocker,
        {
            $push:
            {
                blocked:
                {
                    uuid: blocked.value,
                    rid: blocked.readable
                }
            }
        });
    }
    else
        return modify_user(blocker,
        {
            $pull:
            {
                blocked:
                {
                    uuid: blocked.value
                }
            }
        });
}

export const set_user_playername_hidden = async (id: UserID, hidden: boolean) =>
    modify_user(id, { $set: { playername_hidden: hidden } });

export const set_user_islandname_hidden = async (id: UserID, hidden: boolean) =>
    modify_user(id, { $set: { islandname_hidden: hidden } });

export const set_user_password = async (id: UserID, password: string) =>
{
    const pw = await hash_user_password(password);
    return modify_user(id, { $set: { password: pw } });
}

async function modify_session_filter(filterDoc: any, updateDoc: any, update = true): Promise<Date>
{
    const d = new Date();

    if (update)
        updateDoc['$set'][schema.sessions.updated] = d;

    await dbcon.sessions().updateOne(filterDoc, updateDoc);

    return d;
}

async function modify_session(id: SessionID, updateDoc: any, update = true): Promise<Date>
{
    return modify_session_filter({ uuid: id.value }, updateDoc, update);
}

export const set_session_dodo = async (id: SessionID, dodo: string) =>
    modify_session(id, { $set: { dodo: dodo } });

export const set_session_title = async (id: SessionID, title: string) =>
    modify_session(id, { $set: { title: title } });

export const set_session_description = async (id: SessionID, description: string) =>
    modify_session(id, { $set: { description: description } });

export const set_session_turnip_prices = async (id: SessionID, turnip_prices: number) =>
    modify_session(id, { $set: { turnip_prices: turnip_prices } });

export const set_session_unlisted = async (id: SessionID, unlisted: boolean) =>
    modify_session(id, { $set: { unlisted: unlisted } });

export const set_session_public_requesters = async (id: SessionID, public_requesters: boolean) =>
    modify_session(id, { $set: { public_requesters: public_requesters } });

export const set_session_public_requester_count = async (id: SessionID, public_requester_count: boolean) =>
    modify_session(id, { $set: { public_requester_count: public_requester_count } });

export const set_session_verified_only = async (id: SessionID, verified_only: boolean) =>
    modify_session(id, { $set: { verified_only: verified_only } });

export const set_session_auto_accept_verified = async (id: SessionID, auto_accept_verified: boolean) =>
    modify_session(id, { $set: { auto_accept_verified: auto_accept_verified } });

export const set_session_status = async (id: SessionID, status: Session.SessionStatus) =>
    modify_session(id, { $set: { status: status } });

// joining
export async function user_requests_dodo(uid: UserID, sid: SessionID, auto_accept: boolean = false)
{
    var req = new Session.Requester();
    req.user = uid;
    req.session = sid;

    if (auto_accept)
        req.status = Session.RequesterStatus.Accepted;
    else
        req.status = Session.RequesterStatus.Sent;

    req.requested_at = new Date();

    return modify_session(
        sid, 
        {
            $push:
            {
                requesters:
                {
                    user: { uuid: uid.value, rid: uid.readable },
                    session: { uuid: sid.value, rid: sid.readable },
                    status: req.status,
                    requested_at: req.requested_at
                }
            }
        },
        false
    );
}

function get_requester_from_result(c: any): Session.Requester
{
    if (c === null || c === undefined)
        return undefined;

    var req = new Session.Requester();
    req.user = new UserID(c.user.uuid, c.user.rid);
    req.session = new SessionID(c.session.uuid, c.session.rid);
    req.status = c.status;
    req.requested_at = c.requested_at;

    // post 0.9.4
    req.got_dodo = false;
    if ('got_dodo' in c)
        req.got_dodo = c.got_dodo;

    return req;
}

export async function get_requester_by_id(sid: SessionID,
                                          uid: UserID
                                         ): Promise<Session.Requester>
{
    const filterDoc: any = { uuid: sid.value };
    filterDoc[`${schema.sessions.requesters}.${schema.requesters.user.uuid}`] = uid.value;

    const c = await dbcon.sessions().findOne(filterDoc);

    if (c === undefined || c === null)
        return undefined;

    const c2 = c.requesters.find((x: any) => x.user.uuid === uid.value);

    return get_requester_from_result(c2);
}

export async function get_requesterview_by_id(viewer: User.User,
                                             sid: SessionID,
                                             uid: UserID
                                            ): Promise<Session.RequesterView>
{
    const r = await get_requester_by_id(sid, uid);
    return get_requesterview(viewer, r);
}

export async function get_requesterviews_of_session(viewer: User.User,
                                                    sess: Session.Session
                                                   ): Promise<Session.RequesterView[]>
{
    const rvasp = sess.requesters.map((r: Session.Requester) => get_requesterview_of_session(viewer, sess, r));
    const rvas = await Promise.all(rvasp);
    return rvas.filter((rv: Session.RequesterView) => rv !== undefined);
}

export async function get_requesterviews_by_id(viewer: User.User,
                                               sid: SessionID
                                              ): Promise<Session.RequesterView[]>
{
    const sess = await get_session_by_id(sid);

    if (sess === undefined)
        return undefined;

    return get_requesterviews_of_session(viewer, sess);
}

export async function set_requester_status(sid: SessionID, uid: UserID, status: Session.RequesterStatus)
{
    const set: any = {};
    set[`${schema.sessions.requesters}.$.${schema.requesters.status}`] = status;

    const updateDoc: any = { $set: set };
    const filterDoc: any = { uuid: sid.value };
    filterDoc[`${schema.sessions.requesters}.${schema.requesters.user.uuid}`] = uid.value;

    return modify_session_filter(filterDoc, updateDoc, false);
}

export async function set_requester_got_dodo(sid: SessionID, uid: UserID, got_dodo: boolean)
{
    const set: any = {};
    set[`${schema.sessions.requesters}.$.${schema.requesters.got_dodo}`] = got_dodo;

    const updateDoc: any = { $set: set };
    const filterDoc: any = { uuid: sid.value };
    filterDoc[`${schema.sessions.requesters}.${schema.requesters.user.uuid}`] = uid.value;

    return modify_session_filter(filterDoc, updateDoc, false);
}

export async function has_user_requested_dodo(uid: UserID, sid: SessionID): Promise<boolean>
{
    const filterDoc: any = { uuid: sid.value };
    filterDoc[`${schema.sessions.requesters}.${schema.requesters.user.uuid}`] = uid.value;

    const c = await dbcon.sessions().findOne(filterDoc);
    return (c !== null && c !== undefined);
}

export async function get_logs(rreq: Req.GetLogsRequest): Promise<Req.GetLogsResponse>
{
    const perpage = g.results_per_page;
    const filterDoc: any = {};
    const and_conditions: any[] = [];

    if (rreq.search_text.length > 0)
    {
        const regexDoc = { $regex: rreq.search_text, $options: 'i' };
        const orDoc: any[] = [{}, {}];
        orDoc[0][schema.logs['0']] = regexDoc;
        orDoc[1][schema.logs.msg] = regexDoc;
        and_conditions.push({ '$or': orDoc });
    }

    if (rreq.start_date)
    {
        const startDoc: any = {};
        startDoc[schema.logs.time] = { $gte: rreq.start_date };

        and_conditions.push(startDoc);
    }

    if (rreq.end_date)
    {
        const endDoc: any = {};
        endDoc[schema.logs.time] = { $lte: rreq.end_date };

        and_conditions.push(endDoc);
    }

    const levels: any[] = [];

    for (const i in rreq.log_levels)
        if (rreq.log_levels[i])
            levels.push(Logs.PinoLevelValues[i]);

    if (levels.length > 0)
    {
        const levelDoc: any = {};
        levelDoc[schema.logs.level] = { $in: levels };
        and_conditions.push(levelDoc);
    }

    filterDoc['$and'] = and_conditions;

    const count: number = await dbcon.logs().countDocuments(filterDoc, {});

    const resp = new Req.GetLogsResponse();
    resp.page = 0;
    resp.pages = 0;
    resp.logs = [];

    if (count === 0)
        return resp;

    resp.pages = Math.max(Math.ceil(count / perpage), 1);
    resp.page = clamp(rreq.page, 0, resp.pages - 1);

    const sortDoc: any = {};
    sortDoc[schema.logs.time] = rreq.reversed ? -1 : 1;

    const cur: any = await dbcon.logs().find(filterDoc)
                                       .sort(sortDoc)
                                       .skip(resp.page * perpage)
                                       .limit(perpage);

    for await (const c of cur)
    {
        if (c === undefined || c === null)
            continue;

        resp.logs.push(c);
    }

    return resp;
}

async function create_default_users()
{
    // always make sure default admin exists
    const admn = await get_user_by_username(default_admin_username);

    if (admn === undefined)
    {
        await register_user(default_admin_username,
                            "admin",
                            "adminisle",
                            new SHA3(256).update(default_admin_password).digest('hex'),
                            "zAdmin",
                            User.Level.Admin,
                           );
    }

    if (g.debug.generate_test_data)
        await generate_test_data();
}

export async function init()
{
    await dbcon.connect();
    
    create_default_users();
}
