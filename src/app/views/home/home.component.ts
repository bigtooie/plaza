import { Component, OnInit } from '@angular/core';

import { g } from '@shared/globals';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
    g=g;
  constructor() { }

  ngOnInit(): void {
  }

}
