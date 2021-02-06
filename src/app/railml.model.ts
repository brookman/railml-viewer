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

  get to(): string {
    return this.ocpTTs[this.ocpTTs.length - 1].ocp.name;
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

  constructor(iTrain: ITrain, trainParts: Map<string, TrainPart>) {
    this.id = iTrain.attributes.id;
    this.type = iTrain.attributes.type === 'operational' ? TrainType.OPERATIONAL : TrainType.COMMERCIAL;
    this.trainNumber = iTrain.attributes.trainNumber;
    this.name = iTrain.attributes.name;

    // TrainParts
    let seq = iTrain.trainPartSequence;
    let seqs = Array.isArray(seq) ? seq : [seq];
    for (let iSeq of seqs) {
      let tpSeq = new TrainPartSequence(iSeq, trainParts);
      this.trainPartSequences.push(tpSeq);
    }
  }
}

export class TrainPartSequence {
  sequence: number;
  trainParts: TrainPartRef[] = [];

  constructor(iTrainPartSequence: ITrainPartSequence, trainParts: Map<string, TrainPart>) {
    this.sequence = parseInt(iTrainPartSequence.attributes.sequence);

    // TrainParts
    let ref = iTrainPartSequence.trainPartRef;
    let refs = Array.isArray(ref) ? ref : [ref];
    for (let iRef of refs) {
      let tp = trainParts.get(iRef.attributes.ref);
      let tpRef = new TrainPartRef(iRef, tp);
      this.trainParts.push(tpRef);
    }
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

export enum TrainType {
  OPERATIONAL, COMMERCIAL
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
  }
}
