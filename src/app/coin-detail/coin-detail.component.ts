import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../services/api.service';
import { CacheService } from '../services/cache.service';
import { FavoritesService } from '../services/favorites.service';
import {Chart} from 'chart.js';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-coin-detail',
  standalone: true,
  imports: [CommonModule,FormsModule],
  templateUrl: './coin-detail.component.html',
  styleUrl: './coin-detail.component.css'
})
export class CoinDetailComponent implements OnInit {
  coin: any | null = null;
  loading = false;
  error: string | null = null;
  chart: Chart | null = null;

  constructor(private route: ActivatedRoute, private api: ApiService, private cache: CacheService, public favSvc: FavoritesService) { }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.fetch(id);
  }

  async fetch(id: string) {
    this.loading = true;
    this.error = null;
    try {
      const detailKey = `coin:${id}`;
      let detail = this.cache.get(detailKey, 60_000);
      if (!detail) {
        detail = await this.api.getCoinDetail(id).toPromise();
        this.cache.set(detailKey, detail);
      }
      this.coin = detail;

      
      const chartKey = `chart:${id}:30`;
      let chartData = this.cache.get<any>(chartKey, 60_000);
      if (!chartData) {
        chartData = await this.api.getCoinMarketChart(id, 'usd', 30).toPromise();
        this.cache.set(chartKey, chartData);
      }
      this.renderChart(chartData.prices || []);
    } catch (err) {
      console.error(err);
      this.error = 'Failed to load coin data.';
    } finally {
      this.loading = false;
    }
  }

  renderChart(prices: any[]) {
    const ctx = (document.getElementById('priceChart') as HTMLCanvasElement).getContext('2d')!;
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
            label: `${this.coin.name} price (USD)`,
            data,
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

  toggleFav() {
    if (!this.coin) return;
    this.favSvc.toggle(this.coin.id);
  }
}
