import { Component, OnInit } from '@angular/core';

import { g } from '@shared/globals';

@Component({
  selector: 'app-terms',
  templateUrl: './terms.component.html',
  styleUrls: ['./terms.component.scss']
})
export class TermsComponent implements OnInit
{
    g = g;
    constructor() { }

    ngOnInit(): void
    {
    }

}
