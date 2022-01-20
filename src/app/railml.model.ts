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
  ocp: IOcp | IOcp[];
}

export interface IOcp {
  attributes: {
    id: string,
    name: string,
    code: string
  };
  geoCoord: IGeoCoord;
  designator?: IDesignator;
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
  timetablePeriod: ITimetablePeriod | ITimetablePeriod[];
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
  operatingPeriod: IOperatingPeriod | IOperatingPeriod[];
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
  trainPart: ITrainPart | ITrainPart[];
}

export interface ITrainPart {
  attributes: {
    id: string,
    trainNumber: string,
    name: string,
    timetablePeriodRef: string,
    categoryRef: string,
    line: string,
    cancellation: string,
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
  ocpTT: IOcpTT | IOcpTT[];
}

export interface IOcpTT {
  attributes: {
    ocpRef: string,
    ocpType: string,
    sequence: string,
    trackInfo: string,
  }
  times: ITime | ITime[];
}

export interface ITime {
  attributes: {
    scope: string,
    arrival?: string,
    departure?: string,
  }
}

export interface ITrains {
  train: ITrain | ITrain[];
}

type TrainTypeString = "operational" | "commercial";

export interface ITrain {
  attributes: {
    id: string,
    type: TrainTypeString,
    trainNumber: string,
    additionalTrainNumber?: string,
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
  didok?: string;
  x: number = 0;
  y: number = 0;
  lat: number = 0;
  lon: number = 0;

  constructor(iOcp: IOcp) {
    this.id = iOcp.attributes.id;
    this.name = iOcp.attributes.name;
    this.code = iOcp.attributes.code;
    this.didok = iOcp.designator?.attributes.entry;
    if (iOcp.geoCoord) {
      let coords: string[] = iOcp.geoCoord.attributes.coord.split(' ');
      this.x = Ocp.convertStringToNumber(coords[1]);
      this.y = Ocp.convertStringToNumber(coords[0]);
      this.lat = this.CHtoWGSlat(this.y, this.x);
      this.lon = this.CHtoWGSlng(this.y, this.x);
    }
  }

  private static convertStringToNumber(input: string) {
    if (!input || input.trim().length == 0) {
      return NaN;
    }
    return Number(input);
  }

  CHtoWGSlat(y: number, x: number): number {
    // Converts military to civil and to unit = 1000km
    // Auxiliary values (% Bern)
    let y_aux = (y - 600000) / 1000000;
    let x_aux = (x - 200000) / 1000000;
    // let y_aux = (y - 0) / 1000000;
    // let x_aux = (x - 0) / 1000000;

    // Process lat
    let lat = 16.9023892 +
      3.238272 * x_aux -
      0.270978 * Math.pow(y_aux, 2) -
      0.002528 * Math.pow(x_aux, 2) -
      0.0447 * Math.pow(y_aux, 2) * x_aux -
      0.0140 * Math.pow(x_aux, 3);

    // Unit 10000" to 1 " and converts seconds to degrees (dec)
    lat = lat * 100 / 36;

    return lat;
  }

  CHtoWGSlng(y: number, x: number): number {
    // Converts military to civil and	to unit = 1000km
    // Auxiliary values (% Bern)
    let y_aux = (y - 600000) / 1000000;
    let x_aux = (x - 200000) / 1000000;
    // let y_aux = (y - 0) / 1000000;
    // let x_aux = (x - 0) / 1000000;

    // Process lng
    let lng = 2.6779094 +
      4.728982 * y_aux +
      0.791484 * y_aux * x_aux +
      0.1306 * y_aux * Math.pow(x_aux, 2) -
      0.0436 * Math.pow(y_aux, 3);

    // Unit 10000" to 1 " and converts seconds to degrees (dec)
    lng = lng * 100 / 36;

    return lng;
  }
}

export class OperatingPeriod {
  id: string;
  startDate: Date;
  endDate: Date;
  name: string;
  description: string;
  bitMask: string;
  utfMask: string;

  constructor(id: string, startDate: Date, endDate: Date, name: string, description: string, bitMask: string) {
    this.id = id;
    this.startDate = startDate;
    this.endDate = endDate;
    this.name = name;
    this.description = description;
    this.setBitMask(bitMask);
  }

  public static parse(iTimetablePeriod: ITimetablePeriod, iOperatingPeriod: IOperatingPeriod) {
    return new OperatingPeriod(
      iOperatingPeriod.attributes.id,
      new Date(iTimetablePeriod.attributes.startDate),
      new Date(iTimetablePeriod.attributes.endDate),
      iOperatingPeriod.attributes.name,
      iOperatingPeriod.attributes.description,
      iOperatingPeriod.attributes.bitMask
    );
  }

  private setBitMask(bitMask: string) {
    this.bitMask = bitMask;

    let utfMaskArray = [];
    for (let i = 0; i < bitMask.length; i++) {
      utfMaskArray.push(bitMask.charAt(i) === '1' ? '\u25A0' : '\u25A1');
    }
    this.utfMask = utfMaskArray.join('');
  }

  public getBit(date: Date): boolean {
    let diff = OperatingPeriod.dateDiffInDays(this.startDate, date);
    return this.bitMask?.charAt(diff) === '1';
  }

  public setBit(date: Date, value: boolean) {
    let diff = OperatingPeriod.dateDiffInDays(this.startDate, date);

    let newBitMask = [];
    for (let i = 0; i < this.bitMask.length; i++) {
      if (i === diff) {
        newBitMask.push(value ? '1' : '0');
      } else {
        newBitMask.push(this.bitMask.charAt(i));
      }
    }
    this.setBitMask(newBitMask.join(''));
  }

  public intersectsWith(otherOp: OperatingPeriod): boolean {
    let diff = OperatingPeriod.dateDiffInDays(otherOp.startDate, this.startDate);
    for (let i = 0; i < this.bitMask.length; i++) {
      if (this.bitMask.charAt(i) === '1' && otherOp.bitMask.charAt(i + diff) === '1') {
        return true;
      }
    }
    return false;
  }

  public contains(otherOp: OperatingPeriod): boolean {
    let diff = OperatingPeriod.dateDiffInDays(otherOp.startDate, this.startDate);
    for (let i = 0; i < this.bitMask.length; i++) {
      if (this.bitMask.charAt(i) === '1' && otherOp.bitMask.charAt(i + diff) !== '1') {
        return false;
      }
    }
    return true;
  }

  private static dateDiffInDays(a: Date, b: Date) {
    const MS_PER_DAY = 1000 * 60 * 60 * 24;
    // Discard the time and time-zone information.
    const utc1 = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
    const utc2 = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());

    return Math.floor((utc2 - utc1) / MS_PER_DAY);
  }
}

export class TrainPart {
  id: string;
  commercialTrainNumber: string;
  operationalTrainNumber: string;
  name: string;
  line: string;
  op: OperatingPeriod;
  cancellation: boolean;
  ocpTTs: OcpTT[] = [];
  stops: OcpTT[] = [];
  referencedBy: Set<Train> = new Set();
  position: number;

  ocpTTList: string;
  stopList: string;

  constructor(iTrainPart: ITrainPart, op: OperatingPeriod, ocps: Map<string, Ocp>) {
    this.id = iTrainPart.attributes.id;
    this.name = iTrainPart.attributes.name;
    this.line = iTrainPart.attributes.line;
    this.op = op;
    this.cancellation = iTrainPart.attributes.cancellation === 'true';

    // OcpTTs
    for (let iOcpTT of Util.toArray(iTrainPart.ocpsTT.ocpTT)) {
      let ocp = ocps.get(iOcpTT.attributes.ocpRef);
      let ocpTT = new OcpTT(iOcpTT, ocp);
      this.ocpTTs.push(ocpTT);
    }

    this.stops = this.ocpTTs
      .filter(ocpTT => ocpTT.ocpType === 'stop');

    this.ocpTTList = this.ocpTTs
      .map(o => o.ocp.code + ' - ' + o.ocp.name)
      .join('\n');

    this.stopList = this.stops
      .map(o => o.ocp.code + ' - ' + o.ocp.name)
      .join('\n');
  }

  get from(): string {
    return this.ocpTTs[0].ocp.name;
  }

  get fromCode(): string {
    return this.ocpTTs[0].ocp.code || this.from.substr(0, 4);
  }

  get to(): string {
    return this.ocpTTs[this.ocpTTs.length - 1].ocp.name;
  }

  get toCode(): string {
    return this.ocpTTs[this.ocpTTs.length - 1].ocp.code || this.to.substr(0, 4);
  }

  get timesReferenced(): number {
    return this.referencedBy.size;
  }

  public updateReferencedBy(): void {
    this.commercialTrainNumber = [...this.referencedBy]
      .filter(t => t.type === TrainType.COMMERCIAL)
      .map(t => t.trainNumber)
      .find(_ => true);

    this.operationalTrainNumber = [...this.referencedBy]
      .filter(t => t.type === TrainType.OPERATIONAL)
      .map(t => t.trainNumber)
      .find(_ => true);
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

  get departureUtc(): number | undefined {
    return OcpTT.getUTC(this.departure ? this.departure : this.arrival)
  }

  get arrivalUtc(): number | undefined {
    return OcpTT.getUTC(this.arrival ? this.arrival : this.departure)
  }

  private static getUTC(time: string | undefined): number | undefined {
    if (time === undefined) {
      return undefined;
    }
    const ts = time.split(':');
    return Date.UTC(1970, 0, 1, parseInt(ts[0]), parseInt(ts[1]), parseInt(ts[2]));
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
  relatedTrainsRecursive: Set<Train> = new Set();
  complexitySelf = 0;

  constructor(iTrain: ITrain, trainParts: Map<string, TrainPart>) {
    this.id = iTrain.attributes.id;
    this.type = iTrain.attributes.type === 'operational' ? TrainType.OPERATIONAL : TrainType.COMMERCIAL;
    this.trainNumber = iTrain.attributes.trainNumber + (iTrain.attributes.additionalTrainNumber ? (' - ' + iTrain.attributes.additionalTrainNumber) : '');
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

    this.complexitySelf = this.trainPartSequences.length * this.trainParts.length;
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

  get complexity(): number {
    let relatedComplexity = 0;
    for (let relatedTrain of this.relatedTrains) {
      relatedComplexity += relatedTrain.complexitySelf;
    }
    return this.complexitySelf * relatedComplexity;
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
  startDate: Date;
  endDate: Date;
  ocps = new Map<string, Ocp>();
  ops = new Map<string, OperatingPeriod>();
  sortedOps: OperatingPeriod[] = [];
  trainParts = new Map<string, TrainPart>();
  trains = new Map<string, Train>();
  operationalTrains = new Map<string, Train>();
  commercialTrains = new Map<string, Train>();
  commercialTrainNumbers = new Set<string>();

  trainList: Train[] = [];
  operationalTrainList: Train[] = [];
  commercialTrainList: Train[] = [];

  constructor(iRailmlDocument: IRailmlDocument) {
    let iTimetablePeriod = Util.toArray(iRailmlDocument.railml.timetable.timetablePeriods.timetablePeriod)[0]; // there should be exactly one
    this.startDate = new Date(iTimetablePeriod.attributes.startDate);
    this.endDate = new Date(iTimetablePeriod.attributes.endDate);

    // OCPs
    for (let iocp of Util.toArray(iRailmlDocument.railml.infrastructure.operationControlPoints.ocp)) {
      let ocp = new Ocp(iocp);
      this.ocps.set(ocp.id, ocp);
    }

    // OPs
    for (let iop of Util.toArray(iRailmlDocument.railml.timetable.operatingPeriods.operatingPeriod)) {
      let op = OperatingPeriod.parse(iTimetablePeriod, iop);
      this.ops.set(op.id, op);
      this.sortedOps.push(op);
    }
    this.sortedOps.sort();

    // TrainParts
    for (let itp of Util.toArray(iRailmlDocument.railml.timetable.trainParts.trainPart)) {
      let op = this.ops.get(itp.operatingPeriodRef.attributes.ref);
      let tp = new TrainPart(itp, op, this.ocps);
      this.trainParts.set(tp.id, tp);
    }

    // Trains
    for (let itrain of Util.toArray(iRailmlDocument.railml.timetable.trains.train)) {
      let train = new Train(itrain, this.trainParts);
      this.trains.set(train.id, train);
      if (train.type === TrainType.OPERATIONAL) {
        this.operationalTrains.set(train.id, train);
        this.operationalTrainList.push(train);
      } else if (train.type === TrainType.COMMERCIAL) {
        this.commercialTrains.set(train.id, train);
        this.commercialTrainNumbers.add(train.trainNumber);
        this.commercialTrainList.push(train);
      }
      this.trainList.push(train);
    }

    this.trainList.sort((a, b) => a.trainNumber.localeCompare(b.trainNumber));
    this.operationalTrainList.sort((a, b) => a.trainNumber.localeCompare(b.trainNumber));
    this.commercialTrainList.sort((a, b) => a.trainNumber.localeCompare(b.trainNumber));

    // Create TrainPart->Train references
    for (let train of this.trains.values()) {
      for (let seq of train.trainPartSequences) {
        for (let tpRef of seq.trainParts) {
          let trainPart = tpRef.trainPart;
          trainPart.referencedBy.add(train);
          trainPart.updateReferencedBy();
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

    for (let train of this.trains.values()) {
      train.relatedTrainsRecursive = train.getRelatedTrainsRecursively();
      train.relatedTrainsRecursive.delete(train); // remove self
    }
  }
}
