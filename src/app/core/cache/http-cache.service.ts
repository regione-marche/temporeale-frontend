/*
 * SPDX-License-Identifier: EUPL-1.2
 * Copyright: 2026 Regione Marche
 */
import { HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class HttpCacheService {
  private cache = new Map<string, { response: HttpResponse<any>, expiry: number }>();
  private readonly DEFAULT_TTL = 300000; // 5 minuti

  put(url: string, response: HttpResponse<any>, ttl: number = this.DEFAULT_TTL): void {
    this.cache.set(url, { response, expiry: Date.now() + ttl });
  }

  get(url: string): HttpResponse<any> | undefined {
    const entry = this.cache.get(url);
    if (!entry) return undefined;

    if (Date.now() > entry.expiry) {
      this.cache.delete(url);
      return undefined;
    }

    return entry.response;
  }

  clear(): void {
    // console.log('[HttpCache] Clearing cache due to mutation request');
    this.cache.clear();
  }
}
