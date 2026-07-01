/*
 * SPDX-License-Identifier: EUPL-1.2
 * Copyright: 2026 Regione Marche
 */
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouterModule } from '@angular/router';

import { DesignAngularKitModule } from 'design-angular-kit';

import { AppComponent } from './app.component';
import { routes } from './app.routes';
import { KEYCLOAK_INITIALIZER, provideKeycloak } from './core/auth/keycloak.provider';
import { tokenInterceptor } from './core/auth/token.interceptor';
import { httpCacheInterceptor } from './core/cache/http-cache.interceptor';
import { CookieBannerComponent } from './core/cookie-banner/cookie-banner.component';
import { clientIdInterceptor } from './core/interceptors/client-id.interceptor';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    RouterModule.forRoot(routes),
    DesignAngularKitModule.forRoot({
      assetBasePath: '/bootstrap-italia'
    }),
    CookieBannerComponent
  ],
  providers: [
    provideHttpClient(withInterceptors([clientIdInterceptor, httpCacheInterceptor, tokenInterceptor])),
    provideKeycloak(),
    KEYCLOAK_INITIALIZER
  ],
  bootstrap: [AppComponent]
})
export class AppModule {
}
