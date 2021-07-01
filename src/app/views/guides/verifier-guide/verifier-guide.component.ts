import { Component, OnInit } from '@angular/core';

import { UserID } from '@shared/ID';
import { Level } from '@shared/User';

@Component({
  selector: 'app-verifier-guide',
  templateUrl: './verifier-guide.component.html',
  styleUrls: ['./verifier-guide.component.scss']
})
export class VerifierGuideComponent implements OnInit {

    Level = Level;
    verifierId = new UserID();

  constructor() { }

  ngOnInit(): void {
  }

}
