/**
 * Source unique du statut d'une course côté écran (TICK-077) :
 * libellé, couleur du badge et action suivante, selon le rôle de la personne qui regarde.
 * Tous les écrans (dashboards, historique, détail) passent par ici — plus de mapping recopié.
 */

export type CourseRole = 'CLIENT' | 'COURIER' | 'ADMIN';
export type StatusTone = 'info' | 'warning' | 'success' | 'danger' | 'neutral';

export interface StatusAction {
  label: string;
  link: (string | number)[];
}

export interface CourseStatusView {
  label: string;
  tone: StatusTone;
  /** Action principale attendue de cette personne, ou null s'il n'y a rien à faire. */
  action: StatusAction | null;
}

/** Données de course utiles au calcul de l'action (sous-ensemble de CourseResponse). */
export interface CourseLike {
  id: number;
  status: string;
  chatRoomId?: number | null;
  reviewDue?: boolean | null;
}

const LABELS: Record<string, { CLIENT: string; COURIER: string; tone: StatusTone }> = {
  PUBLISHED:        { CLIENT: "En attente d'offres",  COURIER: 'Nouvelle demande',                      tone: 'info' },
  ASSIGNED:         { CLIENT: 'Paiement à faire',     COURIER: 'Offre acceptée — paiement en attente', tone: 'warning' },
  IN_PROGRESS:      { CLIENT: 'En cours',             COURIER: 'À réaliser',                            tone: 'success' },
  OVERDUE:          { CLIENT: 'En retard',            COURIER: 'En retard — preuves attendues',         tone: 'danger' },
  PROOFS_SUBMITTED: { CLIENT: 'Preuves à valider',    COURIER: 'Preuves envoyées',                      tone: 'warning' },
  DISPUTED:         { CLIENT: 'Litige en cours',      COURIER: 'Litige en cours',                       tone: 'danger' },
  COMPLETED:        { CLIENT: 'Terminée',             COURIER: 'Terminée',                              tone: 'success' },
  REFUNDED:         { CLIENT: 'Remboursée',           COURIER: 'Remboursée au client',                  tone: 'neutral' },
  CANCELLED:        { CLIENT: 'Annulée',              COURIER: 'Annulée',                               tone: 'neutral' },
};

/** Statuts terminaux : plus aucune action de suivi. */
export const FINAL_STATUSES = ['COMPLETED', 'REFUNDED', 'CANCELLED'];

export function courseStatus(course: CourseLike, role: CourseRole | string): CourseStatusView {
  const r: 'CLIENT' | 'COURIER' = role === 'COURIER' ? 'COURIER' : 'CLIENT';
  const entry = LABELS[course.status];
  return {
    label: entry ? entry[r] : course.status,
    tone: entry ? entry.tone : 'neutral',
    action: role === 'ADMIN' ? null : nextAction(course, r),
  };
}

/** Classe CSS du badge (système unique .status-badge — TICK-076). */
export function statusBadgeClass(tone: StatusTone): string {
  return `status-badge status-badge--${tone}`;
}

function nextAction(c: CourseLike, role: 'CLIENT' | 'COURIER'): StatusAction | null {
  if (role === 'CLIENT') {
    switch (c.status) {
      case 'PUBLISHED':        return { label: 'Voir les coursiers', link: ['/client/select-courier', c.id] };
      case 'ASSIGNED':         return { label: 'Payer', link: ['/client/pay', c.id] };
      case 'IN_PROGRESS':      return { label: 'Suivre', link: ['/client/course-detail', c.id] };
      case 'OVERDUE':          return { label: 'Décider', link: ['/client/course-detail', c.id] };
      case 'PROOFS_SUBMITTED': return { label: 'Vérifier et valider', link: ['/client/validate', c.id] };
      case 'DISPUTED':         return { label: 'Voir le litige', link: ['/client/course-detail', c.id] };
      case 'COMPLETED':        return c.reviewDue ? { label: 'Noter le coursier', link: ['/client/rate', c.id] } : null;
      default:                 return null;
    }
  }
  switch (c.status) {
    case 'PUBLISHED':
    case 'ASSIGNED':    return c.chatRoomId ? { label: 'Ouvrir le chat', link: ['/chat', c.chatRoomId] } : null;
    case 'IN_PROGRESS':
    case 'OVERDUE':     return { label: 'Envoyer les preuves', link: ['/courier/proofs', c.id] };
    case 'COMPLETED':   return c.reviewDue ? { label: 'Noter le client', link: ['/courier/rate-client', c.id] } : null;
    default:            return null;
  }
}
