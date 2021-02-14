import {AfterContentChecked, AfterViewInit, Component, ElementRef, QueryList, ViewChild, ViewChildren, ViewEncapsulation} from '@angular/core';
import {RailmlParserService} from "./railml-parser.service";
import {OperatingPeriod, Railml, Train, TrainPart, TrainType} from "./railml.model";
import {MatTable, MatTableDataSource} from "@angular/material/table";
import {MatSort} from "@angular/material/sort";
import {BehaviorSubject} from "rxjs";
import {debounceTime, filter} from "rxjs/operators";
import {MatPaginator} from "@angular/material/paginator";
import {MatCalendar} from "@angular/material/datepicker";

export interface LeaderLine {
  remove();

  new(start: any, end: any, options: any);
}

declare var LeaderLine: any;

export class Month {
  constructor(public from: Date, public to: Date) {
  }
}

@Component({
  selector: 'app-root',
  encapsulation: ViewEncapsulation.None,
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements AfterContentChecked, AfterViewInit {
  title = 'railml-viewer';

  railml: Railml;
  fileName = "";
  dataSource = new MatTableDataSource([]);
  displayedColumns: string[] = ['trainNumber', 'type', 'name', 'complexity', 'sequences'];
  displayedColumnsSeq: string[] = ['sequences', 'trainParts'];
  displayedColumnsPos: string[] = ['tpRef'];

  filter: string = "";
  directMatch: Set<Train> = new Set();
  relatedMatch: Set<Train> = new Set();

  @ViewChild(MatSort) sort: MatSort;

  months: Month[] = []
  dateClassLambda: (d: Date) => string;
  selectedOp: OperatingPeriod;
  @ViewChildren('calendar') calendarElements: QueryList<MatCalendar<Date>>;

  @ViewChild(MatTable) table: MatTable<any>;
  @ViewChild(MatPaginator) paginator: MatPaginator;

  @ViewChildren('tpElement') tpElements: QueryList<ElementRef>;

  lines: LeaderLine[] = [];

  reDrawLines = false;
  updateLines: BehaviorSubject<Object> = new BehaviorSubject<Object>(1);

  mapOptions: google.maps.MapOptions = {
    center: {lat: 46.7307146911459, lng: 10.11897810703834},
    zoom: 9
  };
  stationCircles: { lat: number, lng: number }[] = [];

  ngAfterContentChecked() {
    console.log('ngAfterContentChecked');
    this.updateLines.next(1);
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  constructor(public railmlParserService: RailmlParserService) {
    // railmlParserService.getRailml('2021_v2_large.xml')
    railmlParserService.getRailmlEvents()
      .subscribe(
        railml => {
          if (railml) {
            console.log(railml);
            this.railml = railml;
            this.dataSource.data = this.getTrains();
            this.reDrawLines = true;
            this.dateClassLambda = this.getDateClassLambda();
            this.months = this.generateMonths(this.railml.startDate, this.railml.endDate);
          }
        },
        err => {
          console.error('Error: ', err);
        }
      );

    this.dataSource.filterPredicate = (train, filter) => this.directMatch.has(train) || this.relatedMatch.has(train);

    this.updateLines
      .pipe(
        filter(_ => this.reDrawLines),
        debounceTime(200))
      .subscribe(_ => {
        if (this.lines.length > 0) {
          for (let line of this.lines) {
            line.remove();
          }
          this.lines = [];
        }
        if (this.tpElements) {
          let map = new Map<string, ElementRef[]>();
          for (let tpElement of this.tpElements) {
            let id = tpElement.nativeElement.getAttribute('data-tpid');
            if (!map.has(id)) {
              map.set(id, []);
            }
            map.get(id).push(tpElement);
          }

          for (let [_, elements] of map) {
            for (let i = 0; i < elements.length - 1; i++) {
              this.lines.push(new LeaderLine(elements[i].nativeElement, elements[i + 1].nativeElement, {
                size: 2,
                startSocket: 'right',
                endSocket: 'right',
                path: 'arc',
                startPlug: 'behind',
                endPlug: 'behind',
                // color: '#3344aa'
              }));
            }
          }
          this.reDrawLines = false;
        }
      });
  }

  selectTrain(train: Train) {
    this.stationCircles = [];
    // for (let ocp of this.railml.ocps.values()) {
    //   this.stationCircles.push({lat: ocp.lat, lng: ocp.lon});
    // }

    for (let tp of train.trainParts) {
      for (let ocpTT of tp.trainPart.ocpTTs) {
        this.stationCircles.push({lat: ocpTT.ocp.lat, lng: ocpTT.ocp.lon});
      }
    }
  }

  dateDiffInDays(a: Date, b: Date) {
    const MS_PER_DAY = 1000 * 60 * 60 * 24;
    // Discard the time and time-zone information.
    const utc1 = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
    const utc2 = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());

    return Math.floor((utc2 - utc1) / MS_PER_DAY);
  }

  getKeys(map) {
    return Array.from(map.keys());
  }

  getTrains(): Train[] {
    let result: Train[] = [];
    if (this.railml) {
      result = Array.from(this.railml.trains.values());

    }
    // result.sort((a, b) => a.trainNumber.localeCompare(b.trainNumber));
    return result;
  }

  highlightTrain(train: Train) {
    return this.filter.trim().length > 0 && this.directMatch.has(train);
  }

  trainPartToColor(trainPart: TrainPart) {
    return this.getGradientFromHash(this.hash(trainPart.id));
  }

  sequenceToColor(sequence: number) {
    let hash = this.hash(sequence + '');
    let shortened = hash % (360);
    return 'hsl(' + shortened + ',100%,80%);'
  }

  operatingPeriodToColor(operatingPeriod: OperatingPeriod) {
    return this.getGradientFromHash(this.hash(operatingPeriod.id));
  }

  getTrainColor(train: Train) {
    return train.type === TrainType.COMMERCIAL ? 'hsl(20,80%,70%)' : 'hsl(220,80%,70%)';
  }

  getGradientFromHash(hash: number): string {
    let shortened1 = hash % 360;
    let shortened2 = (hash % (360 * 360)) / 360;
    let shortened3 = (hash % (360 * 360 * 360)) / (360 * 360);
    return 'linear-gradient(90deg, hsl(' + shortened1 + ',100%,70%) 0%, hsl(' + shortened3 + ',100%,70%) 100%);';
  }

  hash(str: string): number {
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

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;

    this.directMatch.clear();
    this.relatedMatch.clear();

    for (let train of this.getTrains()) {
      if (train.trainNumber.startsWith(filterValue)) {
        this.directMatch.add(train);
        for (let relatedTrain of train.getRelatedTrainsRecursively()) {
          this.relatedMatch.add(relatedTrain);
        }
      }
    }

    this.filter = filterValue.trim().toLowerCase();
    this.dataSource.filter = this.filter;
    this.reDrawLines = true;
  }

  private generateMonths(startDate: Date, endDate: Date): Month[] {
    let intervals = [startDate];
    let oldMonth = startDate.getMonth();

    for (let day of AppComponent.getDaysBetween(startDate, endDate)) {
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

  getDateClassLambda(): (d: Date) => string {
    return (d: Date) => {
      if (!this.railml || !this.railml.startDate || !this.selectedOp) {
        return undefined;
      }
      let diff = this.dateDiffInDays(this.railml.startDate, d);
      return (this.selectedOp.bitMask !== undefined && this.selectedOp.bitMask.charAt(diff) === '1') ? 'highlighted-date' : undefined;
    };
  }

  setOp(op: OperatingPeriod) {
    this.selectedOp = op;
    this.dateClassLambda = this.getDateClassLambda();
    for (let calendar of this.calendarElements) {
      calendar.updateTodaysDate();
    }
  }

  fileBrowserHandler(files: FileList) {
    files[0].text().then(content => {
      this.fileName = files[0].name;
      this.railmlParserService.emitRailmlFromContent(content);
    });
  }
}
