import { Component, OnInit } from '@angular/core';

import { UserService } from '@services/user.service';

import { Level } from '@shared/User';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent implements OnInit
{
    Level = Level
    constructor(public userService: UserService)
    {
    }

    ngOnInit(): void 
    {
    }
}
