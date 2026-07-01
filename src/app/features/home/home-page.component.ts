/*
 * SPDX-License-Identifier: EUPL-1.2
 * Copyright: 2026 Regione Marche
 */
import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormControl, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ItButtonDirective, ItIconComponent, ItModalComponent, ItSearchComponent, ItSpinnerComponent, ItTableModule, SearchItem } from 'design-angular-kit';
import * as L from 'leaflet';
import { CoreHubService } from 'src/app/core/services/core-hub.service';
import { formatDateGmt1, fromBorlandToDateGmt1, fromBorlandToDateObject } from 'src/app/core/utils/date-gmt1';
import { environment } from 'src/environments/environment';
import { SENSOR_FILTER_ALL_ICON_CLASS, sensorTypeToWeatherIconClass } from '../../config/sensor-weather-icon';
import { UsefulLink } from '../../config/useful-link';
import { Sensor, StationDto } from '../../generated';
import { MirDisclaimerTermsComponent } from '../../shared/mir-disclaimer-terms/mir-disclaimer-terms.component';

type SensorFilterOption = {
  value: number;
  text: string;
  /** Classi Weather Icons (es. `wi wi-rain`) per il pulsante filtro sensore */
  weatherIconClass: string;
};

type TableSortField = 'name' | 'municipality' | 'province';

@Component({
  selector: 'app-home-page',
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    ItTableModule,
    ItSpinnerComponent,
    ItButtonDirective,
    ItIconComponent,
    ItSearchComponent,
    ItModalComponent,
    MirDisclaimerTermsComponent
  ],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.css'
})
export class HomePageComponent implements OnInit, OnDestroy {
  env = environment;

  @ViewChild('stationSearch') private stationSearchComponent?: ItSearchComponent;

  trackUsefulLinkByUrl(_index: number, link: UsefulLink): string {
    return link.url;
  }
  private readonly staleThresholdMs = 90 * 60 * 1000;
  stations: StationDto[] = [];
  stationSearchData: SearchItem<StationDto>[] = [];
  view: 'map' | 'table' = 'map';
  private map?: L.Map;
  private markersArea: L.LayerGroup | null = null;
  private markers: L.Marker[] = [];
  sensors: Sensor[] = [];
  sensorFilter: number | null = null;
  showMarkerValue = environment.showMarkerValue;
  tableSearchTerm = '';
  tableSortField: TableSortField | null = null;
  tableSortDirection: 'asc' | 'desc' = 'asc';
  displayedColumns: string[] = ['name', 'province', 'lastUpdateTime', 'actions'];
  isLoading = true;
  isReloading = false;
  pageLastUpdated?: Date;
  pageLastUpdatedFormatted?: string;
  sensorFilterOptions: SensorFilterOption[] = [];
  selectedStationCode: number | null = null;
  openedAccordion: string | null = null;

  constructor(
    private hub: CoreHubService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  toggleAccordion(id: string) {
    this.openedAccordion = this.openedAccordion === id ? null : id;
    setTimeout(() => {
      if (this.map) {
        this.map.invalidateSize();
      }
    }, 350);
  }

  get isSensorFilterActive(): boolean {
    return this.sensorFilter != null;
  }

  updateSensorFilterOptions(): void {
    const opts: SensorFilterOption[] = [];

    this.sensors
      .filter(s => environment.standardSensors.includes(s.id))
      .sort((a, b) => environment.standardSensors.indexOf(a.id) - environment.standardSensors.indexOf(b.id))
      .forEach(s => {
        opts.push({
          value: s.id,
          text: this.sensorDisplayName(s.id, s.description || s.label),
          weatherIconClass: sensorTypeToWeatherIconClass(s.id)
        });
      });

    this.sensorFilterOptions = opts;
  }

  trackBySensor(index: number, item: SensorFilterOption): number {
    return item.value;
  }

  selectSensorFilter(value: number): void {
    if (this.sensorFilter === value) {
      return;
    }
    this.sensorFilter = value;

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { sensor: value },
      queryParamsHandling: 'merge'
    });

    this.clearStationSearchInput();
    this.renderMarkers();
    this.rebuildStationSearchData();
  }

  clearSensorFilter(): void {
    if (!this.isSensorFilterActive) {
      return;
    }
    this.sensorFilter = null;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { sensor: null },
      queryParamsHandling: 'merge'
    });
    this.renderMarkers();
    this.rebuildStationSearchData();
  }

  /** Dalla tabella alla mappa: allinea stato e URL (rimuove `view=table`). */
  switchToMapView(): void {
    this.view = 'map';
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { view: null },
      queryParamsHandling: 'merge'
    });
    setTimeout(() => this.map?.invalidateSize(), 0);
  }

  ngOnInit(): void {
    const initialSensorRaw = this.route.snapshot.queryParamMap.get('sensor');
    if (this.route.snapshot.queryParamMap.get('view') === 'table') {
      this.view = 'table';
    }

    this.hub.sensor.getApiSensors().subscribe(data => {
      this.sensors = data;
      this.updateSensorFilterOptions();

      if (initialSensorRaw != null && initialSensorRaw !== '') {
        const n = Number(initialSensorRaw);
        const allowed = new Set(this.sensorFilterOptions.map(o => o.value));
        if (Number.isFinite(n) && allowed.has(n)) {
          this.sensorFilter = n;
        } else {
          this.sensorFilter = null;
          this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { sensor: null },
            queryParamsHandling: 'merge'
          });
        }
      }

      if (this.map) {
        this.renderMarkers();
      }
      this.rebuildStationSearchData();
    });

    this.loadStations(
      () => {
        this.isLoading = false;
        setTimeout(() => {
          this.initMap();
          this.renderMarkers();
        }, 0);
      },
      () => {
        this.isLoading = false;
       
      }
    );

    
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
    }
  }


  private initMap() {
    if (this.map) {
      return;
    }

    const center: L.LatLngExpression = environment.mapCenter as L.LatLngExpression;

    this.map = L.map('map', { center, zoom: environment.mapZoom, zoomControl:false });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);
    L.control.scale().addTo(this.map);
    L.control.zoom({
    position: 'topright'
      }).addTo(this.map);
    this.addViewModeControl();

    this.map.on('click', (e: L.LeafletMouseEvent) => {
      const tgt = e.originalEvent?.target as HTMLElement | undefined;
      if (tgt?.closest?.('.leaflet-marker-icon')) {
        return;
      }
      if (tgt?.closest?.('.leaflet-popup')) {
        return;
      }
      this.selectedStationCode = null;
      this.applyMarkerSelectionHighlight();
    });
  }

  private addViewModeControl() {
    if (!this.map) return;

    const ViewModeControl = L.Control.extend({
      options: { position: 'topright' },
      onAdd: () => {
        const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control view-mode-control');
        L.DomEvent.disableClickPropagation(container);

        // const mapBtn = L.DomUtil.create('a', 'view-mode-control__btn view-mode-control__btn--active', container);
        // mapBtn.href = '#';
        // mapBtn.title = 'Mappa';
        // mapBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/><circle cx="12" cy="10" r="3"/></svg>';
        // L.DomEvent.on(mapBtn, 'click', (e: Event) => {
        //   L.DomEvent.preventDefault(e);
        //   this.view = 'map';
        //   mapBtn.classList.add('view-mode-control__btn--active');
        //   tableBtn.classList.remove('view-mode-control__btn--active');
        // });

        const tableBtn = L.DomUtil.create('a', 'view-mode-control__btn', container);
        tableBtn.href = '#';
        tableBtn.title = 'Elenco stazioni';
        tableBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>';
        L.DomEvent.on(tableBtn, 'click', (e: Event) => {
          L.DomEvent.preventDefault(e);
          this.view = 'table';
          tableBtn.classList.add('view-mode-control__btn--active');
          // mapBtn.classList.remove('view-mode-control__btn--active');
        });

        return container;
      }
    });

    new ViewModeControl().addTo(this.map);
  }

  private resetMapView() {
    if (!this.map) {
      return;
    }

    const center: L.LatLngExpression = environment.mapCenter as L.LatLngExpression;
    this.map.setView(center, environment.mapZoom);
  }

  renderMarkers() {
    if (!this.map) return;
    
    // Clear previous layers
    if (this.markersArea) {
      this.map.removeLayer(this.markersArea);
    }

    this.markers = []; // Clear current trackers
    const markersGroup = L.layerGroup();
    this.markersArea = markersGroup;

    const filterVal = this.sensorFilter === null || this.sensorFilter === undefined
      ? null
      : Number(this.sensorFilter);
    this.stations
      .filter(s => !Number.isNaN(Number(s.latitude)) && !Number.isNaN(Number(s.longitude)))
      .forEach(s => {
        const analogsAll = s.analogs?.filter(a => 
          environment.standardSensors.includes(a.sensorType) && 
          a.analogVisibility?.visible !== false
        )
          .sort((a, b) => environment.standardSensors.indexOf(a.sensorType) - environment.standardSensors.indexOf(b.sensorType));
        if (filterVal !== null) {
          const match = analogsAll?.find(a => a.sensorType === filterVal && a.value !== null && a.value !== undefined);
          if (!match) {
            return;
          }
        }

        const updateDate = this.getStationUpdateDate(s);
        const isStale = this.isMarkerGrey(updateDate);
        const baseIcon = this.buildIconOnlyBadge(filterVal, isStale);

        let stationIcon: L.DivIcon = baseIcon;
        if (filterVal === 0) {
          const rainAnalog = analogsAll?.find(a => a.sensorType === 0);
          const rainVal = Number(rainAnalog?.value);
          const rainActive = Boolean(!isStale && Number.isFinite(rainVal) && rainVal > 0);
          if (this.showMarkerValue && Number.isFinite(rainVal)) {
            const rainDecimals = typeof rainAnalog?.decimals === 'number' ? Math.max(0, rainAnalog.decimals) : 1;
            const rainTotalStr = this.truncateDecimals(rainVal, rainDecimals);
            const rainTotalUnit = rainAnalog?.unit || 'mm';
            const intensityVal = rainVal * 4;
            const intensityStr = this.truncateDecimals(intensityVal, rainDecimals);
            const intensityUnit = rainAnalog?.unit ? `${rainAnalog.unit}/h` : 'mm/h';
            stationIcon = this.buildMultiLineValueMarkerIcon(0, [
              `${rainTotalStr} ${rainTotalUnit}`.trim(),
              `${intensityStr} ${intensityUnit}`.trim()
            ], isStale, rainActive);
          } else {
            stationIcon = this.buildIconOnlyBadge(0, isStale, { rainActive });
          }
        } else if (filterVal === 5 && this.showMarkerValue) {
          const temperatureAnalog = analogsAll?.find(a => a.sensorType === 5);
          const temperatureVal = Number(temperatureAnalog?.value);
          if (Number.isFinite(temperatureVal)) {
            const decimals = typeof temperatureAnalog?.decimals === 'number' ? Math.max(0, temperatureAnalog.decimals) : 0;
            const temperatureText = this.truncateDecimals(temperatureVal, decimals);
            const temperatureUnit = temperatureAnalog?.unit || '°C';
            stationIcon = this.buildValueMarkerIcon(5, `${temperatureText} ${temperatureUnit}`.trim(), isStale);
          }
        } else if (filterVal === 6 && this.showMarkerValue) {
          const humidityAnalog = analogsAll?.find(a => a.sensorType === 6);
          const humidityVal = Number(humidityAnalog?.value);
          if (Number.isFinite(humidityVal)) {
            const decimals = typeof humidityAnalog?.decimals === 'number' ? Math.max(0, humidityAnalog.decimals) : 0;
            const humidityText = this.truncateDecimals(humidityVal, decimals);
            const humidityUnit = humidityAnalog?.unit || '%';
            stationIcon = this.buildValueMarkerIcon(6, `${humidityText} ${humidityUnit}`.trim(), isStale);
          }
        } else if (filterVal === 100 && this.showMarkerValue) {
          const hydrometryAnalog = analogsAll?.find(a => a.sensorType === 100);
          const hydrometryVal = Number(hydrometryAnalog?.value);
          if (Number.isFinite(hydrometryVal)) {
            const decimals = typeof hydrometryAnalog?.decimals === 'number' ? Math.max(0, hydrometryAnalog.decimals) : 0;
            const hydrometryText = this.truncateDecimals(hydrometryVal, decimals);
            const hydrometryUnit = hydrometryAnalog?.unit || '';
            stationIcon = this.buildValueMarkerIcon(100, `${hydrometryText} ${hydrometryUnit}`.trim(), isStale);
          }
        } else if (filterVal === 107 && this.showMarkerValue) {
          const snowAnalog = analogsAll?.find(a => a.sensorType === 107);
          const snowVal = Number(snowAnalog?.value);
          if (Number.isFinite(snowVal)) {
            const decimals = typeof snowAnalog?.decimals === 'number' ? Math.max(0, snowAnalog.decimals) : 0;
            const snowText = this.truncateDecimals(snowVal, decimals);
            const snowUnit = snowAnalog?.unit || '';
            stationIcon = this.buildValueMarkerIcon(107, `${snowText} ${snowUnit}`.trim(), isStale);
          }
        } else if (filterVal === 10) {
          const windAnalog = analogsAll?.find(a => a.sensorType === 10);
          const windVal = Number(windAnalog?.value);
          const windColor = isStale ? '#8c98a4' : '#128e4d';
          const windDirAnalog = s.analogs?.find(a => a.sensorType === 9 && a.value !== null && a.value !== undefined);
          const rawDir = Number(windDirAnalog?.value);
          let windIconHtml = '';
          let isArrowIcon = false;

          if (Number.isFinite(windVal)) {
            if (windVal <= 1) {
              windIconHtml = `<i style="font-size: 33px; color: ${windColor};" class="wi wi-small-craft-advisory"></i>`;
            } else if (Number.isFinite(rawDir)) {
              const dirDeg = (rawDir - 1) * 22.5;
              const dirInt = this.truncateToInt(dirDeg);
              const normalized = dirInt === 360 ? 360 : ((dirInt % 360) + 360) % 360;
              windIconHtml = `<i style="font-size: 29px; color: ${windColor};" class="wi wi-wind from-${normalized}-deg"></i>`;
              isArrowIcon = true;
            } else {
              windIconHtml = `<i style="font-size: 33px; color: ${windColor};" class="wi wi-small-craft-advisory"></i>`;
            }
          }

          const speedLabel = Number.isFinite(windVal)
            ? `${this.truncateDecimals(windVal, typeof windAnalog?.decimals === 'number' ? Math.max(0, windAnalog.decimals) : 0)}${windAnalog?.unit ? ` ${windAnalog.unit}` : ''}`
            : '';
          const directionUnit = windDirAnalog?.unit || '°';
          const directionLabel = Number.isFinite(rawDir)
            ? `${this.truncateDecimals((rawDir - 1) * 22.5, typeof windDirAnalog?.decimals === 'number' ? Math.max(0, windDirAnalog.decimals) : 0)}${directionUnit ? ` ${directionUnit}` : ''}`
            : '';

          if (this.showMarkerValue && (speedLabel || directionLabel) && windIconHtml) {
            stationIcon = this.buildWindValueMarkerIcon(windIconHtml, speedLabel, directionLabel, isStale);
          } else if (windIconHtml) {
            stationIcon = this.buildWindIconOnlyBadge(windIconHtml, isArrowIcon, isStale);
          }
        }
        const marker = L.marker([Number(s.latitude), Number(s.longitude)], { icon: stationIcon });

        if (s.code != null) {
          (marker as L.Marker & { stationCode?: number }).stationCode = s.code;
        }

        if (this.isSensorFilterActive && this.sensorFilter != null && s.code != null) {
          const stationCode = s.code;
          const sensorType = this.sensorFilter;
          marker.on('click', () => {
            this.router.navigate(['/stations', stationCode, 'data'], {
              queryParams: { sensor: sensorType, from: 'map' }
            });
          });
        } else {
          const last = this.stationLastUpdateLabel(s);

          const analogRows: string[] = [];
          analogsAll?.forEach(a => {
            const name = a.description ?? a.sensor?.description ?? this.sensorDisplayName(a.sensorType);
            analogRows.push(this.popupAnalogRow(name, String(a.value ?? '-'), a.unit || '', a.sensorType));
          });

          const windDirAnalog = s.analogs?.find(a => a.sensorType === 9 && a.value !== null && a.value !== undefined);
          const ventiVisible = analogsAll?.some(a => a.sensorType === 10);
          if (windDirAnalog && ventiVisible) {
            const rawDir = Number(windDirAnalog.value);
            if (Number.isFinite(rawDir)) {
              const dirDeg = (rawDir - 1) * 22.5;
              const decimals = typeof windDirAnalog.decimals === 'number' ? Math.max(0, windDirAnalog.decimals) : 0;
              const dirStr = this.truncateDecimals(dirDeg, decimals);
              const dirName = windDirAnalog.description ?? windDirAnalog.sensor?.description ?? 'Direzione Vento';
              const dirUnit = windDirAnalog.unit || '°';
              analogRows.push(this.popupAnalogRow(dirName, dirStr, dirUnit, 9));
            }
          }

          if (filterVal === 0) {
            const rainAnalog = analogsAll?.find(a => a.sensorType === 0);
            const rainVal = Number(rainAnalog?.value);
            if (Number.isFinite(rainVal)) {
              const intensityVal = rainVal * 4;
              const decimals = typeof rainAnalog?.decimals === 'number' ? Math.max(0, rainAnalog.decimals) : 1;
              const intensityStr = this.truncateDecimals(intensityVal, decimals);
              const unit = rainAnalog?.unit ? `${rainAnalog.unit}/h` : 'mm/h';
              analogRows.push(this.popupAnalogRow('Intensità pioggia', intensityStr, unit, 0));
            }
          }

          const analogHtml = analogRows.join('');
          const sensorParam = filterVal !== null ? `?sensor=${filterVal}` : '';
          marker.bindPopup(
            this.buildStationLeafletPopup({
              title: s.name ?? 'Stazione',
              lastUpdateLabel: last,
              analogRowsHtml: analogHtml,
              note: s.note,
              stationCode: s.code,
              sensorQuery: sensorParam
            })
          );
          marker.on('popupopen', () => {
            if (s.code != null) {
              this.selectedStationCode = s.code;
              this.applyMarkerSelectionHighlight();
            }
          });
          marker.on('popupclose', () => {
            this.selectedStationCode = null;
            this.applyMarkerSelectionHighlight();
          });
        }

        marker.bindTooltip(this.buildStationHoverTooltipHtml(s), {
          direction: 'auto',
          sticky: true,
          opacity: 0.95,
          className: 'station-hover-tooltip'
        });

        markersGroup.addLayer(marker);
        this.markers.push(marker);
      });

    this.map.addLayer(markersGroup);

    if (this.selectedStationCode != null) {
      // Logic to find and open the marker if needed
      // (Difficult with clusters as it might be hidden, for now we just find it)
      const onMap = this.markers.some(
        m => (m as L.Marker & { stationCode?: number }).stationCode === this.selectedStationCode
      );
      if (!onMap) {
        this.selectedStationCode = null;
      }
    }
    this.applyMarkerSelectionHighlight();
  }

  refreshMarkers() {
    if (this.isReloading) {
      return;
    }

    this.isReloading = true;
    this.loadStations(
      () => {
        this.initMap();
        this.resetMapView();
        this.renderMarkers();
        this.isReloading = false;
      },
      () => {
        this.isReloading = false;
      }
    );
  }

  sensorLabel(sensorId: number): string {
    const s = this.sensors.find(x => x.id === sensorId);
    return this.sensorDisplayName(sensorId, s?.description ?? s?.label);
  }

  stationLastUpdateLabel(station: StationDto): string {
    const updateDate = this.getStationUpdateDate(station);
    if (updateDate) {
      return this.formatDate(updateDate);
    }

    const stationLastUpdate = (station as StationDto & { lastUpdateTime?: string }).lastUpdateTime;
    return stationLastUpdate || '-';
  }

  toggleTableSort(field: TableSortField): void {
    if (this.tableSortField !== field) {
      this.tableSortField = field;
      this.tableSortDirection = 'asc';
      return;
    }

    if (this.tableSortDirection === 'asc') {
      this.tableSortDirection = 'desc';
      return;
    }

    this.tableSortField = null;
    this.tableSortDirection = 'asc';
  }

  getTableSortIndicator(field: TableSortField): string {
    if (this.tableSortField !== field) {
      return '↕';
    }
    return this.tableSortDirection === 'asc' ? '↑' : '↓';
  }

  getTableAriaSort(field: TableSortField): 'ascending' | 'descending' | 'none' {
    if (this.tableSortField !== field) {
      return 'none';
    }
    return this.tableSortDirection === 'asc' ? 'ascending' : 'descending';
  }

  get filteredTableStations(): StationDto[] {
    const term = this.tableSearchTerm.trim().toLowerCase();
    const filtered = !term ? this.stations : this.stations.filter(s => {
      const code = s.code !== undefined && s.code !== null ? String(s.code) : '';
      const haystack = [
        s.name ?? '',
        s.province ?? '',
        s.municipality ?? '',
        code
      ].join(' ').toLowerCase();

      return haystack.includes(term);
    });

    const sortField = this.tableSortField;
    if (!sortField) {
      return filtered;
    }

    const direction = this.tableSortDirection === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => this.compareTableStations(a, b, sortField) * direction);
  }

  private compareTableStations(a: StationDto, b: StationDto, field: TableSortField): number {
    if (field === 'municipality') {
      return this.compareText(a.municipality, b.municipality) || this.compareText(a.name, b.name);
    }
    if (field === 'province') {
      return this.compareText(a.province, b.province) || this.compareText(a.name, b.name);
    }
    return this.compareText(a.name, b.name);
  }

  private compareText(left: string | null | undefined, right: string | null | undefined): number {
    const l = (left ?? '').trim();
    const r = (right ?? '').trim();
    return l.localeCompare(r, 'it', { sensitivity: 'base', numeric: true });
  }

  private sensorDisplayName(sensorId: number | undefined, fallback?: string): string {
    const labels = (environment as any).sensorLabels || {};
    if (sensorId === undefined || sensorId === null) {
      return fallback ?? 'Misura';
    }
    return labels[sensorId] ?? fallback ?? `Sens ${sensorId}`;
  }

  private truncateDecimals(value: number, decimals: number): string {
    if (!Number.isFinite(value)) return '';
    const safeDecimals = Math.max(0, decimals);
    if (safeDecimals === 0) {
      const intVal = value < 0 ? Math.ceil(value) : Math.floor(value);
      return String(intVal);
    }
    const factor = 10 ** safeDecimals;
    const truncated = value < 0 ? Math.ceil(value * factor) / factor : Math.floor(value * factor) / factor;
    return truncated.toFixed(safeDecimals);
  }

  private escapePopupHtml(text: string | null | undefined): string {
    if (text == null) {
      return '';
    }
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private buildStationHoverTooltipHtml(s: StationDto): string {
    const name = (s.name && s.name.trim()) ? s.name.trim() : 'Stazione';
    const mun = (s.municipality && s.municipality.trim()) ? s.municipality.trim() : '';
    const prov = (s.province && s.province.trim()) ? s.province.trim() : '';
    const comuneDisplay = mun ? (prov ? `${mun} (${prov})` : mun) : '—';

    const updateDate = this.getStationUpdateDate(s);
    const updateStr = updateDate ? this.formatDate(updateDate) : '';

    const clockSvg =
      '<svg class="station-hover-tooltip__clock" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>';

    let html =
      `<div class="station-hover-tooltip-inner">` +
      `<div class="station-hover-tooltip__title">${this.escapePopupHtml(name)}</div>` +
      `<div class="station-hover-tooltip__line">` +
      `<span class="station-hover-tooltip__label">Comune:</span> ` +
      `<span class="station-hover-tooltip__value">${this.escapePopupHtml(comuneDisplay)}</span>` +
      `</div>`;

    if (updateStr) {
      html +=
        `<div class="station-hover-tooltip__line station-hover-tooltip__update">` +
        `${clockSvg} <span class="station-hover-tooltip__value">${this.escapePopupHtml(updateStr)}</span>` +
        `</div>`;
    }

    html += `</div>`;
    return html;
  }

  private popupAnalogRow(
    label: string,
    valueText: string,
    unit: string,
    sensorType?: number | null
  ): string {
    const wiClass = sensorTypeToWeatherIconClass(sensorType);
    const valuePart = `<strong class="station-popup__value-num">${this.escapePopupHtml(valueText)}</strong>`;
    const unitPart = unit
      ? `\u00A0<span class="station-popup__unit">${this.escapePopupHtml(unit)}</span>`
      : '';
    return (
      `<div class="station-popup__row">` +
      `<span class="station-popup__icon" aria-hidden="true"><i class="${wiClass}"></i></span>` +
      `<span class="station-popup__label">${this.escapePopupHtml(label)}</span>` +
      `<span class="station-popup__value">${valuePart}${unitPart}</span>` +
      `</div>`
    );
  }

  private buildStationLeafletPopup(options: {
    title: string;
    lastUpdateLabel: string;
    analogRowsHtml: string;
    note: string | null | undefined;
    stationCode: number | undefined;
    sensorQuery: string;
  }): string {
    const clockSvg =
      '<svg class="station-popup__clock-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<circle cx="12" cy="12" r="10"/>' +
      '<path d="M12 6v6l4 2"/>' +
      '</svg>';

    const code = options.stationCode != null ? String(options.stationCode) : '';
    const dataFromMap =
      options.sensorQuery && options.sensorQuery.length > 0
        ? `${options.sensorQuery}&from=map`
        : '?from=map';
    const dataHref = `/stations/${encodeURIComponent(code)}/data${dataFromMap}`;
    const profileHref = `/stations/${encodeURIComponent(code)}/profile${options.sensorQuery}`;

    const measuresSection = options.analogRowsHtml
      ? `<section class="station-popup__section" aria-label="Misure rilevate"><div class="station-popup__rows">${options.analogRowsHtml}</div></section>`
      : '';

    const noteBlock = options.note
      ? `<div class="station-popup__note border rounded small p-2 bg-light mt-2">
      <span class="station-popup__note-heading text-muted">Note</span><div class="station-popup__note-body">${this.escapePopupHtml(options.note)}</div></div>`
      : '';

    return (
      `<div class="station-popup">` +
      `<header class="station-popup__header">` +
      `<h3 class="station-popup__title text-primary">${this.escapePopupHtml(options.title)}</h3>` +
      `<div class="station-popup__meta" role="group" aria-label="Ultimo aggiornamento dati">` +
      `<span class="station-popup__meta-icon">${clockSvg}</span>` +
      `<div class="station-popup__meta-text">` +
      // `<span class="station-popup__meta-label">Ultimo aggiornamento</span>` +

      `<span class="station-popup__meta-value">${this.escapePopupHtml(options.lastUpdateLabel)}</span>` +
      `</div></div></header>` +
      `<div class="station-popup__divider" role="presentation"></div>` +
      measuresSection +
      noteBlock +
      `<div class="station-popup__actions d-flex flex-nowrap gap-2 align-items-center">` +
      `<a class="btn btn-sm btn-primary text-white" href="${dataHref}">Dati</a>` +
      `<a class="btn btn-sm btn-outline-primary" href="${profileHref}">Anagrafica</a>` +
      `</div></div>`
    );
  }

  private truncateToInt(value: number): number {
    if (!Number.isFinite(value)) return 0;
    return value < 0 ? Math.ceil(value) : Math.floor(value);
  }

  /** Colore icona meteo sui marker (allineato al vento “fresco”). */
  private mapMarkerIconColor(isStale: boolean): string {
    return isStale ? '#8c98a4' : '#128e4d';
  }

  /**
   * Marker solo icona (Weather Icons da `sensor-type` / “tutti”).
   * `rainActive`: pioggia con accumulo > 0 e dato non stale → badge blu, icona bianca.
   */
  private buildIconOnlyBadge(
    sensorType: number | null,
    isStale: boolean,
    options?: { rainActive?: boolean }
  ): L.DivIcon {
    const wiClass =
      sensorType === null || sensorType === undefined
        ? SENSOR_FILTER_ALL_ICON_CLASS
        : sensorTypeToWeatherIconClass(sensorType);
    const highlightRain = Boolean(options?.rainActive && !isStale);
    let color = this.mapMarkerIconColor(isStale);
    if (highlightRain) {
      color = '#ffffff';
    }
    const staleClass = isStale ? ' sensor-value-marker__badge--stale' : '';
    const rainActiveClass = highlightRain ? ' sensor-value-marker__badge--rain-active' : '';
    return L.divIcon({
      className: 'sensor-value-marker',
      html:
        `<div class="sensor-value-marker__content">` +
        `<div class="sensor-value-marker__badge sensor-value-marker__badge--icon-only${staleClass}${rainActiveClass}">` +
        `<i class="${wiClass} sensor-value-marker__wi" style="color: ${color};" aria-hidden="true"></i>` +
        `</div></div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
      popupAnchor: [0, -13]
    });
  }

  private buildValueMarkerIcon(sensorType: number, valueWithUnit: string, isStale: boolean): L.DivIcon {
    const wiClass = sensorTypeToWeatherIconClass(sensorType);
    const color = this.mapMarkerIconColor(isStale);
    const safe = this.escapePopupHtml(valueWithUnit);
    const staleClass = isStale ? ' sensor-value-marker__badge--stale' : '';
    return L.divIcon({
      className: 'sensor-value-marker',
      html:
        `<div class="sensor-value-marker__content">` +
        `<div class="sensor-value-marker__badge${staleClass}">` +
        `<i class="${wiClass} sensor-value-marker__wi" style="color: ${color};" aria-hidden="true"></i>` +
        `<span class="sensor-value-marker__value">${safe}</span>` +
        `</div></div>`,
      iconSize: [60, 28],
      iconAnchor: [30, 14],
      popupAnchor: [0, -12]
    });
  }

  private buildMultiLineValueMarkerIcon(
    sensorType: number,
    lines: string[],
    isStale: boolean,
    rainActive?: boolean
  ): L.DivIcon {
    const wiClass = sensorTypeToWeatherIconClass(sensorType);
    const highlightRain = Boolean(rainActive && !isStale);
    let color = this.mapMarkerIconColor(isStale);
    if (highlightRain) {
      color = '#ffffff';
    }
    const lineHtml = lines
      .filter(Boolean)
      .map(line => `<span class="sensor-value-marker__line">${this.escapePopupHtml(line)}</span>`)
      .join('');
    const staleClass = isStale ? ' sensor-value-marker__badge--stale' : '';
    const rainActiveClass = highlightRain ? ' sensor-value-marker__badge--rain-active' : '';
    return L.divIcon({
      className: 'sensor-value-marker sensor-value-marker--multiline',
      html:
        `<div class="sensor-value-marker__content">` +
        `<div class="sensor-value-marker__badge sensor-value-marker__badge--multiline${staleClass}${rainActiveClass}">` +
        `<i class="${wiClass} sensor-value-marker__wi" style="color: ${color};" aria-hidden="true"></i>` +
        `<div class="sensor-value-marker__value-stack">${lineHtml}</div>` +
        `</div></div>`,
      iconSize: [84, 46],
      iconAnchor: [42, 23],
      popupAnchor: [0, -18]
    });
  }

  private buildWindValueMarkerIcon(iconHtml: string, speedLabel: string, directionLabel: string, isStale: boolean): L.DivIcon {
    const speedHtml = speedLabel
      ? `<span class="sensor-value-marker__line">${this.escapePopupHtml(speedLabel)}</span>`
      : '';
    const directionHtml = directionLabel
      ? `<span class="sensor-value-marker__line">${this.escapePopupHtml(directionLabel)}</span>`
      : '';
    const staleClass = isStale ? ' sensor-value-marker__badge--stale' : '';

    return L.divIcon({
      className: 'sensor-value-marker sensor-value-marker--wind',
      html:
        `<div class="sensor-value-marker__content">` +
        `<div class="sensor-value-marker__badge sensor-value-marker__badge--wind${staleClass}">` +
        `<span class="sensor-value-marker__wind-icon">${iconHtml}</span>` +
        `<div class="sensor-value-marker__value-stack">${speedHtml}${directionHtml}</div>` +
        `</div></div>`,
      iconSize: [72, 40],
      iconAnchor: [36, 20],
      popupAnchor: [0, -16]
    });
  }

  /** Vento senza testo: icona dinamica dentro lo stesso badge circolare. */
  private buildWindIconOnlyBadge(iconHtml: string, isArrowIcon: boolean, isStale: boolean): L.DivIcon {
    const size = isArrowIcon ? 34 : 38;
    const half = size / 2;
    const staleClass = isStale ? ' sensor-value-marker__badge--stale' : '';
    return L.divIcon({
      className: 'sensor-value-marker',
      html:
        `<div class="sensor-value-marker__content">` +
        `<div class="sensor-value-marker__badge sensor-value-marker__badge--icon-only sensor-value-marker__badge--wind-only${staleClass}">` +
        `${iconHtml}` +
        `</div></div>`,
      iconSize: [size, size],
      iconAnchor: [half, half],
      popupAnchor: [0, -16]
    });
  }

  private isMarkerGrey(updateDate: Date | null): boolean {
    return Boolean(environment.updateControl && updateDate && (Date.now() - updateDate.getTime()) > this.staleThresholdMs);
  }

  private getStationUpdateDate(station: StationDto): Date | null {
    const updateSensor = station.analogs?.find(a => a.sensorType === 301);
    if (updateSensor?.value !== null && updateSensor?.value !== undefined) {
      return this.fromBorlandToDateObject(parseFloat(updateSensor.value.toFixed(10)));
    }

    const stationLastUpdate = (station as StationDto & { lastUpdateTime?: string }).lastUpdateTime;
    if (!stationLastUpdate) {
      return null;
    }

    const parsed = new Date(stationLastUpdate);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private formatDate(date: Date): string {
    return formatDateGmt1(date);
  }

  private fromBorlandToDate(borlandDate: number): string {
    return fromBorlandToDateGmt1(borlandDate);
  }

  private fromBorlandToDateObject(borlandDate: number): Date {
    return fromBorlandToDateObject(borlandDate);
  }

  onStationSelected(item: SearchItem<StationDto>) {

    const station = item?.additionalData;
    if (station && station.latitude && station.longitude && this.map) {
      if (station.code != null) {
        this.selectedStationCode = station.code;
        this.applyMarkerSelectionHighlight();
      }

      this.map.setView([Number(station.latitude), Number(station.longitude)], 12);

      if (this.isSensorFilterActive) {
        return;
      }

      const marker = this.markers.find(m => {
        const latLng = m.getLatLng();
        return Math.abs(latLng.lat - Number(station.latitude)) < 0.0001 && Math.abs(latLng.lng - Number(station.longitude)) < 0.0001;
      });

      if (marker) {
        marker.openPopup();
      }
    }
  }

  /** Svuota il campo Ricerca stazione (`it-search` usa un FormControl interno protetto). */
  private clearStationSearchInput(): void {
    const inner = this.stationSearchComponent as unknown as {
      control?: FormControl<string | null | undefined>;
    };
    const ctrl = inner?.control;
    if (!ctrl) {
      return;
    }
    ctrl.setValue(null, { emitEvent: false });
    ctrl.markAsPristine();
  }

  private stationMatchesSensorFilter(station: StationDto, filterVal: number | null): boolean {
    if (filterVal === null || Number.isNaN(filterVal)) {
      return true;
    }
    const analogsAll = station.analogs?.filter(
      a =>
        environment.standardSensors.includes(a.sensorType) &&
        a.analogVisibility?.visible !== false
    );
    const match = analogsAll?.find(
      a => a.sensorType === filterVal && a.value !== null && a.value !== undefined
    );
    return Boolean(match);
  }

  private rebuildStationSearchData(): void {
    const filterVal =
      this.sensorFilter === null || this.sensorFilter === undefined
        ? null
        : Number(this.sensorFilter);
    this.stationSearchData = this.stations
      .filter(s => s.name && this.stationMatchesSensorFilter(s, filterVal))
      .map(s => ({
        value: s.name!,
        label: s.province || s.municipality,
        additionalData: s
      }));
  }

  private applyMarkerSelectionHighlight(): void {
    for (const marker of this.markers) {
      const el = marker.getElement();
      if (!el) {
        continue;
      }
      const badge = el.querySelector('.sensor-value-marker__badge');
      if (!badge) {
        continue;
      }
      const code = (marker as L.Marker & { stationCode?: number }).stationCode;
      const selected =
        this.selectedStationCode != null && code != null && code === this.selectedStationCode;
      badge.classList.toggle('sensor-value-marker__badge--selected', selected);
    }
  }

  private loadStations(onLoaded?: () => void, onError?: () => void) {
    this.hub.station.getApiStationsVisible().subscribe({
      next: data => {
        this.stations = data;
        this.pageLastUpdated = new Date();
        this.pageLastUpdatedFormatted = formatDateGmt1(this.pageLastUpdated);
        this.rebuildStationSearchData();

        onLoaded?.();
      },
      error: () => {
        onError?.();
      }
    });
  }
}
