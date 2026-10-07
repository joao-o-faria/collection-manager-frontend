import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HomeService } from '../../services/home.service';
import { AlertService } from '../../services/alert.service';
import { HomeSummary, SearchResponse } from '../../models/home.model';
import { Item } from '../../models/item.model';
import { tagColor } from '../../shared/utils/tag-color';

/** Frases que mostram a busca por significado funcionando. */
export const EXAMPLE_QUERIES = ['coisas antigas', 'itens de metal', 'presentes e lembranças'];

@Component({
  standalone: true,
  selector: 'app-home',
  imports: [CommonModule, FormsModule],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements OnInit {
  query = signal('');
  lastQuery = signal('');
  searching = signal(false);
  response = signal<SearchResponse | null>(null);
  summary = signal<HomeSummary | null>(null);

  suggestions = computed(() => {
    const tags = (this.summary()?.top_tags ?? []).filter((t) => !EXAMPLE_QUERIES.includes(t));
    return [...EXAMPLE_QUERIES, ...tags];
  });

  /** Melhor nota entre os resultados por significado (referência da barra de relevância). */
  private bestSemanticScore = computed(() => {
    const scores = (this.response()?.results ?? [])
      .filter((r) => r.match === 'semantic' && r.score !== null)
      .map((r) => r.score as number);
    return scores.length ? Math.max(...scores) : 0;
  });

  tagStyle = (tag: string) => tagColor(tag);

  constructor(
    private homeService: HomeService,
    private alertService: AlertService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.homeService.summary().subscribe({
      next: (s) => this.summary.set(s),
      error: () => this.summary.set(null),
    });
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.search();
    }
  }

  search(): void {
    const q = this.query().trim();
    if (!q) return;

    this.searching.set(true);
    this.lastQuery.set(q);
    this.homeService.search(q).subscribe({
      next: (res) => {
        this.response.set(res);
        this.searching.set(false);
      },
      error: () => {
        this.alertService.error('Não foi possível realizar a busca.');
        this.searching.set(false);
      },
    });
  }

  useSuggestion(text: string): void {
    this.query.set(text);
    this.search();
  }

  clear(): void {
    this.query.set('');
    this.response.set(null);
  }

  openItem(item: Item): void {
    this.router.navigate(['/collections', item.collection_id, 'items']);
  }

  /**
   * Relevância relativa ao melhor resultado por significado. O cosseno bruto do
   * embeddinggemma fica entre ~0,25 e ~0,5 mesmo nos acertos, e mostrá-lo cru
   * faria o melhor resultado aparecer como "28%".
   */
  scorePercent(score: number): number {
    const best = this.bestSemanticScore();
    if (best <= 0) return 0;
    return Math.min(100, Math.round((score / best) * 100));
  }

  imageUrl(item: Item): string | null {
    const bin = item.binary_object;
    if (!bin) return null;
    const ext = bin.extension.toLowerCase();
    const mime = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;
    return `data:${mime};base64,${bin.base64}`;
  }
}
