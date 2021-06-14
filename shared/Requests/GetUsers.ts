
import { UserView } from "../User";
import { Token } from "../Token";
import * as base from './base';

export enum GetUsersSearchTextCategory
{
    ID = "ID",
    PlayerName = "Player Name",
    IslandName = "Island Name",
    Username = "Username"
}

export const GetUsersSearchTextCategoryValues: string[] = Object.values(GetUsersSearchTextCategory);

export const MAX_GET_USERS_SEARCH_TEXT_LENGTH = 200;

export class GetUsersRequest extends base.AuthenticatedRequest
{
    constructor(
        token: Token,
        public page: number,
        public search_text: string,
        public search_text_category: GetUsersSearchTextCategory,
        public starred_filter: base.SearchFilter,
        public blocked_filter: base.SearchFilter,
        public reversed: boolean
    )
    {
        super(token);
    }

    static copy(other: GetUsersRequest)
    {
        if (other === undefined)
            return undefined;

        return new GetUsersRequest(
            Token.copy(other.token),
            other.page,
            other.search_text,
            other.search_text_category,
            other.starred_filter,
            other.blocked_filter,
            other.reversed
        );
    }

    static isMe(x: any): x is GetUsersRequest
    {
        return 'page' in x &&
               'search_text' in x &&
               'search_text_category' in x &&
               'starred_filter' in x &&
               'blocked_filter' in x &&
               'reversed' in x
    }
}

export class GetUsersResponse extends base.Response
{
    constructor(
        public users: UserView[] = [],
        public page: number = 0,
        public pages: number = 0
    )
    { super(); }

    static copy(other: GetUsersResponse)
    {
        if (other === undefined)
            return undefined;

        return new GetUsersResponse(other.users.map(UserView.copy), other.page, other.pages);
    }

    static isMe(x: any): x is GetUsersResponse
    {
        return 'users' in x
            && 'page' in x
            && 'pages' in x;
    }
}
