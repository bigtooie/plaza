
import * as base from './base';

export class UsernameTakenRequest extends base.Request
{
    constructor(
        public username: string
    )
    {
        super();
    }

    static copy(other: UsernameTakenRequest)
    {
        if (other === undefined)
            return undefined;

        return new UsernameTakenRequest(other.username);
    }

    static isMe(x: any): x is UsernameTakenRequest
    {
        return 'username' in x;
    }
}

export class UsernameTakenResponse extends base.Response
{
    constructor(
        public taken: boolean
    )
    {
        super();
    }

    static copy(other: UsernameTakenResponse)
    {
        if (other === undefined)
            return undefined;

        return new UsernameTakenResponse(other.taken);
    }

    static isMe(x: any): x is UsernameTakenResponse
    {
        return 'taken' in x;
    }
}
