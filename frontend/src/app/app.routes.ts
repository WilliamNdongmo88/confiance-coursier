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
import { HistoryComponent } from './features/shared/history/history.component';
import { EarningsComponent } from './features/courier/earnings/earnings.component';
import { AdminDashboardComponent } from './features/admin/dashboard/dashboard.component';
import { AdminKycComponent } from './features/admin/kyc/kyc.component';
import { AdminDisputesComponent } from './features/admin/disputes/disputes.component';
import { AdminReportsComponent } from './features/admin/reports/reports.component';
import { AdminCommissionsComponent } from './features/admin/commissions/commissions.component';
import { AdminUsersComponent } from './features/admin/users/users.component';
import { AdminGainsComponent } from './features/admin/gains/gains.component';
import { AdminPayoutSettingsComponent } from './features/admin/payout-settings/payout-settings.component';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { guestGuard } from './core/guards/guest.guard';
import { AppShellComponent } from './shared/components/app-shell/app-shell.component';
import { LandingComponent } from './features/public/landing/landing.component';
import { NotFoundComponent } from './features/public/not-found/not-found.component';
import { SupportComponent } from './features/public/support/support.component';

export const routes: Routes = [
  // Routes publiques — TICK-072 : un utilisateur connecté est envoyé vers son espace (guestGuard)
  { path: '',                 component: LandingComponent,        canActivate: [guestGuard], pathMatch: 'full' },
  { path: 'login',            component: LoginComponent,          canActivate: [guestGuard] },
  { path: 'register',         component: RegisterComponent,       canActivate: [guestGuard] },
  { path: 'verify-otp',       component: OtpComponent,            canActivate: [guestGuard] },
  { path: 'forgot-password',  component: ForgotPasswordComponent, canActivate: [guestGuard] },
  { path: 'reset-password',   component: ResetPasswordComponent },
  { path: 'support',          component: SupportComponent },

  // ── TICK-075 : le shell (sidebar desktop + barre basse mobile) est déclaré UNE fois par espace ──
  // Les pages ne l'enveloppent plus ; titre et largeur viennent de data.title / data.narrow.
  {
    path: 'client',
    component: AppShellComponent,
    canActivate: [authGuard, roleGuard],
    data: { role: 'CLIENT' },
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard',               component: ClientDashboardComponent, data: { title: "Vue d'ensemble" } },
      { path: 'create-course',           component: CreateCourseComponent,    data: { title: 'Nouvelle course', narrow: true } },
      { path: 'edit-course/:id',         component: CreateCourseComponent,    data: { title: 'Modifier la course', narrow: true } },
      { path: 'select-courier/:courseId', component: SelectCourierComponent,  data: { title: 'Choisir un coursier', narrow: true } },
      { path: 'pay/:courseId',           component: PayComponent,             data: { title: 'Paiement', narrow: true } },
      { path: 'course-detail/:courseId', component: CourseDetailComponent,    data: { title: 'Détail course', narrow: true } },
      { path: 'validate/:courseId',      component: ValidateComponent,        data: { title: 'Validation de la course' } },
      { path: 'rate/:courseId',          component: RateComponent,            data: { title: 'Notation coursier' } },
      { path: 'dispute-form/:courseId',  component: DisputeFormComponent,     data: { title: 'Signaler un problème' } },
      { path: 'history',                 component: HistoryComponent,         data: { title: 'Historique' } },
      { path: 'profile',                 component: ProfileComponent,         data: { title: 'Mon profil' } },
    ],
  },
  {
    path: 'courier',
    component: AppShellComponent,
    canActivate: [authGuard, roleGuard],
    data: { role: 'COURIER' },
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard',               component: CourierDashboardComponent, data: { title: "Vue d'ensemble" } },
      { path: 'kyc',                     component: KycComponent,              data: { title: 'Vérification KYC' } },
      { path: 'proofs/:courseId',        component: ProofsComponent,           data: { title: 'Preuves de la course' } },
      { path: 'rate-client/:courseId',   component: RateComponent,             data: { title: 'Notation client' } },
      { path: 'dispute-form/:courseId',  component: DisputeFormComponent,      data: { title: 'Signaler un problème' } },
      { path: 'earnings',                component: EarningsComponent,         data: { title: 'Mes gains' } },
      { path: 'history',                 component: HistoryComponent,          data: { title: 'Historique' } },
      { path: 'profile',                 component: ProfileComponent,          data: { title: 'Mon profil coursier' } },
    ],
  },
  {
    path: 'admin',
    component: AppShellComponent,
    canActivate: [authGuard, roleGuard],
    data: { role: 'ADMIN' },
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard',       component: AdminDashboardComponent,      data: { title: "Vue d'ensemble" } },
      { path: 'kyc',             component: AdminKycComponent,            data: { title: 'Validations KYC' } },
      { path: 'disputes',        component: AdminDisputesComponent,       data: { title: 'Litiges' } },
      { path: 'reports',         component: AdminReportsComponent,        data: { title: 'Signalements' } },
      { path: 'commissions',     component: AdminCommissionsComponent,    data: { title: 'Commissions', narrow: true } },
      { path: 'users',           component: AdminUsersComponent,          data: { title: 'Utilisateurs' } },
      { path: 'gains',           component: AdminGainsComponent,          data: { title: 'Gains' } },
      { path: 'payout-settings', component: AdminPayoutSettingsComponent, data: { title: 'Reversements', narrow: true } },
    ],
  },

  // Signalement : client ou coursier (shell du rôle connecté)
  {
    path: 'report-user',
    component: AppShellComponent,
    canActivate: [authGuard],
    children: [
      { path: ':userId', component: ReportUserComponent, data: { title: 'Signaler un utilisateur' } },
    ],
  },

  // Chat : plein écran (son propre en-tête, sans barre basse) — TICK-075
  { path: 'chat/:roomId', component: ChatComponent, canActivate: [authGuard] },

  // TICK-072 : toute route inconnue → page 404 (doit rester en dernier)
  { path: '**', component: NotFoundComponent },
];
