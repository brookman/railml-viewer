import {Injectable} from '@angular/core';
import {Railml} from "./railml.model";

import {parse} from "fast-xml-parser";
import {HttpClient, HttpHeaders} from "@angular/common/http";
import {Observable} from "rxjs";
import {map} from "rxjs/operators";

@Injectable({
  providedIn: 'root'
})
export class RailmlParserService {

  constructor(private httpClient: HttpClient) {
  }

  public getRailml(path: string): Observable<Railml> {
    let defaultOptions = {
      attributeNamePrefix: "",
      attrNodeName: "attributes", //default is false
      textNodeName: "#text",
      ignoreAttributes: false,
      cdataTagName: "__cdata", //default is false
      cdataPositionChar: "\\c",
      format: false,
      indentBy: "  ",
      supressEmptyNode: false
    };

    return this.httpClient.get(`/assets/test_data/${path}`, {
      headers: new HttpHeaders({
        'Accept': 'text/html, application/xhtml+xml, */*',
        'Content-Type': 'application/x-www-form-urlencoded'
      }),
      responseType: 'text'
    }).pipe(map((res: string) => new Railml(parse(res, defaultOptions))));
  }
}
