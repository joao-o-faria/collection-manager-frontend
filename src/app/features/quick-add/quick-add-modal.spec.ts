import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { QuickAddModal, NEW_REF } from './quick-add-modal';
import { QuickAddService } from '../../services/quick-add.service';
import { CategoryService } from '../../services/category';
import { CollectionService } from '../../services/collection.service';
import { AlertService } from '../../services/alert.service';
import { AuthService } from '../../services/auth.service';
import { QuickAddAnalysis } from '../../models/quick-add.model';

const categories = [
  { id: 1, name: 'Numismática', user_id: 1 },
  { id: 2, name: 'Miniaturas', user_id: 1 },
];
const collections = [
  { id: 10, name: 'Moedas antigas', category_id: 1, category: categories[0], user_id: 1 },
  { id: 20, name: 'Hot Wheels', category_id: 2, category: categories[1], user_id: 1 },
];
const photo = { base64: 'aW1n', filename: 'a.jpg', extension: 'jpg' };

function analysis(partial: Partial<QuickAddAnalysis> = {}): QuickAddAnalysis {
  return {
    name: 'Moeda de 1 real',
    description: 'Moeda prateada.',
    tags: ['moeda'],
    category: { id: 1, name: 'Numismática', is_new: false },
    collection: { id: 0, name: 'Moedas brasileiras', is_new: true },
    ...partial,
  };
}

describe('QuickAddModal', () => {
  let analyze: ReturnType<typeof vi.fn>;
  let create: ReturnType<typeof vi.fn>;
  let alertError: ReturnType<typeof vi.fn>;
  let navigate: ReturnType<typeof vi.fn>;
  let navigateByUrl: ReturnType<typeof vi.fn>;

  function setup(cats = categories, cols = collections): QuickAddModal {
    TestBed.configureTestingModule({
      imports: [QuickAddModal],
      providers: [
        { provide: QuickAddService, useValue: { analyze, create } },
        { provide: CategoryService, useValue: { getCategories: () => of(cats) } },
        { provide: CollectionService, useValue: { getCollections: () => of(cols) } },
        { provide: AlertService, useValue: { error: alertError } },
        { provide: Router, useValue: { navigate, navigateByUrl } },
        { provide: AuthService, useValue: { currentUser: () => ({ id: 1 }) } },
      ],
    });
    const fixture = TestBed.createComponent(QuickAddModal);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  beforeEach(() => {
    analyze = vi.fn();
    create = vi.fn();
    alertError = vi.fn();
    navigate = vi.fn().mockResolvedValue(true);
    navigateByUrl = vi.fn().mockResolvedValue(true);
  });

  it('preenche a revisão com a análise da IA', () => {
    analyze.mockReturnValue(of(analysis()));
    const modal = setup();
    modal.photo.set(photo);

    modal.analyze();

    expect(analyze).toHaveBeenCalledWith('aW1n');
    expect(modal.step()).toBe('review');
    expect(modal.name()).toBe('Moeda de 1 real');
    expect(modal.description()).toBe('Moeda prateada.');
    expect(modal.tags()).toEqual(['moeda']);
    expect(modal.price()).toBe(0);
    expect(modal.categoryChoice()).toBe(1);
    expect(modal.collectionChoice()).toBe(NEW_REF);
    expect(modal.newCollectionName()).toBe('Moedas brasileiras');
  });

  it('fica em "analyzing" enquanto espera e não fecha', () => {
    const pending = new Subject<QuickAddAnalysis>();
    analyze.mockReturnValue(pending);
    const modal = setup();
    const closed = vi.fn();
    modal.onClose.subscribe(closed);
    modal.photo.set(photo);

    modal.analyze();
    modal.close();

    expect(modal.step()).toBe('analyzing');
    expect(closed).not.toHaveBeenCalled();
  });

  it('volta para o upload mantendo a foto quando a análise falha', () => {
    analyze.mockReturnValue(throwError(() => new Error('503')));
    const modal = setup();
    modal.photo.set(photo);

    modal.analyze();

    expect(alertError).toHaveBeenCalled();
    expect(modal.step()).toBe('upload');
    expect(modal.photo()).toEqual(photo);
  });

  it('filtra coleções pela categoria escolhida', () => {
    const modal = setup();
    modal.onCategoryChange(2);
    expect(modal.filteredCollections().map((c) => c.id)).toEqual([20]);
  });

  it('troca a coleção para nova quando ela não pertence à categoria escolhida', () => {
    analyze.mockReturnValue(of(analysis({ collection: { id: 10, name: 'Moedas antigas', is_new: false } })));
    const modal = setup();
    modal.photo.set(photo);
    modal.analyze();

    modal.onCategoryChange(2);

    expect(modal.collectionChoice()).toBe(NEW_REF);
  });

  it('categoria nova não oferece coleções existentes', () => {
    const modal = setup();
    modal.onCategoryChange(NEW_REF);
    expect(modal.filteredCollections()).toEqual([]);
    expect(modal.collectionChoice()).toBe(NEW_REF);
  });

  it('sem categorias/coleções, a revisão começa com tudo novo', () => {
    analyze.mockReturnValue(
      of(analysis({ category: { id: 0, name: 'Selos', is_new: true }, collection: { id: 0, name: 'Selos', is_new: true } })),
    );
    const modal = setup([], []);
    modal.photo.set(photo);
    modal.analyze();

    expect(modal.categoryChoice()).toBe(NEW_REF);
    expect(modal.newCategoryName()).toBe('Selos');
    expect(modal.filteredCollections()).toEqual([]);
  });

  it('envia {id} para existentes e {new_name} para novos e navega recarregando a rota', async () => {
    analyze.mockReturnValue(of(analysis()));
    create.mockReturnValue(of({ id: 5, collection_id: 42 }));
    const modal = setup();
    const closed = vi.fn();
    modal.onClose.subscribe(closed);
    modal.photo.set(photo);
    modal.analyze();
    modal.price.set(12.5);

    modal.save();
    await Promise.resolve();

    expect(create).toHaveBeenCalledWith({
      category: { id: 1 },
      collection: { new_name: 'Moedas brasileiras' },
      item: {
        name: 'Moeda de 1 real',
        description: 'Moeda prateada.',
        tags: ['moeda'],
        price: 12.5,
        binary_object: photo,
      },
    });
    expect(closed).toHaveBeenCalled();
    expect(navigateByUrl).toHaveBeenCalledWith('/', { skipLocationChange: true });
    expect(navigate).toHaveBeenCalledWith(['/collections', 42, 'items']);
  });

  it('não envia com nome vazio ou nome de categoria nova vazio', () => {
    analyze.mockReturnValue(of(analysis()));
    const modal = setup();
    modal.photo.set(photo);
    modal.analyze();

    modal.name.set('  ');
    modal.save();
    modal.name.set('ok');
    modal.onCategoryChange(NEW_REF);
    modal.newCategoryName.set(' ');
    modal.save();

    expect(create).not.toHaveBeenCalled();
    expect(alertError).toHaveBeenCalledTimes(2);
  });

  it('mostra erro e permanece na revisão quando o cadastro falha', () => {
    analyze.mockReturnValue(of(analysis()));
    create.mockReturnValue(throwError(() => new Error('500')));
    const modal = setup();
    modal.photo.set(photo);
    modal.analyze();

    modal.save();

    expect(alertError).toHaveBeenCalled();
    expect(modal.step()).toBe('review');
    expect(modal.isSaving()).toBe(false);
  });

  it('para admin, lista só categorias e coleções do próprio usuário', () => {
    const otherCat = { id: 3, name: 'Selos de outro usuário', user_id: 2 };
    const otherCol = { id: 30, name: 'Selos raros', category_id: 1, category: categories[0], user_id: 2 };
    const modal = setup([...categories, otherCat], [...collections, otherCol]);

    expect(modal.categories().map((c) => c.id)).toEqual([1, 2]);
    modal.onCategoryChange(1);
    expect(modal.filteredCollections().map((c) => c.id)).toEqual([10]);
  });
});
