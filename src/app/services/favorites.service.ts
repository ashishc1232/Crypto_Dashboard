import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

const KEY = 'cd:favorites';

@Injectable({ providedIn: 'root' })
export class FavoritesService {
  private favSub = new BehaviorSubject<string[]>(this.load());
  favorites$ = this.favSub.asObservable();

  private load(): string[] {
    try {
      return JSON.parse(localStorage.getItem(KEY) || '[]');
    } catch {
      return [];
    }
  }

  private save(list: string[]) {
    localStorage.setItem(KEY, JSON.stringify(list));
    this.favSub.next(list);
  }

  toggle(id: string) {
    const list = new Set(this.load());
    if (list.has(id)) list.delete(id);
    else list.add(id);
    this.save(Array.from(list));
  }

  isFav(id: string) {
    return this.load().includes(id);
  }

  getAll() {
    return this.load();
  }


}
