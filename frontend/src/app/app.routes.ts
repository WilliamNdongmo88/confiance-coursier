import { Routes } from '@angular/router';
import { RegisterComponent } from './features/auth/register/register.component';
import { LoginComponent } from './features/auth/login/login.component';
import { OtpComponent } from './features/auth/otp/otp.component';

export const routes: Routes = [
  { path: 'register', component: RegisterComponent },
  { path: 'login', component: LoginComponent },
  { path: 'verify-otp', component: OtpComponent },
  { path: '', redirectTo: '/login', pathMatch: 'full' }
];
