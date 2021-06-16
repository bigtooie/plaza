import { Component, OnInit } from '@angular/core';

import { UserID, SessionID } from '@shared/ID';
import { Level } from '@shared/User';
import { g } from '@shared/globals';

@Component({
  selector: 'app-help',
  templateUrl: './help.component.html',
  styleUrls: ['./help.component.scss']
})
export class HelpComponent implements OnInit
{
    Level = Level;
    g=g;
    active_tab = 1;

    uidexample = new UserID();
    sidexample = new SessionID();

    constructor()
    {
    }

    ngOnInit(): void
    {
    }
}
