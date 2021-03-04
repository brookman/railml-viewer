import {Component, OnInit} from '@angular/core';
import {FormControl} from "@angular/forms";
import {OperatingPeriod} from "../railml.model";
import {AppStore} from "../app.store";

@Component({
  selector: 'rail-filter',
  templateUrl: './rail-filter.component.html',
  styleUrls: ['./rail-filter.component.scss']
})
export class RailFilterComponent implements OnInit {

  opControl = new FormControl([]);

  readonly filter$ = this.appStore.filter$;
  readonly operatingPeriods$ = this.appStore.operatingPeriods$;
  readonly combinedOperatingPeriod$ = this.appStore.combinedOperatingPeriod$;

  constructor(private readonly appStore: AppStore) {
  }

  ngOnInit() {
    this.opControl.registerOnChange(() => {
      this.appStore.filterUpdateSelectedOps(this.opControl.value as OperatingPeriod[])
    });

    this.filter$.subscribe(filter => {
      if (this.opControl.value !== filter.selectedOps) { // prevent endless loop
        this.opControl.setValue(filter.selectedOps);
      }
    })
  }

  onOpRemoved(op: OperatingPeriod) {
    const ops = this.opControl.value as OperatingPeriod[];
    RailFilterComponent.removeFirst(ops, op);
    this.opControl.setValue([]);
    this.opControl.setValue(ops); // To trigger change detection
  }

  onSelectionChange($event: any) {
    this.appStore.filterUpdateSelectedOps($event.value);
  }

  onDateChanged($event: any) {
    this.appStore.filterUpdateSingleDate($event.value);
  }

  onTrainNumberChange(trainNumber: string) {
    this.appStore.filterUpdateTrainNumber(trainNumber);
  }

  onShowRelatedChange(showRelated: boolean) {
    this.appStore.filterUpdateShowRelated(showRelated);
  }

  onCombineOperationChanged($event: any) {
    this.appStore.filterUpdateCombineOperation($event.value);
  }

  onMatchingModeChanged($event: any) {
    this.appStore.filterUpdateMatchingMode($event.value);
  }

  onOutsideOpGreyedOutChange(outsideOpGreyedOut: boolean) {
    this.appStore.filterUpdateOutsideOpGreyedOut(outsideOpGreyedOut);
  }

  clearSelection() {
    this.opControl.setValue([]);
    this.appStore.filterUpdateSelectedOps([])
    this.appStore.filterUpdateSingleDate(null)
  }

  private static removeFirst<T>(array: T[], toRemove: T): void {
    const index = array.indexOf(toRemove);
    if (index !== -1) {
      array.splice(index, 1);
    }
  }


}
