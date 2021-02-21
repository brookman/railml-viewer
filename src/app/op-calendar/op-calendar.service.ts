import {Injectable} from '@angular/core';
import {BehaviorSubject, Observable} from "rxjs";
import {OperatingPeriod, Railml} from "../railml.model";
import {RailmlParserService} from "../railml-parser.service";
import {filter} from "rxjs/operators";

export class Calendar {
  constructor(
    public months: Month[],
    public selectedOp?: OperatingPeriod
  ) {
  }
}

export class Month {
  constructor(
    public from: Date,
    public to: Date
  ) {
  }
}

@Injectable({
  providedIn: 'root'
})
export class OpCalendarService {

  private calendar$ = new BehaviorSubject<Calendar>(null);

  private months: Month[];
  private selectedOp?: OperatingPeriod = null;

  constructor(private railmParserService: RailmlParserService) {
    railmParserService.getRailmlEvents()
      .pipe(filter(railml => !!railml))
      .subscribe(railml => this.updateCalendar(railml));
  }

  public getCalendar(): Observable<Calendar> {
    return this.calendar$;
  }

  public selectOp(op: OperatingPeriod) {
    this.selectedOp = op;
    this.calendar$.next(new Calendar(this.months, this.selectedOp));
  }

  private updateCalendar(railml: Railml) {
    this.months = OpCalendarService.generateMonths(railml.startDate, railml.endDate);
    this.calendar$.next(new Calendar(this.months, this.selectedOp));
  }

  private static generateMonths(startDate: Date, endDate: Date): Month[] {
    let intervals = [startDate];
    let oldMonth = startDate.getMonth();

    for (let day of OpCalendarService.getDaysBetween(startDate, endDate)) {
      let month = day.getMonth()
      if (month != oldMonth) {
        oldMonth = day.getMonth();

        let previousDay = new Date(day.getTime());
        previousDay.setDate(day.getDate() - 1);

        intervals.push(previousDay);
        intervals.push(day);
      }
    }
    if (intervals.length % 2 !== 2) {
      intervals.push(endDate);
    }

    let result = [];
    for (let i = 0; i < intervals.length; i += 2) {
      result.push(new Month(intervals[i], intervals[i + 1]));
    }
    return result;
  }

  private static getDaysBetween(start: Date, end: Date): Date[] {
    let arr = [];
    for (let dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
      arr.push(new Date(dt));
    }
    return arr;
  }
}
