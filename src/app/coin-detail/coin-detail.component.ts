import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';
import { firstValueFrom } from 'rxjs';

import { ApiService } from '../services/api.service';
import { CacheService } from '../services/cache.service';
import { FavoritesService } from '../services/favorites.service';

Chart.register(...registerables);

@Component({
  selector: 'app-coin-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './coin-detail.component.html',
  styleUrls: ['./coin-detail.component.css']
})
export class CoinDetailComponent implements OnInit {
  coin: any | null = null;
  loading = false;
  error: string | null = null;
  chart: Chart | null = null;

  constructor(
    private route: ActivatedRoute,
    private api: ApiService,
    private cache: CacheService,
    public favSvc: FavoritesService,
    private location: Location
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.fetch(id);
  }

  async fetch(id: string) {
    this.loading = true;
    this.error = null;

    try {
      // ---- Coin Detail ----
      const detailKey = `coin:${id}`;
      let detail = this.cache.get(detailKey, 60_000);
      if (!detail) {
        detail = await firstValueFrom(this.api.getCoinDetail(id));
        this.cache.set(detailKey, detail);
      }
      this.coin = detail;

      // ---- Chart Data ----
      const chartKey = `chart:${id}:30`;
      let chartData = this.cache.get<any>(chartKey, 60_000);
      if (!chartData) {
        chartData = await firstValueFrom(
          this.api.getCoinMarketChart(id, 'usd', 30)
        );
        this.cache.set(chartKey, chartData);
      }

      if (chartData?.prices?.length) {
        this.renderChart(chartData.prices);
      } else {
        this.error = 'No chart data available.';
      }
    } catch (err) {
      console.error('Error fetching coin detail:', err);
      this.error = 'Failed to load coin data.';
    } finally {
      this.loading = false;
    }
  }

  renderChart(prices: any[]) {
    const canvas = document.getElementById('priceChart') as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (this.chart) this.chart.destroy();

    const labels = prices.map((p: any) => {
      const d = new Date(p[0]);
      return `${d.getMonth() + 1}/${d.getDate()}`;
    });
    const data = prices.map((p: any) => p[1]);

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: `${this.coin?.name || ''} price (USD)`,
            data,
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59,130,246,0.1)',
            fill: true,
            tension: 0.2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: { display: true },
          y: { display: true }
        }
      }
    });
  }

  goBack() {
    this.location.back();
  }

  toggleFav() {
    if (!this.coin) return;
    this.favSvc.toggle(this.coin.id);
  }
}
