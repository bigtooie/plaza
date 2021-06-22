import { Component, OnInit } from '@angular/core';
import { FormControl, FormBuilder } from '@angular/forms';
import { ActivatedRoute, Router, Params } from '@angular/router';
import { Observable } from 'rxjs';

import { UserService } from '@services/user.service';
import { ApiService } from '@services/api.service';
import { AlertService } from '@services/alert.service';
import { PagingComponent } from '../../classes/PagingComponent';

import { Level } from '@shared/User';
import { Session, SessionView } from '@shared/Session';

import * as Req from '@shared/RequestResponse';
import { range, clamp, get_duration_text_since, remove_if, any_differ } from '@shared/utils';

class SessionlistParams
{
    static StorageKey = "sessionlist_params";

    page?: string = undefined;
    search_text?: string = undefined;
    category?: string = undefined;
    turnips?: string = undefined;
    status?: string = undefined;
    host_starred?: string = undefined;
    host_blocked?: string = undefined;
    order_by?: string = undefined;
    order?: string = undefined;
}

@Component({
  selector: 'app-sessionlist',
  templateUrl: './sessionlist.component.html',
  styleUrls: ['./sessionlist.component.scss']
})
export class SessionlistComponent extends PagingComponent<SessionView> implements OnInit
{
    GetSessionsSearchTextCategoryValues: string[] = [];
    GetSessionsOrderCategoryValues = Req.GetSessionsOrderCategoryValues;
    SessionStatusSearchFilterValues = Req.SessionStatusSearchFilterValues;
    SearchFilterValues = Req.SearchFilterValues;
    range = range;
    get_duration_text_since = get_duration_text_since;

    pending = false;

    search_form = this.fb.group({
        search_text: [''],
        search_text_category: [Req.GetSessionsSearchTextCategory.Title],
        min_turnip_price: [0],
        status_filter: [Req.SessionStatusSearchFilter.OpenOrFull],
        host_starred_filter: [Req.SearchFilter.None],
        host_blocked_filter: [Req.SearchFilter.Hide],
        order_by: [Req.GetSessionsOrderCategory.Updated],
        reversed: true
    });

    filters_collapsed: boolean = true;

    private _form_get = (name: string) => this.search_form.get(name).value;
    private _form_set = (name: string, val: any) => this.search_form.get(name).setValue(val, {onlySelf: true});

    get search_text(): string { return this._form_get("search_text"); }
    set search_text(val: string) { this._form_set("search_text", val); }
    get search_text_category(): Req.GetSessionsSearchTextCategory
    { return this._form_get("search_text_category"); }
    set search_text_category(val: Req.GetSessionsSearchTextCategory)
    { this._form_set("search_text_category", val); }
    get min_turnip_price(): number { return this._form_get("min_turnip_price"); }
    set min_turnip_price(val: number) { this._form_set("min_turnip_price", val); }
    get status_filter(): Req.SessionStatusSearchFilter { return this._form_get("status_filter"); }
    set status_filter(val: Req.SessionStatusSearchFilter) { this._form_set("status_filter", val); }
    get host_starred_filter(): Req.SearchFilter { return this._form_get("host_starred_filter"); }
    set host_starred_filter(val: Req.SearchFilter) { this._form_set("host_starred_filter", val); }
    get host_blocked_filter(): Req.SearchFilter { return this._form_get("host_blocked_filter"); }
    set host_blocked_filter(val: Req.SearchFilter) { this._form_set("host_blocked_filter", val); }
    get order_by(): Req.GetSessionsOrderCategory { return this._form_get("order_by"); }
    set order_by(val: Req.GetSessionsOrderCategory) { this._form_set("order_by", val); }
    get reversed(): boolean { return this._form_get("reversed"); }
    set reversed(val: boolean) { this._form_set("reversed", val); }

    constructor(public userService: UserService,
                private route: ActivatedRoute,
                private router: Router,
                private fb: FormBuilder,
                private alert: AlertService,
                private api: ApiService)
    {
        super();

        this.set_form_defaults();
    }

    ngOnInit(): void
    {
        if (!this.userService.logged_in)
        {
            this.alert.show_error("Wuh-oh!", "Looks like you're not logged in! Log in to continue.",
                                  () => {this.router.navigate(['/login'])});

            return;
        }

        this.set_form_to_storage_params();

        this.route.queryParams
                  .subscribe(params =>
                             {
                                 this.set_form_to_params(params);
                                 this.search_submit(false);
                             });

        this.set_GetSessionsSearchTextCategoryValues();
    }

    private set_GetSessionsSearchTextCategoryValues()
    {
        this.GetSessionsSearchTextCategoryValues = Req.GetSessionsSearchTextCategoryValues.map(x=>x);

        if (this.userService.user.settings.level < Level.Admin)
            remove_if(this.GetSessionsSearchTextCategoryValues,
                      (x: string) => x === Req.GetSessionsSearchTextCategory.Username);
    }

    private set_form_defaults()
    {
        this.search_text_category = Req.GetSessionsSearchTextCategory.Title;
        this.min_turnip_price = 0;
        this.status_filter = Req.SessionStatusSearchFilter.OpenOrFull;
        this.host_starred_filter = Req.SearchFilter.None;
        this.host_blocked_filter = Req.SearchFilter.Hide;
        this.order_by = Req.GetSessionsOrderCategory.Updated;
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

        if ('category' in params)
            if (Req.GetSessionsSearchTextCategoryValues.indexOf(params.category) > -1)
                this.search_text_category = params.category;

        if ('turnips' in params)
        {
            const nip = parseInt(params.turnips);

            if (!isNaN(nip) && Number.isSafeInteger(nip))
                this.min_turnip_price = Math.max(nip, 0);
        }

        if ('status' in params)
            if (Req.SessionStatusSearchFilterValues.indexOf(params.status) > -1)
                this.status_filter = params.status;

        if ('host_starred' in params)
            if (Req.SearchFilterValues.indexOf(params.host_starred) > -1)
                this.host_starred_filter = params.starred;

        if ('host_blocked' in params)
            if (Req.SearchFilterValues.indexOf(params.host_blocked) > -1)
                this.host_blocked_filter = params.host_blocked;

        if ('order_by' in params)
            if (Req.GetSessionsOrderCategoryValues.indexOf(params.order_by) > -1)
                this.order_by = params.order_by;

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
        const params: string = localStorage.getItem(SessionlistParams.StorageKey);

        if (params === null || params === undefined || params.length <= 0)
            return;

        var jparams: any = undefined;

        try
        {
            jparams = JSON.parse(params);
        }
        catch (err)
        {
            localStorage.deleteItem(SessionlistParams.StorageKey);
            return;
        }

        this.set_form_to_param_object(jparams);
    }

    private get_params_from_form()
    {
        var params = new SessionlistParams();

        if (this.page > 0)
            params.page = `${this.page+1}`;

        if (this.search_text.length > 0)
            params.search_text = this.search_text;

        if (this.search_text_category !== Req.GetSessionsSearchTextCategory.Title)
            params.category = this.search_text_category;

        if (this.min_turnip_price > 0)
            params.turnips = `${this.min_turnip_price}`;

        if (this.status_filter !== Req.SessionStatusSearchFilter.OpenOrFull)
            params.status = this.status_filter;

        if (this.host_starred_filter !== Req.SearchFilter.None)
            params.host_starred = this.host_starred_filter;

        if (this.host_blocked_filter !== Req.SearchFilter.Hide)
            params.host_blocked = this.host_blocked_filter;

        if (this.order_by !== Req.GetSessionsOrderCategory.Updated)
            params.order_by = this.order_by;

        if (this.reversed === false)
            params.order = "ascending";

        return params;
    }

    private save_params_to_storage(params: SessionlistParams)
    {
        if (params === undefined)
            return;

        localStorage.setItem(SessionlistParams.StorageKey, JSON.stringify(params));
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

        this.api.get_sessions(this.page,
                              this.search_text,
                              this.search_text_category,
                              this.min_turnip_price,
                              this.status_filter,
                              this.host_starred_filter,
                              this.host_blocked_filter,
                              this.order_by,
                              this.reversed
                             )
                .subscribe(
            resp =>
            {
                if (resp !== undefined)
                {
                    this.current_view = resp.sessions;
                    this.pages = resp.pages;
                    this.pending = false;
                }
                else
                {
                    this.current_view = [];
                    this.pages = 1;
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

    shorten_text(desc: string, maxcount = 100)
    {
        if (desc.length > maxcount)
            return desc.substring(maxcount - 3) + "...";

        return desc;
    }
}
