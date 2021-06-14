import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable, of, pipe } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

import { UserService } from '@services/user.service';
import { Level } from '@shared/User';

@Injectable({
  providedIn: 'root'
})
export class IsAdminGuard implements CanActivate {

    constructor(private userService: UserService) {}
    canActivate(route: ActivatedRouteSnapshot,
                state: RouterStateSnapshot
               ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree
    {
        if (this.userService.logged_in)
            return of(this.userService.user.settings.level >= Level.Admin);

        return this.userService.initial_login_attempt()
                   .pipe(map(_ => this.userService.user.settings.level >= Level.Admin),
                         catchError(_ => of(false)));
    }
}
