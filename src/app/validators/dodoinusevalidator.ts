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
import { g } from '@shared/globals';

@Injectable({ providedIn: 'root' })
export class DodoInUseValidator implements AsyncValidator
{
  constructor(private api: ApiService) {}

  validate(
    ctrl: AbstractControl
  ): Observable<ValidationErrors | null>
  {
    return this.api.get_dodo_in_use(ctrl.value.toUpperCase()).pipe(
        map(s => (s ? { in_use: true } : null)),
        catchError(() => of(null))
    );
  }
}

@Directive({
  selector: '[appDodoInUse]',
  providers: [
    {
      provide: NG_ASYNC_VALIDATORS,
      useExisting: forwardRef(() => DodoInUseValidator),
      multi: true
    }
  ]
})
export class DodoInUseValidatorDirective {
  constructor(private validator: DodoInUseValidator) {}

  validate(control: AbstractControl) {
    this.validator.validate(control);
  }
}
