import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable, of, pipe } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

import { UserService } from '@services/user.service';

@Injectable({
  providedIn: 'root'
})
export class LoggedOutGuard implements CanActivate {

    constructor(private userService: UserService) {}
    canActivate(route: ActivatedRouteSnapshot,
                state: RouterStateSnapshot
               ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree
    {
        if (this.userService.logged_in)
            return of(false);

        return this.userService.initial_login_attempt()
                   .pipe(map(_ => false),
                         catchError(_ => of(true)));
    }
}
