import {NativeDateAdapter} from "@angular/material/core";
import {Injectable} from "@angular/core";

@Injectable()
export class MondayFirstDateAdapter extends NativeDateAdapter {

  getFirstDayOfWeek(): number {
    return 1;
  }

  format(date: Date, displayFormat: any): string {
    if (displayFormat.year === "numeric" && displayFormat.month === "numeric" && displayFormat.day === "numeric") {
      let day = date.getDate();
      let month = date.getMonth() + 1;
      let year = date.getFullYear();
      return MondayFirstDateAdapter.to2digit(day) + '.' + MondayFirstDateAdapter.to2digit(month) + '.' + year;
    } else {
      return super.format(date, displayFormat);
    }
  }

  parse(value: any): Date | null {
    let parts = value.split(".");
    try {
      return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
    } catch (e) {
      super.parse(value);
    }
  }

  private static to2digit(n: number) {
    return ('00' + n).slice(-2);
  }
}
