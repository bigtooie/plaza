import { Component, OnInit } from '@angular/core';

import { g } from '@shared/globals';

@Component({
  selector: 'app-about',
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.scss']
})
export class AboutComponent implements OnInit
{
    g = g;

    constructor() { }

    ngOnInit(): void
    {
    }
}
