import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormControl, FormBuilder, Validators, AbstractControl } from '@angular/forms';

import { NameTakenValidator } from '@validators/nametakenvalidator';
import { AlertService } from '@services/alert.service';
import { UserService } from '@services/user.service';
import { ApiService } from '@services/api.service';

import * as User from '@shared/User';
import * as Settings from '@shared/RuntimeSettings';

function form_control_invalid(fc: AbstractControl) : boolean
{
    return fc.invalid && (fc.dirty || fc.touched);
}

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit
{
    MAX_USERNAME_LENGTH = User.MAX_USERNAME_LENGTH;
    MAX_PASSWORD_LENGTH = User.MAX_PASSWORD_LENGTH;
    MAX_PLAYERNAME_LENGTH = User.MAX_PLAYERNAME_LENGTH;
    MAX_ISLANDNAME_LENGTH = User.MAX_ISLANDNAME_LENGTH;
    pending: boolean = false;
    register_enabled: boolean = false;
    security_question: string = "";

    login_form = this.fb.group({
        username: ['',
            [
                Validators.required,
                Validators.maxLength(User.MAX_USERNAME_LENGTH),
                Validators.pattern(User.USERNAME_REGEX)
            ]
        ],
        password: ['',
            [
                Validators.required
            ]
        ]
    });

    get login_username() { return this.login_form.get('username'); }
    get login_username_invalid() { return form_control_invalid(this.login_username); }
    get login_password() { return this.login_form.get('password'); }
    get login_password_invalid() { return form_control_invalid(this.login_password); }

    register_form = this.fb.group({
        username: ['',
            [
                Validators.required,
                Validators.maxLength(User.MAX_USERNAME_LENGTH),
                Validators.pattern(User.USERNAME_REGEX)
            ],
            [this.nameTakenValidator]
        ],
        playername: ['',
            [
                Validators.required,
                Validators.maxLength(User.MAX_PLAYERNAME_LENGTH),
                Validators.pattern(User.PLAYERNAME_REGEX)
            ]
        ],
        islandname: ['',
            [
                Validators.required,
                Validators.maxLength(User.MAX_ISLANDNAME_LENGTH),
                Validators.pattern(User.ISLANDNAME_REGEX)
            ]
        ],
        password: ['',
            [
                Validators.required
            ]
        ],
        security_question_answer: [''],
    });

    get register_username() { return this.register_form.get('username'); }
    get register_username_invalid() { return form_control_invalid(this.register_username); }
    get register_playername() { return this.register_form.get('playername'); }
    get register_playername_invalid() { return form_control_invalid(this.register_playername); }
    get register_islandname() { return this.register_form.get('islandname'); }
    get register_islandname_invalid() { return form_control_invalid(this.register_islandname); }
    get register_password() { return this.register_form.get('password'); }
    get register_password_invalid() { return form_control_invalid(this.register_password); }
    get register_security_question_answer() { return this.register_form.get('security_question_answer'); }
    get register_security_question_answer_invalid() { return form_control_invalid(this.register_security_question_answer); }

    constructor(public userService: UserService,
                public api: ApiService,
                public alert: AlertService,
                private router: Router,
                private route: ActivatedRoute,
                private fb: FormBuilder,
                private nameTakenValidator: NameTakenValidator)
    {
    }

    ngOnInit(): void
    {
        if (this.route.snapshot.queryParams.force_logout === '1')
        {
            if (this.userService.logged_in)
            {
                this.userService.force_logout();
                this.alert.show_error("Wuh-oh!", "Looks like you were logged out. Try logging back in!");
            }
        }

        if (this.userService.logged_in)
            this.router.navigate(['/']);

        this.api.get_runtime_setting(Settings.registrations_enabled)
            .subscribe(
                (r: any) => { this.register_enabled = r ? true : false; },
                (_: Error) => { this.register_enabled = true; }
            );

        this.api.get_runtime_setting(Settings.register_require_security_question)
            .subscribe(
                (r: any) =>
                {
                    if (r)
                    this.api.get_runtime_setting(Settings.register_security_question)
                        .subscribe(
                            (r: any) =>
                            {
                                this.security_question = r;
                            },
                            (_: Error) => { this.security_question = ""; }
                        );
                },
                (_: Error) => { this.security_question = ""; }
            );
    }

    submit_login()
    {
        if (this.pending || !this.login_form.valid)
            return;

        this.pending = true;

        this.userService.login(this.login_username.value, this.login_password.value)
            .subscribe((_) =>
                {
                    this.pending = false;
                    this.router.navigate(['/']);
                },
                (err: any) =>
                {
                    if (typeof err === 'object' && 'message' in err)
                        this.alert.show_error("Oh, drumsticks...", err.message);
                    else
                        this.alert.show_error("Oh, drumsticks...", err);

                    this.pending = false;
                });
    }

    submit_register()
    {
        if (this.pending || this.register_form.pending || !this.register_form.valid)
            return;

        this.pending = true;

        this.userService.register(this.register_username.value,
                                  this.register_playername.value,
                                  this.register_islandname.value,
                                  this.register_password.value,
                                  this.register_security_question_answer.value,
                                 )
            .subscribe((_) =>
                {
                    this.pending = false;
                    this.router.navigate(['/']);
                },
                (err: any) =>
                {
                    if ('message' in err)
                        this.alert.show_error("Oh, drumsticks...", err.message);
                    else
                        this.alert.show_error("Oh, drumsticks...", err);

                    this.pending = false;
                });
    }
}
