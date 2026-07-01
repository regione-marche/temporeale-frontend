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

import type { AnalogVisibilityUpdateRequest } from '../models/AnalogVisibilityUpdateRequest';
import type { CurrentQueryDto } from '../models/CurrentQueryDto';
import type { CurrentSampleDto } from '../models/CurrentSampleDto';
import type { HistoricQueryDto } from '../models/HistoricQueryDto';
import type { HistoricSampleDto } from '../models/HistoricSampleDto';
import type { StationDto } from '../models/StationDto';
import type { StationPhotoUpdateRequest } from '../models/StationPhotoUpdateRequest';
import type { StationUpdateRequest } from '../models/StationUpdateRequest';
import type { StationVisibilityUpdateRequest } from '../models/StationVisibilityUpdateRequest';

import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';

@Injectable({
    providedIn: 'root',
})
export class StationResourceService {

    constructor(public readonly http: HttpClient) {}

    /**
     * List Stations
     * @returns StationDto OK
     * @throws ApiError
     */
    public getApiStations(): Observable<Array<StationDto>> {
        return __request(OpenAPI, this.http, {
            method: 'GET',
            url: '/api/stations',
        });
    }

    /**
     * List Visible Stations
     * @returns StationDto OK
     * @throws ApiError
     */
    public getApiStationsVisible(): Observable<Array<StationDto>> {
        return __request(OpenAPI, this.http, {
            method: 'GET',
            url: '/api/stations/visible',
        });
    }

    /**
     * Get Station
     * @param code
     * @returns any OK
     * @throws ApiError
     */
    public getApiStations1(
        code: number,
    ): Observable<any> {
        return __request(OpenAPI, this.http, {
            method: 'GET',
            url: '/api/stations/{code}',
            path: {
                'code': code,
            },
        });
    }

    /**
     * Update Analog Visibility
     * @param analogId
     * @param code
     * @param requestBody
     * @returns any OK
     * @throws ApiError
     */
    public putApiStationsAnalogsVisibility(
        analogId: number,
        code: number,
        requestBody: AnalogVisibilityUpdateRequest,
    ): Observable<any> {
        return __request(OpenAPI, this.http, {
            method: 'PUT',
            url: '/api/stations/{code}/analogs/{analogId}/visibility',
            path: {
                'analogId': analogId,
                'code': code,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                401: `Not Authorized`,
                403: `Not Allowed`,
            },
        });
    }

    /**
     * Query Current
     * @param code
     * @param requestBody
     * @returns CurrentSampleDto OK
     * @throws ApiError
     */
    public postApiStationsCurrentReadings(
        code: number,
        requestBody: CurrentQueryDto,
    ): Observable<Array<CurrentSampleDto>> {
        return __request(OpenAPI, this.http, {
            method: 'POST',
            url: '/api/stations/{code}/current-readings',
            path: {
                'code': code,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }

    /**
     * Upsert Station Photo
     * @param code
     * @param requestBody
     * @returns any OK
     * @throws ApiError
     */
    public putApiStationsPhoto(
        code: number,
        requestBody: StationPhotoUpdateRequest,
    ): Observable<any> {
        return __request(OpenAPI, this.http, {
            method: 'PUT',
            url: '/api/stations/{code}/photo',
            path: {
                'code': code,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                401: `Not Authorized`,
                403: `Not Allowed`,
            },
        });
    }

    /**
     * Delete Station Photo
     * @param code
     * @returns any OK
     * @throws ApiError
     */
    public deleteApiStationsPhoto(
        code: number,
    ): Observable<any> {
        return __request(OpenAPI, this.http, {
            method: 'DELETE',
            url: '/api/stations/{code}/photo',
            path: {
                'code': code,
            },
            errors: {
                401: `Not Authorized`,
                403: `Not Allowed`,
            },
        });
    }

    /**
     * Update Anagrafica
     * @param code
     * @param requestBody
     * @returns any OK
     * @throws ApiError
     */
    public putApiStationsProfile(
        code: number,
        requestBody: StationUpdateRequest,
    ): Observable<any> {
        return __request(OpenAPI, this.http, {
            method: 'PUT',
            url: '/api/stations/{code}/profile',
            path: {
                'code': code,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                401: `Not Authorized`,
                403: `Not Allowed`,
            },
        });
    }

    /**
     * Query Historic
     * @param code
     * @param requestBody
     * @returns HistoricSampleDto OK
     * @throws ApiError
     */
    public postApiStationsReadings(
        code: number,
        requestBody: HistoricQueryDto,
    ): Observable<Array<HistoricSampleDto>> {
        return __request(OpenAPI, this.http, {
            method: 'POST',
            url: '/api/stations/{code}/readings',
            path: {
                'code': code,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }

    /**
     * Update Visibility
     * @param code
     * @param requestBody
     * @returns any OK
     * @throws ApiError
     */
    public putApiStationsVisibility(
        code: number,
        requestBody: StationVisibilityUpdateRequest,
    ): Observable<any> {
        return __request(OpenAPI, this.http, {
            method: 'PUT',
            url: '/api/stations/{code}/visibility',
            path: {
                'code': code,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                401: `Not Authorized`,
                403: `Not Allowed`,
            },
        });
    }

}
