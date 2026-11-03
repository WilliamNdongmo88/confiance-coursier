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
import { CourseDetailComponent } from './features/client/course-detail/course-detail.component';
import { CourierDashboardComponent } from './features/courier/dashboard/dashboard.component';
import { KycComponent } from './features/courier/kyc/kyc.component';
import { ProfileComponent } from './features/shared/profile/profile.component';
import { DisputeFormComponent } from './features/shared/dispute-form/dispute-form.component';
import { ReportUserComponent } from './features/shared/report-user/report-user.component';
import { RateComponent } from './features/shared/rate/rate.component';
import { ValidateComponent } from './features/client/validate/validate.component';
import { ProofsComponent } from './features/courier/proofs/proofs.component';
import { ChatComponent } from './features/chat/chat.component';
import { AdminDashboardComponent } from './features/admin/dashboard/dashboard.component';
import { AdminKycComponent } from './features/admin/kyc/kyc.component';
import { AdminDisputesComponent } from './features/admin/disputes/disputes.component';
import { AdminReportsComponent } from './features/admin/reports/reports.component';
import { AdminCommissionsComponent } from './features/admin/commissions/commissions.component';
import { AdminUsersComponent } from './features/admin/users/users.component';
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
  {
    path: 'client/course-detail/:courseId',
    component: CourseDetailComponent,
    canActivate: [authGuard, roleGuard],
    data: { role: 'CLIENT' }
  },
  {
    path: 'client/profile',
    component: ProfileComponent,
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
  {
    path: 'courier/kyc',
    component: KycComponent,
    canActivate: [authGuard, roleGuard],
    data: { role: 'COURIER' }
  },
  {
    path: 'courier/profile',
    component: ProfileComponent,
    canActivate: [authGuard, roleGuard],
    data: { role: 'COURIER' }
  },

  // Routes partagées CLIENT + COURIER (authGuard uniquement)
  {
    path: 'client/dispute-form/:courseId',
    component: DisputeFormComponent,
    canActivate: [authGuard, roleGuard],
    data: { role: 'CLIENT' }
  },
  {
    path: 'courier/dispute-form/:courseId',
    component: DisputeFormComponent,
    canActivate: [authGuard, roleGuard],
    data: { role: 'COURIER' }
  },
  {
    path: 'report-user/:userId',
    component: ReportUserComponent,
    canActivate: [authGuard]
  },
  {
    path: 'client/rate/:courseId',
    component: RateComponent,
    canActivate: [authGuard, roleGuard],
    data: { role: 'CLIENT' }
  },
  {
    path: 'courier/rate-client/:courseId',
    component: RateComponent,
    canActivate: [authGuard, roleGuard],
    data: { role: 'COURIER' }
  },
  {
    path: 'client/validate/:courseId',
    component: ValidateComponent,
    canActivate: [authGuard, roleGuard],
    data: { role: 'CLIENT' }
  },
  {
    path: 'courier/proofs/:courseId',
    component: ProofsComponent,
    canActivate: [authGuard, roleGuard],
    data: { role: 'COURIER' }
  },

  // Route Chat — token requis (accessible aux deux rôles)
  {
    path: 'chat/:roomId',
    component: ChatComponent,
    canActivate: [authGuard]
  },

  // Routes ADMIN — token requis + rôle ADMIN
  {
    path: 'admin/dashboard',
    component: AdminDashboardComponent,
    canActivate: [authGuard, roleGuard],
    data: { role: 'ADMIN' }
  },
  {
    path: 'admin/kyc',
    component: AdminKycComponent,
    canActivate: [authGuard, roleGuard],
    data: { role: 'ADMIN' }
  },
  {
    path: 'admin/disputes',
    component: AdminDisputesComponent,
    canActivate: [authGuard, roleGuard],
    data: { role: 'ADMIN' }
  },
  {
    path: 'admin/reports',
    component: AdminReportsComponent,
    canActivate: [authGuard, roleGuard],
    data: { role: 'ADMIN' }
  },
  {
    path: 'admin/commissions',
    component: AdminCommissionsComponent,
    canActivate: [authGuard, roleGuard],
    data: { role: 'ADMIN' }
  },
  {
    path: 'admin/users',
    component: AdminUsersComponent,
    canActivate: [authGuard, roleGuard],
    data: { role: 'ADMIN' }
  },
];
