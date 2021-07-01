import { Component, OnInit } from '@angular/core';

import { UserID } from '@shared/ID';
import { Level } from '@shared/User';

@Component({
  selector: 'app-admin-guide',
  templateUrl: './admin-guide.component.html',
  styleUrls: ['./admin-guide.component.scss']
})
export class AdminGuideComponent implements OnInit {

    Level = Level;
    adminId = new UserID();

  constructor() { }

  ngOnInit(): void {
  }

}
