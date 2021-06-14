
import { Token } from "../Token";
import { UserView } from "../User";
import { SessionView } from "../Session";
import * as base from './base';

export class GetSessionOfUserRequest extends base.AuthenticatedRequest
{
    constructor(
        token: Token,
        public id: string // readable USER id
    )
    {
        super(token);
    }

    static copy(other: GetSessionOfUserRequest)
    {
        if (other === undefined)
            return undefined;

        return new GetSessionOfUserRequest(Token.copy(other.token),
                                           other.id);
    }

    static isMe(x: any): x is GetSessionOfUserRequest
    {
        return 'id' in x;
    }
}

export class GetSessionOfUserResponse extends base.Response
{
    constructor(
        public session: SessionView
    )
    {
        super();
    }

    static copy(other: GetSessionOfUserResponse)
    {
        if (other === undefined)
            return undefined;

        return new GetSessionOfUserResponse(SessionView.copy(other.session));
    }

    static isMe(x: any): x is GetSessionOfUserResponse
    {
        return 'session' in x;
    }
}
