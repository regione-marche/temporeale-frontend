/*
 * SPDX-License-Identifier: EUPL-1.2
 * Copyright: 2026 Regione Marche
 */
import type { UsefulLink } from '../app/config/useful-link';

export const environment = {
  production: false,
  organization: 'Regione Marche',
  organizationLink: 'https://www.regione.marche.it/',
  usefulLinks: [
    {
      url: 'https://allertameteo.regione.marche.it/',
      label: 'Allerta Meteo Marche',
      icon: 'horn'
    }
  ] satisfies UsefulLink[],
  keycloakUrl: 'http://localhost:8180',
  headerTitle: 'PROTEZIONE CIVILE - Centro funzionale regionale Marche',
  headerSubtitle: 'RETE MIR - Rete Meteo Idropluviometrica Regionale',
  logoUrl: 'assets/logomarche.jpg',
  homePageTitle: 'Rete M.I.R.',
  homePageTitleSmall: 'Rete Meteo Idropluviometrica Regionale',
  homePageReale: 'DATI IN TEMPO REALE',
  homePagesubreal: 'Dati non validati, con orario sempre riferito all\'ora solare (GMT+1:00) e all\'ultimo valore acquisito nel Sistema. I dati possono essere viziati da interferenze esterne o anomalie strumentali e quindi subire correzioni in fase di validazione.',
  footerText: 'Copyright © 2026 Regione Marche. All rights reserved. Dati tempo reale non validati - Qualunque uso deve essere subordinato a preventiva verifica di qualitá ed é sotto la totale responsabilitá dell\'Utente.',
  sensorLabels: {
    0: 'Pioggia',
    5: 'Temperatura',
    6: 'Umidità',
    10: 'Venti',
    100: 'Idrometria',
    107: 'Nivometria'
  },
  standardSensors: [0, 5, 6, 10, 100, 107],
  standardMeasures: {
    0: [9],
    5: [5],
    6: [5],
    10: [5],
    100: [8],
    107: [5]
  },
  showMeasureSelect: false,
  mapCenter: [43.4083215128806, 13.193726057821696],
  mapZoom: 8,
  showDisclaimer: true,
  disclaimerAcceptanceTtlMinutes: 30,
  updateControl: true,
  useCurrentReadings: false,
  showMarkerValue: false
};
