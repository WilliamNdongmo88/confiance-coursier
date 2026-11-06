import { courseStatus, statusBadgeClass } from './course-status';

// TICK-077 — source unique du statut : libellé, couleur et action suivante par rôle.
describe('courseStatus', () => {
  const ALL = ['PUBLISHED', 'ASSIGNED', 'IN_PROGRESS', 'OVERDUE', 'PROOFS_SUBMITTED',
               'DISPUTED', 'COMPLETED', 'REFUNDED', 'CANCELLED'];

  it('donne un libellé lisible à tous les statuts, pour les deux rôles', () => {
    for (const status of ALL) {
      for (const role of ['CLIENT', 'COURIER']) {
        const v = courseStatus({ id: 1, status }, role);
        expect(v.label).not.toBe(status);
        expect(v.label.length).toBeGreaterThan(0);
      }
    }
  });

  it('colore les statuts problématiques en danger', () => {
    expect(courseStatus({ id: 1, status: 'OVERDUE' }, 'CLIENT').tone).toBe('danger');
    expect(courseStatus({ id: 1, status: 'DISPUTED' }, 'COURIER').tone).toBe('danger');
    expect(statusBadgeClass('danger')).toBe('status-badge status-badge--danger');
  });

  it("propose au client l'action attendue", () => {
    expect(courseStatus({ id: 7, status: 'ASSIGNED' }, 'CLIENT').action?.link).toEqual(['/client/pay', 7]);
    expect(courseStatus({ id: 7, status: 'PROOFS_SUBMITTED' }, 'CLIENT').action?.link).toEqual(['/client/validate', 7]);
    expect(courseStatus({ id: 7, status: 'OVERDUE' }, 'CLIENT').action?.link).toEqual(['/client/course-detail', 7]);
  });

  it('propose au coursier les preuves, y compris en retard', () => {
    expect(courseStatus({ id: 3, status: 'IN_PROGRESS' }, 'COURIER').action?.link).toEqual(['/courier/proofs', 3]);
    expect(courseStatus({ id: 3, status: 'OVERDUE' }, 'COURIER').action?.link).toEqual(['/courier/proofs', 3]);
  });

  it("n'invite à noter que si l'avis est dû", () => {
    expect(courseStatus({ id: 5, status: 'COMPLETED', reviewDue: true }, 'CLIENT').action?.link).toEqual(['/client/rate', 5]);
    expect(courseStatus({ id: 5, status: 'COMPLETED', reviewDue: true }, 'COURIER').action?.link).toEqual(['/courier/rate-client', 5]);
    expect(courseStatus({ id: 5, status: 'COMPLETED', reviewDue: false }, 'CLIENT').action).toBeNull();
  });

  it("n'a aucune action sur une course close ou pour l'admin", () => {
    expect(courseStatus({ id: 1, status: 'REFUNDED' }, 'CLIENT').action).toBeNull();
    expect(courseStatus({ id: 1, status: 'CANCELLED' }, 'COURIER').action).toBeNull();
    expect(courseStatus({ id: 1, status: 'ASSIGNED' }, 'ADMIN').action).toBeNull();
  });
});
