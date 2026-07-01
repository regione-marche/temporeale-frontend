/*
 * SPDX-License-Identifier: EUPL-1.2
 * Copyright: 2026 Regione Marche
 */
import { Injectable } from '@angular/core';
import Keycloak from 'keycloak-js';
import { keycloak } from './keycloak.provider';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private kc: Keycloak = keycloak;

  isAuthenticated(): boolean {
    return this.kc.authenticated ?? false;
  }

  hasAnyRole(roles: string[]): boolean {
    if (!this.isAuthenticated()) return false;
    return roles.some(r => this.kc.hasRealmRole(r));
  }

  getUsername(): string | null {
    const token = this.kc.tokenParsed as Record<string, unknown> | undefined;
    if (!token) return null;
    const preferred = token['preferred_username'];
    const name = token['name'];
    const givenName = token['given_name'];
    return (preferred || name || givenName) as string | null;
  }

  getFirstName(): string | null {
    const token = this.kc.tokenParsed as Record<string, unknown> | undefined;
    if (!token) return null;
    return (token['given_name'] as string | undefined) ?? null;
  }

  getLastName(): string | null {
    const token = this.kc.tokenParsed as Record<string, unknown> | undefined;
    if (!token) return null;
    return (token['family_name'] as string | undefined) ?? null;
  }

  login() {
    return this.kc.login({ redirectUri: window.location.origin + '/admin' });
  }

  logout() {
    return this.kc.logout({ redirectUri: window.location.origin });
  }
}
