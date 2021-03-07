import {Injectable} from "@angular/core";
import {ComponentStore} from "@ngrx/component-store";
import {OperatingPeriod, Railml, Train, TrainPart, TrainType} from "./railml.model";
import {filter, map} from "rxjs/operators";
import {Observable} from "rxjs";

export interface AppSate {
  railml?: Railml,
  filter: RailFilterState,
  map: MapState,
}

export interface RailFilterState {
  trainNumber: string;
  showRelated: boolean;
  selectedOps: OperatingPeriod[];
  singleDate?: Date;
  combineOperation: CombineOperation;
  matchingMode: MatchingMode;
  outsideOpGreyedOut: boolean;
}

export enum CombineOperation {
  Intersect = 'Intersect',
  Union = 'Union',
}

export enum MatchingMode {
  Any = 'Any',
  All = 'All',
}

export class TrainFilterResult {
  // operatingPeriod?: OperatingPeriod = null;
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

export class MapState {
  selectedTrains: Train[] = [];
  selectedTrainParts: TrainPart[] = [];
  showStations: boolean = false;
  utcTime: number = 0;
  min: number = 0;
  max: number = 24 * 3600 * 1000;
}


@Injectable()
export class AppStore extends ComponentStore<AppSate> {

  constructor() {
    super({
      railml: null,
      filter: AppStore.getDefaultFilterState(),
      map: AppStore.getDefaultMapState(),
    });
  }


  // Read: ------------------------------------------------------------------------------------------------

  readonly railml$ = this.select(state => state.railml).pipe(filter(o => !!o));
  readonly filter$ = this.select(state => state.filter);
  readonly map$ = this.select(state => state.map);

  readonly operatingPeriods$: Observable<OperatingPeriod[]> = this.railml$.pipe(
    map((railml: Railml) => railml.sortedOps)
  );

  readonly combinedOperatingPeriod$: Observable<OperatingPeriod | null> = this.select(
    this.operatingPeriods$,
    this.filter$,
    AppStore.getCombinedOp);

  readonly filteredTrains$: Observable<TrainFilterResult> = this.select(
    this.railml$,
    this.filter$,
    this.combinedOperatingPeriod$,
    AppStore.getFilteredTrains);

  readonly timeUtc$: Observable<number> = this.select(
    this.map$,
    m => m.utcTime);

  readonly selectedTrainParts$: Observable<TrainPart[]> = this.select(
    this.map$,
    m => m.selectedTrainParts);

  // readonly showStations$: Observable<boolean> = this.select(
  //   this.map$,
  //   m => m.showStations);


  // Write: ------------------------------------------------------------------------------------------------

  readonly filterUpdateTrainNumber = this.updater((state, trainNumber: string) => ({
    ...state, filter: {...state.filter, trainNumber},
  }));

  readonly filterUpdateShowRelated = this.updater((state, showRelated: boolean) => ({
    ...state, filter: {...state.filter, showRelated},
  }));

  readonly filterUpdateSelectedOps = this.updater((state, selectedOps: OperatingPeriod[]) => ({
    ...state, filter: {...state.filter, selectedOps},
  }));

  readonly filterUpdateToggleSelectedOps = this.updater((state, selectedOp: OperatingPeriod) => ({
    ...state, filter: {...state.filter, selectedOps: AppStore.toggle(state.filter.selectedOps, selectedOp)},
  }));

  readonly filterUpdateSingleDate = this.updater((state, singleDate?: Date) => ({
    ...state, filter: {...state.filter, singleDate},
  }));

  readonly filterUpdateCombineOperation = this.updater((state, combineOperation: CombineOperation) => ({
    ...state, filter: {...state.filter, combineOperation},
  }));

  readonly filterUpdateMatchingMode = this.updater((state, matchingMode: MatchingMode) => ({
    ...state, filter: {...state.filter, matchingMode},
  }));

  readonly filterUpdateOutsideOpGreyedOut = this.updater((state, outsideOpGreyedOut: boolean) => ({
    ...state, filter: {...state.filter, outsideOpGreyedOut},
  }));

  readonly mapSelectTrain = this.updater((state, train: Train) => ({
    ...state, map: AppStore.updateMapStateFromTrains(state.map, [train]),
  }));

  readonly mapToggleTrain = this.updater((state, train: Train) => ({
    ...state, map: AppStore.updateMapStateFromTrains(state.map, AppStore.toggle(state.map.selectedTrains, train)),
  }));

  readonly mapSetTime = this.updater((state, time: number) => ({
    ...state, map: {...state.map, utcTime: time}
  }));

  readonly mapUpdateShowStations = this.updater((state, showStations: boolean) => ({
    ...state, map: {...state.map, showStations},
  }));

  readonly railmlUpdate = this.updater((state, railml: Railml) => ({
    ...state, railml, filter: {...state.filter, selectedOps: []},
  }));


  // Mappers: ------------------------------------------------------------------------------------------------

  private static getCombinedOp(availableOps: OperatingPeriod[], railFilter: RailFilterState): OperatingPeriod | null {
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

  private static getFilteredTrains(railml: Railml, railFilter: RailFilterState, op: OperatingPeriod | null): TrainFilterResult {
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
          if (railFilter.matchingMode === MatchingMode.Any ? trainPartRef.trainPart.op.intersectsWith(op) : trainPartRef.trainPart.op.contains(op)) {
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
      // result.operatingPeriod = op;
    }

    result.trains.sort((a, b) => a.trainNumber.localeCompare(b.trainNumber));

    result.commercialTrains = result.trains.filter(train => train.type === TrainType.COMMERCIAL);
    result.operationalTrains = result.trains.filter(train => train.type === TrainType.OPERATIONAL);

    return result;
  }

  private static toggle<T>(list: T[], elementToToggle: T): T[] {
    let set = new Set(list);
    if (set.has(elementToToggle)) {
      set.delete(elementToToggle);
    } else {
      set.add(elementToToggle);
    }
    let result = Array.from(set);
    result.sort();
    return result;
  }

  private static updateMapStateFromTrains(mapState: MapState, selectedTrains: Train[]): MapState {
    let min = 24 * 3600 * 1000;
    let max = 0;

    let selectedTrainParts = [];

    for (let train of selectedTrains) {
      for (let trainPartRef of train.trainParts) {
        let trainPart = trainPartRef.trainPart
        selectedTrainParts.push(trainPart)
        for (let ocpTT of trainPart.ocpTTs) {
          min = Math.min(min, ocpTT.arrivalUtc);
          max = Math.max(max, ocpTT.departureUtc);
        }
      }
    }

    if (min >= max) {
      min = 0;
      max = 24 * 3600 * 1000;
    }

    return {...mapState, selectedTrains, selectedTrainParts, min, max, utcTime: min}
  }


  // --------------------------------------------------

  public static getDefaultFilterState(): RailFilterState {
    return {
      trainNumber: '',
      showRelated: true,
      selectedOps: [],
      singleDate: null,
      combineOperation: CombineOperation.Union,
      matchingMode: MatchingMode.Any,
      outsideOpGreyedOut: true
    }
  }

  public static getDefaultMapState(): MapState {
    return {
      selectedTrains: [],
      selectedTrainParts: [],
      showStations: false,
      utcTime: 0,
      min: 0,
      max: 24 * 3600 * 1000
    }
  }
}
