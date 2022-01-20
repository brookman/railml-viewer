import {AfterViewChecked, AfterViewInit, Component, ElementRef, QueryList, ViewChild, ViewChildren, ViewEncapsulation} from '@angular/core';
import {OperatingPeriod, Train, TrainPart, TrainType} from "../railml.model";
import {MatTable, MatTableDataSource} from "@angular/material/table";
import {MatSort} from "@angular/material/sort";
import {MatPaginator} from "@angular/material/paginator";
import {GooglemapComponent} from "../googlemap/googlemap.component";
import {AppStore, TrainFilterResult} from "../app.store";
import {Utils} from "../utils";

export interface LeaderLine {
  remove();

  new(start: any, end: any, options: any);
}

declare var LeaderLine: any;

@Component({
  selector: 'train-view',
  templateUrl: './train-view.component.html',
  styleUrls: ['./train-view.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class TrainViewComponent implements AfterViewInit, AfterViewChecked {

  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatTable) table: MatTable<any>;
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChildren('tpElement') tpElements: QueryList<ElementRef>;
  @ViewChildren('tpElementCo') tpElementsCo: QueryList<ElementRef>;
  @ViewChildren('tpElementOp') tpElementsOp: QueryList<ElementRef>;
  @ViewChild(GooglemapComponent) map: GooglemapComponent;

  commercialTrainsDataSource = new MatTableDataSource([]);
  operationalTrainsDataSource = new MatTableDataSource([]);
  commercialColumns: string[] = ['trainNumber', 'viewIcon', 'complexity', 'sequences'];
  operationalColumns: string[] = ['sequences', 'trainNumber', 'complexity'];

  filterResult?: TrainFilterResult;
  visibleTrainParts: TrainPart[] = [];

  lines: LeaderLine[] = [];
  // private updateLinesSubject: BehaviorSubject<Object> = new BehaviorSubject<Object>(1);

  private shouldUpdateLines = true;

  private static readonly GREY = 'hsl(0,0%,50%);';
  private static readonly BLUE = 'hsl(218,70%,50%);';
  private static readonly RED = 'hsl(19,70%,50%);';

  constructor(private appStore: AppStore) {

    this.appStore.filteredTrains$.subscribe(filterResult => {
      this.filterResult = filterResult;
      this.commercialTrainsDataSource.data = filterResult.commercialTrains;
      this.operationalTrainsDataSource.data = filterResult.operationalTrains;
    });

    this.commercialTrainsDataSource.connect()
      .subscribe((trains: Train[]) => {
        this.regenerateVisibleTrainParts(trains);
        this.shouldUpdateLines = true;
      });
  }

  ngAfterViewInit() {
    this.commercialTrainsDataSource.paginator = this.paginator;
    this.commercialTrainsDataSource.sort = this.sort;
    this.operationalTrainsDataSource.paginator = this.paginator;
    this.operationalTrainsDataSource.sort = this.sort;
  }

  private removeLines() {
    for (let line of this.lines) {
      line.remove();
    }
    this.lines = [];
  }

  ngAfterViewChecked() {
    this.updateLines();
  }

  updateLines() {
    if (!this.shouldUpdateLines) {
      return;
    }
    this.shouldUpdateLines = false;

    (async () => {
      await this.delay(100);
      this.removeLines();
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
    })();
  }

  private delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  highlightTrain(train: Train) {
    return this.filterResult?.directMatches.has(train);
  }

  trainPartToColor(trainPart: TrainPart) {
    if (this.filterResult?.greyedOutTrainParts.has(trainPart)) {
      return TrainViewComponent.GREY;
    }
    return Utils.hashToColor(trainPart.id);
  }

  sequenceToColor(sequence: number): string {
    return Utils.hashToColor(sequence);
  }

  operatingPeriodToColor(operatingPeriod: OperatingPeriod) {
    // if (!!this.filterResult?.operatingPeriod && !operatingPeriod.intersectsWith(this.filterResult.operatingPeriod)) {
    //   return AppComponent.GREY;
    // }
    return Utils.hashToColor(operatingPeriod.id);
  }

  getTrainColor(train: Train) {
    if (this.filterResult?.greyedOutTrains.has(train)) {
      return TrainViewComponent.GREY;
    }
    return train.type === TrainType.COMMERCIAL ? TrainViewComponent.BLUE : TrainViewComponent.RED;
  }

  onOpSelected(op: OperatingPeriod, $event: any) {
    if ($event.shiftKey) {
      this.appStore.filterUpdateToggleSelectedOps(op);
    } else {
      this.appStore.filterUpdateSelectedOps([op]);
    }
  }

  onSortChange($event: any) {
    this.shouldUpdateLines = true;
    this.updateLines();
  }

  private regenerateVisibleTrainParts(trains: Train[]) {
    this.visibleTrainParts = [];
    for (let train of trains) {
      if (train.type === TrainType.COMMERCIAL) {
        for (let trainPart of train.trainParts) {
          this.visibleTrainParts.push(trainPart.trainPart);
        }
      }
    }
  }

  private addLine(element1: any, element2: any) {
    if (!!element1 && !!element2) {
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

  onTrainClicked(train: Train, $event: MouseEvent) {
    this.appStore.filterUpdateTrainNumber(train.trainNumber);
  }

  onTrainMapClicked(train: Train, $event: MouseEvent) {
    if ($event.shiftKey) {
      this.appStore.mapToggleTrain(train);
    } else {
      this.appStore.mapSelectTrain(train);
    }
  }

  onTrainPartClicked(trainPart: TrainPart, $event: MouseEvent) {

  }
}
