import { Directive, forwardRef, Injectable } from '@angular/core';
import {
  AsyncValidator,
  AbstractControl,
  NG_ASYNC_VALIDATORS,
  ValidationErrors
} from '@angular/forms';
import { catchError, map } from 'rxjs/operators';
import { Observable, of } from 'rxjs';

import { ApiService } from '@services/api.service';

@Injectable({ providedIn: 'root' })
export class NameTakenValidator implements AsyncValidator
{
  constructor(private api: ApiService) {}

  validate(
    ctrl: AbstractControl
  ): Observable<ValidationErrors | null>
  {
    return this.api.get_username_taken(ctrl.value).pipe(
      map(isTaken => (isTaken ? { name_taken: true } : null)),
      catchError(() => of(null))
    );
  }
}

@Directive({
  selector: '[appNameTaken]',
  providers: [
    {
      provide: NG_ASYNC_VALIDATORS,
      useExisting: forwardRef(() => NameTakenValidator),
      multi: true
    }
  ]
})
export class NameTakenValidatorDirective {
  constructor(private validator: NameTakenValidator) {}

  validate(control: AbstractControl) {
    this.validator.validate(control);
  }
}
