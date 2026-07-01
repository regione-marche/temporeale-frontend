/*
 * SPDX-License-Identifier: EUPL-1.2
 * Copyright: 2026 Regione Marche
 */
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CookieService } from './cookie.service';

@Component({
  selector: 'app-cookie-banner',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div *ngIf="cookieService.showBanner$ | async" class="cookie-banner-wrapper" role="region" aria-label="Informativa sui cookie">
      <div class="cookie-banner-content" *ngIf="!showCustomization">
        <div class="cookie-banner-text">
          <h2 class="h6 fw-bold">Gestione Cookie</h2>
          <p>
            Questo sito utilizza cookie per migliorare l'esperienza dell'utente. 
            Cliccando su "Accetta tutto", acconsenti all'uso di tutti i cookie. 
            In alternativa, puoi gestire le tue preferenze.
            Per maggiori informazioni, consulta la nostra <a routerLink="/disclaimer">Termini di utilizzo</a>.
          </p>
        </div>
        <div class="cookie-banner-buttons">
          <button type="button" class="btn btn-primary" (click)="acceptAll()">Accetta tutto</button>
          <button type="button" class="btn btn-outline-primary" (click)="declineAll()">Rifiuta tutti</button>
          <button type="button" class="btn btn-link" (click)="showCustomization = true">Personalizza</button>
        </div>
      </div>

      <div class="cookie-banner-customize" *ngIf="showCustomization">
        <h2 class="h6 fw-bold mb-3">Personalizza preferenze cookie</h2>
        <div class="cookie-options">
          <div class="cookie-option">
            <div class="form-check">
              <input class="form-check-input" type="checkbox" checked disabled id="tech" aria-describedby="desc-tech">
              <label class="form-check-label fw-bold" for="tech">Tecnici (Necessari)</label>
            </div>
            <p id="desc-tech" class="small text-muted">Essenziali per il funzionamento del sito. Non possono essere disattivati.</p>
          </div>
          
          <div class="cookie-option">
            <div class="form-check">
              <input class="form-check-input" type="checkbox" [(ngModel)]="tempConsent.analytical" id="analyt" aria-describedby="desc-analyt">
              <label class="form-check-label fw-bold" for="analyt">Analitici</label>
            </div>
            <p id="desc-analyt" class="small text-muted">Ci aiutano a capire come gli utenti interagiscono con il sito per migliorarne le performance.</p>
          </div>

          <div class="cookie-option">
            <div class="form-check">
              <input class="form-check-input" type="checkbox" [(ngModel)]="tempConsent.marketing" id="mark" aria-describedby="desc-mark">
              <label class="form-check-label fw-bold" for="mark">Marketing</label>
            </div>
            <p id="desc-mark" class="small text-muted">Utilizzati per mostrare contenuti e pubblicità pertinenti ai tuoi interessi.</p>
          </div>
        </div>
        <div class="cookie-banner-buttons mt-3">
          <button type="button" class="btn btn-primary" (click)="saveChoices()">Salva scelte</button>
          <button type="button" class="btn btn-outline-primary" (click)="showCustomization = false">Torna indietro</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .cookie-banner-wrapper {
      position: fixed;
      bottom: 2rem;
      left: 1.5rem;
      right: 1.5rem;
      max-width: 800px;
      background: white;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
      z-index: 10000;
      padding: 1.5rem;
      border-radius: 8px;
      border-left: 5px solid #0C6AAF;
    }
    @media (min-width: 992px) {
        .cookie-banner-wrapper {
            bottom: 2rem;
            left: 2rem;
            right: auto;
            width: 450px;
        }
    }
    .cookie-banner-content {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .cookie-banner-text p {
      margin: 0;
      font-size: 0.85rem;
      color: #333;
      line-height: 1.4;
    }
    .cookie-banner-buttons {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      align-items: center;
    }
    .cookie-option {
        margin-bottom: 1rem;
        padding-bottom: 0.5rem;
        border-bottom: 1px solid #eee;
    }
    .cookie-option:last-child {
        border-bottom: none;
    }
    .btn {
      padding: 0.4rem 0.8rem;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .btn-primary {
      background-color: #0C6AAF;
      color: white;
      border: none;
    }
    .btn-outline-primary {
      background-color: transparent;
      color: #0C6AAF;
      border: 1px solid #0C6AAF;
    }
    .btn-link {
        background: none;
        border: none;
        color: #0C6AAF;
        padding: 0;
        text-decoration: underline;
    }
  `]
})
export class CookieBannerComponent {
  showCustomization = false;
  tempConsent = {
    technical: true,
    analytical: false,
    marketing: false
  };

  constructor(public cookieService: CookieService) {}

  acceptAll() {
    this.cookieService.setConsent({
      technical: true,
      analytical: true,
      marketing: true
    });
  }

  declineAll() {
    this.cookieService.setConsent({
      technical: true,
      analytical: false,
      marketing: false
    });
  }

  saveChoices() {
    this.cookieService.setConsent(this.tempConsent);
  }
}
