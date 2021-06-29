import { Injectable } from '@angular/core';
import { PlatformLocation } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient, HttpResponse, HttpErrorResponse } from '@angular/common/http';

import { Observable, of, throwError } from 'rxjs';
import { delay, map, catchError } from 'rxjs/operators';

import { SHA3 } from 'sha3';

import { SessionView, SessionStatus, Session } from '@shared/Session';
import { UserView, User, Level } from '@shared/User';
import { Token, TokenString } from '@shared/Token';
import { ID, SessionID, UserID } from '@shared/ID';
import { clamp, empty_or_nothing, Copyable, copy_from } from '@shared/utils';

import { APIEndpointType, APIEndpoint, endpoints } from '@shared/APIEndpoints';
import * as Settings from '@shared/RuntimeSettings';
import * as Req from '@shared/RequestResponse';

const average_use_time = 4 * 60 * 60 * 1000;

function id_from_param(id?: string | ID) : string | undefined
{
    if (id === undefined)
        return undefined;

    if (id instanceof ID)
        return id.readable;
    else
        return id;
}

const storageKey = "token";

@Injectable({
  providedIn: 'root'
})
export class ApiService
{
    token?: Token = undefined;

    constructor(
        private http: HttpClient,
        private router: Router,
        private location: PlatformLocation
    )
    {
        this.load_from_storage();
    }

    private load_from_storage()
    {
        const t = localStorage.getItem(storageKey);

        if (t === null || t === undefined)
            return;

        const tok = new Token(t);
        const dt = tok.expire_date.getTime() - Date.now();

        if (dt < average_use_time)
        {
            this.token = undefined;
            this.save_to_storage();
        }
        else
            this.token = tok;
    }

    private save_to_storage()
    {
        if (this.token !== undefined)
            localStorage.setItem(storageKey, this.token.jwt);
        else
            localStorage.removeItem(storageKey);
    }

    get_current_route(): string
    {
        var ret: string = this.location.hash;

        if (ret === null || ret === undefined || ret.length <= 2)
            return "";

        ret = ret.substr(2);

        const i = ret.indexOf("?");

        if (i > -1)
            ret = ret.substr(0, i);

        return ret;
    }

    private send_request<T>(type: Copyable<T>, ep: APIEndpoint, request: any): Observable<T | undefined>
    {
        var method: string = "GET";

        if (ep.type === APIEndpointType.Post)
            method = "POST";

        return this.http.request<any>(method, ep.full_url, { body: request, observe: 'response' })
                .pipe(
                    catchError(
                        (err: HttpErrorResponse) =>
                        {
                            if (typeof(err.error) !== 'string')
                            if (Req.FailedResponse.isMe(err.error))
                            {
                                if (err.error.force_logout)
                                {
                                    this.token = undefined;
                                    this.save_to_storage();

                                    const redirect = this.get_current_route();
                                    var queryParams: any = {};
                                    queryParams.force_logout = 1;

                                    if (redirect.length > 0)
                                        queryParams.redirect = redirect;

                                    this.router.navigate(['/login'], {queryParams: queryParams});
                                }

                                throw new Error(err.error.reason);
                            }

                            throw new Error("unknown error");
                        }
                    ),
                    map(
                        (resp: HttpResponse<any>): T =>
                        {
                            if (!type.isMe(resp.body))
                                throw new Error("unexpected or invalid response");

                            return type.copy(<T>(resp.body));
                        })
                );
    }

    get_user_by_ID(_id?: string | ID) : Observable<UserView | undefined>
    {
        if (this.token === undefined)
            return throwError(new Error("not logged in"));

        const id = id_from_param(_id);
        
        if (id === undefined)
            return of(undefined);

        return this.send_request<Req.GetUserResponse>(
            Req.GetUserResponse,
            endpoints.get_user,
            new Req.GetUserRequest(this.token, id)
        ).pipe(map((r: Req.GetUserResponse) =>
                       r.user
                   ));
    }

    get_self() : Observable<Req.GetUserResponse | undefined>
    {
        if (this.token === undefined)
            return throwError(new Error("not logged in"));

        return this.send_request<Req.GetUserResponse>(
            Req.GetUserResponse,
            endpoints.get_self,
            new Req.AuthenticatedRequest(this.token));
    }

    get_session_by_ID(_id?: string | ID) : Observable<Req.GetSessionResponse>
    {
        const id = id_from_param(_id);
        
        if (id === undefined)
            return of(undefined);

        return this.send_request<Req.GetSessionResponse>(
            Req.GetSessionResponse,
            endpoints.get_session,
            new Req.GetSessionRequest(this.token, id));
    }

    get_session_requesters(target: SessionID): Observable<Req.GetSessionRequestersResponse>
    {
        return this.send_request<Req.GetSessionRequestersResponse>(
            Req.GetSessionRequestersResponse,
            endpoints.get_session_requesters,
            new Req.GetSessionRequestersRequest(this.token, target)
        );
    }

    get_username_taken(name?: string) : Observable<boolean>
    {
        if (name === null || name === undefined || name.length <= 0)
            return of(false);

        return this.send_request(
            Req.UsernameTakenResponse,
            endpoints.username_taken,
            new Req.UsernameTakenRequest(name)
        ).pipe(map((r: Req.UsernameTakenResponse) => r.taken),
               catchError((e: any) => of(false)));
    }

    get_dodo_in_use(dodo?: string) : Observable<boolean>
    {
        if (this.token === undefined)
            return of(false);

        if (dodo === null || dodo === undefined || dodo.length !== 5)
            return of(false);

        return this.send_request<Req.DodoInUseResponse>(
            Req.DodoInUseResponse,
            endpoints.dodo_in_use,
            new Req.DodoInUseRequest(this.token, dodo)
        ).pipe(map((r: Req.DodoInUseResponse) => r.in_use),
               catchError((e: any) => of(false)));
    }

    get_session_of_user(_id?: string | ID) : Observable<SessionView | undefined>
    {
        if (this.token === undefined)
            return throwError(new Error("not logged in"));

        const id = id_from_param(_id);
        
        if (id === undefined)
            return of(undefined);

        return this.send_request<Req.GetSessionOfUserResponse>(
            Req.GetSessionOfUserResponse,
            endpoints.get_session_of_user,
            new Req.GetSessionOfUserRequest(this.token, id)
        ).pipe(map((r: Req.GetSessionOfUserResponse) => r.session));
    }

    get_users(page: number,
              search_text: string,
              search_text_category: Req.GetUsersSearchTextCategory,
              starred_filter: Req.SearchFilter,
              blocked_filter: Req.SearchFilter,
              reversed: boolean
             ): Observable<Req.GetUsersResponse | undefined>
    {
        if (this.token === undefined)
            return throwError(new Error("not logged in"));

        return this.send_request<Req.GetUsersResponse>(
            Req.GetUsersResponse,
            endpoints.get_users,
            new Req.GetUsersRequest(this.token,
                                    page,
                                    search_text,
                                    search_text_category,
                                    starred_filter,
                                    blocked_filter,
                                    reversed
                                   ));
    }

    get_sessions(page: number,
                 search_text: string,
                 search_text_category: Req.GetSessionsSearchTextCategory,
                 min_turnip_price: number,
                 status_filter: Req.SessionStatusSearchFilter,
                 host_starred_filter: Req.SearchFilter,
                 host_blocked_filter: Req.SearchFilter,
                 host_verified_filter: Req.OnlySearchFilter,
                 order_by: Req.GetSessionsOrderCategory,
                 reversed: boolean
                ): Observable<Req.GetSessionsResponse | undefined>
    {
        if (this.token === undefined)
            return throwError(new Error("not logged in"));

        return this.send_request<Req.GetSessionsResponse>(
            Req.GetSessionsResponse,
            endpoints.get_sessions,
            new Req.GetSessionsRequest(this.token,
                                       page,
                                       search_text,
                                       search_text_category,
                                       min_turnip_price,
                                       status_filter,
                                       host_starred_filter,
                                       host_blocked_filter,
                                       host_verified_filter,
                                       order_by,
                                       reversed
                                      ));
    }

    get_logs(page: number,
             search_text: string,
             start_date: number,
             end_date: number,
             log_levels: boolean[],
             reversed: boolean
            ): Observable<Req.GetLogsResponse>
    {
        if (this.token === undefined)
            return throwError(new Error("not logged in"));

        return this.send_request(
            Req.GetLogsResponse,
            endpoints.get_logs,
            new Req.GetLogsRequest(this.token,
                                   page,
                                   search_text,
                                   start_date,
                                   end_date,
                                   log_levels,
                                   reversed
                                  ));
    }

    create_new_session(dodo: string,
                       title: string,
                       description: string,
                       turnips: number,
                       unlisted: boolean,
                       public_requesters: boolean,
                       public_requester_count: boolean,
                       verified_only: boolean,
                       auto_accept_verified: boolean,
                      ): Observable<Req.NewSessionResponse>
    {
        if (this.token === undefined)
            return throwError(new Error("not logged in"));

        return this.send_request<Req.NewSessionResponse>(
            Req.NewSessionResponse,
            endpoints.new_session,
            new Req.NewSessionRequest(this.token,
                                      dodo,
                                      title,
                                      description,
                                      turnips,
                                      unlisted,
                                      public_requesters,
                                      public_requester_count,
                                      verified_only,
                                      auto_accept_verified
                                     ));
    }

    // user stuff
    private handle_loginResponse(resp: Req.LoginResponse): Req.LoginResponse
    {
        if (resp === undefined)
            return undefined;

        this.token = resp.token;
        this.save_to_storage();
        return resp;
    }

    login(username: string, password: string): Observable<Req.LoginResponse>
    {
        const ps = new SHA3(256);
        ps.update(password);

        return this.send_request<Req.LoginResponse>(
                    Req.LoginResponse,
                    endpoints.login,
                    new Req.LoginRequest(username, ps.digest('hex')))
                   .pipe(map(s => this.handle_loginResponse(s)));
    }

    register(username: string, playername: string, islandname: string, password: string, security_question_answer: string = ""): Observable<Req.LoginResponse>
    {
        const ps = new SHA3(256);
        ps.update(password);

        return this.send_request<Req.LoginResponse>(
            Req.LoginResponse,
            endpoints.register,
            new Req.RegisterRequest(
                username,
                playername,
                islandname,
                ps.digest('hex'),
                security_question_answer
            ))
           .pipe(map(s => this.handle_loginResponse(s)));
    }

    advanced_register(username: string,
                      playername: string,
                      islandname: string,
                      password: string,
                      id_prefix: string,
                      level: Level
                     ): Observable<Req.AdvancedRegisterResponse>
    {
        if (this.token === undefined)
            return throwError(new Error("not logged in"));

        const ps = new SHA3(256);
        ps.update(password);

        return this.send_request<Req.AdvancedRegisterResponse>(
            Req.AdvancedRegisterResponse,
            endpoints.advanced_register,
            new Req.AdvancedRegisterRequest(
                this.token,
                username,
                playername,
                islandname,
                ps.digest('hex'),
                id_prefix,
                level
            ));
    }

    logout(): Observable<undefined>
    {
        if (this.token === undefined)
        {
            this.save_to_storage();
            return of(undefined);
        }

        const ret = this.send_request<undefined>(
            undefined,
            endpoints.logout,
            new Req.LogoutRequest(this.token)
        );

        this.token = undefined;
        this.save_to_storage();

        return ret;
    }

    update_user_settings(target: UserID, settings: any): Observable<Req.UpdateUserSettingsResponse | undefined>
    {
        if (this.token === undefined)
            return throwError(new Error("not logged in"));

        return this.send_request<Req.UpdateUserSettingsResponse>(
            Req.UpdateUserSettingsResponse,
            endpoints.update_user_settings,
            new Req.UpdateUserSettingsRequest(this.token, target, settings)
        );
    }

    update_session_settings(target: SessionID, settings: any): Observable<Req.UpdateSessionSettingsResponse | undefined>
    {
        if (this.token === undefined)
            return throwError(new Error("not logged in"));

        return this.send_request<Req.UpdateSessionSettingsResponse>(
            Req.UpdateSessionSettingsResponse,
            endpoints.update_session_settings,
            new Req.UpdateSessionSettingsRequest(this.token, target, settings)
        );
    }

    get_dodo(sid: SessionID): Observable<Req.GetDodoResponse>
    {
        if (this.token === undefined)
            return throwError(new Error("not logged in"));

        return this.send_request<Req.GetDodoResponse>(
            Req.GetDodoResponse,
            endpoints.get_dodo,
            new Req.GetDodoRequest(this.token, sid)
        );
    }

    get_runtime_setting<T>(setting: Settings.Setting<T>): Observable<ReturnType<typeof setting.value_type.copy>>
    {
        return this.send_request<Req.GetRuntimeSettingResponse>(
            Req.GetRuntimeSettingResponse,
            endpoints.get_runtime_setting,
            new Req.GetRuntimeSettingRequest(this.token, setting.key)
        ).pipe(map(
            (r: Req.GetRuntimeSettingResponse) => { return copy_from(setting.value_type, r.value); }
        ));
    }

    set_runtime_setting<T>(setting: Settings.Setting<T>, value: T): Observable<Req.SetRuntimeSettingResponse>
    {
        return this.send_request<Req.SetRuntimeSettingResponse>(
            Req.SetRuntimeSettingResponse,
            endpoints.set_runtime_setting,
            new Req.SetRuntimeSettingRequest(this.token, setting.key, value)
        );
    }
}
