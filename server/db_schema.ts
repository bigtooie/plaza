

// the users collection schema
export const users =
{
    _id: 'users',
    uuid: 'uuid', // the ID uuid
    rid: 'rid', // the readable ID (necessary for user queries)
    username: 'username',
    playername: 'playername',
    playername_hidden: 'playername_hidden',
    islandname: 'islandname',
    islandname_hidden: 'islandname_hidden',
    password: 'password',
    registered: 'registered',
    admin: 'admin',
    banned: 'banned',
    starred: 'starred',
    blocked: 'blocked',
    verification_post: 'verification_post',
    verifier_uuid: 'verifier_uuid',
    verifier_rid: 'verifier_rid',
};

export const sessions = 
{
    _id: 'sessions',
    uuid: 'uuid', // the ID uuid
    rid: 'rid', // the readable ID (necessary for session queries)
    host: 
    {
        uuid: 'host.uuid', // the ID uuid of the host
        rid: 'host.rid', // the readable ID of the host
    },
    created: 'created',
    updated: 'updated',
    requesters: 'requesters',

    dodo: 'dodo',
    title: 'title',
    description: 'description',
    turnip_prices: 'turnip_prices',
    status: 'status',
    unlisted: 'unlisted',
    public_requesters: 'public_requesters',
    public_requester_count: 'public_requester_count',
    verified_only: 'verified_only',
    auto_accept_verified: 'auto_accept_verified'
};

export const requesters =
{
    user:
    {
        uuid: 'user.uuid',
        rid: 'user.rid',
    },
    session:
    {
        uuid: 'session.uuid',
        rid: 'session.rid',
    },
    status: 'status',
    got_dodo: 'got_dodo',
    requested_at: 'requested_at'
};

export const dodo_history =
{
    _id: 'dodo_history',
    user:
    {
        uuid: 'user.uuid',
        rid: 'user.rid',
    },
    session:
    {
        uuid: 'session.uuid',
        rid: 'session.rid',
    },
    dodo: 'dodo',
    obtained_at: 'obtained_at'
};

export const leaked_dodos =
{
    _id: 'leaked_dodos',
    dodo: 'dodo',
    session:
    {
        uuid: 'session.uuid',
        rid: 'session.rid',
    },
    leaked_at: 'leaked_at'
};

export const logs =
{
    _id: 'logs',
    time: 'time',
    level: 'level',
    '0': '0',
    msg: 'msg'
};

class Index
{
    constructor(
        public field: string,
        public unique: boolean = false
    )
    {}
}

// the DB collections and indices (not full schema)
export const indices = new Map<string, Index[]>();
indices.set(users._id, [
    new Index(users.uuid, true),
    new Index(users.rid),
    new Index(users.playername),
    new Index(users.islandname),
    new Index(users.registered)
]);

indices.set(sessions._id, [
    new Index(sessions.uuid, true),
    new Index(sessions.rid),
    new Index(sessions.status),
    new Index(sessions.created),
    new Index(sessions.updated),
    new Index(sessions.turnip_prices)
]);

indices.set(dodo_history._id, [
    new Index(dodo_history.user.uuid),
    new Index(dodo_history.user.rid),
    new Index(dodo_history.session.uuid),
    new Index(dodo_history.session.rid),
    new Index(dodo_history.dodo),
    new Index(dodo_history.obtained_at),
]);

indices.set(logs._id, [
    new Index(logs.time),
]);
