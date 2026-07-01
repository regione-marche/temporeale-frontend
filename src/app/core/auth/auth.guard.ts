/*
 * SPDX-License-Identifier: EUPL-1.2
 * Copyright: 2026 Regione Marche
 */
import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { keycloak } from './keycloak.provider';

export const authGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const router = inject(Router);
  const auth = inject(AuthService);
  const roles = (route.data?.['roles'] as string[]) || [];
  if (roles.length === 0) {
    return true;
  }

  if (auth.hasAnyRole(roles)) {
    return true;
  }

  // Prevenzione loop: se siamo già autenticati ma senza ruoli, non riprovare login
  if (auth.isAuthenticated() && roles.length > 0) {
    console.warn('[Guard] Authenticated but missing roles:', roles);
    router.navigateByUrl('/');
    return false;
  }

  // Se non siamo autenticati e non siamo in un callback di Keycloak, allora login
  const urlParams = new URLSearchParams(window.location.search);
  const hasAuthParams = urlParams.has('code') || urlParams.has('error');

  if (!auth.isAuthenticated() && !hasAuthParams) {
    // console.log('[Guard] Not authenticated, redirecting to login...');
    const redirectUri = `${window.location.origin}${window.location.pathname}`;
    keycloak.login({ redirectUri });
    return false;
  }

  if (hasAuthParams && !auth.isAuthenticated()) {
      console.error('[Guard] Still not authenticated after Keycloak callback. Possible init issue.');
      // Avoid loop, just go home or show error
      router.navigateByUrl('/');
      return false;
  }

  // Authenticated but no role -> Home (or Access Denied page)
  router.navigateByUrl('/');
  return false;
};
