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
  readonly railml$ = this.appStore.railml$;
  readonly operatingPeriods$ = this.appStore.operatingPeriods$;
  readonly combinedOperatingPeriod$ = this.appStore.combinedOperatingPeriod$;

  constructor(private readonly appStore: AppStore) {
  }

  ngOnInit() {
    // this.railmlParserService.getRailmlEvents()
    //   .subscribe(railml => {
    //     let newSelectedOps = []
    //     if (railml) {
    //       this.opList = [...railml.ops.values()];
    //       this.opList.sort();
    //       for (let selectedOp of this.filter.selectedOps) {
    //         if (railml.ops.has(selectedOp.id)) {
    //           newSelectedOps.push(railml.ops.get(selectedOp.id));
    //         }
    //       }
    //     } else {
    //       this.opList = [];
    //     }
    //     this.filter.additionalOp = null;
    //     this.filter.selectedOps = newSelectedOps;
    //     this.opControl.setValue(newSelectedOps);
    //     this.sendUpdate();
    //   });

    this.opControl.registerOnChange(() => {
      // this.filter.selectedOps = this.opControl.value as OperatingPeriod[];
      // this.sendUpdate();
    });
  }

  onOpRemoved(op: OperatingPeriod) {
    const ops = this.opControl.value as OperatingPeriod[];
    RailFilterComponent.removeFirst(ops, op);
    this.opControl.setValue([]);
    this.opControl.setValue(ops); // To trigger change detection
  }

  get combinedBitMask(): string | null {
    // let op = this.filter?.;
    // if (op) {
    //   return op.utfMask;
    // }
    // if (this.opList && this.opList.length > 0) {
    //   return Array.from('\u25A0'.repeat(this.opList[0].bitMask.length)).join('')
    // }
    return '';
  }

  private static removeFirst<T>(array: T[], toRemove: T): void {
    const index = array.indexOf(toRemove);
    if (index !== -1) {
      array.splice(index, 1);
    }
  }

  clearSelection() {
    // this.singleDate = null;
    // this.filter.selectedOps = [];
    // this.filter.additionalOp = null;
    // this.opControl.setValue([]);

    this.appStore.filterUpdateSelectedOps([])
    this.appStore.filterUpdateSingleDate(null)
  }

  onSelectionChange($event: any) {
    this.appStore.filterUpdateSelectedOps($event.value);
  }

  onDateChanged($event: any) {
    this.appStore.filterUpdateSingleDate($event.value);

    // let additionalOp: OperatingPeriod = null;
    //
    // if (!!singleDate && !!this.opList && this.opList.length > 0) {
    //   let firstOp = this.opList[0];
    //   additionalOp = new OperatingPeriod('gen', firstOp.startDate, firstOp.endDate, 'generated', 'generated', Array.from('0'.repeat(firstOp.bitMask.length)).join(''));
    //   additionalOp.setBit(singleDate, true);
    // }


    // this.filter.additionalOp = additionalOp;
    // this.sendUpdate();
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

  onOutsideOpGreyedOutChange(outsideOpGreyedOut: boolean) {
    this.appStore.filterUpdateOutsideOpGreyedOut(outsideOpGreyedOut);
  }
}
