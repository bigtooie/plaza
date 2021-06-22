import { Component, OnInit } from '@angular/core';
import { FormControl, FormBuilder, Validators, AbstractControl } from '@angular/forms';
import { Router } from '@angular/router';

import { AlertService } from '@services/alert.service';
import { UserService } from '@services/user.service';

import { DodoInUseValidator } from '@validators/dodoinusevalidator';

import { UserView } from '@shared/User';
import * as Session from '@shared/Session';

function form_control_invalid(fc: AbstractControl) : boolean
{
    return fc.invalid && (fc.dirty || fc.touched);
}

@Component({
  selector: 'app-newsession',
  templateUrl: './newsession.component.html',
  styleUrls: ['./newsession.component.scss']
})
export class NewsessionComponent implements OnInit
{
    MAX_TITLE_LENGTH = Session.MAX_TITLE_LENGTH;
    MAX_DESCRIPTION_LENGTH = Session.MAX_DESCRIPTION_LENGTH;
    MIN_TURNIPS = Session.MIN_TURNIPS;
    MAX_TURNIPS = Session.MAX_TURNIPS;

    pending: boolean = false;
    new_session_form = this.fb.group({
        dodo: ['',
            [
                Validators.required,
                Validators.pattern(Session.DODO_REGEX)
            ],
            [this.dodoInUseValidator]
        ],
        title: ['',
            [
                Validators.maxLength(Session.MAX_TITLE_LENGTH),
                Validators.pattern(Session.TITLE_REGEX)
            ]
        ],
        description: ['',
            [
                Validators.maxLength(Session.MAX_DESCRIPTION_LENGTH),
                Validators.pattern(Session.DESCRIPTION_REGEX)
            ]
        ],
        turnips: [0, [Validators.min(Session.MIN_TURNIPS), Validators.max(Session.MAX_TURNIPS)]],
        unlisted: [false],
        public_requesters: [false],
        verified_only: [false],
        auto_accept_verified: [false]
    });

    private _form_get = (name: string) => this.new_session_form.get(name).value;
    private _form_get_form = (name: string) => this.new_session_form.get(name);
    private _form_get_invalid = (name: string) => form_control_invalid(this.new_session_form.get(name));
    private _form_set = (name: string, val: any) => this.new_session_form.get(name).setValue(val, {onlySelf: true});

    get dodo(): string { return this._form_get("dodo"); }
    get dodo_form() { return this._form_get_form("dodo"); }
    get dodo_invalid(): boolean { return this._form_get_invalid("dodo"); }
    set dodo(val: string) { this._form_set("dodo", val); }
    get title(): string { return this._form_get("title"); }
    get title_form() { return this._form_get_form("title"); }
    get title_invalid(): boolean { return this._form_get_invalid("title"); }
    set title(val: string) { this._form_set("title", val); }
    get description(): string { return this._form_get("description"); }
    get description_form() { return this._form_get_form("description"); }
    get description_invalid(): boolean { return this._form_get_invalid("description"); }
    set description(val: string) { this._form_set("description", val); }
    get turnips(): number { return this._form_get("turnips"); }
    get turnips_form() { return this._form_get_form("turnips"); }
    get turnips_invalid(): boolean { return this._form_get_invalid("turnips"); }
    set turnips(val: number) { this._form_set("turnips", val); }
    get unlisted(): boolean { return this._form_get("unlisted"); }
    set unlisted(val: boolean) { this._form_set("unlisted", val); }
    get public_requesters(): boolean { return this._form_get("public_requesters"); }
    set public_requesters(val: boolean) { this._form_set("public_requesters", val); }
    get verified_only(): boolean { return this._form_get("verified_only"); }
    set verified_only(val: boolean) { this._form_set("verified_only", val); }
    get auto_accept_verified(): boolean { return this._form_get("auto_accept_verified"); }
    set auto_accept_verified(val: boolean) { this._form_set("auto_accept_verified", val); }

    constructor(public userService: UserService,
                public alert: AlertService,
                private dodoInUseValidator: DodoInUseValidator,
                private router: Router,
                private fb: FormBuilder
                )
    {
    }

    ngOnInit(): void
    {
        if (!this.userService.logged_in)
            this.router.navigate(['/login']);

        if (this.userService.current_session !== undefined)
            this.router.navigate([`/s/${this.userService.current_session.id.readable}`]);
    }

    submit_new_session()
    {
        if (this.pending || this.new_session_form.pending || !this.new_session_form.valid)
            return;

        this.pending = true;

        this.userService.create_new_session(this.dodo,
                                            this.title,
                                            this.description,
                                            this.turnips,
                                            this.unlisted,
                                            this.public_requesters,
                                            this.verified_only,
                                            this.auto_accept_verified
                                           )
            .subscribe((_) =>
            {
                this.pending = false;
                this.router.navigate([`/s/${this.userService.current_session.id.readable}`]);
            },
            (err: Error) =>
            {
                this.pending = false;
                this.alert.show_error("Wuh-oh! Something went wrong...", err.message);
            }
            );
    }
}
