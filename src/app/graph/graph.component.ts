import {Component, OnInit, ViewChild, ViewEncapsulation} from '@angular/core';
import {RailmlParserService} from '../railml-parser.service';
import {CytoscapeGraphComponent, DagreLayoutOptionsImpl} from 'cytoscape-angular';
import {EdgeDefinition, LayoutOptions, NodeDefinition, Stylesheet, use} from 'cytoscape';

// @ts-ignore
import dagre from 'cytoscape-dagre';
import {StylesheetImpl} from './style';
import {TrainPart, TrainTourType} from '../railml.model';
import {AppStore, TrainFilterResult} from '../app.store';
import {debounceTime} from 'rxjs';

@Component({
  selector: 'graph',
  templateUrl: './graph.component.html',
  styleUrls: ['./graph.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class GraphComponent implements OnInit {

  @ViewChild('graphChild')
  graph: CytoscapeGraphComponent | null;

  // layoutOptions: LayoutOptions = new CoseLayoutOptionsImpl();
  layoutOptions: LayoutOptions = new DagreLayoutOptionsImpl();


  stylesheet: Stylesheet[] = [
    new StylesheetImpl('node', {
      content: 'data(label)',
      'text-valign': 'center',
      'text-halign': 'center',
      'font-size': '0.5em'
    }),
    new StylesheetImpl('node[color]', {
      'background-color': 'data(color)',
    }),
    new StylesheetImpl('edge[sourceShape, targetShape, color, style]', {
      'curve-style': 'bezier',
      // @ts-ignore
      'source-arrow-shape': 'data(sourceShape)',
      // @ts-ignore
      'target-arrow-shape': 'data(targetShape)',
      // @ts-ignore
      'target-arrow-color': 'data(color)',
      // @ts-ignore
      'line-color': 'data(color)',
      // @ts-ignore
      'line-style': 'data(style)',
    }),
    new StylesheetImpl(':parent', {
      'text-valign': 'top',
      'text-halign': 'center',
      'font-size': '1em'
    })
  ];

  nodes: NodeDefinition[] = [];
  edges: EdgeDefinition[] = [];

  constructor(private railmlParserService: RailmlParserService, private appStore: AppStore) {
    this.graph = null;
  }

  ngOnInit(): void {
    use(dagre);
    this.appStore.filteredTrains$
      .pipe(debounceTime(150))
      .subscribe(filteredTrains => this.updateGraph(filteredTrains));
  }

  updateGraph(filteredData: TrainFilterResult): void {
    const railml = filteredData.railml;

    this.nodes = [];
    this.edges = [];

    const trainPartToNode = new Map<TrainPart, NodeDefinition>();
    for (const tp of filteredData.trainParts.values()) {
      const node = {
        data: {
          id: tp.id,
          label: tp.commercialTrainNumber,
          color: '#00ff00'
        }
      };
      this.nodes.push(node);
      trainPartToNode.set(tp, node);
    }

    for (const train of filteredData.operationalTrains) {
      this.nodes.push({
        data: {
          id: train.id,
          label: train.trainNumber
        }
      });
      for (const sequence of train.trainPartSequences) {
        const sequenceId = train.id + ' ' + sequence.sequence;
        this.nodes.push({
          data: {
            id: sequenceId,
            label: train.trainPartSequences.length > 1 ? sequence.sequence : '',
            parent: train.id
          }
        });
        for (const tp of sequence.trainParts) {
          const node = trainPartToNode.get(tp.trainPart).data;
          node.parent = sequenceId;
          if (sequence.trainParts.length > 1) {
            node.label += ' p ' + tp.position;
          }
        }
      }
    }

    const colors = ['#e6194b', '#3cb44b', '#ffe119', '#4363d8',
      '#f58231', '#911eb4', '#46f0f0', '#f032e6',
      '#bcf60c', '#fabebe', '#008080', '#e6beff',
      '#9a6324', '#fffac8', '#800000', '#aaffc3',
      '#808000', '#ffd8b1', '#000075', '#808080'];

    for (const trainTour of railml.trainTours) {
      if (trainPartToNode.has(trainTour.from) && trainPartToNode.has(trainTour.to)) {
        switch (trainTour.type) {
          case TrainTourType.TIME_TABLE:
            this.edges.push({
              data: {
                source: trainTour.from.id,
                target: trainTour.to.id,
                sourceShape: 'none',
                targetShape: 'triangle',
                color: 'black',
                style: 'solid',
              }
            });
            break;
          case TrainTourType.PARALLEL_TO_TIME_TABLE:
            this.edges.push({
              data: {
                source: trainTour.from.id,
                target: trainTour.to.id,
                sourceShape: 'none',
                targetShape: 'triangle',
                color: colors[trainTour.index % colors.length],
                style: 'solid',
              }
            });
            break;
          case TrainTourType.SHORT_TURN:
            this.edges.push({
              data: {
                source: trainTour.from.id,
                target: trainTour.to.id,
                sourceShape: 'none',
                targetShape: 'triangle',
                color: colors[trainTour.index % colors.length],
                style: 'dotted',
              }
            });
            break;
          case TrainTourType.LONG_TURN:
            this.edges.push({
              data: {
                source: trainTour.from.id,
                target: trainTour.to.id,
                sourceShape: 'none',
                targetShape: 'triangle',
                color: colors[trainTour.index % colors.length],
                style: 'dashed',
              }
            });
            break;
        }
      }
    }
    console.log('render');
    // // @ts-ignore
    // this.graph?.cy.on('click', 'node', (evt) => {
    //   console.log('on node clicked ', evt);
    // });
    this.graph?.render();
  }

  bigGraphLayoutToolbarChange($event: any): void {
    console.log(`app gets big layout toolbar change ${JSON.stringify($event)}`);
    this.graph?.render();
  }

  bigGraphLayoutStylesToolbarChange($event: cytoscape.Stylesheet[]): void {
    console.log(`app gets biggraph style toolbar change ${JSON.stringify($event)}`);
    this.graph?.render();
  }

  bigGraphLayoutStylesSelectorChange(selector: string):
    void {
    console.log(`app gets biggraph style selector change: ${JSON.stringify(selector)}`);
    this.graph?.zoomToElement(selector);
  }

}
