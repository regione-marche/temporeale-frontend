/*
 * SPDX-License-Identifier: EUPL-1.2
 * Copyright: 2026 Regione Marche
 */
import { HttpEvent, HttpHandlerFn, HttpInterceptorFn, HttpRequest, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, of, tap } from 'rxjs';
import { HttpCacheService } from './http-cache.service';

export const httpCacheInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> => {
  const cache = inject(HttpCacheService);

  // Se la richiesta NON è GET, invalida tutta la cache (es: salvataggio note)
  if (req.method !== 'GET') {
    cache.clear();
    return next(req);
  }

  // Escludi esplicitamente alcuni endpoint dalla cache se necessario (stazioni e sensori devono essere freschi)
  const excludedKeywords = ['/api/stations', '/api/sensors', '/api/measures'];
  if (excludedKeywords.some(keyword => req.url.includes(keyword))) {
    return next(req.clone({
      setHeaders: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    }));
  }

  // Se è una GET, verifica se c'è una risposta valida in cache
  const cachedResponse = cache.get(req.urlWithParams);
  if (cachedResponse) {
    // console.log(`[HttpCache] Returning cached response for: ${req.urlWithParams}`);
    return of(cachedResponse);
  }

  // Se non è in cache, prosegui e salva la risposta (se è un successo HTTP 200)
  return next(req).pipe(
    tap(event => {
      if (event instanceof HttpResponse && event.status === 200) {
        // console.log(`[HttpCache] Caching response for: ${req.urlWithParams}`);
        cache.put(req.urlWithParams, event);
      }
    })
  );
};
