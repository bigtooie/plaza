
import { SessionID } from '../ID';
import { Token } from '../Token';
import * as base from './base';

export class UpdateSessionSettingsRequest extends base.AuthenticatedRequest
{
    constructor(
        token: Token,
        public target: SessionID,
        public settings: any
    )
    {
        super(token);
    }

    static copy(other: UpdateSessionSettingsRequest)
    {
        if (other === undefined)
            return undefined;

        return new UpdateSessionSettingsRequest(
            Token.copy(other.token),
            SessionID.copy(other.target),
            other.settings
        );
    }

    static isMe(x: any): x is UpdateSessionSettingsRequest
    {
        return 'target' in x
            && 'settings' in x;
    }
}

export class UpdateSessionSettingsResponse extends base.Response
{
    constructor(
    )
    {
        super();
    }

    static copy(other: UpdateSessionSettingsResponse)
    {
        if (other === undefined)
            return undefined;

        return new UpdateSessionSettingsResponse();
    }

    static isMe(x: any): x is UpdateSessionSettingsResponse
    {
        return true;
    }
}
