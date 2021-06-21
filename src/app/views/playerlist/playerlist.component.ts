import { Component, OnInit } from '@angular/core';
import { FormControl, FormBuilder } from '@angular/forms';
import { ActivatedRoute, Router, Params } from '@angular/router';
import { Observable } from 'rxjs';

import { UserService } from '@services/user.service';
import { ApiService } from '@services/api.service';
import { AlertService } from '@services/alert.service';
import { PagingComponent } from '../../classes/PagingComponent';

import { UserView, Level } from '@shared/User';
import * as Req from '@shared/RequestResponse';
import { range, clamp, remove_if } from '@shared/utils';

class PlayerlistParams
{
    static StorageKey = "playerlist_params";

    page?: string = undefined;
    search_text?: string = undefined;
    category?: string = undefined;
    starred?: string = undefined;
    blocked?: string = undefined;
    order?: string = undefined;
}

@Component({
  selector: 'app-playerlist',
  templateUrl: './playerlist.component.html',
  styleUrls: ['./playerlist.component.scss']
})
export class PlayerlistComponent extends PagingComponent<UserView> implements OnInit
{
    GetUsersSearchTextCategoryValues: string[] = [];
    SearchFilterValues = Req.SearchFilterValues;
    range = range;

    pending = false;

    search_form = this.fb.group({
        search_text: [''],
        search_text_category: ['0'],
        starred_filter: ['-'],
        blocked_filter: ['hide'],
        reversed: true // "reversed" = descending
    });

    filters_collapsed: boolean = true;

    private _form_get = (name: string) => this.search_form.get(name).value;
    private _form_set = (name: string, val: any) => this.search_form.get(name).setValue(val, {onlySelf: true});

    get search_text(): string { return this._form_get("search_text"); }
    set search_text(val: string) { this._form_set("search_text", val); }
    get search_text_category(): Req.GetUsersSearchTextCategory
    { return this._form_get("search_text_category"); }
    set search_text_category(val: Req.GetUsersSearchTextCategory)
    { this._form_set("search_text_category", val); }
    get starred_filter(): Req.SearchFilter { return this._form_get("starred_filter"); }
    set starred_filter(val: Req.SearchFilter) { this._form_set("starred_filter", val); }
    get blocked_filter(): Req.SearchFilter { return this._form_get("blocked_filter"); }
    set blocked_filter(val: Req.SearchFilter) { this._form_set("blocked_filter", val); }
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
                                 this.search_submit(false, false);
                             });

        this.set_GetUsersSearchTextCategoryValues();
    }

    private set_GetUsersSearchTextCategoryValues()
    {
        this.GetUsersSearchTextCategoryValues = Req.GetUsersSearchTextCategoryValues.map(x=>x);

        if (this.userService.user.settings.level < Level.Admin)
            remove_if(this.GetUsersSearchTextCategoryValues,
                      (x: string) => x === Req.GetUsersSearchTextCategory.Username);
    }

    private set_form_defaults()
    {
        this.search_text_category = Req.GetUsersSearchTextCategory.Name;
        this.blocked_filter = Req.SearchFilter.Hide;
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
            if (this.GetUsersSearchTextCategoryValues.indexOf(params.category) > -1)
                this.search_text_category = params.category;

        if ('starred' in params)
            if (this.SearchFilterValues.indexOf(params.starred) > -1)
                this.starred_filter = params.starred;

        if ('blocked' in params)
            if (this.SearchFilterValues.indexOf(params.blocked) > -1)
                this.blocked_filter = params.blocked;

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
        const params: string = localStorage.getItem(PlayerlistParams.StorageKey);

        if (params === null || params === undefined || params.length <= 0)
            return;

        var jparams: any = undefined;

        try
        {
            jparams = JSON.parse(params);
        }
        catch (err)
        {
            localStorage.deleteItem(PlayerlistParams.StorageKey);
            return;
        }

        this.set_form_to_param_object(jparams);
    }

    private get_params_from_form()
    {
        var params = new PlayerlistParams();

        if (this.page > 0)
            params.page = `${this.page+1}`;

        if (this.search_text.length > 0)
            params.search_text = this.search_text;

        if (this.search_text_category !== Req.GetUsersSearchTextCategory.Name)
            params.category = this.search_text_category;

        if (this.starred_filter !== Req.SearchFilter.None)
            params.starred = this.starred_filter;

        if (this.blocked_filter !== Req.SearchFilter.Hide)
            params.blocked = this.blocked_filter;

        if (this.reversed === false)
            params.order = "ascending";

        return params;
    }

    private save_params_to_storage(params: PlayerlistParams)
    {
        if (params === undefined)
            return;

        localStorage.setItem(PlayerlistParams.StorageKey, JSON.stringify(params));
    }

    search_submit(reset_page: boolean = true, set_params: boolean = true) : void
    {
        if (reset_page)
            this.page = 0;

        const params = this.get_params_from_form();

        if (set_params)
        {
            this.router.navigate([], {
                queryParams: params
            });
            return;
        }

        this.save_params_to_storage(params);

        this.pending = true;

        this.api.get_users(this.page,
                           this.search_text,
                           this.search_text_category,
                           this.starred_filter,
                           this.blocked_filter,
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
                    this.current_view = resp.users;
                    this.pages = resp.pages;
                    this.pending = false;
                }
            },
            err =>
            {
                this.current_view = [];
                this.pages = 1;
                this.pending = false;
                this.alert.show_error("Wuh-oh!", err.message,
                                      () => {this.router.navigate(['/login'])});
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
