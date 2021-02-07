export interface IRailmlDocument {
  railml: IRailml;
}

export interface IRailml {
  infrastructure: IInfrastructure;
  timetable: ITimetable;
}

export interface IInfrastructure {
  operationControlPoints: IOperationControlPoints;
}

export interface IOperationControlPoints {
  ocp: IOcp[];
}

export interface IOcp {
  attributes: {
    id: string,
    name: string,
    code: string
  };
  geoCoord: IGeoCoord;
  designator: IDesignator;
}

export interface IGeoCoord {
  attributes: {
    coord: string;
  };
}

export interface IDesignator {
  attributes: {
    register: string,
    entry: string
  }
}

export interface ITimetable {
  timetablePeriods: ITimetablePeriods;
  operatingPeriods: IOperatingPeriods;
  trainParts: ITrainParts;
  trains: ITrains;
}

export interface ITimetablePeriods {
  timetablePeriod: ITimetablePeriod; // []
}

export interface ITimetablePeriod {
  attributes: {
    id: string,
    name: string,
    description: string,
    startDate: string,
    endDate: string
  }
}

export interface IOperatingPeriods {
  operatingPeriod: IOperatingPeriod[];
}

export interface IOperatingPeriod {
  attributes: {
    id: string,
    name: string,
    description: string,
    bitMask: string
  }
}

export interface ITrainParts {
  trainPart: ITrainPart[];
}

export interface ITrainPart {
  attributes: {
    id: string,
    trainNumber: string,
    name: string,
    timetablePeriodRef: string,
    categoryRef: string,
    line: string,
  }
  operatingPeriodRef: IOperatingPeriodRef;
  ocpsTT: IOcpsTT;
}

export interface IOperatingPeriodRef {
  attributes: {
    ref: string,
  }
}

export interface IOcpsTT {
  ocpTT: IOcpTT[];
}

export interface IOcpTT {
  attributes: {
    ocpRef: string,
    ocpType: string,
    sequence: string,
    trackInfo: string,
  }
  times: ITime[];
}

export interface ITime {
  attributes: {
    scope: string,
    arrival?: string,
    departure?: string,
  }
}

export interface ITrains {
  train: ITrain[];
}

type TrainTypeString = "operational" | "commercial";

export interface ITrain {
  attributes: {
    id: string,
    type: TrainTypeString,
    trainNumber: string,
    name: string,
  }
  trainPartSequence: ITrainPartSequence | ITrainPartSequence[];
}

export interface ITrainPartSequence {
  attributes: {
    sequence: string,
  }
  trainPartRef: ITrainPartRef | ITrainPartRef[];
}

export interface ITrainPartRef {
  attributes: {
    position: string,
    ref: string,
  }
}

// -----------------------------------------------------

export class Ocp {
  id: string;
  name: string;
  code: string;
  didok: string;
  lat: number;
  lon: number;

  constructor(iOcp: IOcp) {
    this.id = iOcp.attributes.id;
    this.name = iOcp.attributes.name;
    this.code = iOcp.attributes.code;
    this.didok = iOcp.designator.attributes.entry;
    let coords: string[] = iOcp.geoCoord.attributes.coord.split(' ');
    this.lat = Ocp.convertStringToNumber(coords[0]);
    this.lon = Ocp.convertStringToNumber(coords[1]);
  }

  private static convertStringToNumber(input: string) {
    if (!input || input.trim().length == 0) {
      return NaN;
    }
    return Number(input);
  }
}

export class OperatingPeriod {
  id: string;
  startDate: string;
  endDate: string;
  name: string;
  description: string;
  bitMask: string;

  constructor(iTimetablePeriod: ITimetablePeriod, iOperatingPeriod: IOperatingPeriod) {
    this.id = iOperatingPeriod.attributes.id;
    this.startDate = iTimetablePeriod.attributes.startDate;
    this.endDate = iTimetablePeriod.attributes.endDate;
    this.name = iOperatingPeriod.attributes.name;
    this.description = iOperatingPeriod.attributes.description;
    this.bitMask = iOperatingPeriod.attributes.bitMask;
  }
}

export class TrainPart {
  id: string;
  trainNumber: string;
  name: string;
  line: string;
  op: OperatingPeriod;
  ocpTTs: OcpTT[] = [];
  referencedBy: Set<Train> = new Set();

  constructor(iTrainPart: ITrainPart, op: OperatingPeriod, ocps: Map<string, Ocp>) {
    this.id = iTrainPart.attributes.id;
    this.trainNumber = iTrainPart.attributes.trainNumber;
    this.name = iTrainPart.attributes.name;
    this.line = iTrainPart.attributes.line;
    this.op = op;

    // OcpTTs
    for (let iOcpTT of iTrainPart.ocpsTT.ocpTT) {
      let ocp = ocps.get(iOcpTT.attributes.ocpRef);
      let ocpTT = new OcpTT(iOcpTT, ocp);
      this.ocpTTs.push(ocpTT);
    }
  }

  get from(): string {
    return this.ocpTTs[0].ocp.name;
  }

  get fromCode(): string {
    return this.ocpTTs[0].ocp.code;
  }

  get to(): string {
    return this.ocpTTs[this.ocpTTs.length - 1].ocp.name;
  }

  get toCode(): string {
    return this.ocpTTs[this.ocpTTs.length - 1].ocp.code;
  }
}

export class OcpTT {
  ocpType: string;
  trackInfo: string;
  arrival?: string;
  departure?: string;
  ocp: Ocp;

  constructor(iOcpTT: IOcpTT, ocp: Ocp) {
    this.ocpType = iOcpTT.attributes.ocpType;
    this.trackInfo = iOcpTT.attributes.trackInfo;
    this.arrival = iOcpTT.times[1].attributes.arrival;
    this.departure = iOcpTT.times[1].attributes.departure;
    this.ocp = ocp;
  }
}

export class Train {
  id: string;
  type: TrainType;
  trainNumber: string;
  name: string;
  trainPartSequences: TrainPartSequence[] = [];
  trainParts: TrainPartRefFlat[] = [];
  relatedTrains: Set<Train> = new Set();

  constructor(iTrain: ITrain, trainParts: Map<string, TrainPart>) {
    this.id = iTrain.attributes.id;
    this.type = iTrain.attributes.type === 'operational' ? TrainType.OPERATIONAL : TrainType.COMMERCIAL;
    this.trainNumber = iTrain.attributes.trainNumber;
    this.name = iTrain.attributes.name;

    // TrainPartSequences
    for (let iSeq of Util.toArray(iTrain.trainPartSequence)) {
      let tpSeq = new TrainPartSequence(iSeq, trainParts);
      this.trainPartSequences.push(tpSeq);
    }

    // TrainParts flat
    for (let seq of this.trainPartSequences) {
      let first = true;
      let lastPosition = 0;
      let offset = 0;
      for (let tp of seq.trainParts) {
        let span = first ? seq.trainParts.length : 0;
        first = false;
        if (tp.position === lastPosition) {
          offset++;
        } else {
          offset = 0;
        }
        lastPosition = tp.position;
        this.trainParts.push(new TrainPartRefFlat(seq.sequence, span, tp.position, offset, tp.trainPart));
      }
    }
  }

  getRelatedTrainsRecursively(): Set<Train> {
    let relatedTrains: Set<Train> = new Set();
    this.addAllRelatedTrainsRecursively(relatedTrains, this);
    return relatedTrains;
  }

  private addAllRelatedTrainsRecursively(relatedTrains: Set<Train>, train: Train) {
    if (!relatedTrains.has(train)) {
      relatedTrains.add(train);
      for (let relatedTrain of train.relatedTrains) {
        this.addAllRelatedTrainsRecursively(relatedTrains, relatedTrain);
      }
    }
  }

  get numberOfSequences(): number {
    return this.trainPartSequences.length;
  }

  get numberOfTrainParts(): number {
    let sum = 0;
    for (let seq of this.trainPartSequences) {
      sum += seq.trainParts.length;
    }
    return sum;
  }
}

export class TrainPartSequence {
  sequence: number;
  trainParts: TrainPartRef[] = [];

  constructor(iTrainPartSequence: ITrainPartSequence, trainParts: Map<string, TrainPart>) {
    this.sequence = parseInt(iTrainPartSequence.attributes.sequence);

    // TrainParts
    for (let iRef of Util.toArray(iTrainPartSequence.trainPartRef)) {
      let tp = trainParts.get(iRef.attributes.ref);
      let tpRef = new TrainPartRef(iRef, tp);
      this.trainParts.push(tpRef);
    }
  }
}

export class Util {
  public static toArray(obj: any) {
    if (obj === undefined || obj === null) {
      return [];
    }
    return Array.isArray(obj) ? obj : [obj];
  }
}

export class TrainPartRef {
  position: number;
  trainPart: TrainPart;

  constructor(iTrainPartRef: ITrainPartRef, trainPart: TrainPart) {
    this.position = parseInt(iTrainPartRef.attributes.position);
    this.trainPart = trainPart;
  }
}

export class TrainPartRefFlat {
  sequence: number;
  span: number;
  position: number;
  positionOffset: number;
  trainPart: TrainPart;

  constructor(sequence: number, span: number, position: number, positionOffset: number, trainPart: TrainPart) {
    this.sequence = sequence;
    this.span = span;
    this.position = position;
    this.positionOffset = positionOffset;
    this.trainPart = trainPart;
  }

  get toString(): string {
    return this.trainPart.fromCode + ' - ' + this.trainPart.toCode + ' (' + this.trainPart.op.id + ')';
  }
}

export enum TrainType {
  OPERATIONAL = 'operational',
  COMMERCIAL = 'commercial'
}

export class Railml {
  ocps = new Map<string, Ocp>();
  ops = new Map<string, OperatingPeriod>();
  trainParts = new Map<string, TrainPart>();
  trains = new Map<string, Train>();

  constructor(iRailmlDocument: IRailmlDocument) {

    // OCPs
    for (let iocp of iRailmlDocument.railml.infrastructure.operationControlPoints.ocp) {
      let ocp = new Ocp(iocp);
      this.ocps.set(ocp.id, ocp);
    }

    // OPs
    let iTimetablePeriod = iRailmlDocument.railml.timetable.timetablePeriods.timetablePeriod;
    for (let iop of iRailmlDocument.railml.timetable.operatingPeriods.operatingPeriod) {
      let op = new OperatingPeriod(iTimetablePeriod, iop);
      this.ops.set(op.id, op);
    }

    // TrainParts
    for (let itp of iRailmlDocument.railml.timetable.trainParts.trainPart) {
      let op = this.ops.get(itp.operatingPeriodRef.attributes.ref);
      let tp = new TrainPart(itp, op, this.ocps);
      this.trainParts.set(tp.id, tp);
    }

    // Trains
    for (let itrain of iRailmlDocument.railml.timetable.trains.train) {
      let train = new Train(itrain, this.trainParts);
      this.trains.set(train.id, train);
    }

    // Create TrainPart->Train references
    for (let train of this.trains.values()) {
      for (let seq of train.trainPartSequences) {
        for (let tpRef of seq.trainParts) {
          let trainPart = tpRef.trainPart;
          trainPart.referencedBy.add(train);
        }
      }
    }

    // Create Train->Train relations
    for (let train of this.trains.values()) {
      for (let seq of train.trainPartSequences) {
        for (let tpRef of seq.trainParts) {
          let trainPart = tpRef.trainPart;
          train.relatedTrains = new Set([...train.relatedTrains, ...trainPart.referencedBy]);
        }
      }
      train.relatedTrains.delete(train); // remove self
    }
  }
}
