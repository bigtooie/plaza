import { g } from '@shared/globals';
import { range, clamp } from '@shared/utils';
 
export abstract class PagingComponent<T>
{
    readonly EntriesPerPage = g.results_per_page;

    public current_view: T[] = [];
    public page: number = 0;

    private pages_: number = 0;
    private visible_pages_: number[] = [];

    get pages(): number { return this.pages_; }
    set pages(pgs: number)
    {
        this.pages_ = Math.max(pgs, 0);
        this.visible_pages_ = [];

        if (pgs <= 0)
            return;
        
        this.page = clamp(this.page, 0, this.pages);

        var vpgs = range(this.page - 3, this.page + 3);
        const first = vpgs[0];
        const last = vpgs[vpgs.length - 1];

        if (first < 0)
            for (var i = 0; i < vpgs.length; ++i)
                vpgs[i] -= first;
        else if (last >= this.pages -1)
            for (var i = 0; i < vpgs.length; ++i)
                vpgs[i] -= (last - this.pages+1);

        for (var i = 0; i < vpgs.length; ++i)
            if (vpgs[i] >= 0)
            {
                vpgs = vpgs.slice(i, vpgs.length);
                break;
            }

        for (var i = 0; i < vpgs.length; ++i)
            if (vpgs[i] >= this.pages)
            {
                vpgs = vpgs.slice(0, i);
                break;
            }

        this.visible_pages_ = vpgs;
    }

    get visible_pages() { return this.visible_pages_; }
}

