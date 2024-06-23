import { Injectable, inject } from '@angular/core';
import { BaseType, Link, Node, Selection, Simulation, drag, forceCenter, forceCollide, forceLink, forceManyBody, forceSimulation, select } from 'd3';
import { forceCluster } from 'd3-force-cluster';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { CHART_OPTIONS } from '../data/chart-options';
import { personNames, personQualities } from '../data/constants';
import { NodeType, Sign } from '../enums';
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
    clusterAffinity: 0.5, // Default cluster affinity
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

  /**
   * Generate Chart Data
   * @returns nodes and links using the persons data from the BehaviorSubject
   */

  public getChartData(): Observable<{ nodes: Node[]; links: Link[] }> {
    const nodes: Node[] = [];
    const links: Link[] = [];

    const person = this.persons2Shown.find((p) => p.id === this.idPersonSelected);
    const personsNotSelected = this.persons2Shown.filter((p) => p.id !== this.idPersonSelected);

    const relationsData = {};
    const selectedData = {
      id: person.id,
      name: person.name,
      attributes: {},
    };

    for (let a = 0; a < personsNotSelected.length; a++) {
      relationsData[personsNotSelected[a].id] = {};
    }

    for (let i = 0; i < personsNotSelected.length; i++) {
      for (const attribute of personQualities) {
        if (personsNotSelected[i].attributes[attribute]) {
          const sign: Sign = person.preferences[attribute].sign;

          let attraction: number = 0;

          const preferenceValue: number = person.preferences[attribute].value;
          const attributevalue: number = personsNotSelected[i].attributes[attribute];

          const isGreater: boolean = preferenceValue < attributevalue;
          const isLesser: boolean = preferenceValue > attributevalue;
          const isExact: boolean = preferenceValue === attributevalue;

          if (sign === Sign.GREATER && isGreater) {
            attraction = person.preferences[attribute].weight;
            relationsData[personsNotSelected[i].id][attribute] = attraction;
          } else if (sign === Sign.LESSER && isLesser) {
            attraction = person.preferences[attribute].weight;
            relationsData[personsNotSelected[i].id][attribute] = attraction;
          } else if (sign === Sign.EXACT && isExact) {
            attraction = person.preferences[attribute].weight;
            relationsData[personsNotSelected[i].id][attribute] = attraction;
          } else {
            relationsData[personsNotSelected[i].id][attribute] = 0;
          }

          if (sign === Sign.CLOSER) {
            const separationUnt: number = person.preferences[attribute].weight / (this.rangeAttributes - 1);

            const distanceInt: number = preferenceValue - attributevalue;

            const distanceDouble: number = Math.abs(distanceInt) * separationUnt;

            attraction = Math.floor((person.preferences[attribute].weight - distanceDouble) * 100) / 100;

            relationsData[personsNotSelected[i].id][attribute] = attraction;
          }

          if (selectedData.attributes[attribute]) {
            selectedData.attributes[attribute] += attraction;
          } else {
            selectedData.attributes[attribute] = attraction;
          }
        } else {
          relationsData[personsNotSelected[i].id][attribute] = 0;
          if (!selectedData.attributes[attribute]) {
            selectedData.attributes[attribute] = 0;
          }
        }
      }
    }

    const linksRelationsAttributes: Link[] = [];
    const nodesAttributes: Node[] = [];
    let maxDistanceRelations: number = 0;

    for (const idPerson in relationsData) {
      if (Object.prototype.hasOwnProperty.call(relationsData, idPerson)) {
        let maxDistanceAttributePerson: number = 0;
        let minDistanceAttributePerson: number = 1000;

        for (const attribute in relationsData[idPerson]) {
          if (Object.prototype.hasOwnProperty.call(relationsData[idPerson], attribute)) {
            const distance = relationsData[idPerson][attribute] * 10 + this.maxAuraRadio / this.auraReduced;

            linksRelationsAttributes.push({
              source: idPerson,
              target: `${idPerson}_${attribute}`,
              light: false,
              distance: distance,
            });

            if (distance > maxDistanceRelations) maxDistanceRelations = distance;

            if (relationsData[idPerson][attribute] > maxDistanceAttributePerson) maxDistanceAttributePerson = relationsData[idPerson][attribute];
            if (relationsData[idPerson][attribute] < minDistanceAttributePerson) minDistanceAttributePerson = relationsData[idPerson][attribute];
          }
        }

        for (const attribute in relationsData[idPerson]) {
          if (Object.prototype.hasOwnProperty.call(relationsData[idPerson], attribute)) {
            nodesAttributes.push({
              id: `${idPerson}_${attribute}`,
              name: attribute,
              value: this.valueAttributeNode * this.proportion,
              color: this.US.getColorAttributeNode(relationsData[idPerson][attribute], maxDistanceAttributePerson, minDistanceAttributePerson, 1),
              colorAura: this.US.getColorAttributeNode(relationsData[idPerson][attribute], maxDistanceAttributePerson, minDistanceAttributePerson, 1),
              fullColor: this.fullColorAttributeNodes,
              personId: idPerson,
            });
          }
        }

        // Adding links between similar attributes/preferences
        for (const attribute1 of personQualities) {
          for (const attribute2 of personQualities) {
            if (attribute1 !== attribute2) {
              links.push({
                source: attribute1,
                target: attribute2,
                light: false,
                distance: this.attributesDistanceProportion * this.maxAuraRadio * this.proportion,
              });
            }
          }
        }
      }
    }

    // Linking the same attributes/preferences
    for (const attribute of personQualities) {
      const attributeNodes = nodesAttributes.filter((node) => node.name === attribute);
      for (let i = 0; i < attributeNodes.length - 1; i++) {
        for (let j = i + 1; j < attributeNodes.length; j++) {
          links.push({
            source: attributeNodes[i].id,
            target: attributeNodes[j].id,
            light: false,
            distance: this.attributesDistanceProportion * this.maxAuraRadio * this.proportion,
          });
        }
      }
    }

    nodes.push({
      id: selectedData.id,
      name: selectedData.name,
      color: `rgb(255, 0, 166, ${this.opacityAura})`,
      fullColor: false,
      colorAura: `rgb(255, 0, 166, ${this.opacityAura})`,
      value: this.maxAuraRadio * this.proportion,
      personId: undefined,
      type: NodeType.PERSON,
    });

    const linksSelectedAttributes: Link[] = [];
    let maxDistanceSelected: number = 0;
    let minDistanceSelected: number = 1000;

    for (const key in selectedData.attributes) {
      if (Object.prototype.hasOwnProperty.call(selectedData.attributes, key)) {
        const distance = selectedData.attributes[key] * 10 + this.maxAuraRadio / this.auraReduced;

        linksSelectedAttributes.push({
          source: key,
          target: selectedData.id,
          light: false,
          distance: distance,
        });

        if (distance > maxDistanceSelected) maxDistanceSelected = distance;
        if (distance < minDistanceSelected) minDistanceSelected = distance;
      }
    }

    for (let i = 0; i < linksSelectedAttributes.length; i++) {
      links.push({
        ...linksSelectedAttributes[i],
        distance: ((linksSelectedAttributes[i].distance * this.maxAuraRadio * this.attributesDistanceProportion) / maxDistanceSelected) * this.proportion,
      });
    }

    for (const key in selectedData.attributes) {
      if (Object.prototype.hasOwnProperty.call(selectedData.attributes, key)) {
        const distance = selectedData.attributes[key] * 10 + this.maxAuraRadio / this.auraReduced;

        nodes.push({
          id: key,
          name: key,
          value: this.valueAttributeNode * this.proportion,
          color: this.US.getColorAttributeNode(distance, maxDistanceSelected, minDistanceSelected, 1, true),
          colorAura: this.US.getColorAttributeNode(distance, maxDistanceSelected, minDistanceSelected, 1, true),
          fullColor: this.fullColorAttributeNodes,
          personId: selectedData.id,
          type: NodeType.ATTRIBUTE,
        });
      }
    }

    // nodes others attributes
    for (let i = 0; i < nodesAttributes.length; i++) {
      nodes.push({
        ...nodesAttributes[i],
        type: NodeType.ATTRIBUTE,
      });
    }

    return of({ nodes, links });
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
          .distance((d) => d.distance * this.distanceProportion),
      )
      .force('charge', forceManyBody<Node>().strength(-this.strengthGraph))
      .force('cluster', clusterForce)
      .force('stiffness', forceManyBody<Node>().strength(-this.stiffnessGraph))
      .force(
        'collide',
        forceCollide<Node>().radius((d) => d.value * this.clusterAffinity),
      )
      .force('center', forceCenter(width / 2, height / 2))
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
