import { Component, OnInit, Input } from '@angular/core';
import { UserView } from '@shared/User';

@Component({
  selector: 'app-user-playerislandname',
  templateUrl: './user_playerislandname.component.html',
  styleUrls: ['./user_playerislandname.component.scss']
})
export class User_playerislandnameComponent implements OnInit
{
    @Input() user!: UserView;

    constructor() { }

    ngOnInit(): void
    {
    }
}
