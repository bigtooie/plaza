import { Component, OnInit } from '@angular/core';

import { UserService } from '@services/user.service';
import { Level } from '@shared/User';

@Component({
  selector: 'app-guide-overview',
  templateUrl: './guide-overview.component.html',
  styleUrls: ['./guide-overview.component.scss']
})
export class GuideOverviewComponent implements OnInit {

    Level = Level;

  constructor(public userService: UserService) { }

  ngOnInit(): void {
  }

}
