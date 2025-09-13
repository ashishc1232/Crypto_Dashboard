import { Component, OnInit } from '@angular/core';
import { FavoritesService } from '../services/favorites.service';
import { ApiService } from '../services/api.service';
import { CacheService } from '../services/cache.service';
import { firstValueFrom } from 'rxjs';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-favorites',
  standalone: true,
  imports: [CommonModule,RouterLink],
  templateUrl: './favorites.component.html',
  styleUrl: './favorites.component.css'
})
export class FavoritesComponent implements OnInit {
  coins: any[] = [];
  loading = false;
  constructor(private fav: FavoritesService, private api: ApiService, private cache: CacheService) {}

  ngOnInit() {
    this.fav.favorites$.subscribe(() => this.load());
    this.load();
  }

  async load() {
    this.loading = true;
    const ids = this.fav.getAll();
    if (ids.length === 0) {
      this.coins = [];
      this.loading = false;
      return;
    }
    try {
      const key = `fav-coins:${ids.join(',')}`;
      const cached = this.cache.get<any[]>(key, 30_000);
      if (cached) this.coins = cached;
      else {
        const res = await firstValueFrom(this.api.getMarkets('usd', 1, ids.length, ids.join(',')));
        this.cache.set(key, res);
        this.coins = res;
      }
    } catch {
      this.coins = [];
    } finally {
      this.loading = false;
    }
  }
}
