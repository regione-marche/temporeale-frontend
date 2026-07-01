/*
 * SPDX-License-Identifier: EUPL-1.2
 * Copyright: 2026 Regione Marche
 */
import { Injectable } from '@angular/core';
import {
  MeasureResourceService,
  SensorResourceService,
  StationResourceService
} from '../../generated';

@Injectable({
  providedIn: 'root'
})
export class CoreHubService {
  constructor(

    public measure: MeasureResourceService,
    public sensor: SensorResourceService,
    public station: StationResourceService
  ) {}
}
