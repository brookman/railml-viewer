import {AfterContentChecked, Component, ElementRef, QueryList, ViewChild, ViewChildren} from '@angular/core';
import {RailmlParserService} from "./railml-parser.service";
import {OperatingPeriod, Railml, Train, TrainPart, TrainType} from "./railml.model";
import {MatTable, MatTableDataSource} from "@angular/material/table";
import {MatSort} from "@angular/material/sort";
import {BehaviorSubject} from "rxjs";
import {debounceTime, filter} from "rxjs/operators";

export interface LeaderLine {
  remove();

  new(start: any, end: any, options: any);
}

declare var LeaderLine: any;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements AfterContentChecked {
  title = 'railml-viewer';

  railml: Railml;
  dataSource = new MatTableDataSource([]);
  displayedColumns: string[] = ['trainNumber', 'type', 'name', 'sequences'];
  displayedColumnsSeq: string[] = ['sequences', 'trainParts'];
  displayedColumnsPos: string[] = ['tpRef'];

  filter: string = "";
  directMatch: Set<Train> = new Set();
  relatedMatch: Set<Train> = new Set();

  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatTable) table: MatTable<any>;

  @ViewChildren('tpElement') tpElements: QueryList<ElementRef>;

  lines: LeaderLine[] = [];

  reDrawLines = false;
  updateLines: BehaviorSubject<Object> = new BehaviorSubject<Object>(1);

  ngAfterContentChecked() {
    console.log('ngAfterContentChecked');
    this.updateLines.next(1);
  }

  constructor(railmlParserService: RailmlParserService) {
    railmlParserService.getRailml('test_smaller.xml')
      .subscribe(
        railml => {
          console.log(railml);
          this.railml = railml;
          this.dataSource.data = this.getTrains();
          this.reDrawLines = true;
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

  getKeys(map) {
    return Array.from(map.keys());
  }

  getTrains(): Train[] {
    let result: Train[] = [];
    if (this.railml) {
      result = Array.from(this.railml.trains.values());

    }
    result.sort((a, b) => a.trainNumber.localeCompare(b.trainNumber));
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
}
