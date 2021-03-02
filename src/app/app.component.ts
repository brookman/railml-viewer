import {AfterContentChecked, AfterViewInit, Component, ElementRef, QueryList, ViewChild, ViewChildren, ViewEncapsulation} from '@angular/core';
import {RailmlParserService} from "./railml-parser.service";
import {OperatingPeriod, Train, TrainPart, TrainType} from "./railml.model";
import {MatTable, MatTableDataSource} from "@angular/material/table";
import {MatSort} from "@angular/material/sort";
import {BehaviorSubject} from "rxjs";
import {debounceTime} from "rxjs/operators";
import {MatPaginator} from "@angular/material/paginator";
import {GooglemapComponent} from "./googlemap/googlemap.component";
import {AppStore, TrainFilterResult} from "./app.store";
import {Utils} from "./utils";

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

  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatTable) table: MatTable<any>;
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChildren('tpElement') tpElements: QueryList<ElementRef>;
  @ViewChildren('tpElementCo') tpElementsCo: QueryList<ElementRef>;
  @ViewChildren('tpElementOp') tpElementsOp: QueryList<ElementRef>;
  @ViewChild(GooglemapComponent) map: GooglemapComponent;

  commercialTrainsDataSource = new MatTableDataSource([]);
  operationalTrainsDataSource = new MatTableDataSource([]);
  commercialColumns: string[] = ['trainNumber', 'name', 'complexity', 'sequences'];
  operationalColumns: string[] = ['sequences', 'trainNumber', 'name', 'complexity'];

  filterResult?: TrainFilterResult;
  visibleTrainParts: TrainPart[] = [];

  lines: LeaderLine[] = [];
  updateLinesSubject: BehaviorSubject<Object> = new BehaviorSubject<Object>(1);

  private static readonly GREY = 'hsl(0,0%,50%);';
  private static readonly BLUE = 'hsl(218,70%,50%);';
  private static readonly RED = 'hsl(19,70%,50%);';

  constructor(
    private railmlParserService: RailmlParserService,
    private appStore: AppStore,
  ) {

    this.appStore.filteredTrains$.subscribe(filterResult => {
      this.filterResult = filterResult;
      this.commercialTrainsDataSource.data = filterResult.commercialTrains;
      this.operationalTrainsDataSource.data = filterResult.operationalTrains;
      this.regenerateVisibleTrainParts();
      this.updateLines();
    });

    this.updateLinesSubject
      .pipe(
        debounceTime(100))
      .subscribe(_ => {
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
              this.addLine(mapTpCo.get(id).nativeElement, element.nativeElement);
            }

            if (mapTpOp.has(id)) {
              this.addLine(element.nativeElement, mapTpOp.get(id).nativeElement);
            }
          }
        }
      });
  }

  ngAfterViewInit() {
    this.commercialTrainsDataSource.paginator = this.paginator;
    this.commercialTrainsDataSource.sort = this.sort;

    this.operationalTrainsDataSource.paginator = this.paginator;
    this.operationalTrainsDataSource.sort = this.sort;
  }

  ngAfterContentChecked() {
    this.updateLines();
  }

  highlightTrain(train: Train) {
    return this.filterResult?.directMatches.has(train);
  }

  trainPartToColor(trainPart: TrainPart) {
    if (this.filterResult?.greyedOutTrainParts.has(trainPart)) {
      return AppComponent.GREY;
    }
    return Utils.hashToGradient(trainPart.id);
  }

  sequenceToColor(sequence: number): string {
    return Utils.hashToColor(sequence);
  }

  operatingPeriodToColor(operatingPeriod: OperatingPeriod) {
    if (!!this.filterResult?.operatingPeriod && !operatingPeriod.intersectsWith(this.filterResult.operatingPeriod)) {
      return AppComponent.GREY;
    }
    return Utils.hashToGradient(operatingPeriod.id);
  }

  getTrainColor(train: Train) {
    if (this.filterResult?.greyedOutTrains.has(train)) {
      return AppComponent.GREY;
    }
    return train.type === TrainType.COMMERCIAL ? AppComponent.BLUE : AppComponent.RED;
  }

  onOpSelected(op: OperatingPeriod, $event: any) {
    if ($event.shiftKey) {
      this.appStore.filterUpdateToggleSelectedOps(op);
    } else {
      this.appStore.filterUpdateSelectedOps([op]);
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
    for (let train of this.commercialTrainsDataSource.filteredData) {
      if (train.type === TrainType.COMMERCIAL) {
        for (let trainPart of train.trainParts) {
          this.visibleTrainParts.push(trainPart.trainPart);
        }
      }
    }
  }

  private addLine(element1: any, element2: any) {
    this.lines.push(new LeaderLine(element1, element2, {
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
