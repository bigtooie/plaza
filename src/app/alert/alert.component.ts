import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { NgbModal, ModalDismissReasons } from '@ng-bootstrap/ng-bootstrap';

import { AlertService } from '@services/alert.service';
import { AlertType } from './alerttype';

@Component({
  selector: 'app-alert',
  templateUrl: './alert.component.html',
  styleUrls: ['./alert.component.scss']
})
export class AlertComponent implements OnInit
{
    @ViewChild("alertdialog", { static: false }) alert_dialog: ElementRef;
    title: string;
    message: string;
    show_dismiss: boolean;
    show_ok: boolean;
    type: AlertType;

    constructor(public alertService: AlertService,
                private modalService: NgbModal
               )
    {
        this.clear();
        this.alertService.alert_component = this;
    }

    ngOnInit(): void
    {
    }

    get dialog_class(): string
    {
        switch (this.type)
        {
        case AlertType.Info:
            return "dialog dialog-info";
        case AlertType.Warning:
            return "dialog dialog-warning";
        case AlertType.Error:
            return "dialog dialog-error";
        default:
            return "dialog";
        }
    }

    show(message: string,
         title: string = "",
         type: AlertType = AlertType.None,
         show_ok: boolean = true,
         show_dismiss: boolean = false,
         close_callback: any = undefined,
         dismiss_callback: any = undefined)
    {
        this.title = title;
        this.message = message;
        this.type = type;
        this.show_ok = show_ok;
        this.show_dismiss = show_dismiss;

        if (close_callback === undefined)
            close_callback = (r: any) => {};

        if (dismiss_callback === undefined)
            dismiss_callback = close_callback;

        this.modalService.open(this.alert_dialog, {windowClass: this.dialog_class}).result.then(close_callback, dismiss_callback);
    }

    clear()
    {
        this.title = "";
        this.message = "";
        this.type = AlertType.None;
        this.show_ok = true;
        this.show_dismiss = true;
    }

    show_info(message: string,
              title: string = "",
              show_ok: boolean = true,
              show_dismiss: boolean = false,
              close_callback: any = undefined,
              dismiss_callback: any = undefined)
    {
        this.show(message, title, AlertType.Info, show_ok, show_dismiss, close_callback, dismiss_callback);
    }

    show_warning(message: string,
                 title: string = "",
                 show_ok: boolean = true,
                 show_dismiss: boolean = false,
                 close_callback: any = undefined,
                 dismiss_callback: any = undefined)
    {
        this.show(message, title, AlertType.Warning, show_ok, show_dismiss, close_callback, dismiss_callback);
    }

    show_error(message: string,
               title: string = "",
               show_ok: boolean = true,
               show_dismiss: boolean = false,
               close_callback: any = undefined,
               dismiss_callback: any = undefined)
    {
        this.show(message, title, AlertType.Error, show_ok, show_dismiss, close_callback, dismiss_callback);
    }
}
