# Temporeale Frontend
> Interfaccia utente web in Angular 19 per il monitoraggio meteorologico della Regione Marche.

Questo repository ospita l'applicazione frontend del sistema **Temporeale**, un portale web moderno e reattivo progettato per visualizzare in tempo reale i dati ambientali (temperatura, pioggia, vento, umidità, altezza neve) provenienti dalle stazioni meteorologiche della **Regione Marche**.

Il portale è rivolto sia alla libera consultazione da parte dei cittadini, sia all'utilizzo interno da parte del personale tecnico dell'amministrazione per la configurazione della visibilità e il caricamento delle foto delle stazioni.

---

## Design, Usabilità e Accessibilità (Standard AGID)

L'applicazione frontend rispetta le direttive grafiche e tecniche stabilite per i siti web della Pubblica Amministrazione italiana:
*   **Design Angular Kit**: L'interfaccia è interamente implementata utilizzando la libreria ufficiale basata su **Bootstrap Italia** e sul design system **Designers Italia / AGID**, garantendo coerenza istituzionale e familiarità visiva.
*   **Accessibilità (Legge Stanca & WCAG 2.1 AA)**: Il codice HTML5 semantico è arricchito con attributi **WAI-ARIA** per garantire la compatibilità con screen reader e tecnologie assistive. L'interfaccia supporta la navigazione sequenziale completa da tastiera (tasto `Tab`) ed offre contrasti di colore elevati per la massima leggibilità.
*   **Visualizzazione Dati Mobile-First**:
    *   **Mappe Leaflet**: Mappe interattive ottimizzate per gesti touch su smartphone e tablet.
    *   **Grafici ECharts**: Visualizzazione delle serie storiche e dei trend meteorologici tramite la libreria open source **ECharts** (licenza Apache-2.0), configurata per riadattare dinamicamente legende e assi su schermi di piccole dimensioni.

---

## Architettura e Flusso Dati

L'applicazione frontend è una Single Page Application (SPA) che interagisce in modo disaccoppiato con il backend tramite chiamate REST. I servizi di chiamata API sono generati in modo asincrono a partire dalla specifica OpenAPI del backend.

```
Client (Browser) ──[HTTP REST JSON]──> Temporeale Backend ──> Database / Keycloak
```

Per maggiori dettagli sull'architettura generale del sistema, consulta il documento di dettaglio:
*   **Architettura di Progetto**: [ARCHITETTURA.md](docs/ARCHITETTURA.md)

---

## Struttura del Repository

```
temporealev2-frontend/
├── docs/
│   └── ARCHITETTURA.md        # Documentazione architetturale condivisa
├── src/
│   ├── app/                   # Componenti logici dell'applicazione
│   ├── assets/                # Immagini, loghi e stili statici
│   └── environments/          # Configurazioni d'ambiente
├── Dockerfile                 # Configurazione Docker standard (Nginx)
├── Dockerfile_marcheCloud     # Variante Dockerfile specifica per Marche Cloud
├── docker-compose.yml         # Configurazione Docker Compose standard (sviluppo/locale)
├── docker-compose_marchecloud.yml # Variante Docker Compose specifica per Marche Cloud
├── angular.json               # Configurazione di Angular CLI
├── package.json               # Dipendenze npm
├── LICENSE                    # Licenza del software
├── publiccode.yml             # Metadati Developers Italia
└── README.md                  # Questo file
```

---

## Prerequisiti e Dipendenze

Per eseguire o compilare il frontend in locale, sono necessari i seguenti strumenti:
*   **Node.js**: versione 18.x o successiva (LTS raccomandata)
*   **npm**: versione 9.x o successiva
*   **Angular CLI**: versione 19.x

### Dipendenze Principali (Open Source)
Tutte le librerie utilizzate sono distribuite con licenze open source compatibili:
*   `@angular/core` (MIT)
*   `bootstrap-italia` (BSD-3-Clause)
*   `design-angular-kit` (BSD-3-Clause)
*   `echarts` (Apache-2.0)
*   `leaflet` (BSD-2-Clause)
*   `keycloak-js` (Apache-2.0)

---

## Setup e Avvio in Ambiente di Sviluppo

### Installazione delle Dipendenze
Accedi alla cartella del frontend ed esegui:
```bash
npm install
```

### Avvio in Locale (Modalità Sviluppo)
Per avviare l'applicazione in locale con ricaricamento automatico (hot reload):
```bash
ng serve
```
L'applicazione sarà accessibile all'indirizzo `http://localhost:4200/`. Di default, le chiamate REST verranno inoltrate al backend in esecuzione locale tramite la configurazione di proxy in `proxy.conf.js`.

---

## Compilazione e Deployment (Produzione)

### Compilazione (Build)
Per generare la versione compilata e ottimizzata per la produzione:
```bash
npm run build
```
L'output della build verrà creato all'interno della directory `dist/temporeale/` ed è pronto per essere servito tramite un web server statico come **Nginx**.

### Esecuzione tramite Docker Compose
Il frontend può essere eseguito containerizzato all'interno di un server web **Nginx**:

1. **Creazione della rete Docker condivisa** (se il backend non è già stato avviato, la rete esterna deve essere creata manualmente):
   ```bash
   docker network create temporeale-backend_temporeale-net
   ```
2. **Avvio dei container**:
   ```bash
   docker compose up -d --build
   ```
   L'applicazione sarà accessibile all'indirizzo `http://localhost:4200/`.

*(Nota: Per l'ambiente specifico di Marche Cloud, è possibile utilizzare in alternativa il file di configurazione dedicato eseguendo `docker compose -f docker-compose_marchecloud.yml up -d --build`).*

---

## Status del Progetto e Limitazioni

*   **Stato**: Stabile.
*   **Limitazioni / Known Issues**:
    *   L'interfaccia dipende completamente dalla disponibilità e dalle performance delle API REST esposte dal backend.
    *   L'accesso alle impostazioni riservate richiede l'autenticazione tramite un Identity Provider Keycloak attivo e configurato.

---

## Contatti, Mantenimento e Sicurezza

### Detentore del Copyright
*   **Regione Marche** (Amministrazione Committente)

### Soggetto Incaricato del Mantenimento
*   **ETG srl**

### Autori e Contributori
L'attribuzione disponibile è riportata nel file [AUTHORS.md](AUTHORS.md).

### Segnalazioni di Sicurezza
> [!IMPORTANT]
> Se rilevi una vulnerabilità di sicurezza all'interno del codice, **NON utilizzare l'issue tracker pubblico** di GitHub per segnalarla. Invia invece una segnalazione riservata e cifrata al seguente indirizzo email di sicurezza:
> *   **Email**: graziano.candelaresi@regione.marche.it`

---

## ⚖️ Licenza

Questo software è distribuito sotto la licenza **European Union Public Licence (EUPL) v. 1.2**.
Per maggiori dettagli, consulta il testo completo all'interno del file [LICENSE](LICENSE) presente nella root del repository.
