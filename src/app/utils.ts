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

export class Utils {
  public static hash(object: any): number {
    let str = object + '';
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      let chr = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + chr * chr * chr;
      hash = ((hash << 5) - hash) + chr * chr * chr;
      hash = ((hash << 5) - hash) + chr * chr * chr;
      hash = ((hash << 5) - hash) + chr * chr * chr;
      hash |= 0; // Convert to 32bit integer
    }
    return hash;
  }

  public static hashToColor(object: any): string {
    return Utils.getColorFromHash(Utils.hash(object))
  }

  public static hashToGradient(object: any): string {
    return Utils.getGradientFromHash(Utils.hash(object))
  }

  public static getColorFromHash(hash: number, saturation?: string, lightness?: string): string {
    let shortened = hash % 360;
    return 'hsl(' + shortened + ',100%,80%)'
  }

  public static getGradientFromHash(hash: number, saturation?: string, lightness?: string): string {
    if (!saturation) {
      saturation = '100%'
    }
    if (!lightness) {
      lightness = '70%'
    }
    let shortened1 = hash % 360;
    let shortened2 = (hash % (360 * 360 * 360)) / (360 * 360);
    return 'linear-gradient(0deg, hsl(' + shortened1 + ',' + saturation + ',' + lightness + ') 0%, hsl(' + shortened2 + ',' + saturation + ',' + lightness + ') 100%);';
  }
}
