import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { guestGuard } from './core/guards/guest.guard';
import { LandingComponent } from './features/public/landing/landing.component';
import { NotFoundComponent } from './features/public/not-found/not-found.component';

// TICK-079 : chaque écran est chargé à la demande (loadComponent) ; le bundle initial ne contient
// que la landing, la 404, les guards et le socle — Lighthouse mobile et budget de taille.
export const routes: Routes = [
  // Routes publiques — TICK-072 : un utilisateur connecté est envoyé vers son espace (guestGuard)
  { path: '',                 component: LandingComponent,        canActivate: [guestGuard], pathMatch: 'full' },
  { path: 'login',            loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent),          canActivate: [guestGuard] },
  { path: 'register',         loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent),       canActivate: [guestGuard] },
  { path: 'verify-otp',       loadComponent: () => import('./features/auth/otp/otp.component').then(m => m.OtpComponent),            canActivate: [guestGuard] },
  { path: 'forgot-password',  loadComponent: () => import('./features/auth/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent), canActivate: [guestGuard] },
  { path: 'reset-password',   loadComponent: () => import('./features/auth/reset-password/reset-password.component').then(m => m.ResetPasswordComponent) },
  { path: 'support',          loadComponent: () => import('./features/public/support/support.component').then(m => m.SupportComponent) },
  { path: 'conditions-utilisation', loadComponent: () => import('./features/public/legal/legal-page.component').then(m => m.LegalPageComponent), data: { doc: 'cgu' }, title: 'Conditions d’utilisation — ConfianceCoursier' },
  { path: 'confidentialite',        loadComponent: () => import('./features/public/legal/legal-page.component').then(m => m.LegalPageComponent), data: { doc: 'privacy' }, title: 'Politique de confidentialité — ConfianceCoursier' },

  // ── TICK-075 : le shell (sidebar desktop + barre basse mobile) est déclaré UNE fois par espace ──
  // Les pages ne l'enveloppent plus ; titre et largeur viennent de data.title / data.narrow.
  {
    path: 'client',
    loadComponent: () => import('./shared/components/app-shell/app-shell.component').then(m => m.AppShellComponent),
    canActivate: [authGuard, roleGuard],
    data: { role: 'CLIENT' },
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard',               loadComponent: () => import('./features/client/dashboard/dashboard.component').then(m => m.ClientDashboardComponent), data: { title: "Vue d'ensemble" } },
      { path: 'create-course',           loadComponent: () => import('./features/client/create-course/create-course.component').then(m => m.CreateCourseComponent),    data: { title: 'Nouvelle course', narrow: true } },
      { path: 'edit-course/:id',         loadComponent: () => import('./features/client/create-course/create-course.component').then(m => m.CreateCourseComponent),    data: { title: 'Modifier la course', narrow: true } },
      { path: 'select-courier/:courseId', loadComponent: () => import('./features/client/select-courier/select-courier.component').then(m => m.SelectCourierComponent),  data: { title: 'Choisir un coursier', narrow: true } },
      { path: 'pay/:courseId',           loadComponent: () => import('./features/client/pay/pay.component').then(m => m.PayComponent),             data: { title: 'Paiement', narrow: true } },
      { path: 'course-detail/:courseId', loadComponent: () => import('./features/client/course-detail/course-detail.component').then(m => m.CourseDetailComponent),    data: { title: 'Détail course', narrow: true } },
      { path: 'validate/:courseId',      loadComponent: () => import('./features/client/validate/validate.component').then(m => m.ValidateComponent),        data: { title: 'Validation de la course' } },
      { path: 'rate/:courseId',          loadComponent: () => import('./features/shared/rate/rate.component').then(m => m.RateComponent),            data: { title: 'Notation coursier' } },
      { path: 'dispute-form/:courseId',  loadComponent: () => import('./features/shared/dispute-form/dispute-form.component').then(m => m.DisputeFormComponent),     data: { title: 'Signaler un problème' } },
      { path: 'history',                 loadComponent: () => import('./features/shared/history/history.component').then(m => m.HistoryComponent),         data: { title: 'Historique' } },
      { path: 'profile',                 loadComponent: () => import('./features/shared/profile/profile.component').then(m => m.ProfileComponent),         data: { title: 'Mon profil' } },
    ],
  },
  {
    path: 'courier',
    loadComponent: () => import('./shared/components/app-shell/app-shell.component').then(m => m.AppShellComponent),
    canActivate: [authGuard, roleGuard],
    data: { role: 'COURIER' },
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard',               loadComponent: () => import('./features/courier/dashboard/dashboard.component').then(m => m.CourierDashboardComponent), data: { title: "Vue d'ensemble" } },
      { path: 'kyc',                     loadComponent: () => import('./features/courier/kyc/kyc.component').then(m => m.KycComponent),              data: { title: 'Vérification KYC' } },
      { path: 'proofs/:courseId',        loadComponent: () => import('./features/courier/proofs/proofs.component').then(m => m.ProofsComponent),           data: { title: 'Preuves de la course' } },
      { path: 'rate-client/:courseId',   loadComponent: () => import('./features/shared/rate/rate.component').then(m => m.RateComponent),             data: { title: 'Notation client' } },
      { path: 'dispute-form/:courseId',  loadComponent: () => import('./features/shared/dispute-form/dispute-form.component').then(m => m.DisputeFormComponent),      data: { title: 'Signaler un problème' } },
      { path: 'earnings',                loadComponent: () => import('./features/courier/earnings/earnings.component').then(m => m.EarningsComponent),         data: { title: 'Mes gains' } },
      { path: 'history',                 loadComponent: () => import('./features/shared/history/history.component').then(m => m.HistoryComponent),          data: { title: 'Historique' } },
      { path: 'profile',                 loadComponent: () => import('./features/shared/profile/profile.component').then(m => m.ProfileComponent),          data: { title: 'Mon profil coursier' } },
    ],
  },
  {
    path: 'admin',
    loadComponent: () => import('./shared/components/app-shell/app-shell.component').then(m => m.AppShellComponent),
    canActivate: [authGuard, roleGuard],
    data: { role: 'ADMIN' },
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard',       loadComponent: () => import('./features/admin/dashboard/dashboard.component').then(m => m.AdminDashboardComponent),      data: { title: "Vue d'ensemble" } },
      { path: 'kyc',             loadComponent: () => import('./features/admin/kyc/kyc.component').then(m => m.AdminKycComponent),            data: { title: 'Validations KYC' } },
      { path: 'disputes',        loadComponent: () => import('./features/admin/disputes/disputes.component').then(m => m.AdminDisputesComponent),       data: { title: 'Litiges' } },
      { path: 'reports',         loadComponent: () => import('./features/admin/reports/reports.component').then(m => m.AdminReportsComponent),        data: { title: 'Signalements' } },
      { path: 'commissions',     loadComponent: () => import('./features/admin/commissions/commissions.component').then(m => m.AdminCommissionsComponent),    data: { title: 'Commissions', narrow: true } },
      { path: 'users',           loadComponent: () => import('./features/admin/users/users.component').then(m => m.AdminUsersComponent),          data: { title: 'Utilisateurs' } },
      { path: 'gains',           loadComponent: () => import('./features/admin/gains/gains.component').then(m => m.AdminGainsComponent),          data: { title: 'Gains' } },
      { path: 'payout-settings', loadComponent: () => import('./features/admin/payout-settings/payout-settings.component').then(m => m.AdminPayoutSettingsComponent), data: { title: 'Reversements', narrow: true } },
    ],
  },

  // Signalement : client ou coursier (shell du rôle connecté)
  {
    path: 'report-user',
    loadComponent: () => import('./shared/components/app-shell/app-shell.component').then(m => m.AppShellComponent),
    canActivate: [authGuard],
    children: [
      { path: ':userId', loadComponent: () => import('./features/shared/report-user/report-user.component').then(m => m.ReportUserComponent), data: { title: 'Signaler un utilisateur' } },
    ],
  },

  // Chat : plein écran (son propre en-tête, sans barre basse) — TICK-075
  { path: 'chat/:roomId', loadComponent: () => import('./features/chat/chat.component').then(m => m.ChatComponent), canActivate: [authGuard] },

  // TICK-072 : toute route inconnue → page 404 (doit rester en dernier)
  { path: '**', component: NotFoundComponent },
];
