
import { Token } from "../Token";
import { UserView } from "../User";
import * as base from './base';

export class GetUserRequest extends base.AuthenticatedRequest
{
    constructor(
        token: Token,
        public id: string // readable id
    )
    {
        super(token);
    }

    static copy(other: GetUserRequest)
    {
        if (other === undefined)
            return undefined;

        return new GetUserRequest(Token.copy(other.token), other.id);
    }

    static isMe(x: any): x is GetUserRequest
    {
        return 'id' in x;
    }
}

export class GetUserResponse extends base.Response
{
    constructor(
        public user: UserView
    )
    {
        super();
    }

    static copy(other: GetUserResponse)
    {
        if (other === undefined)
            return other;

        return new GetUserResponse(UserView.copy(other.user));
    }

    static isMe(x: any): x is GetUserResponse
    {
        return 'user' in x;
    }
}
