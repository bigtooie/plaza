
import { Token } from "../Token";
import { UserView } from "../User";
import { SessionID } from "../ID";
import * as base from './base';

export class GetDodoRequest extends base.AuthenticatedRequest
{
    constructor(
        token: Token,
        public id: SessionID
    )
    {
        super(token);
    }

    static copy(other: GetDodoRequest)
    {
        if (other === undefined)
            return undefined;

        return new GetDodoRequest(Token.copy(other.token),
                                  SessionID.copy(other.id));
    }

    static isMe(x: any): x is GetDodoRequest
    {
        return 'id' in x;
    }
}

export class GetDodoResponse extends base.Response
{
    constructor(
        public dodo: string
    )
    {
        super();
    }

    static copy(other: GetDodoResponse)
    {
        if (other === undefined)
            return other;

        return new GetDodoResponse(other.dodo);
    }

    static isMe(x: any): x is GetDodoResponse
    {
        return 'dodo' in x;
    }
}
