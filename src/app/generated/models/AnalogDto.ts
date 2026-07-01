/*
 * SPDX-License-Identifier: EUPL-1.2
 * Copyright: 2026 Regione Marche
 */
/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { AnalogVisibilityDto } from './AnalogVisibilityDto';
import type { Sensor } from './Sensor';

export type AnalogDto = {
    sensorType?: number;
    description?: string;
    value?: number;
    trend?: number;
    unit?: string;
    decimals?: number;
    lastUpdateTime?: string;
    analogVisibility?: AnalogVisibilityDto;
    sensor?: Sensor;
};

