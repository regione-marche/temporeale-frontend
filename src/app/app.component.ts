/*
 * SPDX-License-Identifier: EUPL-1.2
 * Copyright: 2026 Regione Marche
 */
import { Component, ViewChild } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { ItHeaderComponent } from 'design-angular-kit';
import { filter } from 'rxjs';
import { environment } from '../environments/environment';
import { AuthService } from './core/auth/auth.service';
import { CookieService } from './core/cookie-banner/cookie.service';


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
  standalone: false
})
export class AppComponent {
  @ViewChild(ItHeaderComponent) header!: ItHeaderComponent;

  env = environment;
  light = false;
  sticky = false;
  search = false;
  loginStyle: 'none' | 'default' | 'full' = 'none';
  currentUrl = '';

  constructor(private auth: AuthService, private router: Router, private cookieService: CookieService) {
    this.currentUrl = this.router.url;
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe(event => {
      this.currentUrl = event.urlAfterRedirects || event.url;
      this.header?.closeNavBar();
    });
  }

  isAuth() { return this.auth.isAuthenticated(); }
  firstName() { return this.auth.getFirstName(); }
  lastName() { return this.auth.getLastName(); }
  userName() { return this.auth.getUsername(); }
  greetingName(): string | null {
    const first = this.firstName();
    const last = this.lastName();
    if (first && last) return `${first} ${last}`;
    if (first) return first;
    if (last) return last;
    return this.userName();
  }
  login() { this.auth.login(); }
  logout() { this.auth.logout(); }
  isAdmin() { return this.auth.hasAnyRole(['admin']); }
  isStationDetailRoute() {
    return this.currentUrl.startsWith('/stations/') && !this.currentUrl.includes('profile');
  }
  isAdminRoute() {
    return this.currentUrl.startsWith('/admin');
  }
  isHomeRoute() {
    return this.currentUrl === '/' || this.currentUrl.startsWith('/?');
  }
  hasNavItems() {
    return this.isAuth() && (this.isStationDetailRoute() || this.isAdmin() || this.isAdminRoute());
  }
  openCookieBanner() {
    this.cookieService.openBanner();
  }
}
