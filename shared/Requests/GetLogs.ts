
import { Token } from "../Token";
import * as base from './base';

export class GetLogsRequest extends base.AuthenticatedRequest
{
    constructor(
        token: Token,
        public page: number,
        public search_text: string,
        public start_date: number,
        public end_date: number,
        public log_levels: boolean[],
        public reversed: boolean
    )
    {
        super(token);
    }

    static copy(other: GetLogsRequest)
    {
        if (other === undefined)
            return undefined;

        return new GetLogsRequest(
            Token.copy(other.token),
            other.page,
            other.search_text,
            other.start_date,
            other.end_date,
            other.log_levels,
            other.reversed
        );
    }

    static isMe(x: any): x is GetLogsRequest
    {
        return 'page' in x &&
               'search_text' in x &&
               'start_date' in x &&
               'end_date' in x &&
               'log_levels' in x &&
               'reversed' in x
    }
}

export class GetLogsResponse extends base.Response
{
    constructor(
        public logs: any[] = [],
        public page: number = 0,
        public pages: number = 0
    )
    { super(); }

    static copy(other: GetLogsResponse)
    {
        if (other === undefined)
            return undefined;

        return new GetLogsResponse(other.logs, other.page, other.pages);
    }

    static isMe(x: any): x is GetLogsResponse
    {
        return 'logs' in x
            && 'page' in x
            && 'pages' in x;
    }
}
