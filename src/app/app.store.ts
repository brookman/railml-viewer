import {Injectable} from "@angular/core";
import {ComponentStore} from "@ngrx/component-store";
import {OperatingPeriod, Railml, Train, TrainPart, TrainType} from "./railml.model";
import {filter, map} from "rxjs/operators";
import {Observable} from "rxjs";

export interface AppSate {
  railml?: Railml,
  filter: RailFilterState,
}

export interface RailFilterState {
  trainNumber: string;
  showRelated: boolean;
  selectedOps: OperatingPeriod[];
  singleDate?: Date;
  combineOperation: CombineOperation;
  outsideOpGreyedOut: boolean;
}

export enum CombineOperation {
  Intersect = 'Intersect',
  Union = 'Union',
}

export class TrainFilterResult {
  operatingPeriod?: OperatingPeriod = null;
  trains: Train[] = [];
  commercialTrains: Train[] = [];
  operationalTrains: Train[] = [];
  trainParts: TrainPart[] = [];
  greyedOutTrains: Set<Train> = new Set();
  greyedOutTrainParts: Set<TrainPart> = new Set();
  hiddenTrainParts: Set<TrainPart> = new Set();
  directMatches: Set<Train> = new Set();

  constructor() {
  }
}


@Injectable()
export class AppStore extends ComponentStore<AppSate> {

  constructor() {
    super({
      railml: null,
      filter: AppStore.getDefaultFilterState()
    });
  }

  readonly railml$ = this.select(state => state.railml).pipe(filter(o => !!o));
  readonly filter$ = this.select(state => state.filter);

  readonly operatingPeriods$: Observable<OperatingPeriod[]> = this.railml$.pipe(
    map((railml: Railml) => railml.sortedOps)
  );

  readonly combinedOperatingPeriod$: Observable<OperatingPeriod | null> = this.select(
    this.operatingPeriods$,
    this.filter$,
    this.getCombinedOp);

  readonly filteredTrains$: Observable<TrainFilterResult> = this.select(
    this.railml$,
    this.filter$,
    this.combinedOperatingPeriod$,
    this.getFilteredTrains);

  readonly filterUpdateTrainNumber = this.updater((state, trainNumber: string) => ({
    ...state, filter: {...state.filter, trainNumber},
  }));

  readonly filterUpdateShowRelated = this.updater((state, showRelated: boolean) => ({
    ...state, filter: {...state.filter, showRelated},
  }));

  readonly filterUpdateSelectedOps = this.updater((state, selectedOps: OperatingPeriod[]) => ({
    ...state, filter: {...state.filter, selectedOps},
  }));

  readonly filterUpdateToggleSelectedOps = this.updater((state, selectedOp: OperatingPeriod) => {
    let set = new Set(state.filter.selectedOps);
    if (set.has(selectedOp)) {
      set.delete(selectedOp);
    } else {
      set.add(selectedOp);
    }
    let selectedOps = Array.from(set);
    selectedOps.sort();
    return ({
      ...state, filter: {...state.filter, selectedOps},
    });
  });

  readonly filterUpdateSingleDate = this.updater((state, singleDate?: Date) => ({
    ...state, filter: {...state.filter, singleDate},
  }));

  readonly filterUpdateCombineOperation = this.updater((state, combineOperation: CombineOperation) => ({
    ...state, filter: {...state.filter, combineOperation},
  }));

  readonly filterUpdateOutsideOpGreyedOut = this.updater((state, outsideOpGreyedOut: boolean) => ({
    ...state, filter: {...state.filter, outsideOpGreyedOut},
  }));

  readonly railmlUpdate = this.updater((state, railml: Railml) => ({
    ...state, railml, filter: {...state.filter, selectedOps: []},
  }));

  private getCombinedOp(availableOps: OperatingPeriod[], railFilter: RailFilterState): OperatingPeriod | null {
    if (availableOps.length === 0) {
      return null;
    }

    let firstOp = availableOps[0];
    let ops: OperatingPeriod[] = [...railFilter.selectedOps];

    if (!!railFilter.singleDate) {
      let singleDayOp = new OperatingPeriod('gen', firstOp.startDate, firstOp.endDate, 'generated', 'generated', Array.from('0'.repeat(firstOp.bitMask.length)).join(''));
      singleDayOp.setBit(railFilter.singleDate, true);
      ops.push(singleDayOp)
    }

    let result = Array.from('1'.repeat(firstOp.bitMask.length));

    if (ops.length > 0) {
      if (railFilter.combineOperation == CombineOperation.Union) {
        result = Array.from('0'.repeat(firstOp.bitMask.length));
        for (let op of ops) {
          for (let i = 0; i < result.length; i++) {
            result[i] = (op.bitMask.charAt(i) === '1' || result[i] === '1') ? '1' : '0';
          }
        }
      } else if (railFilter.combineOperation == CombineOperation.Intersect) {
        for (let op of ops) {
          for (let i = 0; i < result.length; i++) {
            result[i] = (op.bitMask.charAt(i) === '1' && result[i] === '1') ? '1' : '0';
          }
        }
      }
    }

    return new OperatingPeriod('combined', firstOp.startDate, firstOp.endDate, 'generated', 'generated', result.join(''));
  }

  private getFilteredTrains(railml: Railml, railFilter: RailFilterState, op: OperatingPeriod | null): TrainFilterResult {
    let trainNumberFilterString = railFilter.trainNumber.trim().toLowerCase();

    let result = new TrainFilterResult();
    result.trains = railml.trainList;

    if (trainNumberFilterString.length > 0) {
      result.trains = result.trains.filter(train => train.trainNumber.startsWith(trainNumberFilterString));
      result.directMatches = new Set(result.trains);
      if (railFilter.showRelated) {
        let related = new Set<Train>();
        for (let train of result.trains) {
          related.add(train);
          for (let relatedTrain of train.getRelatedTrainsRecursively()) {
            related.add(relatedTrain);
          }
        }
        result.trains = Array.from(related);

      }
    }

    if (!!op) {
      let filteredTrains = [];
      for (let train of result.trains) {
        let hasIntersections = false;
        for (let trainPartRef of train.trainParts) {
          if (trainPartRef.trainPart.op.intersectsWith(op)) {
            hasIntersections = true;
          } else if (railFilter.outsideOpGreyedOut) {
            result.greyedOutTrainParts.add(trainPartRef.trainPart);
          } else {
            result.hiddenTrainParts.add(trainPartRef.trainPart);
          }
        }
        if (hasIntersections) {
          filteredTrains.push(train);
        } else if (railFilter.outsideOpGreyedOut) {
          filteredTrains.push(train);
          result.greyedOutTrains.add(train)
        }
      }
      result.trains = filteredTrains;
      result.operatingPeriod = op;
    }

    result.trains.sort((a, b) => a.trainNumber.localeCompare(b.trainNumber));

    result.commercialTrains = result.trains.filter(train => train.type === TrainType.COMMERCIAL);
    result.operationalTrains = result.trains.filter(train => train.type === TrainType.OPERATIONAL);

    return result;
  }

  public static getDefaultFilterState(): RailFilterState {
    return {
      trainNumber: '',
      showRelated: true,
      selectedOps: [],
      singleDate: null,
      combineOperation: CombineOperation.Union,
      outsideOpGreyedOut: true
    }
  }
}
