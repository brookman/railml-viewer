import {AfterContentChecked, AfterViewInit, Component, ElementRef, QueryList, ViewChild, ViewChildren, ViewEncapsulation} from '@angular/core';
import {RailmlParserService} from "./railml-parser.service";
import {OperatingPeriod, Railml, Train, TrainPart, TrainType} from "./railml.model";
import {MatTable, MatTableDataSource} from "@angular/material/table";
import {MatSort} from "@angular/material/sort";
import {BehaviorSubject} from "rxjs";
import {debounceTime, filter} from "rxjs/operators";
import {MatPaginator} from "@angular/material/paginator";
import {OpCalendarService} from "./op-calendar/op-calendar.service";
import {GooglemapComponent} from "./googlemap/googlemap.component";

export interface LeaderLine {
  remove();

  new(start: any, end: any, options: any);
}

declare var LeaderLine: any;


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
  dataSource2 = new MatTableDataSource([]);
  displayedColumns: string[] = ['trainNumber', 'name', 'type', 'complexity', 'sequences'];
  displayedColumns2: string[] = ['sequences', 'trainNumber', 'name', 'type', 'complexity'];

  filter: string = "";
  directMatch: Set<Train> = new Set();
  relatedMatch: Set<Train> = new Set();

  @ViewChild(MatSort) sort: MatSort;

  selectedOp: OperatingPeriod;

  @ViewChild(MatTable) table: MatTable<any>;
  @ViewChild(MatPaginator) paginator: MatPaginator;

  @ViewChildren('tpElement') tpElements: QueryList<ElementRef>;
  @ViewChildren('tpElementCo') tpElementsCo: QueryList<ElementRef>;
  @ViewChildren('tpElementOp') tpElementsOp: QueryList<ElementRef>;

  @ViewChild(GooglemapComponent) map: GooglemapComponent;

  lines: LeaderLine[] = [];

  reDrawLines = false;
  updateLines: BehaviorSubject<Object> = new BehaviorSubject<Object>(1);

  visibleTrainParts: TrainPart[] = [];

  ngAfterContentChecked() {
    // console.log('ngAfterContentChecked');
    this.updateLines.next(1);
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;

    this.dataSource2.paginator = this.paginator;
    this.dataSource2.sort = this.sort;
  }

  constructor(
    private railmlParserService: RailmlParserService,
    private opCalendarService: OpCalendarService,
  ) {
    // railmlParserService.getRailml('2021_v2_large.xml')
    railmlParserService.getRailmlEvents()
      .subscribe(
        railml => {
          if (railml) {
            console.log(railml);
            this.railml = railml;
            this.dataSource.data = this.getTrains();
            this.dataSource2.data = this.getTrains();
            this.reDrawLines = true;
          }
        },
        err => {
          console.error('Error: ', err);
        }
      );

    this.dataSource.filterPredicate = (train, filter) => train.type === TrainType.COMMERCIAL && (this.directMatch.has(train) || this.relatedMatch.has(train));
    this.dataSource2.filterPredicate = (train, filter) => train.type === TrainType.OPERATIONAL && (this.directMatch.has(train) || this.relatedMatch.has(train));

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
          let mapTp = new Map<string, ElementRef>();
          let mapTpCo = new Map<string, ElementRef>();
          let mapTpOp = new Map<string, ElementRef>();

          for (let tpElement of this.tpElements) {
            mapTp.set(tpElement.nativeElement.getAttribute('data-tpid'), tpElement);
          }

          for (let tpElement of this.tpElementsCo) {
            mapTpCo.set(tpElement.nativeElement.getAttribute('data-tpid'), tpElement);
          }

          for (let tpElement of this.tpElementsOp) {
            mapTpOp.set(tpElement.nativeElement.getAttribute('data-tpid'), tpElement);
          }

          for (let [id, element] of mapTp) {
            if (mapTpCo.has(id)) {
              this.lines.push(new LeaderLine(element.nativeElement, mapTpCo.get(id).nativeElement, {
                size: 2,
                startSocket: 'left',
                endSocket: 'right',
                path: 'fluid',
                startPlug: 'behind',
                endPlug: 'behind',
                color: '#3344aa'
              }));
            }

            if (mapTpOp.has(id)) {
              this.lines.push(new LeaderLine(element.nativeElement, mapTpOp.get(id).nativeElement, {
                size: 2,
                startSocket: 'right',
                endSocket: 'left',
                path: 'fluid',
                startPlug: 'behind',
                endPlug: 'behind',
                color: '#3344aa'
              }));
            }
          }

          // for (let [_, elements] of map) {
          //   for (let i = 0; i < elements.length - 1; i++) {
          //     this.lines.push(new LeaderLine(elements[i].nativeElement, elements[i + 1].nativeElement, {
          //       size: 2,
          //       startSocket: 'center',
          //       endSocket: 'center',
          //       path: 'fluid',
          //       startPlug: 'behind',
          //       endPlug: 'behind',
          //       color: '#3344aa'
          //     }));
          //   }
          // }
          this.reDrawLines = false;
        }
      });
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
    let start = this.hash(trainPart.from);
    let center = this.hash(trainPart.id);
    let end = this.hash(trainPart.to);
    return 'linear-gradient(0deg, hsl(' + start + ',100%,70%) 0%, hsl(' + center + ',100%,70%) 50%, hsl(' + end + ',100%,70%) 100%);';
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
    return 'linear-gradient(0deg, hsl(' + shortened1 + ',100%,70%) 0%, hsl(' + shortened3 + ',100%,70%) 100%);';
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
    this.dataSource2.filter = this.filter;
    this.reDrawLines = true;

    this.visibleTrainParts = [];
    for (let train of this.relatedMatch) {
      if (train.type === TrainType.COMMERCIAL) {
        for (let trainPart of train.trainParts) {
          this.visibleTrainParts.push(trainPart.trainPart);
        }
      }
    }
  }

  setOp(op: OperatingPeriod) {
    this.selectedOp = op;
    this.opCalendarService.selectOp(op);
  }

  fileBrowserHandler(files: FileList) {
    files[0].text().then(content => {
      this.fileName = files[0].name;
      this.railmlParserService.emitRailmlFromContent(content);
    });
  }
}
