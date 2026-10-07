import { Component, EventEmitter, OnInit, Output, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { BinaryObjectPayload, Collection } from '../../models/collection.model';
import { Category } from '../../models/category.model';
import { QuickAddAnalysis, QuickAddRef, QuickAddRequest } from '../../models/quick-add.model';
import { QuickAddService } from '../../services/quick-add.service';
import { CategoryService } from '../../services/category';
import { CollectionService } from '../../services/collection.service';
import { AlertService } from '../../services/alert.service';
import { tagColor } from '../../shared/utils/tag-color';

/** Valor usado nos selects para "criar nova". */
export const NEW_REF = 0;

type Step = 'upload' | 'analyzing' | 'review';

@Component({
  standalone: true,
  selector: 'app-quick-add-modal',
  imports: [CommonModule, FormsModule],
  templateUrl: './quick-add-modal.html',
  styleUrl: './quick-add-modal.scss',
})
export class QuickAddModal implements OnInit {
  @Output() onClose = new EventEmitter<void>();

  readonly NEW_REF = NEW_REF;

  step = signal<Step>('upload');
  photo = signal<BinaryObjectPayload | null>(null);
  previewUrl = signal<string | null>(null);

  categories = signal<Category[]>([]);
  collections = signal<Collection[]>([]);

  categoryChoice = signal<number>(NEW_REF);
  newCategoryName = signal('');
  collectionChoice = signal<number>(NEW_REF);
  newCollectionName = signal('');

  name = signal('');
  description = signal('');
  price = signal(0);
  tags = signal<string[]>([]);
  tagInput = signal('');
  isSaving = signal(false);

  filteredCollections = computed(() => {
    const cat = this.categoryChoice();
    if (cat === NEW_REF) return [];
    return this.collections().filter((c) => c.category_id === cat);
  });

  tagStyle = (tag: string) => tagColor(tag);

  constructor(
    private quickAddService: QuickAddService,
    private categoryService: CategoryService,
    private collectionService: CollectionService,
    private alertService: AlertService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.categoryService.getCategories().subscribe({
      next: (cats) => this.categories.set(cats),
      error: () => this.categories.set([]),
    });
    this.collectionService.getCollections().subscribe({
      next: (cols) => this.collections.set(cols),
      error: () => this.collections.set([]),
    });
  }

  close(): void {
    if (this.step() === 'analyzing' || this.isSaving()) return;
    this.onClose.emit();
  }

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
      this.photo.set({ base64, filename: file.name, extension });
      this.previewUrl.set(result);
    };
    reader.onerror = () => this.alertService.error('Não foi possível ler o arquivo selecionado.');
    reader.readAsDataURL(file);
  }

  analyze(): void {
    const photo = this.photo();
    if (!photo) return;

    this.step.set('analyzing');
    this.quickAddService.analyze(photo.base64).subscribe({
      next: (analysis) => {
        this.applyAnalysis(analysis);
        this.step.set('review');
      },
      error: () => {
        this.alertService.error('Não foi possível analisar a imagem. Verifique se a IA está disponível.');
        this.step.set('upload');
      },
    });
  }

  private applyAnalysis(a: QuickAddAnalysis): void {
    this.name.set(a.name);
    this.description.set(a.description);
    this.tags.set([...a.tags]);
    this.price.set(0);
    this.categoryChoice.set(a.category.is_new ? NEW_REF : a.category.id);
    this.newCategoryName.set(a.category.is_new ? a.category.name : '');
    this.collectionChoice.set(a.collection.is_new ? NEW_REF : a.collection.id);
    this.newCollectionName.set(a.collection.is_new ? a.collection.name : '');
  }

  onCategoryChange(value: number): void {
    this.categoryChoice.set(Number(value));
    const stillValid = this.filteredCollections().some((c) => c.id === this.collectionChoice());
    if (!stillValid) {
      this.collectionChoice.set(NEW_REF);
    }
  }

  onCollectionChange(value: number): void {
    this.collectionChoice.set(Number(value));
  }

  addTagFromInput(): void {
    const parts = this.tagInput().split(',').map((p) => p.trim()).filter(Boolean);
    if (parts.length === 0) return;
    this.tags.update((current) => {
      const next = [...current];
      for (const p of parts) if (!next.includes(p)) next.push(p);
      return next;
    });
    this.tagInput.set('');
  }

  onTagKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      this.addTagFromInput();
    }
  }

  removeTag(tag: string): void {
    this.tags.update((current) => current.filter((t) => t !== tag));
  }

  save(): void {
    const request = this.buildRequest();
    if (!request) return;

    this.isSaving.set(true);
    this.quickAddService.create(request).subscribe({
      next: (item) => {
        this.isSaving.set(false);
        this.onClose.emit();
        // ItemList lê o collectionId via snapshot; passar por '/' força a recriação da rota.
        this.router
          .navigateByUrl('/', { skipLocationChange: true })
          .then(() => this.router.navigate(['/collections', item.collection_id, 'items']));
      },
      error: () => {
        this.alertService.error('Erro ao cadastrar item.');
        this.isSaving.set(false);
      },
    });
  }

  private buildRequest(): QuickAddRequest | null {
    const name = this.name().trim();
    if (!name) {
      this.alertService.error('Nome não pode ser vazio.');
      return null;
    }
    const price = Number(this.price());
    if (isNaN(price) || price < 0) {
      this.alertService.error('Valor inválido.');
      return null;
    }

    const category = this.toRef(this.categoryChoice(), this.newCategoryName());
    const collection = this.toRef(this.collectionChoice(), this.newCollectionName());
    if (!category || !collection) {
      this.alertService.error('Informe o nome da nova categoria/coleção.');
      return null;
    }

    const description = this.description().trim();
    const tags = this.tags();
    return {
      category,
      collection,
      item: {
        name,
        description: description === '' ? null : description,
        tags: tags.length === 0 ? null : tags,
        price,
        binary_object: this.photo(),
      },
    };
  }

  private toRef(choice: number, newName: string): QuickAddRef | null {
    if (choice !== NEW_REF) return { id: choice };
    const trimmed = newName.trim();
    return trimmed ? { new_name: trimmed } : null;
  }
}
