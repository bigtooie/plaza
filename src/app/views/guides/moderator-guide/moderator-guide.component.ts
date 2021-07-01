import { Component, OnInit } from '@angular/core';

import { UserID } from '@shared/ID';
import { Level } from '@shared/User';

@Component({
  selector: 'app-moderator-guide',
  templateUrl: './moderator-guide.component.html',
  styleUrls: ['./moderator-guide.component.scss']
})
export class ModeratorGuideComponent implements OnInit {
    Level = Level;
    modId = new UserID();

  constructor() { }

  ngOnInit(): void {
  }

}
