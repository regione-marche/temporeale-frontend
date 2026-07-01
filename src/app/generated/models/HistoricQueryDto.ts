/*
 * SPDX-License-Identifier: EUPL-1.2
 * Copyright: 2026 Regione Marche
 */
/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { OffsetDateTime } from './OffsetDateTime';

export type HistoricQueryDto = {
    sensorType: number;
    measure: number;
    daily?: boolean;
    hoursBack: number;
    from?: OffsetDateTime;
    to?: OffsetDateTime;
};

