import { Routes } from '@angular/router';
import { RegisterComponent } from './features/auth/register/register.component';
import { LoginComponent } from './features/auth/login/login.component';
import { OtpComponent } from './features/auth/otp/otp.component';
import { ForgotPasswordComponent } from './features/auth/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './features/auth/reset-password/reset-password.component';
import { ClientDashboardComponent } from './features/client/dashboard/dashboard.component';
import { CreateCourseComponent } from './features/client/create-course/create-course.component';
import { SelectCourierComponent } from './features/client/select-courier/select-courier.component';
import { PayComponent } from './features/client/pay/pay.component';
import { CourierDashboardComponent } from './features/courier/dashboard/dashboard.component';
import { ChatComponent } from './features/chat/chat.component';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  // Routes publiques
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login',            component: LoginComponent },
  { path: 'register',         component: RegisterComponent },
  { path: 'verify-otp',       component: OtpComponent },
  { path: 'forgot-password',  component: ForgotPasswordComponent },
  { path: 'reset-password',   component: ResetPasswordComponent },

  // Routes CLIENT — token requis + rôle CLIENT
  {
    path: 'client/dashboard',
    component: ClientDashboardComponent,
    canActivate: [authGuard, roleGuard],
    data: { role: 'CLIENT' }
  },
  {
    path: 'client/create-course',
    component: CreateCourseComponent,
    canActivate: [authGuard, roleGuard],
    data: { role: 'CLIENT' }
  },
  {
    path: 'client/edit-course/:id',
    component: CreateCourseComponent,
    canActivate: [authGuard, roleGuard],
    data: { role: 'CLIENT' }
  },
  {
    path: 'client/select-courier/:courseId',
    component: SelectCourierComponent,
    canActivate: [authGuard, roleGuard],
    data: { role: 'CLIENT' }
  },
  {
    path: 'client/pay/:roomId',
    component: PayComponent,
    canActivate: [authGuard, roleGuard],
    data: { role: 'CLIENT' }
  },

  // Routes COURSIER — token requis + rôle COURIER
  {
    path: 'courier/dashboard',
    component: CourierDashboardComponent,
    canActivate: [authGuard, roleGuard],
    data: { role: 'COURIER' }
  },

  // Route Chat — token requis (accessible aux deux rôles)
  {
    path: 'chat/:roomId',
    component: ChatComponent,
    canActivate: [authGuard]
  },
];
