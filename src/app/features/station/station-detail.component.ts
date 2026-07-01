/*
 * SPDX-License-Identifier: EUPL-1.2
 * Copyright: 2026 Regione Marche
 */
import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DropdownDirection, ItButtonDirective, ItDropdownComponent, ItDropdownItemComponent, ItIconComponent, ItModalComponent, ItSelectComponent, ItSpinnerComponent, SelectControlOption } from 'design-angular-kit';
import * as echarts from 'echarts';
import { jsPDF } from 'jspdf';
import { finalize, forkJoin, Subscription } from 'rxjs';
import { CoreHubService } from 'src/app/core/services/core-hub.service';
import { formatDateGmt1, toGmt1 } from 'src/app/core/utils/date-gmt1';
import { MirDisclaimerTermsComponent } from 'src/app/shared/mir-disclaimer-terms/mir-disclaimer-terms.component';
import { environment } from 'src/environments/environment';
import { sensorTypeToWeatherIconClass } from '../../config/sensor-weather-icon';
import { HistoricQueryDto, HistoricSampleDto, Measure, StationDto } from '../../generated';

type StationSensorIconOption = {
  value: number;
  text: string;
  weatherIconClass: string;
};

type PeriodIconOption = {
  value: number;
  text: string;
  iconClass: string;
};

/** Provenienza verso la pagina dati/grafici (`stations/:id/data`). */
type DataPageFrom = 'profile' | 'map' | 'table';

// ECharts non richiede pre-inizializzazione moduli o localizzazione globale


@Component({
    selector: 'app-station-detail',
    imports: [
        CommonModule,
        FormsModule,
    ItSelectComponent,
    ItButtonDirective,
    ItIconComponent,
    ItSpinnerComponent,
    ItDropdownComponent,
    ItDropdownItemComponent,
    ItModalComponent,
    MirDisclaimerTermsComponent
  ],
    templateUrl: './station-detail.component.html',
    styleUrl: './station-detail.component.css'
})
export class StationDetailComponent implements OnInit, OnDestroy {
  env = environment;
  /** Codice stazione dalla route (`:id`), per link ad anagrafica. */
  stationRouteId = '';
  /** Origine navigazione verso questa pagina (query `from`). */
  fromSource: DataPageFrom | null = null;
  private queryParamSub?: Subscription;

  station!: StationDto;
  historic: HistoricSampleDto[] = [];
  historicWindDir: HistoricSampleDto[] = [];
  private chartInstance?: echarts.ECharts;
  selectedSensor?: number;
  selectedSensorName?: string;
  selectedSensorUnit?: string;
  selectedMeasure = 0;
  measures: Measure[] = [];
  isLoading = false;


  color?: "primary";
  isDark = false;
  isFullWidth = false;
  withHeading = true;

  menuPlacement: DropdownDirection = 'dropup';

  items = [
    {
      link: 'https://www.google.com',
      active: false,
      disabled: false,
      large: true,
      icon: 'star-outline',
      iconPosition: 'right',
      text: 'Item 1',
    },]

  
  // Time selection
  timeMode: 'relative' | 'absolute' = 'relative';
  hoursBack = 24;
  dateFrom: Date | null = null;
  dateTo: Date | null = null;

  openedAccordion: string | null = null;

  toggleAccordion(section: string): void {
    if (this.openedAccordion === section) {
      this.openedAccordion = null;
    } else {
      this.openedAccordion = section;
    }
    setTimeout(() => {
      if (this.chartInstance) {
        this.chartInstance.resize();
      }
    }, 300);
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private hub: CoreHubService
  ) {}

  private parseFromParam(raw: string | null): DataPageFrom | null {
    if (raw === 'profile' || raw === 'map' || raw === 'table') {
      return raw;
    }
    return null;
  }

  /** Home in modalità mappa; mantiene `sensor`, rimuove `from` e `view`. */
  navigateToHomeMap(): void {
    this.router.navigate(['/'], {
      queryParams: { from: null, view: null },
      queryParamsHandling: 'merge'
    });
  }

  /** Home in modalità tabella; mantiene `sensor`. */
  navigateToHomeTable(): void {
    this.router.navigate(['/'], {
      queryParams: { from: null, view: 'table' },
      queryParamsHandling: 'merge'
    });
  }

  navigateToProfile(): void {
    this.router.navigate(['/stations', this.stationRouteId, 'profile'], {
      queryParamsHandling: 'merge'
    });
  }

  get sensorIconOptions(): StationSensorIconOption[] {
    return this.standardAnalogs.map(a => ({
      value: a.sensorType!,
      text: this.sensorDisplayName(a.sensorType, a.sensor?.description),
      weatherIconClass: sensorTypeToWeatherIconClass(a.sensorType)
    }));
  }

  get standardAnalogs() {
    return this.station?.analogs?.filter(a => 
      environment.standardSensors.includes(a.sensorType!) && 
      a.analogVisibility?.visible !== false
    ).sort((a, b) => environment.standardSensors.indexOf(a.sensorType!) - environment.standardSensors.indexOf(b.sensorType!)) || [];
  }

  get measureOptions(): SelectControlOption[] {
    const stdMeasures = (environment as any).standardMeasures[this.selectedSensor!] || [];
    return this.measures
      .filter(m => stdMeasures.includes(m.id))
      .map(m => ({
        value: m.id,
        text: m.description || `Mis ${m.id}`
      }));
  }

  get periodIconOptions(): PeriodIconOption[] {
    return [
      { value: 12, text: 'Ultime 12 Ore', iconClass: 'wi wi-time-2' },
      { value: 24, text: 'Ultime 24 Ore', iconClass: 'wi wi-time-4' },
      { value: 36, text: 'Ultime 36 Ore', iconClass: 'wi wi-time-6' },
      { value: 48, text: 'Ultime 48 Ore', iconClass: 'wi wi-time-8' },
      { value: 72, text: 'Ultime 72 Ore', iconClass: 'wi wi-time-10' },
      { value: 168, text: 'Ultima Settimana', iconClass: 'wi wi-time-12' }
    ];
  }

  get dateFromStr(): string { return this.dateFrom ? this.dateFrom.toISOString().split('T')[0] : ''; }
  set dateFromStr(v: string) { this.dateFrom = v ? new Date(v) : null; }

  get dateToStr(): string { return this.dateTo ? this.dateTo.toISOString().split('T')[0] : ''; }
  set dateToStr(v: string) { this.dateTo = v ? new Date(v) : null; }

  trackBySensor(_index: number, item: StationSensorIconOption): number {
    return item.value;
  }

  trackByPeriod(_index: number, item: PeriodIconOption): number {
    return item.value;
  }

  ngOnInit(): void {
    this.stationRouteId = this.route.snapshot.paramMap.get('id') ?? '';
    this.fromSource = this.parseFromParam(this.route.snapshot.queryParamMap.get('from'));
    this.queryParamSub = this.route.queryParamMap.subscribe(q => {
      this.fromSource = this.parseFromParam(q.get('from'));
    });

    const id = Number(this.route.snapshot.paramMap.get('id'));
    const initialSensorParam = this.route.snapshot.queryParamMap.get('sensor');
    
    this.hub.measure.getApiMeasures().subscribe(m => this.measures = m);
    
    this.hub.station.getApiStations1(id).subscribe(s => {
      this.station = s as StationDto;
      if (this.station.analogs) {
        const standard = this.station.analogs
          .filter(a => environment.standardSensors.includes(a.sensorType!) && a.analogVisibility?.visible !== false)
          .sort((a, b) => environment.standardSensors.indexOf(a.sensorType!) - environment.standardSensors.indexOf(b.sensorType!));
        
        if (standard.length > 0) {
          let selection = standard[0].sensorType!;

          if (initialSensorParam) {
            const requestedSenderId = Number(initialSensorParam);
            const found = standard.find(a => a.sensorType === requestedSenderId);
            if (found) {
              selection = requestedSenderId;
            }
          }

          this.selectedSensor = selection;
          
          const stdMeasures = (environment as any).standardMeasures[selection];
          if (stdMeasures && stdMeasures.length > 0) {
             this.selectedMeasure = stdMeasures[0];
          }
          
          this.loadHistoric();
        }
      }
    });
  }

  onSensorSelect(sensorType: any) {
    const sType = Number(sensorType);
    if (this.selectedSensor === sType) {
      return;
    }
    this.selectedSensor = sType;

    const stdMeasures = (environment as any).standardMeasures[sType];
    if (stdMeasures && stdMeasures.length > 0) {
      this.selectedMeasure = stdMeasures[0];
    }

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { sensor: sType },
      queryParamsHandling: 'merge'
    });

    this.loadHistoric();
  }

  onPeriodSelect(hours: number): void {
    if (this.hoursBack === hours) {
      return;
    }
    this.hoursBack = hours;
    this.loadHistoric();
  }

  loadHistoric() {

    
    // if (!this.station || !this.selectedSensor || !this.selectedMeasure) return;


    
    const sensor = Number(this.selectedSensor);
    const analog = this.station.analogs?.find(a => a.sensorType === sensor);
    this.selectedSensorName = this.sensorDisplayName(sensor, analog?.description ?? analog?.sensor?.description);
    this.selectedSensorUnit = analog?.unit ?? '';



    const q: HistoricQueryDto = { 
      sensorType: sensor,
      measure: environment.useCurrentReadings ? 17 : Number(this.selectedMeasure), 
      daily: false, 
      hoursBack: this.hoursBack
    };



    this.isLoading = true;
    
    const requests: any[] = [
      environment.useCurrentReadings 
        ? this.hub.station.postApiStationsCurrentReadings(this.station.code, q)
        : this.hub.station.postApiStationsReadings(this.station.code, q)
    ];
    if (sensor === 10) {
      const qDir: HistoricQueryDto = {
        sensorType: 9,
        measure: environment.useCurrentReadings ? 17 : 5,
        daily: false,
        hoursBack: this.hoursBack
      };

      requests.push(
        environment.useCurrentReadings
          ? this.hub.station.postApiStationsCurrentReadings(this.station.code, qDir)
          : this.hub.station.postApiStationsReadings(this.station.code, qDir)
      );
    }


    forkJoin(requests)
      .pipe(finalize(() => this.isLoading = false))
      .subscribe((results: any[]) => {
        this.historic = results[0];
        this.historicWindDir = results.length > 1 ? results[1] : [];
        if (this.historic.length > 0) {
          setTimeout(() => this.renderChart(), 0);
        }
      });
  }

  @HostListener('window:resize')
  onResize(): void {
    this.chartInstance?.resize();
  }

  ngOnDestroy(): void {
    this.queryParamSub?.unsubscribe();
    this.chartInstance?.dispose();
  }

  private renderChart() {
    this.chartInstance?.dispose();

    const container = document.getElementById('chart-container');
    if (!container) return;

    this.chartInstance = echarts.init(container);

    const isMobile = window.innerWidth < 768;

    const selectedSensorId = Number(this.selectedSensor);
    const seriesData = this.historic.map(h => {
      const raw = h.value;
      const y =
        raw == null || typeof raw !== 'number' || !Number.isFinite(raw)
          ? null
          : this.quantizeSensorYValue(raw, selectedSensorId);
      return [new Date(h.timestamp).getTime(), y] as [number, number | null];
    });

    const isRain = selectedSensorId === 0;
    const isWind = selectedSensorId === 10;

    const valueDecimalsForExport = (sensorType: number): number => {
      switch (sensorType) {
        case 5: return 1; // Temperatura
        case 6: return 0; // Umidità
        case 100: return 2; // Idrometria
        default: return 1;
      }
    };
    const genericExportDecimals = valueDecimalsForExport(selectedSensorId);
    const unit = this.selectedSensorUnit ? ` ${this.selectedSensorUnit}` : '';

    const series: any[] = [];
    let yAxisConfig: any[] = [];

    const formatNumberIt = (val: number, decimals: number): string => {
      if (val === 0) return '0';
      const truncated = this.truncateToNDecimals(val, decimals);
      return truncated.toFixed(decimals).replace('.', ',');
    };

    if (isRain) {
      // 1. Histogram (Pioggia 15 min) - Celestino
      series.push({
        type: 'bar',
        name: "Pioggia ogni 15'",
        data: seriesData,
        color: '#87CEEB',
        yAxisIndex: 0,
        large: true
      });

      // 2. Cumulative (Pioggia cumulata) - Arancione
      let sum = 0;
      const cumulativeData = seriesData.map(p => {
        sum += p[1] || 0;
        return [p[0], sum] as [number, number];
      });

      series.push({
        type: 'line',
        name: 'Pioggia cumulata',
        data: cumulativeData,
        color: '#FFA500',
        lineWidth: 2,
        step: 'start',
        yAxisIndex: 1,
        showSymbol: false,
        z: 5
      });

      yAxisConfig = [
        {
          type: 'value',
          name: "Pioggia ogni 15' (mm)",
          nameTextStyle: { color: '#87CEEB', padding: [0, 0, 10, 0], fontSize: isMobile ? 10 : 12 },
          axisLabel: { color: '#87CEEB', fontSize: isMobile ? 10 : 12 },
          splitLine: { show: true }
        },
        {
          type: 'value',
          name: `Pioggia cumulata (${this.selectedSensorUnit})`,
          nameTextStyle: { color: '#FFA500', padding: [0, 0, 10, 0], fontSize: isMobile ? 10 : 12 },
          axisLabel: { color: '#FFA500', fontSize: isMobile ? 10 : 12 },
          splitLine: { show: false },
          position: 'right'
        }
      ];
    } else if (isWind) {
      // 1. Wind Speed (Blue Line)
      series.push({
        type: 'line',
        name: this.selectedSensorName || 'Velocità Vento',
        data: seriesData,
        yAxisIndex: 0,
        smooth: true,
        showSymbol: false,
        color: '#87CEEB',
        lineStyle: { width: 2 }
      });

      // 2. Wind Direction (Icons + values like Puglia implementation)
      const windDirDecimals = 2; // Force 2 decimals for direction
      
      const sensorDataIcons: any[] = [];
      const dvData: any[] = [];
      
      // Sample to max 24 icons to avoid clutter (12 on mobile)
      const targetIconCount = isMobile ? 12 : 24;
      const stride = Math.max(1, Math.ceil(this.historicWindDir.length / targetIconCount));
      
      this.historicWindDir.forEach((rec, index) => {
        const dateTime = new Date(rec.timestamp).getTime();
        const rawVal = rec.value;
        
        if (rawVal != null) {
          const deg = (rawVal - 1) * 22.5;
          const valTrunc = this.truncateToNDecimals(deg, windDirDecimals);

          // Only add icon if this index should be sampled
          if (index % stride === 0 || index === this.historicWindDir.length - 1) {
            sensorDataIcons.push({
              value: [dateTime, 360],
              symbolRotate: (180 - deg + 360) % 360,
              val: valTrunc
            });
          }
          
          // Always add to invisible series for tooltip
          dvData.push([dateTime, valTrunc]);
        }
      });

      // Series with icons (scatter)
      series.push({
        type: 'scatter',
        yAxisIndex: 1,
        name: 'Direzione Vento',
        data: sensorDataIcons,
        symbol: 'path://M12 2L2 22l10-6 10 6L12 2z',
        symbolSize: isMobile ? 10 : 15,
        itemStyle: {
          color: '#ffffff',
          borderColor: '#333333',
          borderWidth: 1.5
        },
        z: 10
      });

      // Invisible series for tooltip values
      series.push({
        type: 'line',
        yAxisIndex: 1,
        name: 'Direzione Vento',
        data: dvData,
        color: 'transparent',
        showSymbol: false,
        lineStyle: { width: 0 },
        z: 1
      });

      yAxisConfig = [
        {
          type: 'value',
          name: `${this.selectedSensorName} (${this.selectedSensorUnit})`,
          nameTextStyle: { color: '#87CEEB', padding: [0, 0, 10, 0], fontSize: isMobile ? 10 : 12 },
          axisLabel: { color: '#87CEEB', fontSize: isMobile ? 10 : 12 },
          splitLine: { show: true }
        },
        {
          type: 'value',
          min: 0,
          max: 365,
          show: false,
          splitLine: { show: false }
        }
      ];
    } else {
      const name = this.selectedSensorName || 'Valore';
      
      series.push({
        type: 'line',
        name: name,
        data: seriesData,
        smooth: true,
        showSymbol: false,
        color: '#87CEEB',
        lineStyle: { width: 2 }
      });

      const yAxisTitle = `${this.selectedSensorName} (${this.selectedSensorUnit})`;
      yAxisConfig = [
        {
          type: 'value',
          name: yAxisTitle,
          nameTextStyle: { color: '#87CEEB', padding: [0, 0, 10, 0], fontSize: isMobile ? 10 : 12 },
          axisLabel: {
            color: '#87CEEB',
            fontSize: isMobile ? 10 : 12,
            formatter: selectedSensorId === 100 
              ? (value: number) => value.toFixed(2).replace('.', ',')
              : undefined
          },
          splitLine: { show: true }
        }
      ];
    }

    const displayTitle = this.selectedSensor === 100 ? 'Livello idrometrico' : this.selectedSensorName;
    const altitudeStr = this.station.altitude ? `${this.station.altitude} m` : '-';
    const basinStr = this.station.basin || '-';

    const line1 = `${this.station.name} - ${displayTitle}`;
    let line2 = `Quota ${altitudeStr} - Bacino: ${basinStr}`;
    if (this.selectedSensor === 100) {
      line2 += ` - Fiume: ${this.station.river || '-'}`;
    }

    let lastDataStr = '-';
    if (this.historic.length > 0) {
      const lastTs = this.historic[this.historic.length - 1]?.timestamp;
      if (lastTs) {
        lastDataStr = formatDateGmt1(new Date(lastTs));
      }
    }

    const option: echarts.EChartsOption = {
      title: {
        text: line1,
        subtext: `${line2}\nUltimo dato: ${lastDataStr} - Dati non validati`,
        left: 'center',
        top: 10,
        textStyle: {
          fontSize: isMobile ? 13 : 16,
          fontWeight: 'bold',
          color: '#333'
        },
        subtextStyle: {
          fontSize: isMobile ? 10 : 12,
          color: '#666',
          align: 'center',
          lineHeight: isMobile ? 14 : 18
        }
      },
      grid: {
        top: isMobile ? 80 : 100,
        bottom: isMobile ? (isRain ? 50 : 40) : 75,
        left: isMobile ? 45 : 65,
        right: isMobile ? (isRain ? 45 : 15) : 65
      },
      xAxis: {
        type: 'time',
        splitLine: { show: false },
        axisLabel: {
          hideOverlap: true,
          fontSize: isMobile ? 10 : 12,
          formatter: (value: number) => {
            const d = toGmt1(new Date(value));
            const hours = d.getHours();
            const minutes = d.getMinutes();
            if (hours === 0 && minutes === 0) {
              const day = d.getDate();
              const months = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
              return `${day} ${months[d.getMonth()]}`;
            }
            const hh = String(hours).padStart(2, '0');
            const mm = String(minutes).padStart(2, '0');
            return `${hh}:${mm}`;
          }
        }
      },
      yAxis: yAxisConfig,
      series: series,
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'line' },
        confine: true,
        formatter: (params: any) => {
          if (!params || params.length === 0) return '';
          const timestamp = params[0].value[0];
          const dateStr = formatDateGmt1(new Date(timestamp));
          let html = `<span style="font-size: 10px">${dateStr}</span><br/>`;
          
          const shownSeriesNames = new Set<string>();

          params.forEach((p: any) => {
            if (p.seriesType === 'scatter') return; // skip scatter wind icons
            const seriesName = p.seriesName;
            if (shownSeriesNames.has(seriesName)) return;

            const val = p.value[1];
            if (val == null) return;

            shownSeriesNames.add(seriesName);

            let displayVal = '';
            let displayUnit = unit;

            if (isRain) {
              displayVal = formatNumberIt(val, 1);
            } else if (isWind) {
              if (seriesName === 'Direzione Vento') {
                displayVal = formatNumberIt(val, 2);
                displayUnit = '°';
              } else {
                displayVal = formatNumberIt(val, 2);
                displayUnit = unit;
              }
            } else {
              const decs = genericExportDecimals;
              const finalVal = selectedSensorId === 6 ? Math.round(val) : val;
              displayVal = formatNumberIt(finalVal, decs);
            }

            html += `<div style="margin-top:4px;line-height:1.45;">` +
                    `<span style="color:${p.color}">\u25CF</span> ${seriesName}: <b>${displayVal}${displayUnit}</b>` +
                    `</div>`;
          });
          return html;
        }
      },
      dataZoom: [
        {
          type: 'inside',
          realtime: true,
          start: 0,
          end: 100
        },
        ...(isMobile ? [] : [{
          type: 'slider',
          show: true,
          realtime: true,
          start: 0,
          end: 100,
          height: 30,
          bottom: 10,
          borderColor: '#ccc',
          fillerColor: 'rgba(135, 206, 235, 0.15)',
          handleSize: '100%',
          handleStyle: {
            color: '#87CEEB',
            shadowBlur: 3,
            shadowColor: 'rgba(0, 0, 0, 0.4)',
            shadowOffsetX: 1,
            shadowOffsetY: 1
          },
          textStyle: {
            color: '#666'
          }
        }])
      ]
    };

    this.chartInstance.setOption(option);
  }

  exportChart(type: 'image/png' | 'application/pdf' | 'text/csv') {
    if (!this.chartInstance) return;
    const selectedSensorId = Number(this.selectedSensor);
    
    if (type === 'image/png') {
      const dataUrl = this.chartInstance.getDataURL({
        type: 'png',
        pixelRatio: 2,
        backgroundColor: '#fff'
      });
      const link = document.createElement('a');
      link.download = `${this.station.name}_${this.selectedSensorName}.png`;
      link.href = dataUrl;
      link.click();
    } else if (type === 'application/pdf') {
      const dataUrl = this.chartInstance.getDataURL({
        type: 'png',
        pixelRatio: 2,
        backgroundColor: '#fff'
      });
      
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: 'a4'
      });
      
      const width = pdf.internal.pageSize.getWidth();
      const height = pdf.internal.pageSize.getHeight();
      const margin = 20;
      
      pdf.addImage(dataUrl, 'PNG', margin, margin, width - 2 * margin, height - 2 * margin);
      pdf.save(`${this.station.name}_${this.selectedSensorName}.pdf`);
    } else if (type === 'text/csv') {
      let csvContent = '\ufeff'; // UTF-8 BOM for Excel compatibility
      
      const headers = ['Data (GMT+1)'];
      if (selectedSensorId === 0) {
        headers.push("Pioggia ogni 15' (" + this.selectedSensorUnit + ")");
        headers.push("Pioggia cumulata (" + this.selectedSensorUnit + ")");
      } else if (selectedSensorId === 10) {
        headers.push("Velocità Vento (" + this.selectedSensorUnit + ")");
        headers.push("Direzione Vento (°)");
      } else {
        headers.push(`${this.selectedSensorName} (${this.selectedSensorUnit})`);
      }
      
      csvContent += headers.join(';') + '\r\n';
      
      const valueDecimalsForExport = (sensorType: number): number => {
        switch (sensorType) {
          case 5: return 1;
          case 6: return 0;
          case 100: return 2;
          default: return 1;
        }
      };
      const genericExportDecimals = valueDecimalsForExport(selectedSensorId);

      const formatNumberIt = (val: number, decimals: number): string => {
        if (val === 0) return '0';
        const truncated = this.truncateToNDecimals(val, decimals);
        return truncated.toFixed(decimals).replace('.', ',');
      };

      if (selectedSensorId === 0) {
        let sum = 0;
        this.historic.forEach(h => {
          const d = toGmt1(new Date(h.timestamp));
          const dStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
          
          const val = h.value != null ? this.quantizeSensorYValue(h.value, 0) : null;
          if (val != null) sum += val;
          const valStr = val != null ? formatNumberIt(val, 1) : '';
          const sumStr = val != null ? formatNumberIt(sum, 1) : '';
          csvContent += `${dStr};${valStr};${sumStr}\r\n`;
        });
      } else if (selectedSensorId === 10) {
        const dirMap = new Map<string, number>();
        this.historicWindDir.forEach(d => {
          if (d.value != null) {
            const deg = (d.value - 1) * 22.5;
            dirMap.set(d.timestamp, deg);
          }
        });
        
        this.historic.forEach(h => {
          const d = toGmt1(new Date(h.timestamp));
          const dStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
          
          const speed = h.value != null ? this.quantizeSensorYValue(h.value, 10) : null;
          const speedStr = speed != null ? formatNumberIt(speed, 2) : '';
          
          const dir = dirMap.get(h.timestamp);
          const dirStr = dir != null ? formatNumberIt(dir, 2) : '';
          
          csvContent += `${dStr};${speedStr};${dirStr}\r\n`;
        });
      } else {
        this.historic.forEach(h => {
          const d = toGmt1(new Date(h.timestamp));
          const dStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
          
          const val = h.value != null ? this.quantizeSensorYValue(h.value, selectedSensorId) : null;
          let valStr = '';
          if (val != null) {
            const decs = genericExportDecimals;
            const finalVal = selectedSensorId === 6 ? Math.round(val) : val;
            valStr = formatNumberIt(finalVal, decs);
          }
          csvContent += `${dStr};${valStr}\r\n`;
        });
      }
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${this.station.name}_${this.selectedSensorName}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  /** Troncamento come nel grafico vento (coerente tra tooltip e serie). */
  private truncateToNDecimals(value: number, decimals: number): number {
    if (!Number.isFinite(value)) {
      return value;
    }
    const d = Math.max(0, decimals);
    if (d === 0) {
      return value < 0 ? Math.ceil(value) : Math.floor(value);
    }
    const factor = 10 ** d;
    return (value < 0 ? Math.ceil(value * factor) : Math.floor(value * factor)) / factor;
  }

  private truncateDecimalsString(value: number, decimals: number): string {
    if (!Number.isFinite(value)) {
      return '';
    }
    const d = Math.max(0, decimals);
    if (d === 0) {
      const intVal = value < 0 ? Math.ceil(value) : Math.floor(value);
      return String(intVal);
    }
    return this.truncateToNDecimals(value, d).toFixed(d);
  }

  /**
   * Si normalizzano i dati qui in modo che i valori del grafico
   * e le esportazioni CSV rispettino i decimali richiesti per ciascun sensore.
   */
  private quantizeSensorYValue(value: number, sensorType: number): number {
    switch (sensorType) {
      case 5:
        return Math.round(value * 10) / 10;
      case 6:
        return Math.round(value);
      case 100:
        return Math.round(value * 100) / 100;
      case 0:
        return Math.round(value * 10) / 10;
      case 10:
        return this.truncateToNDecimals(value, 2);
      default:
        return Math.round(value * 10) / 10;
    }
  }

  private sensorDisplayName(sensorId: number | undefined, fallback?: string): string {
    const labels = (environment as any).sensorLabels || {};
    if (sensorId === undefined || sensorId === null) {
      return fallback ?? 'Misura';
    }
    return labels[sensorId] ?? fallback ?? `Sens ${sensorId}`;
  }

}
