/*
 * SPDX-License-Identifier: EUPL-1.2
 * Copyright: 2026 Regione Marche
 */
/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { AnalogDto } from './AnalogDto';
import type { StationPhotoDto } from './StationPhotoDto';
import type { StationVisibilityDto } from './StationVisibilityDto';

export type StationDto = {
    code?: number;
    name?: string;
    locality?: string;
    municipality?: string;
    province?: string;
    latitude?: string;
    longitude?: string;
    altitude?: string;
    river?: string;
    basin?: string;
    subBasin?: string;
    imageName?: string;
    note?: string;
    analogs?: Array<AnalogDto>;
    stationVisibility?: StationVisibilityDto;
    stationPhoto?: StationPhotoDto;
};

