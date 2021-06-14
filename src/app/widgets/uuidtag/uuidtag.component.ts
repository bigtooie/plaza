import { Component, Input, OnInit } from '@angular/core';
import { Location } from '@angular/common';

import { ID } from '@shared/ID';
import { Level } from '@shared/User';

@Component({
  selector: 'app-uuidtag',
  templateUrl: './uuidtag.component.html',
  styleUrls: ['./uuidtag.component.scss']
})
export class UuidtagComponent implements OnInit
{
    Level = Level;
    @Input() id!: ID;
    @Input() link: boolean = true;
    @Input() show_copy: boolean = false;

    @Input() level: Level = Level.Normal;
    @Input() verified: boolean = false;
    router_link: string = "";
    copy_url: string = "";
    level_icon: string = "";

    constructor(private location: Location)
    {
    }

    ngOnInit(): void
    {
        this.router_link = '/' + this.id.readable[0] + '/' + this.id.readable;
        this.copy_url = window.location.origin + '/' + this.location.prepareExternalUrl('/') + this.id.readable[0] + '/' + this.id.readable;
        this.level_icon = this.get_level_icon();
    }

    private get_level_icon(): string
    {
        switch (this.level)
        {
        case (Level.Normal):
            return "";
        case (Level.Verifier):
            return "fa-check";
        case (Level.Moderator):
            return "fa-gavel";
        case (Level.Admin):
            return "fa-leaf fa-spin";
        }

        return "";
    }

    get verified_icon(): string
    {
        if (!this.verified)
            return "";

        if (this.id.readable[0] === 'p')
        {
            if (this.level === Level.Normal)
                return "fa-check-circle";
            else
                return "";
        }
        else
            return "fa-key"
    }

    get border_style(): string
    {
        return this.id.readable[0] == 'p' ? 'rounded-pill' : 'progress-bar-striped';
    }
}
