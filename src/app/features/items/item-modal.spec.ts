import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { ItemModal } from './item-modal';
import { ItemService } from '../../services/item.service';
import { AlertService } from '../../services/alert.service';
import { Item, ItemSuggestion } from '../../models/item.model';

describe('ItemModal - sugestão com IA', () => {
  let suggestDetails: ReturnType<typeof vi.fn>;
  let alertError: ReturnType<typeof vi.fn>;

  function create(): ItemModal {
    const fixture = TestBed.createComponent(ItemModal);
    const modal = fixture.componentInstance;
    modal.collectionId = 3;
    modal.item = null;
    return modal;
  }

  beforeEach(() => {
    suggestDetails = vi.fn();
    alertError = vi.fn();
    TestBed.configureTestingModule({
      imports: [ItemModal],
      providers: [
        { provide: ItemService, useValue: { suggestDetails } },
        { provide: AlertService, useValue: { error: alertError } },
      ],
    });
  });

  it('envia nome, coleção e foto nova e preenche descrição e tags', () => {
    suggestDetails.mockReturnValue(
      of<ItemSuggestion>({ description: 'Moeda antiga.', tags: ['moeda', 'prata'] }),
    );
    const modal = create();
    modal.formData.set({ name: 'Moeda 1 real', description: '', price: 0 });
    modal.tags.set(['prata', 'raro']);
    modal.newFile.set({ base64: 'aGVsbG8=', filename: 'a.jpg', extension: 'jpg' });

    modal.suggestWithAI();

    expect(suggestDetails).toHaveBeenCalledWith({
      name: 'Moeda 1 real',
      collection_id: 3,
      image_base64: 'aGVsbG8=',
    });
    expect(modal.formData().description).toBe('Moeda antiga.');
    expect(modal.tags()).toEqual(['prata', 'raro', 'moeda']);
    expect(modal.isSuggesting()).toBe(false);
  });

  it('usa a foto já salva do item ao editar', () => {
    suggestDetails.mockReturnValue(of<ItemSuggestion>({ description: 'x', tags: [] }));
    const modal = create();
    modal.item = {
      id: 1,
      name: 'Moeda',
      price: 0,
      collection_id: 3,
      binary_object: { id: 9, base64: 'c2F2ZWQ=', filename: 'b.png', extension: 'png' },
    } as Item;

    modal.suggestWithAI();

    expect(suggestDetails).toHaveBeenCalledWith({
      name: 'Moeda',
      collection_id: 3,
      image_base64: 'c2F2ZWQ=',
    });
  });

  it('não chama a IA com nome vazio', () => {
    const modal = create();
    modal.formData.set({ name: '   ', description: '', price: 0 });

    modal.suggestWithAI();

    expect(suggestDetails).not.toHaveBeenCalled();
    expect(alertError).toHaveBeenCalled();
  });

  it('marca isSuggesting enquanto aguarda a resposta', () => {
    const pending = new Subject<ItemSuggestion>();
    suggestDetails.mockReturnValue(pending);
    const modal = create();
    modal.formData.set({ name: 'Moeda', description: '', price: 0 });

    modal.suggestWithAI();
    expect(modal.isSuggesting()).toBe(true);

    pending.next({ description: 'x', tags: [] });
    pending.complete();
    expect(modal.isSuggesting()).toBe(false);
  });

  it('mostra erro e mantém os campos quando a IA falha', () => {
    suggestDetails.mockReturnValue(throwError(() => new Error('503')));
    const modal = create();
    modal.formData.set({ name: 'Moeda', description: 'minha', price: 0 });

    modal.suggestWithAI();

    expect(alertError).toHaveBeenCalled();
    expect(modal.formData().description).toBe('minha');
    expect(modal.isSuggesting()).toBe(false);
  });
});
