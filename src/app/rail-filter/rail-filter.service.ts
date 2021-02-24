import {Injectable} from '@angular/core';
import {OperatingPeriod} from "../railml.model";

export class FilterValues {
  public operatingPeriod?: OperatingPeriod;
  public trainNumber?: string;
}

@Injectable({
  providedIn: 'root'
})
export class RailFilterService {

  private FilterValues

  constructor() {
  }
}
