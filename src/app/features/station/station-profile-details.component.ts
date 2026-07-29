/*
 * SPDX-License-Identifier: EUPL-1.2
 * Copyright: 2026 Regione Marche
 */
import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ItButtonDirective } from 'design-angular-kit';
import { environment } from 'src/environments/environment';
import { AnalogDto, StationDto } from '../../generated';
import { fromBorlandToDateGmt1 } from 'src/app/core/utils/date-gmt1';
import { AuthService } from 'src/app/core/auth/auth.service';

type ProfileField = {
  label: string;
  value: string;
};

@Component({
  selector: 'app-station-profile-details',
  imports: [
    CommonModule,
    RouterLink,
    ItButtonDirective
  ],
  templateUrl: './station-profile-details.component.html',
  styleUrl: './station-profile-details.component.css'
})
export class StationProfileDetailsComponent {
  @Input({ required: true }) station!: StationDto;
  @Input() stationCode?: number;
  /** Valore query `from` alla navigazione verso questa pagina (es. `'table'` dall'elenco). */
  @Input() fromSource: string | null = null;

  constructor(private auth: AuthService) {}

  get isFromTable(): boolean {
    return this.fromSource === 'table';
  }

  isAdmin(): boolean {
    return this.auth.hasAnyRole(['admin']);
  }

  get resolvedStationCode(): number | undefined {
    return this.stationCode ?? this.station.code;
  }

  get headerSubtitle(): string {
    const parts = [this.station.locality, this.station.municipality, this.station.province]
      .map(value => value?.trim())
      .filter((value): value is string => Boolean(value));

    return parts.join(' · ') || 'Scheda anagrafica stazione';
  }

  get identityFields(): ProfileField[] {
    return [
      // { label: 'Codice', value: this.formatValue(this.resolvedStationCode) },
      { label: 'Nome stazione', value: this.formatValue(this.station.name) },
      { label: 'Località', value: this.formatValue(this.station.locality) },
      { label: 'Comune', value: this.formatValue(this.station.municipality) },
      { label: 'Provincia', value: this.formatValue(this.station.province) }
    ];
  }

  //forzo a 2 decimali lat e lon per "sporcare" la posizione quanto basta
  get positionFields(): ProfileField[] {
    return [
      { label: 'Altitudine', value: this.formatUnitValue(this.station.altitude, 'm s.l.m.') },
      { label: 'Latitudine', value: this.formatValue((+this.station.latitude).toFixed(2)) },
      { label: 'Longitudine', value: this.formatValue((+this.station.longitude).toFixed(2)) },
      // { label: 'Ultimo aggiornamento', value: this.lastUpdateLabel }
    ];
  }

  get hydroFields(): ProfileField[] {
    return [
      { label: 'Fiume', value: this.formatValue(this.station.river) },
      { label: 'Bacino', value: this.formatValue(this.station.basin) }
    ];
  }

  get noteText(): string {
    return this.formatValue(this.station.note);
  }

  get summaryItems(): ProfileField[] {
    return [
      // { label: 'Codice stazione', value: this.formatValue(this.resolvedStationCode) },
      { label: 'Quota', value: this.formatUnitValue(this.station.altitude, 'm s.l.m.') },
      // { label: 'Ultimo aggiornamento', value: this.lastUpdateLabel }
    ];
  }

  get sensorSnapshot(): AnalogDto[] {
    return [...(this.station.analogs ?? [])]
      .filter(analog =>
        analog.sensorType !== undefined &&
        environment.standardSensors.includes(analog.sensorType) &&
        analog.analogVisibility?.visible !== false
      )
      .sort((left, right) =>
        environment.standardSensors.indexOf(left.sensorType!) - environment.standardSensors.indexOf(right.sensorType!)
      );
  }

  analogLabel(analog: AnalogDto): string {
    return analog.description ?? analog.sensor?.description ?? analog.sensor?.label ?? this.sensorDisplayName(analog.sensorType);
  }

  analogValueLabel(analog: AnalogDto): string {
    if (analog.value === null || analog.value === undefined) {
      return '-';
    }

    const decimals = typeof analog.decimals === 'number' ? Math.max(0, analog.decimals) : undefined;
    const value = decimals === undefined
      ? String(analog.value)
      : this.truncateDecimals(analog.value, decimals);

    return analog.unit ? `${value} ${analog.unit}` : value;
  }

  private get lastUpdateLabel(): string {
    const stationLevel = (this.station as StationDto & { lastUpdateTime?: string }).lastUpdateTime;
    if (stationLevel) {
      return stationLevel;
    }

    const analogUpdate = this.sensorSnapshot.find(analog => analog.lastUpdateTime)?.lastUpdateTime;
    if (analogUpdate) {
      return analogUpdate;
    }

    const borlandUpdate = this.station.analogs?.find(analog => analog.sensorType === 301)?.value;
    if (typeof borlandUpdate === 'number') {
      return this.fromBorlandToDate(borlandUpdate);
    }

    return '-';
  }

  private sensorDisplayName(sensorId: number | undefined): string {
    const labels = (environment as Record<string, any>).sensorLabels || {};
    if (sensorId === undefined || sensorId === null) {
      return 'Misura';
    }

    return labels[sensorId] ?? `Misura ${sensorId}`;
  }

  private truncateDecimals(value: number, decimals: number): string {
    if (!Number.isFinite(value)) {
      return '';
    }

    const safeDecimals = Math.max(0, decimals);
    if (safeDecimals === 0) {
      const intValue = value < 0 ? Math.ceil(value) : Math.floor(value);
      return String(intValue);
    }

    const factor = 10 ** safeDecimals;
    const truncated = value < 0
      ? Math.ceil(value * factor) / factor
      : Math.floor(value * factor) / factor;

    return truncated.toFixed(safeDecimals);
  }

  private fromBorlandToDate(borlandDate: number): string {
    return fromBorlandToDateGmt1(borlandDate);
  }

  private formatUnitValue(value: unknown, unit: string): string {
    const formattedValue = this.formatValue(value);
    return formattedValue === '-' ? formattedValue : `${formattedValue} ${unit}`;
  }

  private formatValue(value: unknown): string {
    if (value === null || value === undefined) {
      return '-';
    }

    const text = String(value).trim();
    return text ? text : '-';
  }

  getStationImageUrl(): string {
    const photoData = this.station.stationPhoto?.photo as any;
    if (typeof photoData === 'string' && photoData.length > 50) {
      return 'data:image/png;base64,' + photoData;
    }
    return 'assets/stazione_placeholder.webp';
  }
}
