import { Component } from '@angular/core';

import { g } from '../../shared/globals';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent
{
    g=g;

    constructor() {}
}
