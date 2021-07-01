import { Component, OnInit } from '@angular/core';

import { UserService } from '@services/user.service';
import { g } from '@shared/globals';

@Component({
  selector: 'app-profile-guide',
  templateUrl: './profile-guide.component.html',
  styleUrls: ['./profile-guide.component.scss']
})
export class ProfileGuideComponent implements OnInit
{
    g=g;

  constructor(public userService: UserService) { }

  ngOnInit(): void {
  }

}
