/*
 * SPDX-License-Identifier: EUPL-1.2
 * Copyright: 2026 Regione Marche
 */
import { CommonModule, DOCUMENT } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ItButtonDirective, ItCheckboxComponent, ItIconComponent } from 'design-angular-kit';
// import html2canvas from 'html2canvas';
// import { jsPDF } from 'jspdf';
import {
  DISCLAIMER_ACCEPTANCE_UNTIL_MS_KEY,
  DISCLAIMER_SESSION_EXPIRED_VALUE,
  DISCLAIMER_SESSION_QUERY_PARAM,
  takeSafeDisclaimerReturnUrl
} from '../../core/guards/disclaimer.guard';
import { environment } from 'src/environments/environment';
import { MirDisclaimerTermsComponent } from '../../shared/mir-disclaimer-terms/mir-disclaimer-terms.component';

/** Nome file in `src/assets/` (copiato in `dist/.../assets/`). Sostituisci il PDF reale: finché è il dummy W3C vedrai il testo "Dummy PDF file". */
const DISCLAIMER_PDF_RELATIVE = 'assets/disclaimer_marche.pdf';
const DISCLAIMER_PDF_FILENAME = 'disclaimer_marche.pdf';

@Component({
  selector: 'app-disclaimer-page',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ItCheckboxComponent,
    ItButtonDirective,
    ItIconComponent,
    MirDisclaimerTermsComponent
  ],
  preserveWhitespaces: true,

  templateUrl: './disclaimer-page.component.html',
  styleUrl: './disclaimer-page.component.css'
})
export class DisclaimerPageComponent implements OnInit {
  private readonly doc = inject(DOCUMENT);

  showExpiredNotice = false;

  form = new FormGroup({
    accepted: new FormControl<boolean>(false, {
      nonNullable: true,
      validators: [Validators.requiredTrue]
    })
  });

  submitted = false;

  constructor(
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const session = this.route.snapshot.queryParamMap.get(
      DISCLAIMER_SESSION_QUERY_PARAM
    );
    if (session === DISCLAIMER_SESSION_EXPIRED_VALUE) {
      this.showExpiredNotice = true;
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { [DISCLAIMER_SESSION_QUERY_PARAM]: null },
        queryParamsHandling: 'merge',
        replaceUrl: true
      });
    }
  }

  private disclaimerPdfHref(): string {
    return new URL(DISCLAIMER_PDF_RELATIVE, this.doc.baseURI).href;
  }

  downloadPdf(): void {
    const link = this.doc.createElement('a');
    link.href = this.disclaimerPdfHref();
    link.download = DISCLAIMER_PDF_FILENAME;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    this.doc.body.appendChild(link);
    link.click();
    this.doc.body.removeChild(link);
  }

  /*
   * Comportamento precedente: generazione PDF da DOM (html2canvas + jsPDF).
   * Per riattivarlo: decommentare gli import in cima a questo file e sostituire
   * downloadPdf() con la versione sotto; servono le dipendenze html2canvas e jspdf in package.json.
   *
   * async downloadPdfFromDom(): Promise<void> {
   *   const original = document.getElementById('disclaimerContent');
   *   if (!original) return;
   *
   *   const clone = original.cloneNode(true) as HTMLElement;
   *
   *   Object.assign(clone.style, {
   *     position: 'absolute',
   *     top: '-9999px',
   *     left: '0',
   *     width: original.offsetWidth + 'px',
   *     height: 'auto',
   *     maxHeight: 'none',
   *     overflow: 'visible',
   *     backgroundColor: 'white',
   *     padding: '20px'
   *   });
   *
   *   clone.classList.remove('bg-light');
   *   clone.style.backgroundColor = 'white';
   *
   *   document.body.appendChild(clone);
   *
   *   try {
   *     const canvas = await html2canvas(clone, {
   *       scale: 2,
   *       useCORS: true,
   *       logging: false,
   *       backgroundColor: '#ffffff'
   *     });
   *
   *     const imgData = canvas.toDataURL('image/png');
   *     const pdf = new jsPDF('p', 'mm', 'a4');
   *
   *     const pdfWidth = pdf.internal.pageSize.getWidth();
   *     const pdfHeight = pdf.internal.pageSize.getHeight();
   *
   *     const imgWidth = pdfWidth;
   *     const imgHeight = (canvas.height * imgWidth) / canvas.width;
   *
   *     let heightLeft = imgHeight;
   *     let position = 0;
   *
   *     pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
   *     heightLeft -= pdfHeight;
   *
   *     while (heightLeft > 0) {
   *       position = heightLeft - imgHeight;
   *       pdf.addPage();
   *       pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
   *       heightLeft -= pdfHeight;
   *     }
   *
   *     pdf.save('Termini_e_Condizioni_Rete_MIR.pdf');
   *   } catch (error) {
   *     console.error('Errore nella generazione del PDF:', error);
   *   } finally {
   *     document.body.removeChild(clone);
   *   }
   * }
   */

  enterSite(): void {
    this.submitted = true;

    const acceptedControl = this.form.get('accepted');
    if (!acceptedControl || acceptedControl.invalid) {
      // acceptedControl?.markAsTouched();
      return;
    }

    const untilMs =
      Date.now() + environment.disclaimerAcceptanceTtlMinutes * 60 * 1000;
    sessionStorage.setItem(
      DISCLAIMER_ACCEPTANCE_UNTIL_MS_KEY,
      String(untilMs)
    );
    const target = takeSafeDisclaimerReturnUrl(this.router);
    if (target !== null) {
      void this.router.navigateByUrl(target);
    } else {
      this.router.navigate(['/']);
    }
  }
}
