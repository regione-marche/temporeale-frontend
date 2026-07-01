/*
 * SPDX-License-Identifier: EUPL-1.2
 * Copyright: 2026 Regione Marche
 */
import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { disclaimerGuard } from './core/guards/disclaimer.guard';

export const routes: Routes = [
  { 
    path: 'disclaimer', 
    loadComponent: () => import('./features/disclaimer/disclaimer-page.component').then(m => m.DisclaimerPageComponent) 
  },
  { 
    path: '', 
    loadComponent: () => import('./features/home/home-page.component').then(m => m.HomePageComponent), 
    canActivate: [disclaimerGuard] 
  },
  { 
    path: 'stations/:id/profile', 
    loadComponent: () => import('./features/station/station-profile.component').then(m => m.StationProfileComponent), 
    canActivate: [disclaimerGuard] 
  },
  { 
    path: 'stations/:id/data', 
    loadComponent: () => import('./features/station/station-detail.component').then(m => m.StationDetailComponent), 
    canActivate: [disclaimerGuard] 
  },
  { 
    path: 'admin', 
    loadComponent: () => import('./features/admin/admin-page.component').then(m => m.AdminPageComponent), 
    canActivate: [authGuard], 
    data: { roles: ['admin'] } 
  },
  { path: '**', redirectTo: '' }
];
