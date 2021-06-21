import { Component, OnInit, OnDestroy, SecurityContext, ViewChild, ElementRef } from '@angular/core';
import { FormControl, FormBuilder, Validators, AbstractControl } from '@angular/forms';
import { DomSanitizer } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { NgbModal, ModalDismissReasons } from '@ng-bootstrap/ng-bootstrap';
import { of, Observable, forkJoin } from 'rxjs';
import { concatMap } from 'rxjs/operators';

import { UserService } from '@services/user.service';
import { ApiService } from '@services/api.service';
import { AlertService } from '@services/alert.service';

import { DodoInUseValidator } from '@validators/dodoinusevalidator';

import { UserID, SessionID } from '@shared/ID';
import * as Session from '@shared/Session';
import * as User from '@shared/User';
import * as Req from '@shared/RequestResponse';
import * as Msg from '@shared/SocketMessages';
import { get_duration_text, copy_from, remove_if } from '@shared/utils';

function form_control_invalid(fc: AbstractControl) : boolean
{
    return fc.invalid && (fc.dirty || fc.touched);
}

@Component({
  selector: 'app-sessionview',
  templateUrl: './sessionview.component.html',
  styleUrls: ['./sessionview.component.scss']
})
export class SessionviewComponent implements OnInit, OnDestroy
{
    Level = User.Level;
    MAX_TITLE_LENGTH = Session.MAX_TITLE_LENGTH;
    MAX_DESCRIPTION_LENGTH = Session.MAX_DESCRIPTION_LENGTH;
    MIN_TURNIPS = Session.MIN_TURNIPS;
    MAX_TURNIPS = Session.MAX_TURNIPS;
    
    // types
    SessionStatus = Session.SessionStatus;
    SessionStatusValues = Session.SessionStatusValues;
    RequesterStatus = Session.RequesterStatus;

    @ViewChild("editDodoDialog", { static: false }) editDodoDialog: ElementRef;
    @ViewChild("editTitleDialog", { static: false }) editTitleDialog: ElementRef;
    @ViewChild("editDescriptionDialog", { static: false }) editDescriptionDialog: ElementRef;
    @ViewChild("editTurnipsDialog", { static: false }) editTurnipsDialog: ElementRef;
    @ViewChild("editSessionStatusDialog", { static: false }) editSessionStatusDialog: ElementRef;
    @ViewChild("closeSessionDialog", { static: false }) closeSessionDialog: ElementRef;
    dialogRef: any;

    pending: boolean = false;
    edit_pending: boolean = false;
    session?: Session.SessionView;

    requesters: Session.RequesterView[] = [];

    dodoInUseValidatorFn = <AsyncValidatorFn>(ctrl: any) => 
    {
        if (ctrl.value === this.session.settings.dodo)
            return of({});

        return this.dodoInUseValidator.validate(ctrl);
    }

    dodo_form = new FormControl('',
        [
            Validators.required,
            Validators.pattern(Session.DODO_REGEX)
        ],
        [this.dodoInUseValidatorFn]);

    get dodo(): string { return this.dodo_form.value; }
    set dodo(val: string) { this.dodo_form.setValue(val, {onlySelf: true}); }
    get dodo_invalid(): boolean { return form_control_invalid(this.dodo_form); }

    title_form = new FormControl('',
        [
            Validators.maxLength(Session.MAX_TITLE_LENGTH),
            Validators.pattern(Session.TITLE_REGEX)
        ]);

    get title(): string { return this.title_form.value; }
    set title(val: string) { this.title_form.setValue(val, {onlySelf: true}); }
    get title_invalid(): boolean { return form_control_invalid(this.title_form); }

    description_form = new FormControl('',
        [
            Validators.maxLength(Session.MAX_DESCRIPTION_LENGTH),
            Validators.pattern(Session.DESCRIPTION_REGEX)
        ]);

    get description(): string { return this.description_form.value; }
    set description(val: string) { this.description_form.setValue(val, {onlySelf: true}); }
    get description_invalid(): boolean { return form_control_invalid(this.description_form); }

    turnips_form = new FormControl(0,
        [
            Validators.min(Session.MIN_TURNIPS),
            Validators.max(Session.MAX_TURNIPS)
        ]);

    get turnips(): number { return this.turnips_form.value; }
    set turnips(val: number) { this.turnips_form.setValue(val, {onlySelf: true}); }
    get turnips_invalid(): boolean { return form_control_invalid(this.turnips_form); }

    session_status_form = new FormControl('');

    get session_status(): Session.SessionStatus { return this.session_status_form.value; }
    set session_status(val: Session.SessionStatus) { this.session_status_form.setValue(val, {onlySelf: true}); }

    dodo_leaked_form = new FormControl(false);

    get dodo_leaked(): boolean { return this.dodo_leaked_form.value; }
    set dodo_leaked(val: boolean) { this.dodo_leaked_form.setValue(val, {onlySelf: true}); }

    constructor(public userService: UserService,
                private sanitizer: DomSanitizer,
                private route: ActivatedRoute,
                private dodoInUseValidator: DodoInUseValidator,
                private modalService: NgbModal,
                private alert: AlertService,
                private api: ApiService)
    {
    }

    sanitize = (s: string) => this.sanitizer.sanitize(SecurityContext.HTML, s);

    ngOnInit(): void
    {
        this.route.params.subscribe(params =>
        {
            this.pending = true;
            const id = params["id"];

            this.update_session(id);
        });
    }

    ngOnDestroy(): void
    {
        if (this.session !== undefined)
        {
            this.userService.unwatch_session(this.session.id);

            if (this.can_watch_requesters && !this.is_host)
                this.userService.unwatch_session_requesters(this.session.id);
        }
    }

    get can_edit(): boolean
    {
        return this.userService.logged_in
            && this.session.settings.status !== Session.SessionStatus.Closed
            && (this.userService.user.settings.level >= User.Level.Moderator || this.userService.user.id.value === this.session.host.id.value);
    }

    get can_edit_after_closed(): boolean
    {
        return this.userService.logged_in
           && (this.userService.user.settings.level >= User.Level.Moderator || this.userService.user.id.value === this.session.host.id.value);
    }

    get can_watch_requesters(): boolean
    {
        return this.session !== undefined && (this.session.settings.public_requesters
        || (this.userService.logged_in
            && (this.userService.user.settings.level >= User.Level.Moderator
             || this.userService.user.id.value === this.session.host.id.value)))
    }

    get is_host(): boolean
    {
        return this.session !== undefined
            && this.userService.logged_in
            && this.userService.user.id.value === this.session.host.id.value;
    }

    get time_since_last_update() : Date
    {
        if (this.session === undefined)
            return new Date(0);

        const now = new Date();
        return new Date(now.getTime() - this.session.updated.getTime());
    }

    get time_since_last_update_string() : string
    {
        const df = this.time_since_last_update;

        return get_duration_text(df);
    }

    // sess
    private update_session(id: string)
    {
        this.api.get_session_by_ID(id ? id : undefined).subscribe(
            (r: Req.GetSessionResponse) =>
            {
                this.session = r.session;
                this.pending = false;

                if (this.session.settings.status !== Session.SessionStatus.Closed)
                {
                    this.userService.watch_session(this.session.id, (c:any) => this.onSessionChanged(c));

                    if (this.can_watch_requesters)
                    {
                        this.get_requesters();
                        this.watch_requesters();
                    }
                    else
                    if (this.session.requester_status !== Session.RequesterStatus.None)
                        this.userService.watch_session_requesters_updated(this.session.id,
                              (c: Msg.RequesterUpdate) => this.onRequesterUpdate(c));
                }
            },
            (err: Error) =>
            {
                this.session = undefined;
                this.pending = false;
            }
        );
    }

    private get_requesters()
    {
        this.api.get_session_requesters(this.session.id)
                .subscribe(
                    (resp: Req.GetSessionRequestersResponse) =>
                    {
                        this.requesters = resp.requesters;
                        this.sort_requesters();
                    },
                    (err) =>
                    {
                        console.log("could not get requesters", err);
                    });
    }

    private watch_requesters()
    {
        this.userService.watch_session_requesters(this.session.id,
                                                  (n: Session.RequesterView) => this.onNewRequester(n));
        this.userService.watch_session_requesters_updated(this.session.id,
                                                          (c: Msg.RequesterUpdate) => this.onRequesterUpdate(c));
    }

    private onSessionChanged(changes: any)
    {
        if (this.session === undefined)
            return;

        if ('unlisted' in changes)
            this.session.settings.unlisted = changes.unlisted;

        if ('title' in changes)
            this.session.settings.title = changes.title;

        if ('description' in changes)
            this.session.settings.description = changes.description;

        if ('turnip_prices' in changes)
            this.session.settings.turnip_prices = changes.turnip_prices;

        if ('public_requesters' in changes)
            this.session.settings.public_requesters = changes.public_requesters;

        if ('verified_only' in changes)
            this.session.settings.verified_only = changes.verified_only;

        if ('updated' in changes)
            this.session.updated = new Date(changes.updated);

        if ('status' in changes)
        {
            this.session.settings.status = changes.status;

            if (this.session.settings.status === Session.SessionStatus.Closed
             && this.session.host.id.value === this.userService.user.id.value)
                this.userService.update_current_session();
        }

        if ('dodo' in changes)
        {
            if (changes.dodo.length > 0)
                this.session.settings.dodo = changes.dodo;
            else
                this.alert.show_info("Dodo Changed!", "The Dodo Code has changed.");
        }
    }

    private onNewRequester(nr: Session.RequesterView)
    {
        if (nr === undefined)
            return;

        this.requesters.push(nr);
        this.sort_requesters();
    }

    private onRequesterUpdate(c: Msg.RequesterUpdate)
    {
        for (var req of this.requesters)
            if (req.user.id.value === c.user.value)
                req.status = c.status;

        if (this.userService.logged_in
         && this.userService.user.id.value === c.user.value)
        {
            this.session.requester_status = c.status;

            if (this.session.requester_status === Session.RequesterStatus.Accepted)
                this.alert.show_info("Hooray!", "You got accepted! You can now get the dodo by pressing the 'show dodo' button");
            else if (this.session.requester_status === Session.RequesterStatus.Rejected)
                this.alert.show_info("Oh no!", "You got rejected!");
            else if (this.session.requester_status === Session.RequesterStatus.Withdrawn)
            {
                if (!this.can_watch_requesters)
                    this.userService.unwatch_session_requesters_updated(this.session.id);
            }
        }
    }

    private sort_requesters()
    {
        this.requesters.sort((r1: Session.RequesterView, r2: Session.RequesterView) =>
        {
            if (r1.user.settings.starred && !r2.user.settings.starred)
                return -1;
            if (!r1.user.settings.starred && r2.user.settings.starred)
                return 1;

            return r2.requested_at.getTime() - r1.requested_at.getTime();
        });
    }

    // edit
    private submit_edit_request(data: any, callback: any = undefined)
    {
        if (this.edit_pending)
            return;

        this.edit_pending = true;

        this.api.update_session_settings(this.session.id, data)
                .subscribe(
                (_) =>
                {
                    if (this.dialogRef !== undefined)
                        this.dialogRef.close();

                    if (callback !== undefined)
                        callback();

                    this.edit_pending = false;
                },
                (err: Error) =>
                {
                    this.alert.show_error("Wuh-oh!", err.message,
                        () =>
                        {
                            if (this.dialogRef !== undefined)
                                this.dialogRef.close();

                            this.edit_pending = false;
                        });
                });
    }

    show_edit_dodo_dialog()
    {
        this.dodo = this.session.settings.dodo;
        this.dodo_leaked = false;
        this.dialogRef = this.modalService.open(this.editDodoDialog, {backdrop: 'static'});
    }

    submit_edit_dodo()
    {
        this.submit_edit_request({dodo: this.dodo, dodo_leaked: this.dodo_leaked});
    }

    show_edit_title_dialog()
    {
        this.title = this.session.settings.title;
        this.dialogRef = this.modalService.open(this.editTitleDialog, {backdrop: 'static'});
    }

    submit_edit_title()
    {
        this.submit_edit_request({title: this.title});
    }

    show_edit_description_dialog()
    {
        this.description = this.session.settings.description;
        this.dialogRef = this.modalService.open(this.editDescriptionDialog, {backdrop: 'static'});
    }

    submit_edit_description()
    {
        this.submit_edit_request({description: this.description});
    }

    show_edit_turnip_prices_dialog()
    {
        this.turnips = this.session.settings.turnip_prices;
        this.dialogRef = this.modalService.open(this.editTurnipsDialog, {backdrop: 'static'});
    }

    submit_edit_turnips()
    {
        this.submit_edit_request({turnip_prices: this.turnips});
    }

    show_edit_session_status_dialog()
    {
        this.session_status = this.session.settings.status;
        this.dodo_leaked = false;
        this.dialogRef = this.modalService.open(this.editSessionStatusDialog, {backdrop: 'static'});
    }

    submit_edit_session_status()
    {
        this.submit_edit_request({status: this.session_status, dodo_leaked: this.dodo_leaked});
    }

    show_close_session_dialog()
    {
        this.dodo_leaked = false;
        this.dialogRef = this.modalService.open(this.closeSessionDialog, {backdrop: 'static'});
    }

    submit_close_session()
    {
        this.submit_edit_request({status: Session.SessionStatus.Closed, dodo_leaked: this.dodo_leaked});
    }

    toggle_unlisted()
    {
        this.submit_edit_request({unlisted: !this.session.settings.unlisted});
    }

    toggle_public_requesters()
    {
        this.submit_edit_request({public_requesters: !this.session.settings.public_requesters});
    }

    toggle_verified_only()
    {
        this.submit_edit_request({verified_only: !this.session.settings.verified_only});
    }

    request_dodo()
    {
        if (this.session.requester_status === Session.RequesterStatus.None)
            this.userService.request_dodo(this.session.id, (c: Msg.RequesterUpdate) => this.onRequesterUpdate(c));
        else if (this.session.requester_status === Session.RequesterStatus.Withdrawn)
            this.userService.rerequest_dodo(this.session.id, (c: Msg.RequesterUpdate) => this.onRequesterUpdate(c));
    }

    withdraw_dodo_request()
    {
        if (this.session.requester_status === Session.RequesterStatus.Sent)
            this.userService.withdraw_dodo_request(this.session.id);
    }

    accept_requester(usr: UserID)
    {
        this.userService.accept_requester(this.session.id, usr);
    }

    reject_requester(usr: UserID)
    {
        this.userService.reject_requester(this.session.id, usr);
    }

    reset_requester(usr: UserID)
    {
        this.userService.reset_requester(this.session.id, usr);
    }

    get_dodo()
    {
        if (this.session.requester_status !== Session.RequesterStatus.Accepted)
            return;

        this.userService.get_dodo(this.session.id)
            .subscribe((resp: Req.GetDodoResponse) =>
            {
                if (resp === undefined)
                    return;

                this.alert.show_info("Dodo is...", resp.dodo);
            },
            (err: Error) =>
            {
                this.alert.show_error("Wuh-oh!", err.message);
            })
    }
}
