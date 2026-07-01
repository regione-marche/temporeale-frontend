/*
 * SPDX-License-Identifier: EUPL-1.2
 * Copyright: 2026 Regione Marche
 */
/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { JsonNodeType } from './JsonNodeType';

export type JsonNode = {
    empty?: boolean;
    valueNode?: boolean;
    containerNode?: boolean;
    missingNode?: boolean;
    array?: boolean;
    object?: boolean;
    nodeType?: JsonNodeType;
    pojo?: boolean;
    number?: boolean;
    integralNumber?: boolean;
    floatingPointNumber?: boolean;
    short?: boolean;
    int?: boolean;
    long?: boolean;
    float?: boolean;
    double?: boolean;
    bigDecimal?: boolean;
    bigInteger?: boolean;
    textual?: boolean;
    boolean?: boolean;
    null?: boolean;
    binary?: boolean;
};

