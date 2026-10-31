import { Routes } from '@angular/router';
import { RegisterComponent } from './features/auth/register/register.component';
import { LoginComponent } from './features/auth/login/login.component';
import { OtpComponent } from './features/auth/otp/otp.component';
import { ClientDashboardComponent } from './features/client/dashboard/dashboard.component';
import { CreateCourseComponent } from './features/client/create-course/create-course.component';
import {CourierDashboardComponent} from './features/courier/dashboard/dashboard.component';
import {ChatComponent} from './features/chat/chat.component';

export const routes: Routes = [
  { path: 'register', component: RegisterComponent },
  { path: 'login', component: LoginComponent },
  { path: 'verify-otp', component: OtpComponent },
  { path: 'client/dashboard', component: ClientDashboardComponent },
  { path: 'client/create-course', component: CreateCourseComponent },
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'courier/dashboard', component: CourierDashboardComponent },
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'client/create-course', component: CreateCourseComponent },
  { path: 'client/edit-course/:id', component: CreateCourseComponent },
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'chat/:roomId', component: ChatComponent },
];
