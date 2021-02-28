import {Component, OnInit, ViewChild} from '@angular/core';
import {OperatingPeriod, Train, TrainPart} from "../railml.model";
import {GoogleMap} from "@angular/google-maps";

export class Station {
  lat: number;
  lng: number;
  code: string;
  name: string;
}

export class Stop {
  station: Station;
  arrival: number | undefined;
  departure: number | undefined;
  trainNumber: string;
  trainPartId: string;
}

export class TrainCourse {
  name: string;
  stops: Stop[];

  trainPosition: { lat: number, lng: number } = undefined;
  currentStop: Stop;

  get stations(): Station[] {
    return this.stops.map(stop => stop.station);
  }
}

@Component({
  selector: 'googlemap',
  templateUrl: './googlemap.component.html',
  styleUrls: ['./googlemap.component.css']
})
export class GooglemapComponent implements OnInit {

  @ViewChild(GoogleMap) map: GoogleMap;

  mapOptions: google.maps.MapOptions = {
    center: {lat: 46.7307146911459, lng: 10.11897810703834},
    zoom: 9
  };

  stations: Set<Station> = new Set();

  trainCourses: TrainCourse[] = [];

  utcTime: number = 0;
  lerpedTime = 0.0;

  min: number = 0;
  max: number = 24 * 3600 * 1000;

  private selectedTrains: Set<Train> = new Set();
  private selectedTrainParts: Set<TrainPart> = new Set();

  constructor() {
  }

  ngOnInit(): void {
  }

  private lerp(v0: number, v1: number, t: number): number {
    return v0 + t * (v1 - v0);
  }

  onTrainClicked(train: Train, $event: any) {
    if ($event.shiftKey) {
      this.toggleTrain(train);
    } else {
      this.selectTrain(train);
    }
  }

  public selectTrain(train: Train) {
    this.selectedTrains.clear();
    this.selectedTrains.add(train);
    this.update();
  }

  public toggleTrain(train: Train) {
    if (this.selectedTrains.has(train)) {
      this.selectedTrains.delete(train);
    } else {
      this.selectedTrains.add(train);
    }
    this.update();
  }

  public selectTrainPart(trainPart: TrainPart) {
    this.selectedTrainParts.add(trainPart);
    this.update();
  }

  private update() {
    this.updateMap();
    this.updateCourses();
  }

  private updateMap() {
    this.utcTime = 0;
    this.lerpedTime = 0;
    this.stations.clear();
    this.trainCourses = [];

    this.min = 24 * 3600 * 1000;
    this.max = 0;

    for (let train of this.selectedTrains) {
      let trainCourse = new TrainCourse();
      trainCourse.name = train.id + ' ' + train.name + ' ' + train.trainNumber;
      trainCourse.stops = [];
      for (let trainPartRef of train.trainParts) {
        let trainPart = trainPartRef.trainPart;
        for (let ocpTT of trainPart.ocpTTs) {
          let ocp = ocpTT.ocp;
          if (ocpTT.ocpType === 'stop') {
            let previousStop = trainCourse.stops.length > 0 ? trainCourse.stops[trainCourse.stops.length - 1] : undefined;
            if (previousStop?.station.code === ocp.code) {
              previousStop.departure = this.getUTC(ocpTT.departure);
            } else {
              let station: Station = {
                lat: ocp.lat,
                lng: ocp.lon,
                code: ocp.code,
                name: ocp.name,
              };
              this.stations.add(station);
              trainCourse.stops.push({
                station: station,
                arrival: this.getUTC(ocpTT.arrival ? ocpTT.arrival : ocpTT.departure),
                departure: this.getUTC(ocpTT.departure ? ocpTT.departure : ocpTT.arrival),
                trainNumber: trainPart.trainNumber,
                trainPartId: trainPart.id,
              });
            }
          }
        }
      }
      this.trainCourses.push(trainCourse);
    }
    this.fitBounds();
  }

  private updateCourses() {
    for (let course of this.trainCourses) {
      if (course.stops.length < 2) {
        course.trainPosition = undefined;
      } else {

        let previousStop = course.stops[course.stops.length - 1];
        let nextStop = course.stops[course.stops.length - 1];
        let ratio = 0.0;

        for (let i = 0; i < course.stops.length; i++) {
          if (this.utcTime < course.stops[i].arrival) {
            previousStop = course.stops[Math.max(i - 1, 0)]
            nextStop = course.stops[i];
            let span = nextStop.arrival - previousStop.departure;
            ratio = span > 0 ? (this.utcTime - previousStop.departure) / span : 0;
            break;
          } else if (this.utcTime >= course.stops[i].arrival && this.utcTime <= course.stops[i].departure) {
            previousStop = course.stops[i];
            nextStop = course.stops[i];
            break;
          }
        }

        course.currentStop = nextStop;
        course.trainPosition = {
          lat: previousStop.station.lat * (1.0 - ratio) + nextStop.station.lat * ratio,
          lng: previousStop.station.lng * (1.0 - ratio) + nextStop.station.lng * ratio
        };
      }
    }
  }

  // private appendStops(trainPart: TrainPart) {
  //   for (let ocpTT of trainPart.ocpTTs) {
  //     if (ocpTT.ocpType === 'stop') {
  //       let ocp = ocpTT.ocp;
  //       let previousStation = this.stations.length > 0 ? this.stations[this.stations.length - 1] : undefined;
  //       if (previousStation?.code === ocp.code) {
  //         previousStation.departure = GooglemapComponent.getUTC(ocpTT.departure);
  //       } else {
  //         this.stations.push({
  //           lat: ocp.lat,
  //           lng: ocp.lon,
  //           code: ocp.code,
  //           name: ocp.name,
  //           arrival: GooglemapComponent.getUTC(ocpTT.arrival ? ocpTT.arrival : ocpTT.departure),
  //           departure: GooglemapComponent.getUTC(ocpTT.departure ? ocpTT.departure : ocpTT.arrival),
  //           trainNumber: trainPart.trainNumber,
  //           trainPartId: trainPart.id,
  //         });
  //       }
  //     }
  //   }
  // }


  public formatTime(input: number): string {
    let date = new Date(input);
    return date.getUTCHours() + ':' + date.getUTCMinutes();
  }

  private fitBounds() {
    let latlngbounds = new google.maps.LatLngBounds();
    for (let station of this.stations) {
      latlngbounds.extend({lat: station.lat, lng: station.lng});
    }
    this.map.fitBounds(latlngbounds);
  }

  private getUTC(time): number | undefined {
    if (time === undefined) {
      return undefined;
    }
    const ts = time.split(':');
    let utc = Date.UTC(1970, 0, 1, ts[0], ts[1], ts[2]);

    this.min = Math.min(this.min, utc);
    this.max = Math.max(this.max, utc);

    return utc;
  }

  onSliderValueChanged(value: number) {
    this.utcTime = value;
    this.updateCourses();
  }
}
