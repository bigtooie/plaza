
import { UserID } from '../ID';
import { Token } from '../Token';
import * as base from './base';

export class UpdateUserSettingsRequest extends base.AuthenticatedRequest
{
    constructor(
        token: Token,
        public target: UserID,
        public settings: any
    )
    {
        super(token);
    }

    static copy(other: UpdateUserSettingsRequest)
    {
        if (other === undefined)
            return undefined;

        return new UpdateUserSettingsRequest(
            Token.copy(other.token),
            UserID.copy(other.target),
            other.settings
        );
    }

    static isMe(x: any): x is UpdateUserSettingsRequest
    {
        return 'target' in x
            && 'settings' in x;
    }
}

export class UpdateUserSettingsResponse extends base.Response
{
    constructor(
    )
    {
        super();
    }

    static copy(other: UpdateUserSettingsResponse)
    {
        if (other === undefined)
            return undefined;

        return new UpdateUserSettingsResponse();
    }

    static isMe(x: any): x is UpdateUserSettingsResponse
    {
        return x;
    }
}
