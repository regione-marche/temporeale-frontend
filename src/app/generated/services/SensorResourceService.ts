/*
 * SPDX-License-Identifier: EUPL-1.2
 * Copyright: 2026 Regione Marche
 */
/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { Observable } from 'rxjs';

import type { Sensor } from '../models/Sensor';

import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';

@Injectable({
    providedIn: 'root',
})
export class SensorResourceService {

    constructor(public readonly http: HttpClient) {}

    /**
     * List Sensors
     * @returns Sensor OK
     * @throws ApiError
     */
    public getApiSensors(): Observable<Array<Sensor>> {
        return __request(OpenAPI, this.http, {
            method: 'GET',
            url: '/api/sensors',
        });
    }

}
