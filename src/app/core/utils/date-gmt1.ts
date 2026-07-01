/*
 * SPDX-License-Identifier: EUPL-1.2
 * Copyright: 2026 Regione Marche
 */
const GMT1_OFFSET_MS = 60 * 60 * 1000;

/**
 * Converts a Date to a new Date object representing the same instant
 * as it would appear in GMT+1 (ora solare), regardless of the browser's
 * local timezone.
 */
export function toGmt1(date: Date): Date {
  const utcMs = date.getTime() + date.getTimezoneOffset() * 60 * 1000;
  return new Date(utcMs + GMT1_OFFSET_MS);
}

/**
 * Formats a Date in GMT+1 (ora solare) as dd/MM/yyyy HH:mm.
 */
export function formatDateGmt1(date: Date): string {
  const d = toGmt1(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes} (GMT+1)`;
}

/**
 * Formats a Date in GMT+1 (ora solare) as dd/MM/yyyy HH:mm:ss.
 */
export function formatDateTimeGmt1(date: Date): string {
  const d = toGmt1(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

/**
 * Converts a Borland TDateTime value to a formatted date string in GMT+1.
 */
export function fromBorlandToDateGmt1(borlandDate: number): string {
  return formatDateGmt1(fromBorlandToDateObject(borlandDate));
}

/**
 * Converts a Borland TDateTime value to a JS Date object.
 * The resulting Date represents the UTC instant; use formatDateGmt1()
 * to display it in GMT+1.
 */
export function fromBorlandToDateObject(borlandDate: number): Date {
  const baseBuild = 36525.0;
  const baseUnix = 946594800.0;
  const diffSeconds = (borlandDate - baseBuild) * 86400.0;
  const unixTime = baseUnix + diffSeconds;
  return new Date(unixTime * 1000);
}


