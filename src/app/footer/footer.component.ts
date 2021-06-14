import { Component, OnInit } from '@angular/core';

import { g } from '@shared/globals';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss']
})
export class FooterComponent implements OnInit
{
    g = g;

    constructor()
    {
    }

    ngOnInit(): void
    {
    }

}
