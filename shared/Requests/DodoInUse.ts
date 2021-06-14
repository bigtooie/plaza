
import { Token } from "../Token";
import * as base from './base';

export class DodoInUseRequest extends base.AuthenticatedRequest
{
    constructor(
        token: Token,
        public dodo: string
    )
    {
        super(token);
    }

    static copy(other: DodoInUseRequest)
    {
        if (other === undefined)
            return undefined;

        return new DodoInUseRequest(Token.copy(other.token),
                                    other.dodo);
    }

    static isMe(x: any): x is DodoInUseRequest
    {
        return 'dodo' in x;
    }
}

export class DodoInUseResponse extends base.Response
{
    constructor(
        public in_use: boolean
    )
    {
        super();
    }

    static copy(other: DodoInUseResponse)
    {
        if (other === undefined)
            return undefined;

        return new DodoInUseResponse(other.in_use);
    }

    static isMe(x: any): x is DodoInUseResponse
    {
        return 'in_use' in x;
    }
}
