import {Component} from '@angular/core';
import {RailmlParserService} from "./railml-parser.service";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'railml-viewer';

  constructor(railmlParserService: RailmlParserService) {
    railmlParserService.getRailml('test_smaller.xml')
      .subscribe(
        railml => {
          console.log(railml);
        },
        err => {
          console.error('Error: ', err);
        }
      );
  }
}
