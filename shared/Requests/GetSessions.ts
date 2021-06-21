
import { Token } from "../Token";
import { Session, SessionView } from "../Session";
import { UserView } from "../User";
import * as base from './base';

export enum GetSessionsSearchTextCategory
{
    ID = "ID",
    HostID = "Host ID",
    Host = "Host",
    Title = "Title",
    Description = "Description",
    Username = "Username"
}

export const GetSessionsSearchTextCategoryValues: string[] = Object.values(GetSessionsSearchTextCategory);

export enum SessionStatusSearchFilter
{
    All = "All",
    Open = "Open only",
    Full = "Full only",
    OpenOrFull = "Open or Full",
    Closed = "Closed only"
}

export const SessionStatusSearchFilterValues: string[] = Object.values(SessionStatusSearchFilter);

export enum GetSessionsOrderCategory
{
    Created = "created time",
    Updated = "last updated time"
}

export const GetSessionsOrderCategoryValues: string[] = Object.values(GetSessionsOrderCategory);

export const MAX_GET_SESSIONS_SEARCH_TEXT_LENGTH = 1000;
export class GetSessionsRequest extends base.AuthenticatedRequest
{
    constructor(
        token: Token,
        public page: number,
        public search_text: string,
        public search_text_category: GetSessionsSearchTextCategory,
        public min_turnip_price: number,
        public status_filter: SessionStatusSearchFilter,
        public host_starred_filter: base.SearchFilter,
        public host_blocked_filter: base.SearchFilter,
        public order_by: GetSessionsOrderCategory,
        public reversed: boolean
    )
    {
        super(token);
    }

    static copy(other: GetSessionsRequest)
    {
        if (other === undefined)
            return undefined;

        return new GetSessionsRequest(
            Token.copy(other.token),
            other.page,
            other.search_text,
            other.search_text_category,
            other.min_turnip_price,
            other.status_filter,
            other.host_starred_filter,
            other.host_blocked_filter,
            other.order_by,
            other.reversed
        );
    }

    static isMe(x: any): x is GetSessionsRequest
    {
        return 'page' in x &&
               'search_text' in x &&
               'search_text_category' in x &&
               'min_turnip_price' in x &&
               'status_filter' in x &&
               'host_starred_filter' in x &&
               'host_blocked_filter' in x &&
               'order_by' in x &&
               'reversed' in x
    }
}

export class GetSessionsResponse extends base.Response
{
    constructor(
        public sessions: SessionView[] = [],
        public page: number = 0,
        public pages: number = 0
    )
    { super(); }

    static copy(other: GetSessionsResponse)
    {
        if (other === undefined)
            return undefined;

        return new GetSessionsResponse(other.sessions.map(SessionView.copy),
                                       other.page,
                                       other.pages
                                      );
    }

    static isMe(x: any): x is GetSessionsResponse
    {
        return 'sessions' in x
            && 'page' in x
            && 'pages' in x;
    }
}
