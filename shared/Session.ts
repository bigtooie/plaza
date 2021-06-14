
import { User, UserView } from "./User";
import { SessionID, UserID } from "./ID";

// state diagram:
//      None -> Sent   (user)
//
//      Sent -> Accepted
//           -> Rejected
//           -> Withdrawn
//
//      Accepted -> Withdrawn (reset)
//
//      Rejected -> Withdrawn (reset)
//
//      Withdrawn -> Sent

export enum RequesterStatus
{
    None,     // requester didnt do anything, i.e. isn't even a requester
    Sent,     // requester requested dodo and host didnt do anything / revoked Accept or Reject
    Accepted, // host accepted and requester has access to current dodo
    Rejected, // host rejected and requester will not get access to current dodo and cannot ask again
    Withdrawn // requester withdrew after sending (but before getting accepted / rejected)
}

export class Requester
{
    user: UserID; // whomst is requester
    session: SessionID; // what session is the whomst interested in
    status: RequesterStatus = RequesterStatus.None;
    requested_at: Date = new Date();

    static copy(other: Requester): Requester
    {
        if (other === undefined)
            return other;

        var r = new Requester();
        r.user = UserID.copy(other.user);
        r.session = SessionID.copy(other.session);
        r.status = other.status;
        r.requested_at = new Date(other.requested_at);
        return r;
    }
}

export class RequesterView
{
    user: UserView;
    session: SessionID;
    status: RequesterStatus;
    requested_at: Date;

    static copy(other: RequesterView)
    {
        if (other === undefined)
            return undefined;

        var ret = new RequesterView();
        ret.user = UserView.copy(other.user);
        ret.session = SessionID.copy(other.session);
        ret.requested_at = new Date(other.requested_at);
        ret.status = other.status;
        return ret;
    }
}

export enum SessionStatus
{
    Open,
    Full, // still open, just there to notify people that its full
    Closed
}

export const SessionStatusValues: SessionStatus[] =
[
    SessionStatus.Open,
    SessionStatus.Full,
    SessionStatus.Closed
];

const MAX_TITLE_LENGTH: number = 50;
const TITLE_REGEX: RegExp = /^[a-z0-9 \-_\/´`'"!\$§%&\.:,;#\+=~\[\]\(\)]*$/i;

const MAX_DESCRIPTION_LENGTH: number = 1000;
const DESCRIPTION_REGEX: RegExp = /^[a-z0-9 \-_\/´`'"!\$§%&\.:,;#\+=~\[\]\(\)\n\r]*$/i;

const DODO_REGEX: RegExp = /^[0-9abcdefghjklmnpqrstuvwxy]{5}$/i;

const MIN_TURNIPS: number = 0;
const MAX_TURNIPS: number = 1000;

export { MAX_TITLE_LENGTH, MAX_DESCRIPTION_LENGTH,
         TITLE_REGEX, DESCRIPTION_REGEX,
         DODO_REGEX,
         MIN_TURNIPS, MAX_TURNIPS
};

export class Session
{
    id: SessionID = new SessionID();
    host: UserID = new UserID();
    created: Date = new Date();
    updated: Date = new Date();
    requesters: Requester[] = [];

    // things that can be changed directly:
    dodo: string = "aaaaa";
    title: string = "";
    description: string = "";
    turnip_prices: number = 0;
    status: SessionStatus = SessionStatus.Open;
    unlisted: boolean = false;
    public_requesters: boolean = false;
    verified_only: boolean = false;

    static copy(other: Session): Session
    {
        if (other === undefined)
            return undefined;

        var ret = new Session();
        ret.id = SessionID.copy(other.id);
        ret.host = UserID.copy(other.host);
        ret.created = new Date(other.created);
        ret.updated = new Date(other.updated);
        ret.requesters = other.requesters.map(x => Requester.copy(x));
        ret.dodo = other.dodo;
        ret.title = other.title;
        ret.description = other.description;
        ret.turnip_prices = other.turnip_prices;
        ret.status = other.status;
        ret.unlisted = other.unlisted;
        ret.public_requesters = other.public_requesters;
        ret.verified_only = other.verified_only;

        return ret;
    }
}

export class SessionViewSettings
{
    dodo: string;
    title: string;
    description: string;
    turnip_prices: number;
    status: SessionStatus;
    unlisted: boolean;
    public_requesters: boolean;
    verified_only: boolean;
}

export class SessionView
{
    id: SessionID;
    host: UserView;
    created: Date;
    updated: Date;
    requester_status: RequesterStatus; // status of the user who views the session
    settings: SessionViewSettings;

    static copy(other: SessionView): SessionView
    {
        if (other === undefined)
            return undefined;

        var ret = new SessionView();
        ret.id = SessionID.copy(other.id);
        ret.host = UserView.copy(other.host);
        ret.created = new Date(other.created);
        ret.updated = new Date(other.updated);
        ret.requester_status = other.requester_status;

        ret.settings = other.settings;

        return ret;
    }
}

export function validate_session_dodo(str: string): void
{
    if (str === undefined || str.length !== 5)
        throw new Error("dodo code must have exactly 5 characters"); 

    const reg = DODO_REGEX.exec(str);

    if (reg === null || reg[0].length < str.length)
        throw new Error("dodo code contains illegal characters");
}

export function validate_session_title(str: string): void
{
    if (str === undefined)
        return;

    if (str.length <= 0)
        return;

    if (str.length > MAX_TITLE_LENGTH)
        throw new Error(`max title length is ${MAX_TITLE_LENGTH} characters`); 

    const reg = TITLE_REGEX.exec(str);

    if (reg === null || reg[0].length < str.length)
        throw new Error("title contains illegal characters");
}

export function validate_session_description(str: string): void
{
    if (str === undefined)
        return;

    if (str.length <= 0)
        return;

    if (str.length > MAX_DESCRIPTION_LENGTH)
        throw new Error(`max description length is ${MAX_DESCRIPTION_LENGTH} characters`); 

    const reg = DESCRIPTION_REGEX.exec(str);

    if (reg === null || reg[0].length < str.length)
        throw new Error("description contains illegal characters");
}

// lmao
export function validate_session_turnip_prices(val: number): void
{
    if (val === undefined)
        throw new Error("invalid turnip prices");

    if (!Number.isSafeInteger(val))
        throw new Error("invalid turnip prices");

    if (val < MIN_TURNIPS)
        throw new Error(`turnip prices must be at least ${MIN_TURNIPS}`);

    if (val > MAX_TURNIPS)
        throw new Error(`turnip prices must be at most ${MAX_TURNIPS}`);
}
