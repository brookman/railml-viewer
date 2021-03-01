import {AfterContentChecked, AfterViewInit, Component, ElementRef, QueryList, ViewChild, ViewChildren, ViewEncapsulation} from '@angular/core';
import {RailmlParserService} from "./railml-parser.service";
import {OperatingPeriod, Railml, Train, TrainPart, TrainType} from "./railml.model";
import {MatTable, MatTableDataSource} from "@angular/material/table";
import {MatSort} from "@angular/material/sort";
import {BehaviorSubject} from "rxjs";
import {debounceTime} from "rxjs/operators";
import {MatPaginator} from "@angular/material/paginator";
import {GooglemapComponent} from "./googlemap/googlemap.component";
import {Filter, RailFilterService} from "./rail-filter/rail-filter.service";

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

  dataSource = new MatTableDataSource([]);
  dataSource2 = new MatTableDataSource([]);
  displayedColumns: string[] = ['trainNumber', 'name', 'complexity', 'sequences'];
  displayedColumns2: string[] = ['sequences', 'trainNumber', 'name', 'complexity'];

  trainNumberFilterString: string = "";
  filterOp?: OperatingPeriod = null;
  directMatch: Set<Train> = new Set();
  relatedMatch: Set<Train> = new Set();

  @ViewChild(MatSort) sort: MatSort;

  @ViewChild(MatTable) table: MatTable<any>;
  @ViewChild(MatPaginator) paginator: MatPaginator;

  @ViewChildren('tpElement') tpElements: QueryList<ElementRef>;
  @ViewChildren('tpElementCo') tpElementsCo: QueryList<ElementRef>;
  @ViewChildren('tpElementOp') tpElementsOp: QueryList<ElementRef>;

  @ViewChild(GooglemapComponent) map: GooglemapComponent;

  lines: LeaderLine[] = [];

  updateLinesSubject: BehaviorSubject<Object> = new BehaviorSubject<Object>(1);

  visibleTrainParts: TrainPart[] = [];

  ngAfterContentChecked() {
    this.updateLines();
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;

    this.dataSource2.paginator = this.paginator;
    this.dataSource2.sort = this.sort;

    this.updateLines();
  }

  constructor(
    private railmlParserService: RailmlParserService,
    private railFilterService: RailFilterService,
  ) {
    railmlParserService.getRailmlEvents()
      .subscribe(
        railml => {
          if (railml) {
            console.log(railml);
            this.railml = railml;
            this.dataSource.data = this.getTrains(TrainType.COMMERCIAL);
            this.dataSource2.data = this.getTrains(TrainType.OPERATIONAL);
            this.updateLines();
          }
        },
        err => {
          console.error('Error: ', err);
        }
      );

    railFilterService.getFilter()
      .subscribe(filter => this.applyFilter(filter));

    this.dataSource.filterPredicate = (train, filter) => train.type === TrainType.COMMERCIAL && (this.directMatch.has(train) || this.relatedMatch.has(train));
    this.dataSource2.filterPredicate = (train, filter) => train.type === TrainType.OPERATIONAL && (this.directMatch.has(train) || this.relatedMatch.has(train));

    this.updateLinesSubject
      .pipe(
        debounceTime(100))
      .subscribe(_ => {
        this.regenerateVisibleTrainParts();

        for (let line of this.lines) {
          line.remove();
        }
        this.lines = [];

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
        }
      });
  }

  getKeys(map) {
    return Array.from(map.keys());
  }

  getTrains(trainType?: TrainType): Train[] {
    let result: Train[] = [];
    if (this.railml) {
      result = [...this.railml.trains.values()];
      if (trainType) {
        result = result.filter(train => train.type === trainType);
      }
    }
    result.sort((a, b) => a.trainNumber.localeCompare(b.trainNumber));
    return result;
  }

  highlightTrain(train: Train) {
    return this.trainNumberFilterString.trim().length > 0 && this.directMatch.has(train);
  }

  trainPartToColor(trainPart: TrainPart) {
    if (!!this.filterOp && !trainPart.op.intersectsWith(this.filterOp)) {
      return 'hsl(0,0%,50%);'
    }
    return this.getGradientFromHash(this.hash(trainPart.id));
  }

  sequenceToColor(sequence: number) {
    let hash = this.hash(sequence + '');
    let shortened = hash % (360);
    return 'hsl(' + shortened + ',100%,80%);'
  }

  operatingPeriodToColor(operatingPeriod: OperatingPeriod) {
    if (!!this.filterOp && !operatingPeriod.intersectsWith(this.filterOp)) {
      return 'hsl(0,0%,50%);'
    }
    return this.getGradientFromHash(this.hash(operatingPeriod.id));
  }

  getTrainColor(train: Train) {
    if (!!this.filterOp) {
      let hasIntersections = false;
      for (let trainPartRef of train.trainParts) {
        if (trainPartRef.trainPart.op.intersectsWith(this.filterOp)) {
          hasIntersections = true;
          break;
        }
      }
      if (!hasIntersections) {
        return 'hsl(0,0%,50%);'
      }
    }
    return train.type === TrainType.COMMERCIAL ? 'hsl(218,70%,50%)' : 'hsl(19,70%,50%)';
  }

  getGradientFromHash(hash: number, saturation?: string, lightness?: string): string {
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

  applyFilter(filter: Filter) {
    this.trainNumberFilterString = filter.trainNumber.trim().toLowerCase();
    this.filterOp = filter.combinedOp;

    this.directMatch.clear();
    this.relatedMatch.clear();

    for (let train of this.getTrains()) {
      if (train.trainNumber.startsWith(this.trainNumberFilterString)) {
        this.directMatch.add(train);
        if (filter.showRelated) {
          for (let relatedTrain of train.getRelatedTrainsRecursively()) {
            this.relatedMatch.add(relatedTrain);
          }
        }
      }
    }

    this.dataSource.filter = this.trainNumberFilterString;
    this.dataSource2.filter = this.trainNumberFilterString;
    this.updateLines();
  }

  setOp(op: OperatingPeriod, $event: any) {
    if ($event.shiftKey) {
      this.railFilterService.toggleOp(op);
    } else {
      this.railFilterService.setSelectedOp(op);
    }
  }

  onSortChange($event: any) {
    this.updateLines();
  }

  private updateLines() {
    this.updateLinesSubject.next(1);
  }

  private regenerateVisibleTrainParts() {
    this.visibleTrainParts = [];
    for (let train of this.dataSource.filteredData) {
      if (train.type === TrainType.COMMERCIAL) {
        for (let trainPart of train.trainParts) {
          this.visibleTrainParts.push(trainPart.trainPart);
        }
      }
    }
  }
}
