import {Component, OnInit, ViewChild, ViewEncapsulation} from '@angular/core';
import {RailmlParserService} from '../railml-parser.service';
import {filter} from 'rxjs/operators';
import {CytoscapeGraphComponent, DagreLayoutOptionsImpl} from 'cytoscape-angular';
import {EdgeDefinition, LayoutOptions, NodeDefinition, Stylesheet, use} from 'cytoscape';

// @ts-ignore
import dagre from 'cytoscape-dagre';
import {StylesheetImpl} from './style';
import {TrainPart} from "../railml.model";

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
      'text-halign': 'center'
    }),
    new StylesheetImpl('node[color]', {
      'background-color': 'data(color)',
    }),
    new StylesheetImpl('edge', {
      'curve-style': 'bezier',
      'line-color': 'blue',
      // 'target-arrow-color': 'blue',
      'target-arrow-shape': 'triangle'
    }),
    new StylesheetImpl('edge[sourceShape, targetShape, color]', {
      // @ts-ignore
      'source-arrow-shape': 'data(sourceShape)',
      // @ts-ignore
      'target-arrow-shape': 'data(targetShape)',
      // @ts-ignore
      'line-color': 'data(color)'
    }),
    new StylesheetImpl(':parent', {
      'text-valign': 'top',
      'text-halign': 'center',
    })
  ];

  nodes: NodeDefinition[] = [];
  edges: EdgeDefinition[] = [];

  constructor(private railmlParserService: RailmlParserService) {
    this.graph = null;
  }

  ngOnInit(): void {
    use(dagre);
    this.railmlParserService.getRailmlEvents()
      .pipe(filter(railml => !!railml))
      .subscribe(railml => {
        console.log('got railml');

        this.nodes = [];
        const trainPartToNode = new Map<TrainPart, NodeDefinition>();
        for (const tp of railml.trainParts.values()) {
          const node = {
            data: {
              id: tp.id,
              label: tp.commercialTrainNumber,
              color: 'cyan'
            }
          };
          this.nodes.push(node);
          trainPartToNode.set(tp, node);
        }

        this.edges = [];
        for (const train of railml.commercialTrainList) {
          for (let i = 0; i < train.trainParts.length - 1; i++) {
            this.edges.push({
              data: {
                source: train.trainParts[i].trainPart.id,
                target: train.trainParts[i + 1].trainPart.id,
                sourceShape: 'none',
                targetShape: 'triangle',
                color: 'blue',
              }
            });
          }
        }

        for (const train of railml.operationalTrainList) {
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

        for (const trainTour of railml.trainTours) {
          this.edges.push({
            data: {
              source: trainTour.from.id,
              target: trainTour.to.id,
              sourceShape: 'none',
              targetShape: 'triangle',
              color: 'red',
            }
          });
        }
        this.graph?.render();
      }, err => console.error('Error: ', err));
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
