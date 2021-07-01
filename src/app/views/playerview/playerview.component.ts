import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { NgbModal, ModalDismissReasons } from '@ng-bootstrap/ng-bootstrap';
import { Router, ActivatedRoute } from '@angular/router';
import { FormControl, Validators, AbstractControl } from '@angular/forms';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { SHA3 } from 'sha3';

import { UserService } from '@services/user.service';
import { ApiService } from '@services/api.service';
import { AlertService } from '@services/alert.service';

import { is_valid_readable_id } from '@shared/ID';
import * as User from '@shared/User';
import * as Session from '@shared/Session';
import { abbreviate_name } from '@shared/utils';

function form_control_invalid(fc: AbstractControl) : boolean
{
    return fc.invalid && (fc.dirty || fc.touched);
}

@Component({
  selector: 'app-playerview',
  templateUrl: './playerview.component.html',
  styleUrls: ['./playerview.component.scss']
})
export class PlayerviewComponent implements OnInit
{
    MAX_PLAYERNAME_LENGTH = User.MAX_PLAYERNAME_LENGTH;
    MAX_ISLANDNAME_LENGTH = User.MAX_ISLANDNAME_LENGTH;
    MAX_VERIFICATION_POST_LENGTH = User.MAX_VERIFICATION_POST_LENGTH;

    Level = User.Level;
    LevelValues = User.LevelValues;
    LevelNames = User.LevelNames;
    abbreviate_name = abbreviate_name;

    pending: boolean = false;
    visibility_setting_pending: boolean = false;
    user?: User.UserView;
    user_session?: Session.SessionView;

    edit_pending: boolean = false;
    current_password = new FormControl('');
    new_password = new FormControl('');

    playername = new FormControl({value: '', disabled: this.edit_pending},
    [
        Validators.required,
        Validators.maxLength(User.MAX_PLAYERNAME_LENGTH),
        Validators.pattern(User.PLAYERNAME_REGEX)
    ]);

    islandname = new FormControl({value: '', disabled: this.edit_pending},
    [
        Validators.required,
        Validators.maxLength(User.MAX_ISLANDNAME_LENGTH),
        Validators.pattern(User.ISLANDNAME_REGEX)
    ]);

    verification_post = new FormControl({value: '', disabled: this.edit_pending},
    [
        Validators.maxLength(User.MAX_VERIFICATION_POST_LENGTH),
        Validators.pattern(User.VERIFICATION_POST_REGEX)
    ]);

    level = new FormControl({value: 0, disabled: this.edit_pending});

    get playername_invalid(): boolean { return form_control_invalid(this.playername); }
    get islandname_invalid(): boolean { return form_control_invalid(this.islandname); }
    get verification_post_invalid(): boolean { return form_control_invalid(this.verification_post); }

    @ViewChild("resetPasswordDialog", { static: false }) resetPasswordDialog: ElementRef;
    @ViewChild("editPlayernameDialog", { static: false }) editPlayernameDialog: ElementRef;
    @ViewChild("editIslandnameDialog", { static: false }) editIslandnameDialog: ElementRef;
    @ViewChild("editVerificationPostDialog", { static: false }) editVerificationPostDialog: ElementRef;
    @ViewChild("editLevelDialog", { static: false }) editLevelDialog: ElementRef;
    dialogRef: any;

    constructor(public userService: UserService,
                private api: ApiService,
                private alert: AlertService,
                private route: ActivatedRoute,
                private modalService: NgbModal,
                private router: Router
                )
    {
    }

    ngOnInit(): void
    {
        if (!this.userService.logged_in)
        {
            this.alert.show_error("Wuh-oh!", "Looks like you're not logged in! Log in to continue.",
                                  () => {this.router.navigate(['/login'])});

            return;
        }

        this.route.params.subscribe(params => this.get_user(params["id"]));
    }

    get is_self()
    {
        return this.userService.logged_in
            && (this.userService.user.id.value === this.user.id.value);
    }

    get can_reset_password()
    {
        return this.userService.logged_in
            && ((this.userService.user.id.value === this.user.id.value)
             || (this.userService.user.settings.level >= User.Level.Moderator
              && this.user.settings.level < this.userService.user.settings.level));
    }

    get can_edit_level()
    {
        return this.userService.logged_in
            && this.userService.user.settings.level >= User.Level.Moderator
            && this.user.settings.level < this.userService.user.settings.level;
    }

    get can_edit_player_islandname()
    {
        return this.userService.logged_in
            && this.userService.user.settings.level >= User.Level.Admin
            && (this.user.settings.level < this.userService.user.settings.level
               || this.userService.user.id.value === this.user.id.value
               );
    }

    get can_edit_player_islandname_visibility()
    {
        return this.userService.logged_in
            && ((this.userService.user.settings.level >= User.Level.Moderator
                 && this.user.settings.level < this.userService.user.settings.level
                )
              || (this.userService.user.id.value === this.user.id.value)
           );
    }

    get can_edit_verification_post()
    {
        return this.userService.logged_in
            && (this.userService.user.settings.level >= User.Level.Moderator
            || (this.userService.user.settings.level === User.Level.Verifier
               && this.user.settings.level === User.Level.Normal
               && (this.user.verifier === undefined || this.user.verifier.value === this.userService.user.id.value)
               )
            );
    }

    get verification_url(): string
    {
        return `https://arch.b4k.co/vg/post/${this.user.verification_post}`;
    }

    get_user(id: string | undefined)
    {
        if (id === undefined)
        {
            this.show_redirect_error("Drumsticks...", "We wanted to show you the profile of a player, but you didn't provide a player ID to look up. Better luck next time.");
            return;
        }

        if (!is_valid_readable_id(id))
        {
            this.show_redirect_error("Wuh-oh!", `I'm not quite sure what "${id}" is, but it sure doesn't look like a player ID! Better luck next time.`);
            return;
        }

        this.pending = true;

        this.api.get_user_by_ID(id)
            .subscribe((u: User.UserView | undefined) =>
            {
                this.user = u;
                this.pending = false;

                this.api.get_session_of_user(this.user.id)
                    .subscribe(
                        (s: Session.SessionView) =>
                        {
                            this.user_session = s;
                        },
                        (err: any) =>
                        {
                            this.user_session = undefined;
                        },
                    );
            },
            (err: any) =>
            {
                this.pending = false;
                this.user = undefined;
                this.user_session = undefined;
            });
    }

    private show_redirect_error(title: string, message: string)
    {
        this.alert.show_error(title, message,
            () =>
            {
                this.router.navigate(['/players']);    
            });
    }

    toggle_playername_visible()
    {
        if (this.visibility_setting_pending)
            return;

        this.visibility_setting_pending = true;
        console.log("showing / hiding playername of " + this.user.id.readable);
        const val = !this.user.settings.playername_hidden;
        this.user.settings.playername_hidden = val;

        this.api.update_user_settings(this.user.id, {playername_hidden: val})
                .subscribe(() => {this.visibility_setting_pending = false},
        (err: Error) =>
        {
            this.visibility_setting_pending = false;
            this.alert.show_error("Wuh-oh!", `Could not ${val ? 'show' : 'hide'} playername... ${err.message}`);
            this.user.settings.playername_hidden = !val;
        });
    }

    toggle_islandname_visible()
    {
        if (this.visibility_setting_pending)
            return;

        this.visibility_setting_pending = true;
        console.log("showing / hiding islandname of " + this.user.id.readable);
        const val = !this.user.settings.islandname_hidden;
        this.user.settings.islandname_hidden = val;

        this.api.update_user_settings(this.user.id, {islandname_hidden: val})
                .subscribe(() => {this.visibility_setting_pending = false},
        (err: Error) =>
        {
            this.visibility_setting_pending = false;
            this.alert.show_error("Wuh-oh!", `Could not ${val ? 'show' : 'hide'} islandname... ${err.message}`);
            this.user.settings.islandname_hidden = !val;
        });
    }

    show_reset_password_dialog()
    {
        this.dialogRef = this.modalService.open(this.resetPasswordDialog, {backdrop: 'static'});
    }

    private submit_edit_request(data: any, callback: any = undefined)
    {
        if (this.edit_pending)
            return;

        this.edit_pending = true;

        this.api.update_user_settings(this.user.id, data)
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

    reset_password()
    {
        if (this.userService.user.settings.level < User.Level.Moderator)
        if (this.current_password.value === undefined || this.current_password.value.length <= 0)
        {
            this.alert.show_error("Wuh-oh! Cannot reset password...", "current password is empty");
            return;
        }

        if (this.new_password.value === undefined || this.new_password.value.length <= 0)
        {
            this.alert.show_error("Wuh-oh! Cannot reset password...", "new password is empty");
            return;
        }


        const sha = new SHA3(256);
        this.submit_edit_request(
            {
                current_password: sha.update(this.current_password.value).digest('hex'),
                new_password: sha.reset().update(this.new_password.value).digest('hex')
            },
            () =>
            {
                this.alert.show_info("", "Password reset successfully");
            }
        );
    }

    show_edit_playername_dialog()
    {
        this.playername.setValue(this.user.playername, {onlySelf: true});
        this.dialogRef = this.modalService.open(this.editPlayernameDialog, {backdrop: 'static'});
    }

    submit_edit_playername()
    {
        if (this.playername.value === this.user.playername)
        {
            if (this.dialogRef !== undefined)
                this.dialogRef.close();

            return;
        }

        this.submit_edit_request(
            { playername: this.playername.value },
            () => { this.user.playername = this.playername.value; }
        );
    }

    show_edit_islandname_dialog()
    {
        this.islandname.setValue(this.user.islandname, {onlySelf: true});
        this.dialogRef = this.modalService.open(this.editIslandnameDialog, {backdrop: 'static'});
    }

    submit_edit_islandname()
    {
        if (this.islandname.value === this.user.islandname)
        {
            if (this.dialogRef !== undefined)
                this.dialogRef.close();

            return;
        }

        this.submit_edit_request(
            { islandname: this.islandname.value },
            () => { this.user.islandname = this.islandname.value; }
        );
    }

    show_edit_verification_post_dialog()
    {
        this.verification_post.setValue(this.user.verification_post, {onlySelf: true});
        this.dialogRef = this.modalService.open(this.editVerificationPostDialog, {backdrop: 'static'});
    }

    submit_edit_verification_post()
    {
        if (this.verification_post.value === this.user.verification_post)
        {
            if (this.dialogRef !== undefined)
                this.dialogRef.close();

            return;
        }

        this.submit_edit_request(
            { verification_post: this.verification_post.value },
            () => {
                this.user.verifier = this.userService.user.id;
                this.user.verification_post = this.verification_post.value;
            }
        );
    }

    show_edit_level_dialog()
    {
        this.level.setValue(this.user.settings.level, {onlySelf: true});
        this.dialogRef = this.modalService.open(this.editLevelDialog, {backdrop: 'static'});
    }

    submit_edit_level()
    {
        if (this.level.value === this.user.settings.level)
        {
            if (this.dialogRef !== undefined)
                this.dialogRef.close();

            return;
        }

        this.submit_edit_request(
            { level: this.level.value },
            () => { this.user.settings.level = this.level.value;}
        );
    }
}
