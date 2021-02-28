import {Injectable} from '@angular/core';
import {OperatingPeriod} from "../railml.model";
import {BehaviorSubject, Observable} from "rxjs";
import {debounceTime} from "rxjs/operators";

export class Filter {
  public trainNumber = '';
  public showRelated = true;
  public selectedOps: OperatingPeriod[];
  public combineOperation = CombineOperation.Intersect;
  public outsideOpGreyedOut = true;
  public combinedMask?: string = undefined;

  public reset() {
    this.trainNumber = '';
    this.showRelated = true;
    this.selectedOps = [];
    this.combineOperation = CombineOperation.Intersect;
    this.outsideOpGreyedOut = true;
    this.combinedMask = undefined;
  }

  get combinedOp(): OperatingPeriod | null {
    const ops = this.selectedOps;
    if (ops.length <= 0) {
      return null;
    }

    let result = [];
    if (this.combineOperation == CombineOperation.Union) {
      result = Array.from('0'.repeat(ops[0].bitMask.length));
      for (let op of ops) {
        for (let i = 0; i < op.bitMask.length; i++) {
          result[i] = (op.bitMask.charAt(i) === '1' || result[i] === '1') ? '1' : '0';
        }
      }
    } else if (this.combineOperation == CombineOperation.Intersect) {
      result = Array.from('1'.repeat(ops[0].bitMask.length));
      for (let op of ops) {
        for (let i = 0; i < op.bitMask.length; i++) {
          result[i] = (op.bitMask.charAt(i) === '1' && result[i] === '1') ? '1' : '0';
        }
      }
    }
    return new OperatingPeriod('0', ops[0].startDate, ops[0].endDate, 'generated', 'generated', result.join(''));
  }
}

export enum CombineOperation {
  Intersect = 'Intersect',
  Union = 'Union',
}

@Injectable({
  providedIn: 'root'
})
export class RailFilterService {

  private filterSubject: BehaviorSubject<Filter> = new BehaviorSubject<Filter>(new Filter());

  constructor() {
  }

  public getFilter(): Observable<Filter> {
    return this.filterSubject.pipe(
      debounceTime(100)
    );
  }

  public getFilterSubject(): BehaviorSubject<Filter> {
    return this.filterSubject;
  }

  public setSelectedOp(op: OperatingPeriod) {

  }

  public toggleOp(op: OperatingPeriod) {

  }
}
