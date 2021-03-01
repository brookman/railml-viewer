import {Component, OnInit} from '@angular/core';
import {FormControl} from "@angular/forms";
import {RailmlParserService} from "../railml-parser.service";
import {OperatingPeriod} from "../railml.model";
import {OpCalendarService} from "../op-calendar/op-calendar.service";
import {Filter, RailFilterService} from "./rail-filter.service";
import {BehaviorSubject} from "rxjs";

@Component({
  selector: 'rail-filter',
  templateUrl: './rail-filter.component.html',
  styleUrls: ['./rail-filter.component.scss']
})
export class RailFilterComponent implements OnInit {
  filter: Filter = new Filter();

  opControl = new FormControl([]);
  opList: OperatingPeriod[] = [];

  private filterSubject: BehaviorSubject<Filter>
  singleDate: Date;

  constructor(
    private railmlParserService: RailmlParserService,
    private railFilterService: RailFilterService,
    private opCalendarService: OpCalendarService) {
    this.filterSubject = railFilterService.getFilterSubject();
  }

  ngOnInit() {
    this.filter.reset();
    this.singleDate = undefined;
    this.railmlParserService.getRailmlEvents()
      .subscribe(railml => {
        let newSelectedOps = []
        if (railml) {
          this.opList = [...railml.ops.values()];
          this.opList.sort();
          for (let selectedOp of this.filter.selectedOps) {
            if (railml.ops.has(selectedOp.id)) {
              newSelectedOps.push(railml.ops.get(selectedOp.id));
            }
          }
        } else {
          this.opList = [];
        }
        this.singleDate = null;
        this.filter.additionalOp = null;
        this.filter.selectedOps = newSelectedOps;
        this.opControl.setValue(newSelectedOps);
        this.sendUpdate();
      });

    this.opControl.registerOnChange(() => {
      this.filter.selectedOps = this.opControl.value as OperatingPeriod[];
      this.sendUpdate();
    });
  }

  onOpRemoved(op: OperatingPeriod) {
    const ops = this.opControl.value as OperatingPeriod[];
    RailFilterComponent.removeFirst(ops, op);
    this.opControl.setValue([]);
    this.opControl.setValue(ops); // To trigger change detection
    // this.filter.selectedOps = ops;
  }

  sendUpdate() {
    console.log('filter, sendUpdate', this.filter);
    this.filterSubject.next(this.filter);
  }

  get combinedBitMask(): string | null {
    let op = this.filter?.combinedOp;
    if (op) {
      return op.utfMask;
    }
    if (this.opList && this.opList.length > 0) {
      return Array.from('\u25A0'.repeat(this.opList[0].bitMask.length)).join('')
    }
    return '';
  }

  private static removeFirst<T>(array: T[], toRemove: T): void {
    const index = array.indexOf(toRemove);
    if (index !== -1) {
      array.splice(index, 1);
    }
  }

  clearSelection() {
    this.singleDate = null;
    this.filter.selectedOps = [];
    this.filter.additionalOp = null;
    this.opControl.setValue([]);
  }

  onSelectionChange($event: any) {
    this.filter.selectedOps = this.opControl.value as OperatingPeriod[];
    this.sendUpdate();
  }

  clearTrainNumber() {
    this.filter.trainNumber = '';
    this.sendUpdate();
  }

  onDateChanged($event: any) {
    let additionalOp: OperatingPeriod = null;

    if (!!$event.value && !!this.opList && this.opList.length > 0) {
      let date: Date = $event.value;
      let firstOp = this.opList[0];
      additionalOp = new OperatingPeriod('gen', firstOp.startDate, firstOp.endDate, 'generated', 'generated', Array.from('0'.repeat(firstOp.bitMask.length)).join(''));
      additionalOp.setBit(date, true);
    }

    this.filter.additionalOp = additionalOp;
    this.sendUpdate();
  }
}
