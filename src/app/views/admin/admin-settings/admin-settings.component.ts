import { Component, OnInit } from '@angular/core';
import { FormControl, FormBuilder, Validators, AbstractControl, ValidatorFn } from '@angular/forms';
import { ApiService } from '@services/api.service';
import { AlertService } from '@services/alert.service';

import { copy_from } from '@shared/utils';
import * as Req from '@shared/RequestResponse';
import * as Settings from '@shared/RuntimeSettings';

function form_control_invalid(fc: AbstractControl) : boolean
{
    return fc.invalid && (fc.dirty || fc.touched);
}

@Component({
  selector: 'app-admin-settings',
  templateUrl: './admin-settings.component.html',
  styleUrls: ['./admin-settings.component.scss']
})
export class AdminSettingsComponent implements OnInit
{
    all_settings = Settings.all;
    isBoolSetting = Settings.BoolSetting.isMe;
    isStringSetting = Settings.StringSetting.isMe;
    isNumberSetting = Settings.NumberSetting.isMe;
    form_control_invalid = form_control_invalid;

    formControls: { [name: string]: FormControl; } = {}

    pending = false;

    constructor(
        public api: ApiService,
        private alert: AlertService,
        private fb: FormBuilder,
    )
    {
        this.init_settings_form();
        this.init_load_settings();
    }

    ngOnInit(): void
    {
    }

    private init_settings_form()
    {
        for (const setting of Settings.all)
        {
            if (Settings.StringSetting.isMe(setting))
                this.add_string_setting(setting);
            else if (Settings.NumberSetting.isMe(setting))
                this.add_number_setting(setting);
            else if (Settings.BoolSetting.isMe(setting))
                this.add_bool_setting(setting);
        }
    }

    private init_load_settings()
    {
        const f = Settings.all.reduce(
            (acc: any, setting: any) =>
            {
                return () => { this.load_setting(setting, acc); };
            }
        , () => {});

        f();
    }

    private add_string_setting(setting: Settings.StringSetting)
    {
        var validators: ValidatorFn[] =
        [
            Validators.minLength(setting.min_length),
            Validators.maxLength(setting.max_length)
        ];

        if (setting.pattern.length > 0)
            validators.push(Validators.pattern(new RegExp(setting.pattern)));

        const ctrl = new FormControl(setting.default_value, validators);
        this.formControls[setting.key] = ctrl;
    }

    private add_number_setting(setting: Settings.NumberSetting)
    {
        var validators: ValidatorFn[] =
        [
            Validators.min(setting.min),
            Validators.max(setting.max)
        ];

        const ctrl = new FormControl(setting.default_value, validators);
        this.formControls[setting.key] = ctrl;
    }

    private add_bool_setting(setting: Settings.BoolSetting)
    {
        const ctrl = new FormControl(setting.default_value);
        this.formControls[setting.key] = ctrl;
    }

    get_form(key: string)
    {
        return this.formControls[key];
    }

    apply_setting<T>(setting: Settings.Setting<T>)
    {
        if (this.pending)
            return;

        this.pending = true;

        this.api.set_runtime_setting(setting, this.get_form(setting.key).value)
            .subscribe(
                (_:any) =>
                {
                    this.pending = false;
                    this.alert.show_info("Setting Saved", "Setting saved successfully.");
                },
                (err:Error) =>
                {
                    this.pending = false;
                    this.alert.show_error("Wuh-oh!", `Setting could not be saved... ${err.message}`);
                }
            );
    }

    load_setting<T>(setting: Settings.Setting<T>, next: any = undefined)
    {
        if (this.pending)
            return;

        this.pending = true;

        this.api.get_runtime_setting(setting)
            .subscribe(
                (val: T) =>
                {
                    this.pending = false;

                    this.get_form(setting.key).setValue(val, {onlySelf: true});

                    if (next !== undefined)
                        next();
                },
                (err: Error) =>
                {
                    this.pending = false;
                    this.alert.show_error("Wuh-oh!", `could not get setting... ${err.message}`);
                }
            );
    }

    reset_setting<T>(setting: Settings.Setting<T>)
    {
        this.get_form(setting.key).setValue(setting.default_value, {onlySelf: true});
    }
}
