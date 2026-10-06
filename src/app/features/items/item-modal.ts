import { Component, Input, Output, EventEmitter, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BinaryObjectPayload } from '../../models/collection.model';
import { Item, ItemSuggestion } from '../../models/item.model';
import { ItemService } from '../../services/item.service';
import { AlertService } from '../../services/alert.service';
import { tagColor } from '../../shared/utils/tag-color';

@Component({
  standalone: true,
  selector: 'app-item-modal',
  imports: [CommonModule, FormsModule],
  templateUrl: './item-modal.html',
  styleUrl: './item-modal.scss',
})
export class ItemModal {
  private _item: Item | null = null;
  @Input() set item(val: Item | null) {
    this._item = val;
    if (val) {
      this.formData.set({
        name: val.name,
        description: val.description ?? '',
        price: val.price,
      });
      this.tags.set([...(val.tags ?? [])]);
      this.itemId = val.id;
      this.previewUrl.set(this.buildDataUrl(val.binary_object));
      this.existingFilename.set(val.binary_object?.filename ?? '');
      this.existingBase64 = val.binary_object?.base64 ?? null;
    } else {
      this.formData.set({ name: '', description: '', price: 0 });
      this.tags.set([]);
      this.itemId = null;
      this.previewUrl.set(null);
      this.existingFilename.set('');
      this.existingBase64 = null;
    }
    this.tagInput.set('');
    this.newFile.set(null);
  }
  get item(): Item | null {
    return this._item;
  }

  @Input() collectionId: number = 0;
  @Output() onClose = new EventEmitter<void>();
  @Output() onSave = new EventEmitter<Item>();

  itemId: number | null = null;
  formData = signal<{ name: string; description: string; price: number }>({
    name: '',
    description: '',
    price: 0,
  });
  tags = signal<string[]>([]);
  tagInput = signal<string>('');
  isLoading = signal(false);
  isSuggesting = signal(false);
  private existingBase64: string | null = null;

  tagStyle = (tag: string) => tagColor(tag);

  addTagFromInput(event?: Event): void {
    if (event) event.preventDefault();
    const raw = this.tagInput().trim();
    if (!raw) return;
    const parts = raw.split(',').map((p) => p.trim()).filter(Boolean);
    this.tags.update((current) => {
      const next = [...current];
      for (const p of parts) {
        if (!next.includes(p)) next.push(p);
      }
      return next;
    });
    this.tagInput.set('');
  }

  removeTag(tag: string): void {
    this.tags.update((current) => current.filter((t) => t !== tag));
  }

  onTagKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      this.addTagFromInput();
    }
  }

  newFile = signal<BinaryObjectPayload | null>(null);
  previewUrl = signal<string | null>(null);
  existingFilename = signal<string>('');

  isEdit = computed(() => this.itemId !== null);
  title = computed(() => (this.isEdit() ? 'Editar Item' : 'Novo Item'));
  buttonText = computed(() => {
    if (this.isLoading()) return 'Salvando...';
    return this.isEdit() ? 'Salvar Alterações' : 'Adicionar Item';
  });

  constructor(
    private itemService: ItemService,
    private alertService: AlertService
  ) {}

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1] ?? '';
      const dotIdx = file.name.lastIndexOf('.');
      const extension = dotIdx >= 0 ? file.name.slice(dotIdx + 1).toLowerCase() : '';

      this.newFile.set({ base64, filename: file.name, extension });
      this.previewUrl.set(result);
    };
    reader.onerror = () => {
      this.alertService.error('Não foi possível ler o arquivo selecionado.');
    };
    reader.readAsDataURL(file);
  }

  suggestWithAI(): void {
    const name = this.formData().name.trim();
    if (!name) {
      this.alertService.error('Preencha o nome do item antes de pedir uma sugestão.');
      return;
    }

    this.isSuggesting.set(true);
    this.itemService
      .suggestDetails({
        name,
        collection_id: this.collectionId,
        image_base64: this.newFile()?.base64 ?? this.existingBase64,
      })
      .subscribe({
        next: (suggestion) => {
          this.applySuggestion(suggestion);
          this.isSuggesting.set(false);
        },
        error: () => {
          this.alertService.error('Não foi possível gerar a sugestão. Verifique se a IA está disponível.');
          this.isSuggesting.set(false);
        },
      });
  }

  private applySuggestion(suggestion: ItemSuggestion): void {
    this.formData.update((d) => ({ ...d, description: suggestion.description }));
    this.tags.update((current) => {
      const next = [...current];
      for (const t of suggestion.tags) {
        if (!next.includes(t)) next.push(t);
      }
      return next;
    });
  }

  private buildDataUrl(bin: { base64: string; extension: string } | null | undefined): string | null {
    if (!bin) return null;
    const ext = bin.extension.toLowerCase();
    const mime = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;
    return `data:${mime};base64,${bin.base64}`;
  }

  save(): void {
    const data = this.formData();
    if (!data.name.trim()) {
      this.alertService.error('Nome não pode ser vazio.');
      return;
    }
    if (data.price < 0 || isNaN(Number(data.price))) {
      this.alertService.error('Valor inválido.');
      return;
    }
    if (!this.collectionId) {
      this.alertService.error('Coleção inválida.');
      return;
    }

    this.isLoading.set(true);

    const trimmedDescription = data.description.trim();
    const tagsToSend = this.tags();
    const payload = {
      name: data.name,
      description: trimmedDescription === '' ? null : trimmedDescription,
      tags: tagsToSend.length === 0 ? null : tagsToSend,
      price: Number(data.price),
      collection_id: this.collectionId,
      binary_object: this.newFile(),
    };

    const obs = this.isEdit()
      ? this.itemService.updateItem(this.itemId!, payload)
      : this.itemService.addItem(payload);

    obs.subscribe({
      next: (saved) => {
        this.onSave.emit(saved);
        this.isLoading.set(false);
      },
      error: () => {
        this.alertService.error(`Erro ao ${this.isEdit() ? 'atualizar' : 'adicionar'} item.`);
        this.isLoading.set(false);
      },
    });
  }
}
