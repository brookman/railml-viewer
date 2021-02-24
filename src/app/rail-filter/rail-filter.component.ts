import {Component, OnInit} from '@angular/core';
import {FormControl} from "@angular/forms";
import {RailmlParserService} from "../railml-parser.service";
import {OperatingPeriod} from "../railml.model";
import {OpCalendarService} from "../op-calendar/op-calendar.service";

@Component({
  selector: 'rail-filter',
  templateUrl: './rail-filter.component.html',
  styleUrls: ['./rail-filter.component.scss']
})
export class RailFilterComponent implements OnInit {

  opControl = new FormControl([]);
  opList: OperatingPeriod[] = [];

  constructor(
    private railmlParserService: RailmlParserService,
    private opCalendarService: OpCalendarService) {
  }

  ngOnInit() {
    this.railmlParserService.getRailmlEvents()
      .subscribe(railml => {
        if (railml) {
          this.opList = [...railml.ops.values()];
          this.opList.sort();
        } else {
          this.opList = [];
        }
        this.opControl.setValue([]);
      });

    this.opControl.registerOnChange(() => {
      this.opCalendarService.selectOp(this.getCombinedMask());
    });
  }

  onOpRemoved(op: OperatingPeriod) {
    const ops = this.opControl.value as OperatingPeriod[];
    RailFilterComponent.removeFirst(ops, op);
    this.opControl.setValue([]);
    this.opControl.setValue(ops); // To trigger change detection
  }

  private getCombinedMask(): OperatingPeriod | null {
    const ops = this.opControl.value as OperatingPeriod[];
    if (ops.length <= 0) {
      return null;
    }

    let result = Array.from('0'.repeat(ops[0].bitMask.length));
    for (let op of ops) {
      for (let i = 0; i < op.bitMask.length; i++) {
        if (op.bitMask.charAt(i) === '1') {
          result[i] = '1';
        }
      }
    }
    return new OperatingPeriod('0', ops[0].startDate, ops[0].endDate, 'generated', 'generated', result.join(''));
  }

  private static removeFirst<T>(array: T[], toRemove: T): void {
    const index = array.indexOf(toRemove);
    if (index !== -1) {
      array.splice(index, 1);
    }
  }

  clearSelection() {
    this.opControl.setValue([]);
  }

  onSelectionChange($event: any) {
    this.opCalendarService.selectOp(this.getCombinedMask());
  }
}
