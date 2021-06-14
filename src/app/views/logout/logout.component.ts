import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

import { UserService } from '@services/user.service';

@Component({
  selector: 'app-logout',
  templateUrl: './logout.component.html',
  styleUrls: ['./logout.component.scss']
})
export class LogoutComponent implements OnInit
{
    constructor(public userService: UserService, private router: Router) { }

    ngOnInit(): void
    {
        this.userService.logout();
        this.router.navigate(['/']);
    }

}
