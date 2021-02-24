import {Component, OnInit, QueryList, ViewChildren} from '@angular/core';
import {MatCalendar} from "@angular/material/datepicker";
import {Calendar, OpCalendarService} from "./op-calendar.service";


@Component({
  selector: 'op-calendar',
  templateUrl: './op-calendar.component.html',
  styleUrls: ['./op-calendar.component.css']
})
export class OpCalendarComponent implements OnInit {

  calendar?: Calendar = null
  dateClassLambda: (d: Date) => string;
  @ViewChildren('calendar') calendarElements: QueryList<MatCalendar<Date>>;

  constructor(private opCalendarService: OpCalendarService) {
  }

  ngOnInit(): void {
    this.opCalendarService.getCalendar()
      .subscribe(calendar => {
        this.calendar = calendar;
        this.dateClassLambda = this.getDateClassLambda();
        if (this.calendarElements) {
          for (let calElement of this.calendarElements) {
            calElement.updateTodaysDate();
          }
        }
      });
  }

  getDateClassLambda(): (d: Date) => string {
    return (d: Date) => {
      if (!this.calendar?.months.length || !this.calendar.selectedOp) {
        return undefined;
      }
      return this.calendar.selectedOp?.getBit(d) ? 'highlighted-date' : undefined;
    };
  }
}
