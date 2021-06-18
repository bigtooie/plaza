import { Component, OnInit } from '@angular/core';

import { UserService } from '@services/user.service';

import { Level } from '@shared/User';

@Component({
  selector: 'app-control-panel',
  templateUrl: './control-panel.component.html',
  styleUrls: ['./control-panel.component.scss']
})
export class ControlPanelComponent implements OnInit
{
    Level = Level;
    active_tab = 1

    constructor(public userService: UserService)
    {
    }

    ngOnInit(): void
    {
    }
}
