import { Routes } from '@angular/router';
import { CategoryList } from './features/categories/categories';
import { CollectionList } from './features/collections/collections';
import { ItemList } from './features/items/items';
import { LoginComponent } from './features/auth/login/login';
import { RegisterComponent } from './features/auth/register/register';
import { authGuard } from './guards/auth.guard';
import { Home } from './features/home/home';
import { adminGuard } from './guards/admin.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: 'register',
    component: RegisterComponent,
    canActivate: [authGuard, adminGuard]
  },
  {
    path: 'home',
    component: Home,
    canActivate: [authGuard]
  },
  {
    path: 'categories',
    component: CategoryList,
    canActivate: [authGuard]
  },
  {
    path: 'collections',
    component: CollectionList,
    canActivate: [authGuard]
  },
  {
    path: 'collections/:collectionId/items',
    component: ItemList,
    canActivate: [authGuard]
  },
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: '**', redirectTo: 'home' }
];
