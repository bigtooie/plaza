import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { map, catchError, delay } from 'rxjs/operators';
import { io, Socket } from 'socket.io-client';

import { ApiService } from '@services/api.service';
import { AlertService } from '@services/alert.service';

import * as Req from '@shared/RequestResponse';
import { g } from '@shared/globals';
import * as Msg from '@shared/SocketMessages';
import * as Session from '@shared/Session';
import { UserView, User } from '@shared/User';
import { UserID, SessionID } from '@shared/ID';
import { copy_from } from '@shared/utils';

class Watches
{
    watched_session_changes: Map<string, any> = new Map();
    watched_session_requesters: Map<string, any> = new Map();
    watched_session_requesters_changes: Map<string, any> = new Map();
}

@Injectable({
  providedIn: 'root'
})
export class UserService
{
    user_: UserView;
    current_session_pending: boolean = false;
    current_session?: Session.SessionView;
    login_observable: Observable<any> = undefined;

    get login_pending() { return this.login_observable !== undefined; }

    get logged_in() { return this.user !== undefined; }
    get user(): UserView { return this.user_; }
    set user(usr: UserView) { this.user_ = usr; this.user_changed(); }

    sock: Socket = undefined;
    w = new Watches();

    constructor(private api: ApiService,
                private alert: AlertService)
    {
        if (g.debug.auto_login)
            this.login("admin", "admin");
        else
            this.initial_login_attempt();

        this.login_observable.subscribe(_ => {}, _ => {});
    }

    private user_changed()
    {
        this.update_current_session();
        this.update_socket();
    }

    // if token exists in api already (e.g. from storage), try to log in
    // using this key.
    // otherwise, see if settings have autologin.
    initial_login_attempt()
    {
        if (this.login_pending)
            return this.login_observable;

        if (this.api.token !== undefined)
            this.login_observable = this.login_by_token();
        else
            this.login_observable = throwError(new Error("no login")).pipe(catchError(e => this.login_error_intercepter(e)));

        return this.login_observable;
    }

    private login_intercepter(resp: any)
    {
        this.user = resp.user;
        console.log(`logged in as ${this.user.username}`);
        this.update_current_session();
        this.login_observable = undefined;
        return resp;
    }

    private login_error_intercepter(err: any): never
    {
        this.login_observable = undefined;
        throw err;
    }

    private login_by_token()
    {
        return this.api.get_self().pipe(
            map((r: Req.GetUserResponse) => this.login_intercepter(r)),
            catchError(err => this.login_error_intercepter(err))
        );
    }

    force_logout(): void
    {
        this.user = undefined;
    }

    // returns whether youre logged in after calling
    login(username: string, password: string): Observable<Req.LoginResponse>
    {
        if (this.login_pending)
            return this.login_observable;

        this.login_observable = this.api.login(username, password)
            .pipe(
                map((resp: Req.LoginResponse) => this.login_intercepter(resp)),
                catchError(err => this.login_error_intercepter(err))
            );

        return this.login_observable;
    }

    register(username: string,
             playername: string,
             islandname: string,
             password: string,
             security_question_answer: string = ""
            ): Observable<Req.RegisterResponse>
    {
        if (this.login_pending)
            return this.login_observable;

        this.login_observable = this.api.register(username, playername, islandname, password, security_question_answer)
            .pipe(
                map(resp => this.login_intercepter(resp)),
                catchError(err => this.login_error_intercepter(err))
            );

        return this.login_observable;
    }

    logout(): void
    {
        this.api.logout().subscribe(
            (_) => 
            {
                this.user = undefined;
                this.update_current_session();
            },
            (err: Error) => 
            {
                console.log(`something went wrong, but whatever: ${err.message}`);
                this.user = undefined;
                this.update_current_session();
            }
        );
    }

    create_new_session(dodo: string,
                       title: string = "",
                       description: string = "",
                       turnips: number = 0,
                       unlisted: boolean = false,
                       public_requesters: boolean = false,
                       public_requester_count: boolean = false,
                       verified_only: boolean = false,
                       auto_accept_verified: boolean = false
                      ): Observable<Req.NewSessionResponse>
    {
        return this.api.create_new_session(dodo, title, description, turnips, unlisted, public_requesters, public_requester_count, verified_only, auto_accept_verified)
                   .pipe(map((resp: Req.NewSessionResponse) =>
                {
                    this.current_session_pending = false;
                    this.current_session = resp.session;
                    return resp;
                }),
                    catchError((err: any) =>
                {
                    this.current_session_pending = false;
                    this.current_session = undefined;
                    return throwError(err);
                }));
    }

    update_current_session()
    {
        if (!this.logged_in)
        {
            this.current_session = undefined;
            this.current_session_pending = false;
            return;
        }

        this.current_session_pending = true;

        console.log("updating current session");
        this.api.get_session_of_user(this.user.id).subscribe(
            s =>
            {
                this.current_session = s;
                this.current_session_pending = false;
            },
            (err: Error) =>
            {
                console.log("could not get current session:", err.message);
                this.current_session = undefined;
                this.current_session_pending = false;
            }
        );
    }

    star(uid: UserID, value: boolean = true)
    {
        return this.api.update_user_settings(uid, {starred: value});
    }

    block(uid: UserID, value: boolean = true)
    {
        return this.api.update_user_settings(uid, {blocked: value});
    }

    ban(uid: UserID, value: boolean = true)
    {
        return this.api.update_user_settings(uid, {banned: value});
    }

    get_dodo(sid: SessionID): Observable<Req.GetDodoResponse>
    {
        return this.api.get_dodo(sid);
    }

    private socket_callback<T>(type: Msg.Message<T>, callback: (param: T) => void)
    {
        this.sock.on(type.ID, (res_: any) =>
        {
            const res = copy_from<T>(type, res_);

            if (res === undefined)
                return;

            callback(res);
        });
    }

    // socket stuff
    private update_socket()
    {
        if (!this.logged_in)
        {
            this.sock = undefined;
            return;
        }

        this.sock = io("/",
        {
            path: g.socket_path,
            auth: { token: this.api.token.jwt }
        });

        this.sock.on("error", (err: any) =>
        {
            this.alert.show_error("Wuh-oh!", err);
        });

        this.sock.on(Msg.ErrorID, (err: string) =>
        {
            this.alert.show_error("Wuh-oh!", err);
        });

        this.socket_callback(Msg.SessionChanged, (res: Msg.SessionChanged) =>
        {
            if (this.current_session !== undefined && res.session.value === this.current_session.id.value)
            {
                if ('status' in res.changes)
                    this.current_session.settings.status = res.changes.status;

                if ('requester_count' in res.changes)
                    this.current_session.requester_count = res.changes.requester_count;
            }

            const callback = this.w.watched_session_changes.get(res.session.value);

            if (callback === undefined)
                return;

            callback(res.changes);
        });

        this.socket_callback(Msg.NewRequester, (res: Msg.NewRequester) =>
        {
            const callback = this.w.watched_session_requesters.get(res.requester.session.value);

            if (callback === undefined)
                return;

            callback(res.requester);
        });

        this.socket_callback(Msg.RequesterUpdate, (res: Msg.RequesterUpdate) =>
        {
            const callback = this.w.watched_session_requesters_changes.get(res.session.value);

            if (callback === undefined)
                return;

            callback(res);
        });
    }

    watch_session(id: SessionID, callback: any)
    {
        if (id === undefined || this.sock === undefined)
            return;

        this.w.watched_session_changes.set(id.value, callback);

        this.sock.emit(Msg.WatchSession.ID, new Msg.WatchSession(id));
    }

    unwatch_session(id: SessionID)
    {
        if (id === undefined || this.sock === undefined)
            return;

        this.w.watched_session_changes.delete(id.value);

        this.sock.emit(Msg.UnwatchSession.ID, new Msg.UnwatchSession(id));
    }

    watch_session_requesters(id: SessionID, callback: any)
    {
        if (id === undefined || this.sock === undefined)
            return;

        this.w.watched_session_requesters.set(id.value, callback);

        this.sock.emit(Msg.WatchSessionRequesters.ID, new Msg.WatchSessionRequesters(id));
    }

    unwatch_session_requesters(id: SessionID)
    {
        if (id === undefined || this.sock === undefined)
            return;

        this.w.watched_session_requesters.delete(id.value);

        this.sock.emit(Msg.UnwatchSessionRequesters.ID, new Msg.UnwatchSessionRequesters(id));
    }

    watch_session_requesters_updated(id: SessionID, callback: any)
    {
        if (id === undefined || this.sock === undefined || !this.logged_in)
            return;

        this.w.watched_session_requesters_changes.set(id.value, callback);

        this.sock.emit(Msg.WatchSessionRequestersChanges.ID, new Msg.WatchSessionRequestersChanges(id));
    }

    unwatch_session_requesters_updated(id: SessionID)
    {
        if (id === undefined || this.sock === undefined || !this.logged_in)
            return;

        this.w.watched_session_requesters_changes.delete(id.value);

        this.sock.emit(Msg.UnwatchSessionRequestersChanges.ID, new Msg.UnwatchSessionRequestersChanges(id));
    }

    request_dodo(id: SessionID, callback: any)
    {
        if (id === undefined || this.sock === undefined || !this.logged_in)
            return;

        this.w.watched_session_requesters_changes.set(id.value, callback);

        this.sock.emit(Msg.RequestDodo.ID, new Msg.RequestDodo(id));
    }

    rerequest_dodo(id: SessionID, callback: any)
    {
        if (id === undefined || this.sock === undefined || !this.logged_in)
            return;

        this.watch_session_requesters_updated(id, callback);
        this.sock.emit(Msg.RequesterUpdate.ID, new Msg.RequesterUpdate(id, this.user.id, Session.RequesterStatus.Sent));
    }

    withdraw_dodo_request(id: SessionID)
    {
        if (id === undefined || this.sock === undefined || !this.logged_in)
            return;

        this.sock.emit(Msg.RequesterUpdate.ID, new Msg.RequesterUpdate(id, this.user.id, Session.RequesterStatus.Withdrawn));
    }

    accept_requester(sid: SessionID, uid: UserID)
    {
        if (sid === undefined || uid === undefined || this.sock === undefined || !this.logged_in)
            return;

        this.sock.emit(Msg.RequesterUpdate.ID, new Msg.RequesterUpdate(sid, uid, Session.RequesterStatus.Accepted));
    }

    reject_requester(sid: SessionID, uid: UserID)
    {
        if (sid === undefined || uid === undefined || this.sock === undefined || !this.logged_in)
            return;

        this.sock.emit(Msg.RequesterUpdate.ID, new Msg.RequesterUpdate(sid, uid, Session.RequesterStatus.Rejected));
    }

    reset_requester(sid: SessionID, uid: UserID)
    {
        if (sid === undefined || uid === undefined || this.sock === undefined || !this.logged_in)
            return;

        this.sock.emit(Msg.RequesterUpdate.ID, new Msg.RequesterUpdate(sid, uid, Session.RequesterStatus.Withdrawn));
    }
}
