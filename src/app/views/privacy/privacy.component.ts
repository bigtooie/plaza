import { Component, OnInit } from '@angular/core';

import { g } from '@shared/globals'

@Component({
  selector: 'app-privacy',
  templateUrl: './privacy.component.html',
  styleUrls: ['./privacy.component.scss']
})
export class PrivacyComponent implements OnInit
{
    g=g;

    constructor() { }

    ngOnInit(): void
    {
    }

}
