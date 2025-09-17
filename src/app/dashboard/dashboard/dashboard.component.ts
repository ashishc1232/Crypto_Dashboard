import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import {
  debounceTime,
  distinctUntilChanged,
  firstValueFrom,
  Subject,
  retry,
  catchError,
  throwError
} from 'rxjs';
import { FavoritesService } from '../../services/favorites.service';
import { CacheService } from '../../services/cache.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
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
  private latestMarkets: any[] = [];

  constructor(
    private api: ApiService,
    public favSvc: FavoritesService,
    private cache: CacheService
  ) {}

  ngOnInit() {
    this.load();

    this.q$
      .pipe(debounceTime(400), distinctUntilChanged())
      .subscribe(() => this.applyFilter());

    this.favSvc.favorites$.subscribe(list => {
      this.favorites = list;
      this.loadFavorites();
    });
  }

  onQueryChange(q: string) {
    this.query = q;
    this.q$.next(q);
  }

  async load() {
    this.loading = true;
    this.error = null;

    try {
      const cacheKey = `markets:${this.page}:${this.perPage}`;
      let res: any[]|null = this.cache.get<any[]>(cacheKey, 60_000);

      if (!res) {
        res = await firstValueFrom(
          this.api.getMarkets('usd', this.page, this.perPage).pipe(
            retry(1),
            catchError(err => {
              return throwError(() => err);
            })
          )
        );
        this.cache.set(cacheKey, res);
      }

      this.latestMarkets = res;
      this.applyFilter();
      this.loadFavorites();
    } catch (err) {
      console.error(err);
      this.error = 'Failed to load market data. Please try again later.';
      this.coins = [];
    } finally {
      this.loading = false;
    }
  }

  applyFilter() {
    if (this.query?.trim()) {
      const q = this.query.toLowerCase();
      this.coins = this.latestMarkets.filter(
        c =>
          c.name.toLowerCase().includes(q) ||
          c.symbol.toLowerCase().includes(q)
      );
    } else {
      this.coins = this.latestMarkets;
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
      const cached = this.cache.get<any[]>(key, 60_000);
      if (cached) {
        this.favCoins = cached;
      } else {
        const res = await firstValueFrom(
          this.api.getMarkets('usd', 1, favs.length, favs.join(',')).pipe(
            retry(1),
            catchError(err => throwError(() => err))
          )
        );
        this.cache.set(key, res);
        this.favCoins = res;
      }
    } catch (err) {
      console.error(err);
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
