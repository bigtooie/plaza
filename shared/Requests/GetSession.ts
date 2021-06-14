
import { Token } from "../Token";
import { UserView } from "../User";
import { SessionView } from "../Session";
import * as base from './base';

export class GetSessionRequest extends base.AuthenticatedRequest
{
    constructor(
        token: Token,
        public id: string // readable id
    )
    {
        super(token);
    }

    static copy(other: GetSessionRequest)
    {
        if (other === undefined)
            return undefined;

        return new GetSessionRequest(Token.copy(other.token),
                                     other.id);
    }

    static isMe(x: any): x is GetSessionRequest
    {
        return 'id' in x;
    }
}

export class GetSessionResponse extends base.Response
{
    constructor(
        public session: SessionView
    )
    {
        super();
    }

    static copy(other: GetSessionResponse)
    {
        if (other === undefined)
            return undefined;

        return new GetSessionResponse(SessionView.copy(other.session));
    }

    static isMe(x: any): x is GetSessionResponse
    {
        return 'session' in x;
    }
}
