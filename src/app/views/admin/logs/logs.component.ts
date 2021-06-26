import { Component, OnInit } from '@angular/core';
import { FormsModule, FormControl, FormBuilder } from '@angular/forms';
import { ActivatedRoute, Router, Params } from '@angular/router';
import { Observable } from 'rxjs';

import { UserService } from '@services/user.service';
import { ApiService } from '@services/api.service';
import { PagingComponent } from '../../../classes/PagingComponent';

import * as Req from '@shared/RequestResponse';
import * as Logs from '@shared/Logs';
import { g } from '@shared/globals';
import { range, any_differ, empty_or_nothing, get_duration_text_since } from '@shared/utils';

class LogsParams
{
    static StorageKey = "logs_params";

    page?: string = undefined;
    search_text?: string = undefined;
    order?: string = undefined;
}

@Component({
  selector: 'app-logs',
  templateUrl: './logs.component.html',
  styleUrls: ['./logs.component.scss']
})
export class LogsComponent extends PagingComponent<any> implements OnInit
{
    g = g;
    Level = Logs.Level;
    LevelNames = Logs.LevelNames;
    get_duration_text_since = get_duration_text_since;

    range = range;

    pending = false;

    search_form = this.fb.group({
        search_text: [''],
        start_date: [new Date(0)],
        end_date: [new Date()],
        reversed: true
    });

    selected_levels = Logs.LevelValues.map((l: Logs.Level) => { return {level: l, name: Logs.LevelNames[l], checked: true}; });

    filters_collapsed: boolean = true;

    private _form_get = (name: string) => this.search_form.get(name).value;
    private _form_set = (name: string, val: any) => this.search_form.get(name).setValue(val, {onlySelf: true});

    get search_text(): string { return this._form_get("search_text"); }
    set search_text(val: string) { this._form_set("search_text", val); }
    get start_date(): Date { return new Date(this._form_get("start_date")); }
    set start_date(val: Date) { this._form_set("start_date", val); }
    get end_date(): Date { return new Date(this._form_get("end_date")); }
    set end_date(val: Date) { this._form_set("end_date", val); }
    get reversed(): boolean { return this._form_get("reversed"); }
    set reversed(val: boolean) { this._form_set("reversed", val); }

    constructor(public userService: UserService,
                private route: ActivatedRoute,
                private router: Router,
                private fb: FormBuilder,
                private api: ApiService)
    {
        super();

        this.set_form_defaults();
    }

    ngOnInit(): void
    {
        this.set_form_to_storage_params();

        this.route.queryParams
                  .subscribe(params =>
                             {
                                 this.set_form_to_params(params);
                                 this.search_submit(false);
                             });
    }

    private set_form_defaults()
    {
        this.reversed = true;
    }

    private set_form_to_param_object(params: any)
    {
        if (params === undefined)
            return;

        if ('page' in params)
        {
            const page = parseInt(params.page);

            if (!isNaN(page) && Number.isSafeInteger(page))
                this.page = Math.max(page - 1, 0);
        }

        if ('search_text' in params)
            this.search_text = params.search_text;

        if ('order' in params)
            if (params.order == "ascending" || params.order == "descending")
                this.reversed = (params.order == "descending");
    }

    private set_form_to_params(params: Params | undefined)
    {
        this.set_form_to_param_object(params);
    }

    private set_form_to_storage_params()
    {
        const params: string = localStorage.getItem(LogsParams.StorageKey);

        if (params === null || params === undefined || params.length <= 0)
            return;

        var jparams: any = undefined;

        try
        {
            jparams = JSON.parse(params);
        }
        catch (err)
        {
            localStorage.deleteItem(LogsParams.StorageKey);
            return;
        }

        this.set_form_to_param_object(jparams);
    }

    private get_params_from_form()
    {
        var params: any = {};

        if (this.page > 0)
            params.page = `${this.page+1}`;

        if (this.search_text.length > 0)
            params.search_text = this.search_text;

        if (this.reversed === false)
            params.order = "ascending";

        return params;
    }

    private save_params_to_storage(params: any)
    {
        if (params === undefined)
            return;

        localStorage.setItem(LogsParams.StorageKey, JSON.stringify(params));
    }

    private set_logs(data: any)
    {
        if (empty_or_nothing(data))
        {
            this.current_view = [];
            return;
        }

        const set_time = (log: any) =>
        {
            if ('time' in log)
                log.time = new Date(log.time);
            else
                log.time = new Date(0);
        };

        const set_message = (log: any) =>
        {
            if ('0' in log && !('msg' in log))
                log.msg = log['0'];

            if (typeof log.msg !== "string")
                log.msg = JSON.stringify(log.msg);
        };

        const set_level = (log: any) =>
        {
            if ('level' in log)
                log.level = Logs.get_name_by_pino_level(log.level);
            else
                log.level = "-";
        };

        data.forEach(set_time);
        data.forEach(set_message);
        data.forEach(set_level);

        this.current_view = data;
    }

    search_submit(reset_page: boolean = true) : void
    {
        if (reset_page)
            this.page = 0;

        const params = this.get_params_from_form();
        const current_url_params = this.route.snapshot.queryParams;

        if (any_differ(params, current_url_params))
        {
            this.router.navigate([], {
                queryParams: params
            });
            return;
        }

        this.save_params_to_storage(params);

        this.pending = true;

        this.api.get_logs(this.page,
                          this.search_text,
                          this.start_date.getTime(),
                          this.end_date.getTime(),
                          this.selected_levels.map((x: any) => x.checked),
                          this.reversed
                         )
                .subscribe(
            resp =>
            {
                if (resp === undefined)
                {
                    this.current_view = [];
                    this.pages = 1;
                    this.pending = false;
                }
                else
                {
                    this.set_logs(resp.logs);
                    this.pages = resp.pages;
                    this.pending = false;
                }
            },
            err =>
            {
                this.current_view = [];
                this.pages = 1;
                this.pending = false;
            }
        );
    }

    goto_page(pg: number)
    {
        this.page = pg;
        this.search_submit(false);
    }

    next_page()
    {
        this.page++;
        this.search_submit(false);
    }

    prev_page()
    {
        this.page--;
        this.search_submit(false);
    }
}
