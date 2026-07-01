/*
 * SPDX-License-Identifier: EUPL-1.2
 * Copyright: 2026 Regione Marche
 */
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ItButtonDirective, ItCardComponent, ItCheckboxComponent, ItIconComponent, ItInputComponent, ItListComponent, ItListItemComponent, ItPaginationComponent, ItSpinnerComponent } from 'design-angular-kit';
import { finalize } from 'rxjs';
import { HttpCacheService } from 'src/app/core/cache/http-cache.service';
import { environment } from 'src/environments/environment';
import {
  AnalogDto,
  AnalogVisibilityUpdateRequest,
  StationDto,
  StationUpdateRequest,
  StationVisibilityUpdateRequest
} from '../../generated';
import { CoreHubService } from 'src/app/core/services/core-hub.service';

@Component({
    selector: 'app-admin-page',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink, ItCardComponent, ItListComponent, ItListItemComponent, ItButtonDirective, ItIconComponent, ItInputComponent, ItSpinnerComponent, ItCheckboxComponent, ItPaginationComponent],
    templateUrl: './admin-page.component.html',
    styleUrl: './admin-page.component.css'
})
export class AdminPageComponent implements OnInit {
  stations: StationDto[] = [];

  editingStationCode: number | null = null;
  editingNoteValue: string = '';
  loadingStations: boolean = false;
  uploadingStationCode: number | null = null;
  defaultImageUrl: string = 'assets/station_default.png';
  localPhotoCache: Map<number, string> = new Map();
  currentPage: number = 1;
  pageSize: number = 10;

  private _searchText: string = '';
  get searchText(): string { return this._searchText; }
  set searchText(value: string) {
    this._searchText = value;
    this.currentPage = 1;
  }

  private _visibilityFilter: 'all' | 'visible' | 'hidden' = 'all';
  get visibilityFilter(): 'all' | 'visible' | 'hidden' { return this._visibilityFilter; }
  set visibilityFilter(value: 'all' | 'visible' | 'hidden') {
    this._visibilityFilter = value;
    this.currentPage = 1;
  }

  get paginatedStations(): StationDto[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredStations.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredStations.length / this.pageSize);
  }

  onPageChange(pageIndex: number) {
    this.currentPage = pageIndex + 1;
  }


  get filteredStations(): StationDto[] {
    let result = this.stations;

    // Filtro testo
    if (this.searchText) {
      const lowerSearch = this.searchText.toLowerCase();
      result = result.filter(s => 
        s.name?.toLowerCase().includes(lowerSearch)
      );
    }

    // Filtro visibilità
    if (this.visibilityFilter === 'visible') {
      result = result.filter(s => !!s.stationVisibility?.visible);
    } else if (this.visibilityFilter === 'hidden') {
      result = result.filter(s => !s.stationVisibility?.visible);
    }

    return result;
  }

  constructor(
    private hub: CoreHubService,
    private cacheService: HttpCacheService
  ) {}

  ngOnInit(): void {
    this.reload();
  }

  reload() {
  this.loadingStations = true;
  this.hub.station.getApiStations()
    .pipe(
      finalize(() => this.loadingStations = false)
    )
    .subscribe({
      next: (s) => this.stations = s,
      error: (err) => console.error('Errore nel caricamento stazioni', err)
    });
}

  startEdit(s: StationDto) {
    this.editingStationCode = s.code ?? null;
    this.editingNoteValue = s.note ?? '';
  }

  cancelEdit() {
    this.editingStationCode = null;
    this.editingNoteValue = '';
  }

  saveNote(s: StationDto) {
    if (s.code === undefined) return;

    const request: StationUpdateRequest = {
      name: s.name ?? '',
      municipality: s.municipality ?? '',
      province: s.province ?? '',
      latitude: s.latitude ?? '',
      longitude: s.longitude ?? '',
      altitude: s.altitude ?? '',
      river: s.river,
      basin: s.basin,
      subBasin: s.subBasin,
      imageName: s.imageName,
      note: this.editingNoteValue
    };

    this.hub.station.putApiStationsProfile(s.code, request).subscribe(() => {
      s.note = this.editingNoteValue;
      this.editingStationCode = null;
    });
  }

  toggleVisibility(s: StationDto) {
    if (s.code === undefined) return;
    const currentVisible = !!s.stationVisibility?.visible;
    const nextVisible = !currentVisible;

    const request: StationVisibilityUpdateRequest = {
      visible: nextVisible
    };

    this.hub.station.putApiStationsVisibility(s.code, request).subscribe({
      next: () => {
        this.cacheService.clear();
        if (!s.stationVisibility) {
          s.stationVisibility = { stationCode: s.code, visible: nextVisible };
        } else {
          s.stationVisibility.visible = nextVisible;
        }
      },
      error: (err) => {
        console.error('Errore nel cambio visibilità stazione', err);
        if (s.stationVisibility) {
          s.stationVisibility.visible = currentVisible;
        }
      }
    });
  }

  getStandardAnalogs(s: StationDto): AnalogDto[] {
    return (s.analogs ?? [])
      .filter(a => a.sensorType !== undefined && environment.standardSensors.includes(a.sensorType))
      .sort((a, b) => environment.standardSensors.indexOf(a.sensorType!) - environment.standardSensors.indexOf(b.sensorType!));
  }

  getAnalogName(a: AnalogDto): string {
    const labels = (environment as any).sensorLabels || {};
    return labels[a.sensorType!] ?? a.description ?? `Sens ${a.sensorType}`;
  }

  toggleAnalogVisibility(s: StationDto, a: AnalogDto) {
    if (s.code === undefined || a.analogVisibility?.analogId === undefined) return;

    const currentVisible = !!a.analogVisibility?.visible;
    const nextVisible = !currentVisible;

    const request: AnalogVisibilityUpdateRequest = {
      visible: nextVisible
    };

    this.hub.station.putApiStationsAnalogsVisibility(a.analogVisibility.analogId, s.code, request).subscribe({
      next: () => {
        this.cacheService.clear();
        if (a.analogVisibility) {
          a.analogVisibility.visible = nextVisible;
        }
      },
      error: (err) => {
        console.error('Errore nel cambio visibilità sensore', err);
        if (a.analogVisibility) {
          a.analogVisibility.visible = currentVisible;
        }
      }
    });
  }

  getStationImageUrl(s: StationDto): string {
    if (s.code !== undefined && this.localPhotoCache.has(s.code)) {
      return this.localPhotoCache.get(s.code)!;
    }
    
    const photoData = s.stationPhoto?.photo as any;
    if (typeof photoData === 'string' && photoData.length > 50) {
      return 'data:image/png;base64,' + photoData;
    }

    return this.defaultImageUrl;
  }

  triggerFileUpload(code: number | undefined) {
    if (code === undefined) return;
    const input = document.getElementById('photo-input-' + code) as HTMLInputElement;
    if (input) {
      input.click();
    }
  }

  onFileSelected(event: any, s: StationDto) {
    const file: File = event.target.files[0];
    if (file && s.code !== undefined) {
      this.uploadingStationCode = s.code;
      const reader = new FileReader();
      reader.onload = (e: any) => {
          const base64 = e.target.result.split(',')[1];
          const request = { photo: base64 as any };
          
          this.hub.station.putApiStationsPhoto(s.code!, request)
            .pipe(finalize(() => this.uploadingStationCode = null))
            .subscribe({
              next: () => {
                this.localPhotoCache.set(s.code!, e.target.result); // Update cache with local preview
                // We don't necessarily need to reload everything if we have local preview
              },
              error: (err) => console.error('Errore nel caricamento foto', err)
            });
      };
      reader.readAsDataURL(file);
    }
  }

  deletePhoto(event: Event, s: StationDto) {
    event.stopPropagation();
    if (s.code === undefined || !confirm('Sicuro di voler eliminare la foto?')) return;
    
    this.uploadingStationCode = s.code;
    this.hub.station.deleteApiStationsPhoto(s.code)
      .pipe(finalize(() => this.uploadingStationCode = null))
      .subscribe({
        next: () => {
          this.localPhotoCache.delete(s.code!);
          if (s.stationPhoto) {
            s.stationPhoto.photo = null as any;
          }
          s.imageName = undefined;
        },
        error: (err) => console.error('Errore nell\'eliminazione foto', err)
      });
  }
}
