import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, firstValueFrom, map, of } from 'rxjs';

const BASE = 'https://api.coingecko.com/api/v3';

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private http: HttpClient) {}

  
  getMarkets(vs_currency = 'usd', page = 1, per_page = 50, ids?: string) {
    let params = new HttpParams()
      .set('vs_currency', vs_currency)
      .set('order', 'market_cap_desc')
      .set('per_page', String(per_page))
      .set('page', String(page))
      .set('sparkline', 'false');

    if (ids) params = params.set('ids', ids);

    return this.http.get<any[]>(`${BASE}/coins/markets`, { params });
  }

 
  getCoinDetail(id: string) {
  return this.http.get<any>(`${BASE}/coins/${id}`, {
    params: new HttpParams()
      .set('localization', 'false')
      .set('tickers', 'false')
      .set('market_data', 'true')
      .set('community_data','false')
      .set('developer_data','false')
      .set('sparkline','false')
  }).pipe(
    catchError(err => {
      console.error('Coin detail API error:', err);
      return of(null); // return empty so UI still works
    })
  );
}

  getCoinMarketChart(id: string, vs_currency = 'usd', days = 30) {
  return this.http.get<any>(`${BASE}/coins/${id}/market_chart`, {
    params: new HttpParams()
      .set('vs_currency', vs_currency)
      .set('days', String(days))
  }).pipe(
    catchError(err => {
      console.error('Market chart API error:', err);
      return of({ prices: [] }); // safe fallback
    })
  );
}
}
