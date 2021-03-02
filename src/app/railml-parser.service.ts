import {Injectable} from '@angular/core';
import {Railml} from "./railml.model";

import {parse} from "fast-xml-parser";
import {HttpClient, HttpHeaders} from "@angular/common/http";
import {BehaviorSubject, Observable} from "rxjs";
import {AppStore} from "./app.store";

@Injectable({
  providedIn: 'root'
})
export class RailmlParserService {

  subject = new BehaviorSubject<Railml>(null);

  constructor(
    private httpClient: HttpClient,
    private appStore: AppStore
  ) {
  }

  public getRailmlEvents(): Observable<Railml> {
    return this.subject;
  }

  public emitRailmlFromContent(content: string): Observable<Railml> {
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

    let railml = new Railml(parse(content, defaultOptions));

    this.subject.next(railml);
    this.appStore.railmlUpdate(railml);

    return this.subject;
  }

  public getRailmlFromPath(path: string): Observable<Railml> {
    this.httpClient.get(`/assets/test_data/${path}`, {
      headers: new HttpHeaders({
        'Accept': 'text/html, application/xhtml+xml, */*',
        'Content-Type': 'application/x-www-form-urlencoded'
      }),
      responseType: 'text'
    }).subscribe(result => this.emitRailmlFromContent(result));
    return this.subject;
  }
}
