/*
 * SPDX-License-Identifier: EUPL-1.2
 * Copyright: 2026 Regione Marche
 */
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './app/app.module';

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.error(err));
