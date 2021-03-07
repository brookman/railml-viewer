import {Component, OnInit, ViewChild} from '@angular/core';
import {TrainPart} from "../railml.model";
import {GoogleMap} from "@angular/google-maps";
import {AppStore} from "../app.store";
import {Utils} from "../utils";

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
  stops: Stop[];
  color: string;

  trainPosition: { lat: number, lng: number } = undefined;
  offset: { lat: number, lng: number } = undefined;
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

  readonly map$ = this.appStore.map$;
  readonly timeUtc$ = this.appStore.timeUtc$;
  readonly selectedTrainParts$ = this.appStore.selectedTrainParts$;

  constructor(private readonly appStore: AppStore) {
    this.selectedTrainParts$.subscribe(selectedTrainParts => {
      this.updateMap(new Set<TrainPart>(selectedTrainParts));
      this.updateCourses(0);
    })
    this.timeUtc$.subscribe(time => {
      this.updateCourses(time);
    })
  }

  ngOnInit(): void {
  }

  private updateMap(selectedTrainParts: Set<TrainPart>) {
    this.stations.clear();
    this.trainCourses = [];

    for (let trainPart of selectedTrainParts) {
      let trainCourse = new TrainCourse();
      trainCourse.stops = [];
      trainCourse.color = Utils.hashToColor(trainPart.id)

      for (let ocpTT of trainPart.ocpTTs) {
        let ocp = ocpTT.ocp;
        if (ocpTT.ocpType === 'stop') {
          let previousStop = trainCourse.stops.length > 0 ? trainCourse.stops[trainCourse.stops.length - 1] : undefined;
          if (previousStop?.station.code === ocp.code) {
            previousStop.departure = ocpTT.departureUtc;
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
              arrival: ocpTT.arrivalUtc,
              departure: ocpTT.departureUtc,
              trainNumber: trainPart.operationalUses + ' ' + trainPart.commercialUses,
              trainPartId: trainPart.id,
            });
          }
        }
      }
      this.trainCourses.push(trainCourse);
    }
    this.fitBounds();
  }

  private updateCourses(timeUtc: number) {
    let offset = 0;
    for (let course of this.trainCourses) {
      if (course.stops.length < 2) {
        course.trainPosition = undefined;
        course.offset = undefined;
      } else {

        let previousStop = course.stops[course.stops.length - 1];
        let nextStop = course.stops[course.stops.length - 1];
        let ratio = 0.0;

        for (let i = 0; i < course.stops.length; i++) {
          if (timeUtc < course.stops[i].arrival) {
            previousStop = course.stops[Math.max(i - 1, 0)]
            nextStop = course.stops[i];
            let span = nextStop.arrival - previousStop.departure;
            ratio = span > 0 ? (timeUtc - previousStop.departure) / span : 0;
            break;
          } else if (timeUtc >= course.stops[i].arrival && timeUtc <= course.stops[i].departure) {
            previousStop = course.stops[i];
            nextStop = course.stops[i];
            break;
          }
        }

        if (previousStop === nextStop && previousStop === course.stops[0] || timeUtc > nextStop.departure + 300000) {
          course.trainPosition = undefined;
          course.offset = undefined;
        } else {
          course.currentStop = nextStop;
          course.trainPosition = {
            lat: previousStop.station.lat * (1.0 - ratio) + nextStop.station.lat * ratio,
            lng: previousStop.station.lng * (1.0 - ratio) + nextStop.station.lng * ratio
          };
          course.offset = {
            lat: course.trainPosition.lat + Math.cos(2.0 * offset / this.trainCourses.length * Math.PI + Math.PI * 0.25) * 0.05,
            lng: course.trainPosition.lng + Math.sin(2.0 * offset / this.trainCourses.length * Math.PI + Math.PI * 0.25) * 0.05,
          };
          offset++;
        }
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
    let hours = date.getUTCHours() + '';
    let minutes = date.getUTCMinutes() + '';
    if (hours.length < 2) {
      hours = '0' + hours;
    }
    if (minutes.length < 2) {
      minutes = '0' + minutes;
    }
    return hours + ':' + minutes;
  }

  private fitBounds() {
    let bounds = new google.maps.LatLngBounds();
    for (let station of this.stations) {
      bounds.extend({lat: station.lat, lng: station.lng});
    }
    this.map?.fitBounds(bounds);
  }

  onSliderValueChange(value: number) {
    this.appStore.mapSetTime(value);
  }

  onShowStationsChange(showStations: boolean) {
    this.appStore.mapUpdateShowStations(showStations);
  }
}
