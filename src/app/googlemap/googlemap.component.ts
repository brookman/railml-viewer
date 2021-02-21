import {Component, OnInit, ViewChild} from '@angular/core';
import {Train, TrainPart} from "../railml.model";
import {GoogleMap} from "@angular/google-maps";

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

  stations: { lat: number, lng: number, code: string, name: string }[] = [];

  constructor() {
  }

  ngOnInit(): void {
  }

  public selectTrain(train: Train) {
    this.stations = [];
    for (let trainPartRef of train.trainParts) {
      this.appendStops(trainPartRef.trainPart);
    }
    this.fitBounds();
  }

  public selectTrainPart(trainPart: TrainPart) {
    this.stations = [];
    this.appendStops(trainPart);
    this.fitBounds();
  }

  private appendStops(trainPart: TrainPart) {
    for (let ocpTT of trainPart.ocpTTs) {
      if (ocpTT.ocpType === "stop") {
        let ocp = ocpTT.ocp;
        this.stations.push({
          lat: ocp.lat,
          lng: ocp.lon,
          code: ocp.code,
          name: ocp.name
        });
      }
    }
  }

  private fitBounds() {
    let latlngbounds = new google.maps.LatLngBounds();
    for (let station of this.stations) {
      latlngbounds.extend({lat: station.lat, lng: station.lng});
    }
    this.map.fitBounds(latlngbounds);
  }
}
