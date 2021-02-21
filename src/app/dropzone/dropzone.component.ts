import {Component, OnInit} from '@angular/core';
import {RailmlParserService} from "../railml-parser.service";
import {Railml} from "../railml.model";

@Component({
  selector: 'dropzone',
  templateUrl: './dropzone.component.html',
  styleUrls: ['./dropzone.component.scss']
})
export class DropzoneComponent implements OnInit {

  railml: Railml;
  fileName = "";

  constructor(
    private railmlParserService: RailmlParserService,
  ) {
  }

  ngOnInit(): void {
    this.railmlParserService.getRailmlEvents()
      .subscribe(railml => this.railml = railml,
          err => console.error('Error: ', err));
  }

  fileBrowserHandler(files: FileList) {
    files[0].text().then(content => {
      this.fileName = files[0].name;
      this.railmlParserService.emitRailmlFromContent(content);
    });
  }
}
