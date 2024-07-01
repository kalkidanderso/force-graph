import { Injectable, inject } from '@angular/core';
import { BaseType, Link, Node, Selection, Simulation, drag, forceCenter, forceCollide, forceLink, forceManyBody, forceSimulation, select } from 'd3';
import { forceCluster } from 'd3-force-cluster';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { CHART_OPTIONS } from '../data/chart-options';
import { personNames, personQualities } from '../data/constants';
import { NodeType } from '../enums';
import { GraphConfiguration, Person2 } from '../interfaces';
import { BreakpointService } from './breakpoint.service';
import { UtilsService } from './utils.service';

@Injectable({
  providedIn: 'root',
})
export class ChartDataService {
  private US = inject(UtilsService);

  private persons2Shown: Person2[] = [];
  private persons2Created: Person2[] = [];
  public persons2Subject: BehaviorSubject<Person2[]> = new BehaviorSubject<Person2[]>([]);

  private breakpointService = inject(BreakpointService);
  public proportion = 1;

  private rangeAttributes = 10;
  private rangeWeight = 5;
  private auraReduced = 8;
  private distanceProportion = 1;

  public attributesSelected: BehaviorSubject<string[]> = new BehaviorSubject<string[]>(personQualities);

  public graphConfiguration: BehaviorSubject<GraphConfiguration> = new BehaviorSubject<GraphConfiguration>({
    idPersonSelected: 0,
    /**
     * From 0 to 4
     */
    personsDistanceProportion: 2.5,
    /**
     * From 0 to 1
     */
    attributesDistanceProportion: 0.7,
    /**
     * From 0 to 1
     */
    opacityAura: 1,
    /**
     * From 10 to 100,
     */
    percentDefinedAttributes: 70,
    /**
     * From 5 to 100,
     */
    strengthGraph: 30,
    /**
     * From 5 to 250,
     */
    maxAuraRadio: 200,
    /**
     * From 4 to 10,
     */
    valueAttributeNode: 4,
    fullColorAttributeNodes: true,
    showNames: true,

    stiffnessGraph: 1,
    clusterAffinity: 0.5,
  });

  get idPersonSelected() {
    return this.graphConfiguration.value.idPersonSelected;
  }
  get personsDistanceProportion() {
    return this.graphConfiguration.value.personsDistanceProportion;
  }
  get attributesDistanceProportion() {
    return this.graphConfiguration.value.attributesDistanceProportion;
  }
  get opacityAura() {
    return this.graphConfiguration.value.opacityAura;
  }
  get percentDefinedAttributes() {
    return this.graphConfiguration.value.percentDefinedAttributes;
  }
  get strengthGraph() {
    return this.graphConfiguration.value.strengthGraph;
  }
  get maxAuraRadio() {
    return this.graphConfiguration.value.maxAuraRadio;
  }
  get valueAttributeNode() {
    return this.graphConfiguration.value.valueAttributeNode;
  }
  get fullColorAttributeNodes() {
    return this.graphConfiguration.value.fullColorAttributeNodes;
  }
  get showNames() {
    return this.graphConfiguration.value.showNames;
  }
  get stiffnessGraph() {
    return this.graphConfiguration.value.stiffnessGraph;
  }
  get clusterAffinity() {
    return this.graphConfiguration.value.clusterAffinity;
  }

  addPerson(nodeGroupAmount: number = 2, percentDefinedAttributes: number = 100, attributesList: string[]) {
    const newNumberPersons = Math.floor(nodeGroupAmount);
    const currentNumberPersons = this.persons2Created.length;

    if (newNumberPersons < 2) return;

    const differenceNumber = newNumberPersons - currentNumberPersons;
    const sameAttributes = this.US.arraysHaveSameElements(attributesList, this.attributesSelected.value);
    if (!sameAttributes) {
      // console.log('new');
      const newPersons = this.loopCreatePersons(newNumberPersons, percentDefinedAttributes, attributesList, true);
      this.attributesSelected.next(attributesList);
      this.persons2Created = newPersons;
      this.persons2Shown = this.persons2Created;
    } else if (percentDefinedAttributes !== this.percentDefinedAttributes) {
      // console.log('new');
      const newPersons = this.loopCreatePersons(newNumberPersons, percentDefinedAttributes, attributesList, true);
      this.persons2Created = newPersons;
      this.persons2Shown = this.persons2Created;
    } else if (differenceNumber === 0) {
      // console.log('slice');
      this.persons2Shown = this.persons2Created.slice(0, newNumberPersons);
    } else if (differenceNumber > 0) {
      // console.log('add');
      const newPersons = this.loopCreatePersons(differenceNumber, this.percentDefinedAttributes, attributesList, false);
      this.persons2Created = [...this.persons2Created, ...newPersons];
      this.persons2Shown = this.persons2Created;
    } else {
      // console.log('else');
      this.persons2Shown = this.persons2Created.slice(0, newNumberPersons);
    }

    this.persons2Subject.next(this.persons2Shown);
  }

  loopCreatePersons(number: number, percentDefinedAttributes: number, attributesList: string[], isNew: boolean) {
    const persons2Created: Person2[] = [];

    let counterId = isNew ? 0 : this.persons2Created.length;

    for (let i = 0; i < number; i++) {
      const name: string = personNames[this.US.randomNumber(personNames.length, false)] + ` (${this.US.randomNumber(10) + 18})`;
      const id = counterId;

      const attributes = {};
      const preferences = {};

      for (let j = 0; j < attributesList.length; j++) {
        const attributeName = attributesList[j];
        if (this.US.randomBoolean(percentDefinedAttributes)) {
          attributes[attributeName] = this.US.randomNumber(this.rangeAttributes);
        }
        preferences[attributeName] = {
          value: this.US.randomNumber(this.rangeAttributes),
          sign: this.US.randomSign(),
          weight: this.US.randomNumber(this.rangeWeight),
        };
      }

      const personalAuraRadio = (this.maxAuraRadio * Object.keys(attributes).length) / attributesList.length;

      persons2Created.push({
        id,
        name,
        attributes,
        preferences,
        personalAuraRadio,
      });

      counterId += 1;
    }

    return persons2Created;
  }

  constructor() {
    this.proportion = this.breakpointService.proportion.getValue();
  }

  /**
   * Filters the list of persons based on the provided criteria:
   * Only persons with at least 'n' matching attributes from the 'selectedAttributes'
   * array will be included in the filtered results.
   *
   * @param n The minimum number of matching attributes required for a person to be included.
   * @param selectedAttributes An array of attribute names to filter by.
   */

  applyFilter(n: number, selectedAttributes: string[]) {
    this.persons2Shown = this.persons2Created.filter((person) => {
      const matchingAttributesCount = Object.keys(person.attributes).filter((attribute) => selectedAttributes.includes(attribute)).length;

      return matchingAttributesCount >= n;
    });

    this.persons2Subject.next(this.persons2Shown);
  }

  // Implementing indirect connections
  createIndirectConnections() {
    const connections = [];
    const persons = this.persons2Subject.value;
    persons.forEach((person) => {
      Object.keys(person.attributes).forEach((attribute) => {
        const connectedPeople = persons.filter((p) => Object.keys(p.attributes).includes(attribute));
        connectedPeople.forEach((connectedPerson) => {
          if (person.id !== connectedPerson.id) {
            connections.push({
              source: person.id,
              target: connectedPerson.id,
              attribute: attribute,
            });
          }
        });
      });
    });
    return connections;
  }

  // Implementing resting edge length calculation
  calculateRestingEdgeLength(personA: Person2, personB: Person2): number {
    let similarityScore = 0;
    let sharedAttributes = 0;
    Object.keys(personA.attributes).forEach((attribute) => {
      if (personB.attributes[attribute] !== undefined) {
        const diff = Math.abs(personA.attributes[attribute] - personB.attributes[attribute]);
        similarityScore += (10 - diff) / 10;
        sharedAttributes++;
      }
    });
    return (1 - similarityScore / (sharedAttributes || 1)) * this.maxAuraRadio * this.proportion;
  }

  /**
   * Generate Chart Data
   * @returns nodes and links using the persons data from the BehaviorSubject
   */

  public getChartData(): Observable<{ nodes: Node[]; links: Link[] }> {
    const nodes: Node[] = [];
    const links: Link[] = [];

    // Get the selected person and other persons
    const selectedPerson = this.persons2Shown.find((p) => p.id === this.idPersonSelected);
    const otherPersons = this.persons2Shown.filter((p) => p.id !== this.idPersonSelected);

    // Adding the selected person node
    nodes.push({
      id: selectedPerson.id.toString(),
      name: this.showNames ? selectedPerson.name : '',
      color: `rgb(255, 0, 166, ${this.opacityAura})`,
      fullColor: false,
      colorAura: `rgb(255, 0, 166, ${this.opacityAura})`,
      value: this.maxAuraRadio * this.proportion,
      personId: undefined,
      type: NodeType.PERSON,
    });

    // Processing selected person's attributes
    for (const attribute in selectedPerson.attributes) {
      if (selectedPerson.attributes.hasOwnProperty(attribute)) {
        const attributeValue = selectedPerson.attributes[attribute];
        const attributeNode: Node = {
          id: `${selectedPerson.id}_${attribute}`,
          name: this.showNames ? attribute : '',
          value: this.valueAttributeNode * this.proportion,
          color: this.getAttributeColor(attributeValue, this.rangeAttributes),
          colorAura: this.getAttributeColor(attributeValue, this.rangeAttributes),
          fullColor: this.fullColorAttributeNodes,
          personId: selectedPerson.id,
          type: NodeType.ATTRIBUTE,
        };
        nodes.push(attributeNode);

        // Link between selected person and attribute
        links.push({
          source: selectedPerson.id.toString(),
          target: attributeNode.id,
          light: false,
          distance: this.calculateAttributeDistance(attributeValue),
        });
      }
    }

    // Processing other persons
    for (const person of otherPersons) {
      // Add person node
      nodes.push({
        id: person.id.toString(),
        name: this.showNames ? person.name : '',
        color: 'rgb(100, 100, 100)',
        fullColor: false,
        colorAura: 'rgb(100, 100, 100)',
        value: (this.maxAuraRadio / 2) * this.proportion,
        personId: undefined,
        type: NodeType.PERSON,
      });

      // Processing person's attributes
      for (const attribute in person.attributes) {
        if (person.attributes.hasOwnProperty(attribute)) {
          const attributeValue = person.attributes[attribute];
          const attributeNode: Node = {
            id: `${person.id}_${attribute}`,
            name: this.showNames ? attribute : '',
            value: this.valueAttributeNode * this.proportion,
            color: this.getAttributeColor(attributeValue, this.rangeAttributes),
            colorAura: this.getAttributeColor(attributeValue, this.rangeAttributes),
            fullColor: this.fullColorAttributeNodes,
            personId: person.id,
            type: NodeType.ATTRIBUTE,
          };
          nodes.push(attributeNode);

          // Link between person and attribute
          links.push({
            source: person.id.toString(),
            target: attributeNode.id,
            light: false,
            distance: this.calculateAttributeDistance(attributeValue),
          });
        }
      }
    }

    // Creating links between similar attributes
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const node1 = nodes[i];
        const node2 = nodes[j];
        if (node1.type === NodeType.ATTRIBUTE && node2.type === NodeType.ATTRIBUTE && node1.name === node2.name) {
          links.push({
            source: node1.id,
            target: node2.id,
            light: false,
            distance: this.attributesDistanceProportion * this.maxAuraRadio * this.proportion,
          });
        }
      }
    }

    return of({ nodes, links });
  }

  private calculateAttributeDistance(attributeValue: number): number {
    // Calculating distance based on attribute value
    const normalizedValue = attributeValue / this.rangeAttributes;
    return normalizedValue * this.maxAuraRadio * this.proportion;
  }

  private getAttributeColor(value: number, maxValue: number): string {
    // Generating a color based on the attribute value
    const hue = (value / maxValue) * 120; // 0 to 120 degrees (red to green)
    return `hsl(${hue}, 100%, 50%)`;
  }

  /**
   * Create Graph & Adjust SVG Height,Width & View Box
   */

  public createGraph(
    div: HTMLDivElement,
    width: number,
    height: number,
    data: { nodes: Node[]; links: Link[] },
  ): { svg: Selection<SVGSVGElement, unknown, null, undefined>; simulation: Simulation<Node, Link> } {
    // Removing any existing SVG elements
    select('svg').remove();
    select(div).selectAll('svg').remove();

    // Creating the main SVG element
    const svg = select(div).append('svg').attr('viewBox', `0 0 ${width} ${height}`).attr('preserveAspectRatio', 'xMidYMid meet');

    // Defining the marker for the "light" at the end of the link
    svg
      .append('defs')
      .append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 18)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', 'white');

    // Adding the link elements with highlighting and "light"
    const link: Selection<SVGLineElement, Link, BaseType, unknown> = svg
      .append('g')
      .attr('stroke', CHART_OPTIONS.linkColor)
      .attr('stroke-opacity', 1)
      .selectAll('line')
      .data(data.links)
      .join('line')
      .attr('class', 'links')
      .attr('pointer-events', 'all')
      .attr('marker-end', 'url(#arrowhead)');

    // Adding the node groups with highlighting and drag behavior
    const node: Selection<SVGGElement, Node, BaseType, unknown> = svg
      .append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(data.nodes)
      .enter()
      .append('g')
      .on('mouseover', (event, d) => {
        link.style('stroke-opacity', (l) => (l.source.id === d.id || l.target.id === d.id ? 1 : 0.1));
        text.filter((t) => t.id === d.id || t.personId === d.id).style('fill', 'white');
      })
      .on('mouseout', () => {
        link.style('stroke-opacity', 1);
        text.filter((t) => t.type === NodeType.ATTRIBUTE).style('fill', 'transparent');
      })
      .call(
        drag()
          .on('start', (e, d) => {
            this.dragStart(e, d, simulation);
          })
          .on('drag', (e, d) => {
            this.drag(e, d, simulation);
          })
          .on('end', (e, d) => {
            this.dragEnd(e, d, simulation);
          }),
      );

    // Appending circles to represent the nodes
    const circles: Selection<SVGCircleElement, Node, BaseType, unknown> = node.append('g').style('cursor', 'pointer');

    circles
      .append('circle')
      .attr('r', (d) => d.value)
      .style('fill', (d) => (d.fullColor ? d.color : 'transparent'));

    // Adding gradients for visual effects
    const gradient: Selection<SVGStopElement, unknown, BaseType, unknown> = circles
      .append('radialGradient')
      .attr('id', (d, i) => (d.fullColor ? `glare-gradient-${i}` : ''))
      .attr('cx', '70%')
      .attr('cy', '70%')
      .attr('r', '80%');

    gradient.append('stop').attr('offset', '0%').style('stop-color', CHART_OPTIONS.gradientColor).style('stop-opacity', 1);

    gradient.append('stop').attr('offset', '100%').style('stop-color', CHART_OPTIONS.gradientShade);

    const gradientOut: Selection<SVGStopElement, unknown, BaseType, unknown> = circles
      .append('radialGradient')
      .attr('id', (d, i) => (d.fullColor ? '' : `gradient-out-${i}`))
      .attr('cx', '50%')
      .attr('cy', '50%')
      .attr('r', '50%');

    gradientOut
      .append('stop')
      .attr('offset', '0%')
      .style('stop-color', (n) => n.colorAura)
      .style('stop-opacity', 1);

    gradientOut.append('stop').attr('offset', '100%').style('stop-color', 'transparent');

    circles
      .append('circle')
      .attr('r', (d) => d.value)
      .attr('x', 0)
      .attr('y', 0)
      .style('fill', (d, i) => `url(#glare-gradient-${i})`);

    circles
      .append('circle')
      .attr('r', (d) => d.value)
      .attr('x', 0)
      .attr('y', 0)
      .style('fill', (d, i) => `url(#gradient-out-${i})`);

    // Adding text labels to the nodes
    const text = circles
      .append('text')
      .style('fill', (n) => `${n.type === NodeType.PERSON ? 'white' : 'transparent'}`)
      .text((n) => `${this.showNames ? n.name : ''} ${n.counter ? '(' + n.counter + ')' : ''}`)
      .attr('x', 12)
      .attr('y', 3)
      .style('font-size', '12px');

    svg.select('#light-gradient').attr('refX', 5);

    // Initializing the force simulation
    const clusterForce = forceCluster<Node>().strength(this.clusterAffinity);
    const simulation = forceSimulation(data.nodes)
      .force(
        'link',
        forceLink<Node, Link>(data.links)
          .id((d) => d.id)
          .distance((d) => d.distance)
          .strength(1),
      )
      .force('charge', forceManyBody<Node>().strength(-this.strengthGraph * 1.5))
      .force(
        'link',
        forceLink<Node, Link>(data.links)
          .id((d) => d.id)
          .distance((d) => d.distance)
          .strength((d) => (d.light ? 0.1 : 1)), // Weaker strength for indirect connections
      )
      .force('cluster', clusterForce.strength(this.clusterAffinity * 1.2))
      .force('stiffness', forceManyBody<Node>().strength(-this.stiffnessGraph * 0.8))
      .force(
        'collide',
        forceCollide<Node>().radius((d) => d.value * this.clusterAffinity),
      )
      .force('center', forceCenter(width / 2, height / 2))
      .force('attribute', this.createAttributeForce(data.nodes, data.links))
      .on('tick', () => {
        // Updating node and link positions on each tick of the simulation
        node.attr('transform', (n) => {
          n.x = Math.max(0, Math.min(width, n.x));
          n.y = Math.max(0, Math.min(height, n.y));
          return 'translate(' + n.x + ',' + n.y + ')';
        });
        link
          .attr('x1', (l) => l.source.x)
          .attr('y1', (l) => l.source.y)
          .attr('x2', (l) => l.target.x)
          .attr('y2', (l) => l.target.y);
      });

    // Fixing the initial positions of the nodes
    simulation.nodes().forEach((n) => {
      node.fx = n.x;
      node.fy = n.y;
    });

    return { svg, simulation };
  }

  private createAttributeForce(nodes: Node[], links: Link[]): (alpha: number) => void {
    return (alpha: number) => {
      for (const node of nodes) {
        if (node.type === NodeType.PERSON) {
          let fx = 0,
            fy = 0,
            count = 0;
          for (const link of links) {
            if (link.source === node || link.target === node) {
              const other = link.source === node ? link.target : link.source;
              if (other.type === NodeType.ATTRIBUTE) {
                fx += other.x;
                fy += other.y;
                count++;
              }
            }
          }
          if (count > 0) {
            node.vx += (fx / count - node.x) * alpha * 0.1;
            node.vy += (fy / count - node.y) * alpha * 0.1;
          }
        }
      }
    };
  }
  private dragStart(e: DragEvent, d: Node, simulation) {
    simulation.alphaTarget(0.05).restart();
    d.fx = d.x;
    d.fy = d.y;
  }

  private drag(e: DragEvent, d: Node, simulation) {
    d.fx = e.x;
    d.fy = e.y;
  }

  private dragEnd(e: DragEvent, d: Node, simulation) {
    simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
  }

  getNodeRadiusValue(counter: number) {
    return counter * 5 + 5;
  }

  updatePersonAttribute(personId: number, attribute: string, newValue: number) {
    const personIndex = this.persons2Created.findIndex((p) => p.id === personId);
    if (personIndex !== -1) {
      this.persons2Created[personIndex].attributes[attribute] = newValue;
      this.persons2Subject.next(this.persons2Created); // Triggering re-rendering
    }
  }
}
