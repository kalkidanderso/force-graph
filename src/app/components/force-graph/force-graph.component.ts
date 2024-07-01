import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, inject } from '@angular/core';
import * as d3 from 'd3';
import { Link, Node, Simulation } from 'd3';
import { Subject, debounceTime, takeUntil } from 'rxjs';
import { BreakpointService } from 'src/app/services/breakpoint.service';
import { ChartDataService } from 'src/app/services/chart-data.service';

@Component({
  selector: 'app-force-graph',
  templateUrl: './force-graph.component.html',
  styleUrls: ['./force-graph.component.scss'],
})
export class ForceGraphComponent implements OnDestroy, AfterViewInit {
  @ViewChild('graphContainer') graphContainer!: ElementRef;
  private svg!: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  private simulation!: Simulation<Node, Link>;
  private componentDestroyed = new Subject<void>();
  private initializeSubject = new Subject<void>();

  private chartDataService = inject(ChartDataService);
  private breakpointService = inject(BreakpointService);

  ngAfterViewInit(): void {
    this.initializeSubject.pipe(debounceTime(300), takeUntil(this.componentDestroyed)).subscribe(() => {
      this.initializeGraph();
    });

    // Subscribe to subjects to trigger graph initialization
    this.chartDataService.persons2Subject.pipe(takeUntil(this.componentDestroyed)).subscribe(() => {
      this.checkInitialization();
    });

    this.chartDataService.graphConfiguration.pipe(takeUntil(this.componentDestroyed)).subscribe(() => {
      this.checkInitialization();
    });

    this.breakpointService.proportion.pipe(takeUntil(this.componentDestroyed)).subscribe({
      next: () => {
        this.checkInitialization();
      },
      error: (err) => {
        console.error('Error in breakpoint subscription:', err);
      },
    });

    // Initial trigger for graph initialization
    this.initializeSubject.next();
  }

  ngOnDestroy(): void {
    this.componentDestroyed.next();
    this.componentDestroyed.complete();
  }

  private checkInitialization(): void {
    if (this.chartDataService.persons2Subject.value.length !== 0) {
      this.initializeSubject.next();
    }
  }

  private initializeGraph(): void {
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

  private createGraph(data: { nodes: Node[]; links: Link[] }): void {
    const div: HTMLDivElement = this.graphContainer.nativeElement;
    const width: number = div.clientWidth;
    const height: number = div.clientHeight;

    // Clear existing SVG content
    d3.select(div).selectAll('svg').remove();

    // Create new SVG and simulation
    const { svg, simulation } = this.chartDataService.createGraph(div, width, height, data);

    // Store references
    this.svg = svg;
    this.simulation = simulation;

    // Update the graph with initial data
    this.updateGraph(this.svg, this.simulation, data);
  }

  public updateGraph(svg: d3.Selection<SVGSVGElement, unknown, null, undefined>, simulation: Simulation<Node, Link>, newData: { nodes: Node[]; links: Link[] }): void {
    // Create indirect connections
    const indirectConnections = this.chartDataService.createIndirectConnections();

    // Update nodes
    let node = svg.selectAll('.node').data(newData.nodes, (d) => d.id as string);

    node.exit().remove();

    const nodeEnter = node.enter().append('g').attr('class', 'node');

    // Add circles to nodes
    nodeEnter
      .append('circle')
      .attr('r', (d) => d.value * 2)
      .attr('fill', (d) => (d.id === 'selected' ? 'red' : 'none'));

    // Add text to nodes
    nodeEnter
      .append('text')
      .attr('dx', 12)
      .attr('dy', '.35em')
      .text((d) => d.id);

    node = nodeEnter.merge(node);

    // Update links
    let link = svg.selectAll('.link').data(indirectConnections, (d) => `${d.source}-${d.target}`);

    link.exit().remove();

    const linkEnter = link.enter().append('line').attr('class', 'link');

    link = linkEnter.merge(link);

    // Update simulation with custom force for resting edge length
    simulation.nodes(newData.nodes);
    simulation.force(
      'link',
      d3.forceLink(indirectConnections).distance((d: any) =>
        this.chartDataService.calculateRestingEdgeLength(
          newData.nodes.find((node) => node.id === d.source),
          newData.nodes.find((node) => node.id === d.target),
        ),
      ),
    );

    simulation.alpha(1).restart();
  }

  get persons() {
    return this.chartDataService.persons2Subject.getValue();
  }
}
