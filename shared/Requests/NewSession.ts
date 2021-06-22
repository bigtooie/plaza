
import { Token } from "../Token";
import { SessionView } from "../Session";
import * as base from './base';

export class NewSessionRequest extends base.AuthenticatedRequest
{
    constructor(
        token: Token,
        public dodo: string,
        public title: string,
        public description: string,
        public turnips: number,
        public unlisted: boolean,
        public public_requesters: boolean,
        public verified_only: boolean,
        public auto_accept_verified: boolean,
    )
    {
        super(token);
    }

    static copy(other: NewSessionRequest)
    {
        if (other === undefined)
            return undefined;

        return new NewSessionRequest(
            Token.copy(other.token),
            other.dodo,
            other.title,
            other.description,
            other.turnips,
            other.unlisted,
            other.public_requesters,
            other.verified_only,
            other.auto_accept_verified
        );
    }

    static isMe(x: any): x is NewSessionRequest
    {
        return 'dodo' in x
            && 'title' in x
            && 'description' in x
            && 'turnips' in x
            && 'unlisted' in x
            && 'public_requesters' in x
            && 'verified_only' in x
            && 'auto_accept_verified' in x
            ;
    }
}

export class NewSessionResponse extends base.Response
{
    constructor(
        public session: SessionView
    )
    { super(); }

    static copy(other: NewSessionResponse)
    {
        if (other === undefined)
            return undefined;

        return new NewSessionResponse(SessionView.copy(other.session));
    }

    static isMe(x: any): x is NewSessionResponse
    {
        return 'session' in x;
    }
}
