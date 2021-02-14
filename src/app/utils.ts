import {NativeDateAdapter} from "@angular/material/core";
import {Injectable} from "@angular/core";

@Injectable()
export class MondayFirstDateAdapter extends NativeDateAdapter {

  getFirstDayOfWeek(): number {
    return 1;
  }

}
