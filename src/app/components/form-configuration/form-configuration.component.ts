import { AfterViewInit, ChangeDetectorRef, Component, ViewChild, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Person2 } from 'src/app/interfaces';
import { PreferenceTable } from 'src/app/interfaces/preference-table.interface';
import { ChartDataService } from 'src/app/services/chart-data.service';
import { personQualities } from '../../data/constants';

@Component({
  selector: 'app-form-configuration',
  templateUrl: './form-configuration.component.html',
  styleUrls: ['./form-configuration.component.scss'],
})
export class FormConfigurationComponent implements AfterViewInit {
  @ViewChild(MatSort) sort: MatSort;
  displayedColumns: string[] = ['id', 'name', ...personQualities];
  dataSource: MatTableDataSource<Person2>;

  preferenceColumns: string[] = ['name', 'value', 'sign'];
  selectedSource: MatTableDataSource<PreferenceTable>;

  private fb = inject(FormBuilder);
  private chartDataService = inject(ChartDataService);

  selectedPerson: Person2;

  public initialPersonsNumber: number = 10;
  public personQualities: string[] = personQualities;

  public graphForm: FormGroup = this.fb.group({
    nodeGroupAmount: ['', [Validators.required, Validators.min(2), Validators.max(50)]],
    idPersonSelected: ['', [Validators.required]],
    personsDistanceProportion: ['', [Validators.required, Validators.min(0), Validators.max(5)]],
    attributesDistanceProportion: ['', [Validators.required, Validators.min(0), Validators.max(1)]],
    opacityAura: ['', [Validators.required, Validators.min(0), Validators.max(1)]],
    percentDefinedAttributes: ['', [Validators.required, Validators.min(10), Validators.max(100)]],
    strengthGraph: ['', [Validators.required, Validators.min(5), Validators.max(100)]],
    maxAuraRadio: ['', [Validators.required, Validators.min(20), Validators.max(250)]],
    valueAttributeNode: ['', [Validators.required, Validators.min(4), Validators.max(10)]],
    fullColorAttributeNodes: ['', [Validators.required]],
    showNames: ['', [Validators.required]],
    stiffnessGraph: ['', [Validators.required, Validators.min(0), Validators.max(10)]],
    clusterAffinity: ['', [Validators.required, Validators.min(0), Validators.max(1)]],
  });

  public attributesForm: FormGroup = this.fb.group({
    attributes: [[]],
  });

  public filterForm: FormGroup = this.fb.group({
    n: ['', [Validators.required, Validators.min(1)]],
    selectedAttributes: [[]],
  });

  editingCells: { [personId: number]: { [attribute: string]: boolean } } = {};
  private cdr: ChangeDetectorRef = inject(ChangeDetectorRef);
  editCellTimeout: any;

  constructor() {
    const attributesSelected = this.chartDataService.attributesSelected.value;
    this.attributesForm.patchValue({ attributes: attributesSelected });
    const percentDefinedAttributes = this.chartDataService.percentDefinedAttributes;

    this.chartDataService.addPerson(this.initialPersonsNumber, percentDefinedAttributes, attributesSelected);
    this.graphForm.get('nodeGroupAmount').setValue(this.initialPersonsNumber);
    this.graphForm.patchValue({ ...this.chartDataService.graphConfiguration.value });

    this.submitForm();
  }

  stopEventPropagation(event: Event) {
    event.stopPropagation();
  }

  get persons() {
    return this.chartDataService.persons2Subject.value;
  }

  ngAfterViewInit() {
    this.dataSource.sort = this.sort;
    this.selectedSource.sort = this.sort;
  }

  submitForm() {
    if (this.graphForm.invalid) return;
    const attributes = this.attributesForm.get('attributes').value as string[];
    if (attributes.length < 3) {
      return;
    }

    const {
      nodeGroupAmount,
      idPersonSelected,
      personsDistanceProportion,
      attributesDistanceProportion,
      opacityAura,
      percentDefinedAttributes,
      strengthGraph,
      maxAuraRadio,
      valueAttributeNode,
      fullColorAttributeNodes,
      showNames,
      stiffnessGraph,
      clusterAffinity,
    } = this.graphForm.value;

    this.chartDataService.addPerson(nodeGroupAmount, percentDefinedAttributes, attributes);

    this.chartDataService.graphConfiguration.next({
      idPersonSelected,
      personsDistanceProportion,
      attributesDistanceProportion,
      opacityAura,
      percentDefinedAttributes,
      strengthGraph,
      maxAuraRadio,
      valueAttributeNode,
      fullColorAttributeNodes,
      showNames,
      stiffnessGraph,
      clusterAffinity,
    });

    this.dataSource = new MatTableDataSource(this.persons);
    this.dataSource.sort = this.sort;

    const selectedPreferences: PreferenceTable[] = [];

    const selectedPerson = this.persons.find((p) => p.id === this.chartDataService.idPersonSelected);
    this.selectedPerson = selectedPerson;

    for (let i = 0; i < Object.keys(selectedPerson.preferences).length; i++) {
      selectedPreferences.push({
        name: Object.keys(selectedPerson.preferences)[i],
        value: selectedPerson.preferences[Object.keys(selectedPerson.preferences)[i]].value,
        sign: selectedPerson.preferences[Object.keys(selectedPerson.preferences)[i]].sign,
      });
    }

    this.selectedSource = new MatTableDataSource(selectedPreferences);
    this.selectedSource.sort = this.sort;
  }

  updateChart() {
    // Triggering re-rendering of the graph
    this.chartDataService.persons2Subject.next(this.persons);
  }

  editCell(person: Person2, attribute: string) {
    clearTimeout(this.editCellTimeout);
    this.editCellTimeout = setTimeout(() => {
      if (!this.editingCells[person.id]) {
        this.editingCells[person.id] = {};
      }
      this.editingCells[person.id][attribute] = true;
      this.cdr.detectChanges();
    }, 250);
  }

  saveCell(person: Person2, attribute: string) {
    this.editingCells[person.id][attribute] = false;
    this.chartDataService.updatePersonAttribute(person.id, attribute, person.attributes[attribute]);
    this.updateChart();
  }

  isEditing(person: Person2, attribute: string) {
    return this.editingCells[person.id] && this.editingCells[person.id][attribute];
  }

  // In form-configuration.component.ts
  filterPersons() {
    const n = this.filterForm.get('n').value;
    const selectedAttributes = this.filterForm.get('selectedAttributes').value;

    this.chartDataService.applyFilter(n, selectedAttributes);
  }
}
