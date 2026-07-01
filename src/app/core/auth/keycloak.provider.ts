/*
 * SPDX-License-Identifier: EUPL-1.2
 * Copyright: 2026 Regione Marche
 */
import { APP_INITIALIZER, Provider } from '@angular/core';
import Keycloak from 'keycloak-js';
import { environment } from '../../../environments/environment';

const normalizeKeycloakUrl = (rawUrl: string) => {
  const trimmed = rawUrl?.trim();
  if (!trimmed) {
    return window.location.origin;
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed.replace(/\/+$/, '');
  }
  const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${window.location.origin}${path}`.replace(/\/+$/, '');
};

export const keycloak = new Keycloak({
  url: normalizeKeycloakUrl(environment.keycloakUrl),
  realm: 'temporeale',
  clientId: 'temporeale-fe'
});

export const KEYCLOAK_INITIALIZER: Provider = {
  provide: APP_INITIALIZER,
  multi: true,
  useFactory: () => () => {
    return keycloak
      .init({
        onLoad: 'check-sso',
        pkceMethod: 'S256',
        checkLoginIframe: false,
        enableLogging: true,
        responseMode: 'query',
        timeSkew: 300, // 5 minuti di tolleranza
      })
      .then(authenticated => {
        // console.log('Keycloak init completed. Authenticated:', authenticated);
        if (authenticated) {
          // console.log('Token successfully acquired. User:', keycloak.tokenParsed?.['preferred_username']);
        }
        return authenticated;
      })
      .catch(err => {
        console.error('Keycloak init error details:', err);
        // Se c'è un errore, non bloccare l'app ma loggalo bene
        return false;
      });
  }
};

export function provideKeycloak(): Provider[] {
  return [
    { provide: Keycloak, useValue: keycloak }
  ];
}
