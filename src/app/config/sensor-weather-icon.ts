/*
 * SPDX-License-Identifier: EUPL-1.2
 * Copyright: 2026 Regione Marche
 */

export const SENSOR_FILTER_ALL_ICON_CLASS = 'sensor-filter-all-icon';


export function sensorTypeToWeatherIconClass(sensorType: number | null | undefined): string {
  if (sensorType === null || sensorType === undefined || Number.isNaN(Number(sensorType))) {
    return 'wi wi-meteor';
  }
  switch (Number(sensorType)) {
    case 0:
      return 'wi wi-rain';
    case 5:
      return 'wi wi-thermometer';
    case 6:
      return 'wi wi-humidity';
    case 9:
      return 'wi wi-wind-direction';
    case 10:
      return 'wi wi-strong-wind';
    case 100:
      return 'wi wi-flood';
    case 107:
      return 'wi wi-snow';
    default:
      return 'wi wi-meteor';
  }
}
