/*
 * SPDX-License-Identifier: EUPL-1.2
 * Copyright: 2026 Regione Marche
 */
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface CookieConsent {
  technical: boolean;
  analytical: boolean;
  marketing: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class CookieService {
  private showBannerSubject = new BehaviorSubject<boolean>(!localStorage.getItem('cookieConsent'));
  showBanner$ = this.showBannerSubject.asObservable();

  private consentSubject = new BehaviorSubject<CookieConsent>(this.loadConsent());
  consent$ = this.consentSubject.asObservable();

  openBanner() {
    this.showBannerSubject.next(true);
  }

  closeBanner() {
    this.showBannerSubject.next(false);
  }

  setConsent(consent: CookieConsent) {
    localStorage.setItem('cookieConsent', JSON.stringify(consent));
    this.consentSubject.next(consent);
    this.closeBanner();
  }

  resetConsent() {
    localStorage.removeItem('cookieConsent');
    this.openBanner();
  }

  private loadConsent(): CookieConsent {
    const saved = localStorage.getItem('cookieConsent');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Fallback
      }
    }
    return {
      technical: true, // Always true
      analytical: false,
      marketing: false
    };
  }
}
