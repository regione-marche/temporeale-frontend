/*
 * SPDX-License-Identifier: EUPL-1.2
 * Copyright: 2026 Regione Marche
 */
import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ItButtonDirective, ItSpinnerComponent } from 'design-angular-kit';
import { StationDto } from '../../generated';
import { CoreHubService } from 'src/app/core/services/core-hub.service';
import { StationProfileDetailsComponent } from './station-profile-details.component';

@Component({
  selector: 'app-station-profile',
  imports: [
    CommonModule,
    RouterLink,
    ItButtonDirective,
    ItSpinnerComponent,
    StationProfileDetailsComponent
  ],
  templateUrl: './station-profile.component.html',
  styleUrl: './station-profile.component.css'
})
export class StationProfileComponent implements OnInit {
  station?: StationDto;
  requestedStationId?: number;
  isLoading = true;
  loadError = false;
  /** `from` in query: se `'table'`, l'anagrafica è stata aperta dall'elenco stazioni. */
  profileEntryFrom: string | null = null;

  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private readonly route: ActivatedRoute,
    private readonly hub: CoreHubService
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(q => {
        this.profileEntryFrom = q.get('from');
      });

    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => {
        const rawId = params.get('id');
        const id = rawId === null ? Number.NaN : Number(rawId);
        this.requestedStationId = Number.isFinite(id) ? id : undefined;

        if (this.requestedStationId === undefined) {
          this.station = undefined;
          this.loadError = true;
          this.isLoading = false;
          return;
        }

        this.loadStation(this.requestedStationId);
      });
  }

  get stationCode(): number | undefined {
    return this.station?.code ?? this.requestedStationId;
  }

  private loadStation(code: number): void {
    this.isLoading = true;
    this.loadError = false;

    this.hub.station.getApiStations1(code).subscribe({
      next: station => {
        this.station = station as StationDto;
        this.isLoading = false;
      },
      error: () => {
        this.station = undefined;
        this.loadError = true;
        this.isLoading = false;
      }
    });
  }
}
