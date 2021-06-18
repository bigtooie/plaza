import { Component, OnInit } from '@angular/core';
import { FormControl, FormBuilder, Validators, AbstractControl } from '@angular/forms';
import { v4 as uuidv4 } from 'uuid';

import { NameTakenValidator } from '@validators/nametakenvalidator';
import { AlertService } from '@services/alert.service';
import { ApiService } from '@services/api.service';
import { UserService } from '@services/user.service';

import { BASE58pattern, UserID, prefix_uuid } from '@shared/ID';
import { remove_if } from '@shared/utils';
import * as User from '@shared/User';

function form_control_invalid(fc: AbstractControl) : boolean
{
    return fc.invalid && (fc.dirty || fc.touched);
}

@Component({
  selector: 'app-advanced-account-creator',
  templateUrl: './advanced-account-creator.component.html',
  styleUrls: ['./advanced-account-creator.component.scss']
})
export class AdvancedAccountCreatorComponent implements OnInit
{
    Level = User.Level;
    AvailableLevels = User.LevelValues;
    LevelValues = User.LevelValues;
    LevelNames = User.LevelNames;
    MAX_USERNAME_LENGTH = User.MAX_USERNAME_LENGTH;
    MAX_PASSWORD_LENGTH = User.MAX_PASSWORD_LENGTH;
    MAX_PLAYERNAME_LENGTH = User.MAX_PLAYERNAME_LENGTH;
    MAX_ISLANDNAME_LENGTH = User.MAX_ISLANDNAME_LENGTH;
    pending: boolean = false;

    exampleID: UserID = new UserID();

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
                Validators.required,
                Validators.maxLength(User.MAX_PASSWORD_LENGTH)
            ]
        ],
        id_prefix: ['',
            [
                Validators.pattern(BASE58pattern)
            ]
        ],
        level: [User.Level.Normal]
    });

    get register_username() { return this.register_form.get('username'); }
    get register_username_invalid() { return form_control_invalid(this.register_username); }
    get register_playername() { return this.register_form.get('playername'); }
    get register_playername_invalid() { return form_control_invalid(this.register_playername); }
    get register_islandname() { return this.register_form.get('islandname'); }
    get register_islandname_invalid() { return form_control_invalid(this.register_islandname); }
    get register_password() { return this.register_form.get('password'); }
    get register_password_invalid() { return form_control_invalid(this.register_password); }
    get register_id_prefix() { return this.register_form.get('id_prefix'); }
    get register_id_prefix_invalid() { return form_control_invalid(this.register_id_prefix); }
    get register_level() { return this.register_form.get('level'); }
    get register_level_invalid() { return form_control_invalid(this.register_level); }

    constructor(public userService: UserService,
                public api: ApiService,
                public alert: AlertService,
                private fb: FormBuilder,
                private nameTakenValidator: NameTakenValidator)
    {
    }

    ngOnInit(): void
    {
        this.set_available_levels();
    }

    set_available_levels()
    {
        this.AvailableLevels = User.LevelValues;

        if (this.userService.user.settings.level < User.Level.Admin)
            remove_if(this.AvailableLevels, (x: User.Level) => x >= this.userService.user.settings.level);
    }

    renew_exampleID()
    {
        const uid = uuidv4();
        const puid = prefix_uuid(uid, this.register_id_prefix.value ?? '');
        this.exampleID = new UserID(puid);
    }

    submit_register()
    {
        if (this.pending || this.register_form.pending || !this.register_form.valid)
            return;

        this.pending = true;

        this.api.advanced_register(this.register_username.value,
                                   this.register_playername.value,
                                   this.register_islandname.value,
                                   this.register_password.value,
                                   this.register_id_prefix.value,
                                   this.register_level.value
                                  )
            .subscribe((_) =>
                {
                    this.pending = false;
                    this.alert.show_info("yes", "account created successfully");
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
