import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { debounceTime, distinctUntilChanged, firstValueFrom, Subject } from 'rxjs';
import { FavoritesService } from '../../services/favorites.service';
import { CacheService } from '../../services/cache.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule,RouterLink,FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  coins: any[] = [];
  favCoins: any[] = [];
  favorites: string[] = [];
  loading = false;
  error: string | null = null;
  page = 1;
  perPage = 25;
  query = '';

  private q$ = new Subject<string>();

  constructor(private api: ApiService, public favSvc: FavoritesService, private cache: CacheService) {}

  ngOnInit() {
    this.load();
    this.q$.pipe(debounceTime(400), distinctUntilChanged()).subscribe(q => {
      this.page = 1;
      this.load();
    });
    this.favSvc.favorites$.subscribe(list => {
      this.favorites = list;
      this.loadFavorites();
    });
  }

  onQueryChange(q: string) {
    this.q$.next(q);
  }

  async load() {
    this.loading = true;
    this.error = null;
    try {
      const cacheKey = `markets:${this.page}:${this.perPage}:${this.query}`;
      const cached = this.cache.get<any[]>(cacheKey, 20_000);
      let res: any[];
      if (cached) {
        res = cached;
      } else {
        res = await firstValueFrom(this.api.getMarkets('usd', this.page, this.perPage, undefined));
        this.cache.set(cacheKey, res);
      }
      // apply client-side search if query provided
      if (this.query?.trim()) {
        const q = this.query.toLowerCase();
        this.coins = res.filter(c => c.name.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q));
      } else {
        this.coins = res;
      }
      this.loadFavorites();
    } catch (err) {
      console.error(err);
      this.error = 'Failed to load market data.';
    } finally {
      this.loading = false;
    }
  }

  async loadFavorites() {
    const favs = this.favSvc.getAll();
    this.favorites = favs;
    if (!favs?.length) {
      this.favCoins = [];
      return;
    }
    try {
      const key = `fav-coins:${favs.join(',')}`;
      const cached = this.cache.get<any[]>(key, 30_000);
      if (cached) {
        this.favCoins = cached;
      } else {
        const res = await firstValueFrom(this.api.getMarkets('usd', 1, favs.length, favs.join(',')));
        this.cache.set(key, res);
        this.favCoins = res;
      }
    } catch {
      this.favCoins = [];
    }
  }

  toggleFav(id: string) {
    this.favSvc.toggle(id);
  }

  prev() {
    if (this.page > 1) {
      this.page--;
      this.load();
    }
  }
  next() {
    this.page++;
    this.load();
  }
  refresh() {
    this.cache.clear();
    this.load();
  }
}