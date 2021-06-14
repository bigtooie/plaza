import { Component, OnInit, Input } from '@angular/core';

import { SessionStatus } from '@shared/Session';

@Component({
  selector: 'app-sessionstatus',
  templateUrl: './sessionstatus.component.html',
  styleUrls: ['./sessionstatus.component.scss']
})
export class SessionstatusComponent implements OnInit
{
    SessionStatus = SessionStatus;
    @Input() status: SessionStatus;

    constructor()
    {
    }

    ngOnInit(): void
    {
    }
}
