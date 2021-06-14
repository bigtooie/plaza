
import { Token } from "../Token";
import { UserView } from "../User";
import { RequesterView } from "../Session";
import { SessionID } from "../ID";
import * as base from './base';

export class GetSessionRequestersRequest extends base.AuthenticatedRequest
{
    constructor(
        token: Token,
        public id: SessionID
    )
    {
        super(token);
    }

    static copy(other: GetSessionRequestersRequest)
    {
        if (other === undefined)
            return undefined;

        return new GetSessionRequestersRequest(Token.copy(other.token),
                                               SessionID.copy(other.id));
    }

    static isMe(x: any): x is GetSessionRequestersRequest
    {
        return 'id' in x;
    }
}

export class GetSessionRequestersResponse extends base.Response
{
    constructor(
        public requesters: RequesterView[]
    )
    {
        super();
    }

    static copy(other: GetSessionRequestersResponse)
    {
        if (other === undefined)
            return undefined;

        return new GetSessionRequestersResponse(
            other.requesters.map((r: RequesterView) => RequesterView.copy(r))
        );
    }

    static isMe(x: any): x is GetSessionRequestersResponse
    {
        return 'requesters' in x;
    }
}
