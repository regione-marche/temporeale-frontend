/*
 * SPDX-License-Identifier: EUPL-1.2
 * Copyright: 2026 Regione Marche
 */
import { HttpEvent, HttpHandlerFn, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { ItNotificationService } from 'design-angular-kit';
import { Observable, from, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { keycloak } from './keycloak.provider';

export const tokenInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> => {
  const kc = keycloak;
  const router = inject(Router);
  const notifications = inject(ItNotificationService);
  
  if (!kc.authenticated) {
    // console.warn('[Interceptor] Not authenticated, sending request without token');
    return next(req);
  }

  return from(kc.updateToken(30)).pipe(
    switchMap(() => {
      const token = kc.token;
      const authReq = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
      return next(authReq).pipe(
        catchError(err => {
          // Se riceviamo un 401 dal server, il token è probabilmente scaduto/invalido
          if (err.status === 401) {
            console.error('[Interceptor] Server returned 401 Unauthorized');
            notifications.error('Accesso Negato', 'Sessione scaduta o non autorizzata. Reindirizzamento alla home...');
            router.navigate(['/']);
          }
          return throwError(() => err);
        })
      );
    }),
    catchError(err => {
      console.error('[Interceptor] Failed to refresh token or request error', err);
      
      // Quando il token fallisce il refresh (sessione scaduta o altro)
      // Se non è già stato gestito sopra (per evitare notifiche doppie)
      if (err.status !== 401) {
        notifications.error('Sessione Scaduta', 'La sessione è scaduta. Reindirizzamento alla home...');
        router.navigate(['/']);
      }
      
      return throwError(() => err);
    })
  );
};
