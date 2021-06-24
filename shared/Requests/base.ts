import { Token } from "../Token";

export enum SearchFilter
{
    None = "-",
    Only = "only",
    Hide = "hide"
}

export const SearchFilterValues: string[] = Object.values(SearchFilter);

export enum OnlySearchFilter
{
    None = "-",
    Only = "only"
}

export const OnlySearchFilterValues: string[] = Object.values(OnlySearchFilter);
 
export abstract class Request
{
    constructor(
        // only useful when debugging, overhead otherwise
        // public created: Date = new Date()
    )
    {}
}

export class AuthenticatedRequest extends Request
{
    constructor(
        public token: Token
    )
    {
        super();
    }

    static copy(other: AuthenticatedRequest)
    {
        if (other === undefined)
            return undefined;

        return new AuthenticatedRequest(Token.copy(other.token));
    }

    // this here is the reason why typescript is still absolute garbage.
    // fuck you microsoft.
    static isMe(x: any): x is AuthenticatedRequest
    {
        return 'token' in x;
    }
}

export abstract class Response
{
    constructor(
        // only useful when debugging, overhead otherwise
        // public created: Date = new Date()
    )
    {}
}

export class FailedResponse extends Response
{
    constructor(
        public reason: string,
        // e.g. session expired, banned, etc
        public force_logout: boolean = false
    ) { super(); }

    static copy(other: FailedResponse)
    {
        if (other === undefined)
            return undefined;

        return new FailedResponse(other.reason, other.force_logout);
    }

    static isMe(x: any) : x is FailedResponse
    {
        return 'reason' in x;
    }
}
