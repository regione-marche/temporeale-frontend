/*
 * SPDX-License-Identifier: EUPL-1.2
 * Copyright: 2026 Regione Marche
 */
import { inject } from '@angular/core';
import {
  CanActivateFn,
  Router,
  RouterStateSnapshot
} from '@angular/router';
import { environment } from 'src/environments/environment';

export const DISCLAIMER_ACCEPTANCE_UNTIL_MS_KEY = 'disclaimerAcceptanceUntilMs';

/** URL interno verso cui tornare dopo accettazione sul disclaimer (impostato dal guard). */
export const DISCLAIMER_RETURN_URL_KEY = 'disclaimerReturnUrl';

/** Query param sulla route `/disclaimer` quando l'accettazione precedente è scaduta. */
export const DISCLAIMER_SESSION_QUERY_PARAM = 'disclaimerSession';
export const DISCLAIMER_SESSION_EXPIRED_VALUE = 'expired';

export type DisclaimerStatus = 'accepted' | 'expired' | 'required';

/** Primo segmento di path è `disclaimer` (es. `/disclaimer`, `/disclaimer?x=1`). */
function isDisclaimerPath(attemptedUrl: string): boolean {
  const q = attemptedUrl.indexOf('?');
  const h = attemptedUrl.indexOf('#');
  let end = attemptedUrl.length;
  if (q !== -1) {
    end = Math.min(end, q);
  }
  if (h !== -1) {
    end = Math.min(end, h);
  }
  const pathOnly = attemptedUrl.slice(0, end);
  const segments = pathOnly.split('/').filter(Boolean);
  return segments[0] === 'disclaimer';
}

/**
 * Salva l'URL richiesto prima del redirect al disclaimer (evita loop se la destinazione è già il disclaimer).
 */
export function storeDisclaimerReturnUrlIfNeeded(
  _router: Router,
  attemptedUrl: string
): void {
  const trimmed = attemptedUrl.trim();
  if (trimmed === '' || isDisclaimerPath(trimmed)) {
    return;
  }
  sessionStorage.setItem(DISCLAIMER_RETURN_URL_KEY, trimmed);
}

/**
 * Legge e rimuove il return URL; validazione anti open-redirect per uso in `navigateByUrl`.
 */
export function takeSafeDisclaimerReturnUrl(router: Router): string | null {
  const raw = sessionStorage.getItem(DISCLAIMER_RETURN_URL_KEY);
  sessionStorage.removeItem(DISCLAIMER_RETURN_URL_KEY);
  if (raw === null) {
    return null;
  }
  const trimmed = raw.trim();
  if (trimmed === '' || !trimmed.startsWith('/') || trimmed.startsWith('//')) {
    return null;
  }
  try {
    router.parseUrl(trimmed);
  } catch {
    return null;
  }
  return trimmed;
}

export function disclaimerStatus(): DisclaimerStatus {
  const raw = sessionStorage.getItem(DISCLAIMER_ACCEPTANCE_UNTIL_MS_KEY);
  if (raw === null) {
    return 'required';
  }
  const untilMs = Number(raw);
  if (!Number.isFinite(untilMs)) {
    sessionStorage.removeItem(DISCLAIMER_ACCEPTANCE_UNTIL_MS_KEY);
    return 'required';
  }
  const now = Date.now();
  if (untilMs <= now) {
    sessionStorage.removeItem(DISCLAIMER_ACCEPTANCE_UNTIL_MS_KEY);
    return 'expired';
  }
  return 'accepted';
}

export const disclaimerGuard: CanActivateFn = (
  _route,
  state: RouterStateSnapshot
) => {
  const router = inject(Router);

  if (environment.showDisclaimer === false) {
    return true;
  }
  switch (disclaimerStatus()) {
    case 'accepted':
      return true;
    case 'required':
      // storeDisclaimerReturnUrlIfNeeded(router, state.url);
      return router.createUrlTree(['/disclaimer']);
    case 'expired':
      storeDisclaimerReturnUrlIfNeeded(router, state.url);
      return router.createUrlTree(['/disclaimer'], {
        queryParams: {
          [DISCLAIMER_SESSION_QUERY_PARAM]: DISCLAIMER_SESSION_EXPIRED_VALUE
        }
      });
  }
};
