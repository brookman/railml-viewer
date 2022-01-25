import {Component, OnInit, ViewChild, ViewEncapsulation} from '@angular/core';
import {RailmlParserService} from '../railml-parser.service';
import {CytoscapeGraphComponent, DagreLayoutOptionsImpl} from 'cytoscape-angular';
import {EdgeDefinition, LayoutOptions, NodeDefinition, Stylesheet, use} from 'cytoscape';

// @ts-ignore
import dagre from 'cytoscape-dagre';
import {StylesheetImpl} from './style';
import {TrainPart} from '../railml.model';
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
    new StylesheetImpl('edge[sourceShape, targetShape, color]', {
      'curve-style': 'bezier',
      // @ts-ignore
      'source-arrow-shape': 'data(sourceShape)',
      // @ts-ignore
      'target-arrow-shape': 'data(targetShape)',
      // @ts-ignore
      'target-arrow-color': 'data(color)',
      // @ts-ignore
      'line-color': 'data(color)',
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

    this.edges = [];
    for (const train of filteredData.commercialTrains) {
      for (let i = 0; i < train.trainParts.length - 1; i++) {
        const from = train.trainParts[i].trainPart;
        const to = train.trainParts[i + 1].trainPart;
        if (trainPartToNode.has(from) && trainPartToNode.has(to)) {
          this.edges.push({
            data: {
              source: from.id,
              target: to.id,
              sourceShape: 'none',
              targetShape: 'triangle',
              color: 'black',
            }
          });
        }
      }
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

    const colors = [
      '#e6194b',
      '#3cb44b',
      '#ffe119',
      '#4363d8',
      '#f58231',
      '#911eb4',
      '#46f0f0',
      '#f032e6',
      '#bcf60c',
      '#fabebe',
      '#008080',
      '#e6beff',
      '#9a6324',
      '#fffac8',
      '#800000',
      '#aaffc3',
      '#808000',
      '#ffd8b1',
      '#000075',
      '#808080'];

    for (const trainTour of railml.trainTours) {
      if (trainPartToNode.has(trainTour.from && trainTour.to)) {
        this.edges.push({
          data: {
            source: trainTour.from.id,
            target: trainTour.to.id,
            sourceShape: 'none',
            targetShape: 'triangle',
            color: colors[trainTour.index % colors.length],
          }
        });
      }
    }
    console.log('render');
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
