
import { Token } from "../Token";
import * as base from './base';

export class GetRuntimeSettingRequest extends base.AuthenticatedRequest
{
    constructor(
        token: Token,
        public key: string
    )
    {
        super(token);
    }

    static copy(other: GetRuntimeSettingRequest)
    {
        if (other === undefined)
            return undefined;

        return new GetRuntimeSettingRequest(Token.copy(other.token),
                                            other.key);
    }

    static isMe(x: any): x is GetRuntimeSettingRequest
    {
        return 'key' in x && (typeof x.key === 'string');
    }
}

export class GetRuntimeSettingResponse extends base.Response
{
    constructor(
        public value: any
    )
    {
        super();
    }

    static copy(other: GetRuntimeSettingResponse)
    {
        if (other === undefined)
            return undefined;

        return new GetRuntimeSettingResponse(other.value);
    }

    static isMe(x: any): x is GetRuntimeSettingResponse
    {
        return 'value' in x;
    }
}

export class SetRuntimeSettingRequest extends base.AuthenticatedRequest
{
    constructor(
        token: Token,
        public key: string,
        public value: any
    )
    {
        super(token);
    }

    static copy(other: SetRuntimeSettingRequest)
    {
        if (other === undefined)
            return undefined;

        return new SetRuntimeSettingRequest(Token.copy(other.token),
                                            other.key,
                                            other.value
                                           );
    }

    static isMe(x: any): x is SetRuntimeSettingRequest
    {
        return 'key' in x && (typeof x.key === 'string')
            && 'value' in x;
    }
}

export class SetRuntimeSettingResponse extends base.Response
{
    constructor(
    )
    {
        super();
    }

    static copy(other: SetRuntimeSettingResponse)
    {
        if (other === undefined)
            return undefined;

        return new SetRuntimeSettingResponse();
    }

    static isMe(x: any): x is SetRuntimeSettingResponse
    {
        return true;
    }
}
