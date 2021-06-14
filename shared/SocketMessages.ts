
import { ID, UserID, SessionID } from './ID';
import * as Session from './Session';
import * as utils from './utils';

export const ErrorID: string = "err";

export interface Message<T> extends utils.Copyable<T>
{
    ID: string;
}

export class SessionChanged
{
    static ID: string = "session_changed";

    constructor(
        public session: SessionID,
        public changes: any
    )
    {}

    static copy(other: SessionChanged)
    {
        if (other === undefined)
            return other;

        return new SessionChanged(SessionID.copy(other.session), other.changes);
    }

    static isMe(x: any): x is SessionChanged
    {
        return 'session' in x
            && 'changes' in x;
    }
}

export class WatchSession
{
    static ID: string = "watch_session";

    constructor(
        public session: SessionID
    )
    {}

    static copy(other: WatchSession)
    {
        if (other === undefined)
            return other;

        return new WatchSession(SessionID.copy(other.session));
    }

    static isMe(x: any): x is WatchSession
    {
        return 'session' in x;
    }
}

export class UnwatchSession
{
    static ID: string = "unwatch_session";

    constructor(
        public session: SessionID
    )
    {}

    static copy(other: UnwatchSession)
    {
        if (other === undefined)
            return other;

        return new UnwatchSession(SessionID.copy(other.session));
    }

    static isMe(x: any): x is UnwatchSession
    {
        return 'session' in x;
    }
}

export class WatchSessionRequesters
{
    static ID: string = "watch_session_requesters";

    constructor(
        public session: SessionID
    )
    {}

    static copy(other: WatchSessionRequesters)
    {
        if (other === undefined)
            return other;

        return new WatchSessionRequesters(SessionID.copy(other.session));
    }

    static isMe(x: any): x is WatchSessionRequesters
    {
        return 'session' in x;
    }
}

export class UnwatchSessionRequesters
{
    static ID: string = "unwatch_session_requesters";

    constructor(
        public session: SessionID
    )
    {}

    static copy(other: UnwatchSessionRequesters)
    {
        if (other === undefined)
            return other;

        return new UnwatchSessionRequesters(SessionID.copy(other.session));
    }

    static isMe(x: any): x is UnwatchSessionRequesters
    {
        return 'session' in x;
    }
}

export class WatchSessionRequestersChanges
{
    static ID: string = "watch_session_requesters_changes";

    constructor(
        public session: SessionID
    )
    {}

    static copy(other: WatchSessionRequestersChanges)
    {
        if (other === undefined)
            return other;

        return new WatchSessionRequestersChanges(SessionID.copy(other.session));
    }

    static isMe(x: any): x is WatchSessionRequestersChanges
    {
        return 'session' in x;
    }
}

export class UnwatchSessionRequestersChanges
{
    static ID: string = "unwatch_session_requesters_changes";

    constructor(
        public session: SessionID
    )
    {}

    static copy(other: UnwatchSessionRequestersChanges)
    {
        if (other === undefined)
            return other;

        return new UnwatchSessionRequestersChanges(SessionID.copy(other.session));
    }

    static isMe(x: any): x is UnwatchSessionRequestersChanges
    {
        return 'session' in x;
    }
}

export class RequestDodo
{
    static ID: string = "request_dodo";

    constructor(
        public session: SessionID
    )
    {}

    static copy(other: RequestDodo)
    {
        if (other === undefined)
            return other;

        return new RequestDodo(SessionID.copy(other.session));
    }

    static isMe(x: any): x is RequestDodo
    {
        return 'session' in x;
    }
}

export class NewRequester
{
    static ID: string = "new_requester";

    constructor(
        public requester: Session.RequesterView
    )
    {
    }

    static copy(other: NewRequester)
    {
        if (other === undefined)
            return other;

        return new NewRequester(Session.RequesterView.copy(other.requester));
    }

    static isMe(x: any): x is NewRequester
    {
        return 'requester' in x;
    }
}

export class RequesterUpdate
{
    static ID: string = "requester_update";

    constructor(
        public session: SessionID,
        public user: UserID,
        public status: Session.RequesterStatus
    )
    {
    }

    static copy(other: RequesterUpdate)
    {
        if (other === undefined)
            return other;

        return new RequesterUpdate(SessionID.copy(other.session),
                                    UserID.copy(other.user),
                                    other.status
                                   );
    }

    static isMe(x: any): x is RequesterUpdate
    {
        return 'session' in x
            && 'user' in x
            && 'status' in x;
    }
}
