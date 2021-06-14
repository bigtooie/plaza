import { Injectable } from '@angular/core';
import { AlertComponent } from '../alert/alert.component';
import { AlertType } from '../alert/alerttype';

@Injectable({
  providedIn: 'root'
})
export class AlertService
{
    alert_component: AlertComponent;

    constructor()
    {
    }

    show(title: string,
         message: string,
         close_callback: any = undefined,
         dismiss_callback: any = undefined)
    {
        this.alert_component.show(message, title, AlertType.None, true, false, close_callback, dismiss_callback);
    }
    
    show_info(title: string,
              message: string,
              close_callback: any = undefined,
              dismiss_callback: any = undefined)
    {
        this.alert_component.show_info(message, title, true, false, close_callback, dismiss_callback);
    }
    
    show_warning(title: string,
                 message: string,
                 close_callback: any = undefined,
                 dismiss_callback: any = undefined)
    {
        this.alert_component.show_warning(message, title, true, false, close_callback, dismiss_callback);
    }
    
    show_error(title: string,
               message: string,
               close_callback: any = undefined,
               dismiss_callback: any = undefined)
    {
        this.alert_component.show_error(message, title, true, false, close_callback, dismiss_callback);
    }
}
