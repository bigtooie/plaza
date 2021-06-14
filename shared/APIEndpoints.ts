
import { g } from './globals';

export enum APIEndpointType
{
    // thanks to angulag, Get is useless
    Get,
    Post
}

export class APIEndpoint
{
    constructor(
        public type: APIEndpointType,
        public url: string
    )
    {
    }

    get full_url(): string
    {
        return g.api_root + this.url;
    }
}

const post = (url: string) => new APIEndpoint(APIEndpointType.Post, url);

const endpoints: any = 
{
    // angulag is incompenent and really autistic when it
    // comes to body data in GET requests and will silently
    // discard the body, so all of these are POST.
    // Fuck you google.
    login: post("login"),
    register: post("register"),
    advanced_register: post("advanced_register"),
    logout: post("logout"),

    username_taken: post("username_taken"),
    dodo_in_use: post("dodo_in_use"),

    get_user: post("p"),
    get_self: post("self"),
    get_users: post("players"),
    get_session: post("s"),
    get_session_requesters: post("srs"),
    get_session_of_user: post("session_of_user"),
    get_sessions: post("sessions"),
    new_session: post("newsession"),

    get_dodo: post("dodo"),

    update_user_settings: post("update_user_settings"),
    update_session_settings: post("update_session_settings"),
    get_runtime_setting: post("grt"),
    set_runtime_setting: post("srt"),
};

export { endpoints }
