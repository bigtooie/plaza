import { Component, OnInit, Input } from '@angular/core';

import { UserService } from '@services/user.service';
import { AlertService } from '@services/alert.service';

import { UserView, Level } from '@shared/User';

@Component({
  selector: 'app-userbuttons',
  templateUrl: './userbuttons.component.html',
  styleUrls: ['./userbuttons.component.scss']
})
export class UserbuttonsComponent implements OnInit {

    Level = Level
    pending = false;
    @Input() user!: UserView;

    constructor(public userService: UserService,
                private alert: AlertService
               ) { }

    ngOnInit(): void
    {
    }

    get can_ban()
    {
        return this.userService.user.settings.level >= Level.Moderator
            && this.userService.user.settings.level > this.user.settings.level;
    }

    onStarClick() : void
    {
        if (this.pending)
            return;

        this.pending = true;
        const val = !this.user.settings.starred;
        this.user.settings.starred = val;

        this.userService.star(this.user.id, val)
                        .subscribe(() => {this.pending = false},
            (err: Error) =>
            {
                this.pending = false;
                this.alert.show_error("Wuh-oh!", `Could not ${val ? '' : 'un'}star this player... ${err.message}`);
                this.user.settings.starred = !val;
            });
    }

    onBlockClick() : void
    {
        if (this.pending)
            return;

        this.pending = true;
        const val = !this.user.settings.blocked;
        this.user.settings.blocked = val;

        this.userService.block(this.user.id, val)
                .subscribe(() => {this.pending = false},
            (err: Error) =>
            {
                this.pending = false;
                this.alert.show_error("Wuh-oh!", `Could not ${val ? '' : 'un'}block this player... ${err.message}`);
                this.user.settings.blocked = !val;
            });
    }

    onBanClick(): void
    {
        if (this.pending)
            return;

        this.pending = true;
        const val = !this.user.settings.banned;
        this.user.settings.banned = val;

        this.userService.ban(this.user.id, val)
                .subscribe(() => {this.pending = false},
            (err: Error) =>
            {
                this.pending = false;
                this.alert.show_error("Wuh-oh!", `Could not ${val ? '' : 'un'}ban this player... ${err.message}`);
                this.user.settings.banned = !val;
            });
    }
}
