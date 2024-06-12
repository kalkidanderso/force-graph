import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, inject } from '@angular/core';
import { Link, Node, Selection, Simulation, forceCenter } from 'd3';
import { Subject, takeUntil } from 'rxjs';
import { BreakpointService } from 'src/app/services/breakpoint.service';
import { ChartDataService } from 'src/app/services/chart-data.service';

@Component({
  selector: 'app-force-graph',
  templateUrl: './force-graph.component.html',
  styleUrl: './force-graph.component.scss',
})
export class ForceGraphComponent implements OnDestroy, AfterViewInit {
  @ViewChild('graphContainer') graphContainer!: ElementRef;
  private svg!: Selection<SVGSVGElement, unknown, null, undefined>;
  private simulation!: Simulation<Node, Link>;
  private componentDestroyed = new Subject<void>();

  private chartDataService = inject(ChartDataService);
  private breakpointService = inject(BreakpointService);

  ngAfterViewInit(): void {
    // Subscribing to persons2Subject to trigger graph initialization
    this.chartDataService.persons2Subject.pipe(takeUntil(this.componentDestroyed)).subscribe((persons) => {
      if (persons.length !== 0) {
        this.initializeGraph();
      }
    });

    // Subscribing to graphConfiguration to trigger graph initialization
    this.chartDataService.graphConfiguration.pipe(takeUntil(this.componentDestroyed)).subscribe((config) => {
      if (this.chartDataService.persons2Subject.value.length !== 0) {
        this.initializeGraph();
      }
    });

    // Subscribing to proportion for responsive adjustments
    this.breakpointService.proportion.pipe(takeUntil(this.componentDestroyed)).subscribe({
      next: () => {
        if (this.chartDataService.persons2Subject.value.length !== 0) {
          this.initializeGraph();
        }
      },
      error: (err) => {
        console.error('Error in breakpoint subscription:', err);
      },
    });
  }

  ngOnDestroy(): void {
    this.componentDestroyed.next(); // Signaling component destruction
    this.componentDestroyed.unsubscribe();
  }

  initializeGraph() {
    this.chartDataService
      .getChartData()
      .pipe(takeUntil(this.componentDestroyed))
      .subscribe({
        next: (data) => {
          this.createGraph(data);
        },
        error: (error) => {
          console.error('Error fetching chart data:', error);
        },
      });
  }

  /**
   * Creates the force-directed graph and initializes its state.
   * @param data The data containing nodes and links for the graph.
   */
  createGraph(data: { nodes: Node[]; links: Link[] }): void {
    const div: HTMLDivElement = this.graphContainer.nativeElement;
    const width: number = div.clientWidth;
    const height: number = div.clientHeight;
    const { svg, simulation } = this.chartDataService.createGraph(div, width, height, data);
    this.svg = svg;
    this.simulation = simulation;
    this.updateGraph();
  }

  /**
   * Updates the graph's viewBox to match the container's dimensions and applies the stiffness force.
   */
  updateGraph(): void {
    const div: HTMLDivElement = this.graphContainer.nativeElement;
    const width: number = div.clientWidth;
    const height: number = div.clientHeight;
    this.svg.attr('viewBox', `0 0 ${width} ${height}`);

    const stiffness = this.chartDataService.graphConfiguration.value.stiffnessGraph;
    this.simulation.force('center', forceCenter<Node>(width / 2, height / 2).strength(stiffness * 2));
    this.simulation.restart();
  }

  get persons() {
    return this.chartDataService.persons2Subject.getValue();
  }
}
