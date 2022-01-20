import {AfterViewInit, Component, OnInit, ViewChild, ViewEncapsulation} from '@angular/core';
import {MatTableDataSource} from "@angular/material/table";
import {RailmlParserService} from "../railml-parser.service";
import {filter} from "rxjs/operators";
import {MatSort} from "@angular/material/sort";
import {MatPaginator} from "@angular/material/paginator";

@Component({
  selector: 'train-part-list',
  templateUrl: './train-part-list.component.html',
  styleUrls: ['./train-part-list.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class TrainPartListComponent implements OnInit, AfterViewInit {
  dataSource = new MatTableDataSource([]);
  displayedColumns: string[] = ['id', 'name', 'from', 'to', 'line', 'commercialTrainNumber', 'operationalTrainNumber', 'op', 'ocpTTs', 'stops', 'cancellation'];

  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatPaginator) paginator: MatPaginator;

  constructor(private railmlParserService: RailmlParserService) {
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  ngOnInit(): void {
    this.railmlParserService.getRailmlEvents()
      .pipe(filter(railml => !!railml))
      .subscribe(railml => this.dataSource.data = [...railml.trainParts.values()],
        err => console.error('Error: ', err));
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }
}
