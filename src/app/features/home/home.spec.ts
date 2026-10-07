import { TestBed } from '@angular/core/testing';
import { registerLocaleData } from '@angular/common';
import localePtBr from '@angular/common/locales/pt';
import { Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { Home, EXAMPLE_QUERIES } from './home';
import { HomeService } from '../../services/home.service';
import { AlertService } from '../../services/alert.service';
import { HomeSummary, SearchResponse } from '../../models/home.model';

const summaryData: HomeSummary = {
  totals: { items: 3, collections: 2, categories: 1, total_value: 42.5 },
  recent_items: [{ id: 3, name: 'Selo azul', price: 1, collection_id: 2 }],
  top_tags: ['moeda', 'coisas antigas', 'prata'],
};

const semanticResponse: SearchResponse = {
  mode: 'semantic',
  results: [
    { item: { id: 1, name: 'Moeda de 1 real', price: 0, collection_id: 7 }, score: 0.62, match: 'semantic' },
    { item: { id: 2, name: 'Moeda de 50 centavos', price: 0, collection_id: 7 }, score: 0.48, match: 'semantic' },
  ],
};

// O app registra o pt-BR em app.config.ts, que os testes não carregam.
registerLocaleData(localePtBr, 'pt-BR');

describe('Home', () => {
  let search: ReturnType<typeof vi.fn>;
  let summary: ReturnType<typeof vi.fn>;
  let navigate: ReturnType<typeof vi.fn>;
  let alertError: ReturnType<typeof vi.fn>;

  function setup(): Home {
    TestBed.configureTestingModule({
      imports: [Home],
      providers: [
        { provide: HomeService, useValue: { search, summary } },
        { provide: Router, useValue: { navigate } },
        { provide: AlertService, useValue: { error: alertError } },
      ],
    });
    const fixture = TestBed.createComponent(Home);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  beforeEach(() => {
    search = vi.fn();
    summary = vi.fn().mockReturnValue(of(summaryData));
    navigate = vi.fn();
    alertError = vi.fn();
  });

  it('carrega o resumo ao abrir', () => {
    const home = setup();
    expect(summary).toHaveBeenCalled();
    expect(home.summary()).toEqual(summaryData);
  });

  it('sugestões = frases de exemplo + tags mais usadas, sem repetir', () => {
    const home = setup();
    expect(home.suggestions()).toEqual([...EXAMPLE_QUERIES, 'moeda', 'prata']);
  });

  it('busca com Enter e mostra os resultados com o modo', () => {
    search.mockReturnValue(of(semanticResponse));
    const home = setup();
    home.query.set('  coisas antigas ');

    home.onKeydown(new KeyboardEvent('keydown', { key: 'Enter' }));

    expect(search).toHaveBeenCalledWith('coisas antigas');
    expect(home.response()).toEqual(semanticResponse);
    expect(home.lastQuery()).toBe('coisas antigas');
    expect(home.searching()).toBe(false);
  });

  it('fica em "buscando" enquanto espera', () => {
    const pending = new Subject<SearchResponse>();
    search.mockReturnValue(pending);
    const home = setup();
    home.query.set('moeda');

    home.search();
    expect(home.searching()).toBe(true);

    pending.next(semanticResponse);
    pending.complete();
    expect(home.searching()).toBe(false);
  });

  it('não busca com o campo vazio', () => {
    const home = setup();
    home.query.set('   ');
    home.search();
    expect(search).not.toHaveBeenCalled();
  });

  it('clicar numa sugestão preenche o campo e busca', () => {
    search.mockReturnValue(of(semanticResponse));
    const home = setup();

    home.useSuggestion('itens de metal');

    expect(home.query()).toBe('itens de metal');
    expect(search).toHaveBeenCalledWith('itens de metal');
  });

  it('limpar volta às sugestões', () => {
    search.mockReturnValue(of(semanticResponse));
    const home = setup();
    home.useSuggestion('moeda');

    home.clear();

    expect(home.query()).toBe('');
    expect(home.response()).toBeNull();
  });

  it('mostra erro e para de buscar quando a busca falha', () => {
    search.mockReturnValue(throwError(() => new Error('500')));
    const home = setup();
    home.query.set('moeda');

    home.search();

    expect(alertError).toHaveBeenCalled();
    expect(home.searching()).toBe(false);
    expect(home.response()).toBeNull();
  });

  it('continua utilizável quando o resumo falha', () => {
    summary.mockReturnValue(throwError(() => new Error('500')));
    search.mockReturnValue(of(semanticResponse));
    const home = setup();

    expect(home.summary()).toBeNull();
    expect(home.suggestions()).toEqual([...EXAMPLE_QUERIES]);
    home.useSuggestion('moeda');
    expect(home.response()).toEqual(semanticResponse);
  });

  it('clicar num item abre a coleção dele', () => {
    const home = setup();
    home.openItem(semanticResponse.results[0].item);
    expect(navigate).toHaveBeenCalledWith(['/collections', 7, 'items']);
  });

  it('relevância é relativa ao melhor resultado por significado', () => {
    search.mockReturnValue(
      of<SearchResponse>({
        mode: 'semantic',
        results: [
          { item: { id: 9, name: 'Luvas de Boxe', price: 0, collection_id: 1 }, score: 0.15, match: 'text' },
          ...semanticResponse.results,
        ],
      }),
    );
    const home = setup();
    home.useSuggestion('moeda');

    // o resultado por texto (nota 0,15) não serve de referência
    expect(home.scorePercent(0.62)).toBe(100);
    expect(home.scorePercent(0.48)).toBe(77);
  });
});
