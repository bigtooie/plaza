import { Component, OnInit } from '@angular/core';

import { UserService } from '@services/user.service';

import { Level } from '@shared/User';
import { RequesterStatus } from '@shared/Session';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent implements OnInit
{
    Level = Level;
    RequesterStatus = RequesterStatus;

    constructor(public userService: UserService)
    {
    }

    ngOnInit(): void 
    {
    }
}
