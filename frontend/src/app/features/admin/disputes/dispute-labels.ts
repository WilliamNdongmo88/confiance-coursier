/** Libellés des litiges, partagés par l'écran des litiges et la fiche utilisateur. */
/** Mêmes codes que le formulaire d'ouverture (dispute-form) + litige automatique de non-livraison. */
export const DISPUTE_MOTIFS: Record<string, string> = {
  'L-C1': 'La course n’a pas été faite', 'L-C2': 'La course est incomplète', 'L-C3': 'Les preuves ne sont pas conformes',
  'L-C4': 'Argent détourné', 'L-C5': 'Comportement irrespectueux du coursier', 'L-C6': 'Retard important',
  'L-F1': 'Le client ne valide pas', 'L-F2': 'Supplément légitime refusé', 'L-F3': 'Client injurieux ou menaçant',
  'L-F4': 'Fausse accusation', 'SYS-NL': 'Non-livraison (litige automatique)',
};

export const DISPUTE_DONE: Record<string, string> = {
  LIBERATION: 'Payé au coursier', REMBOURSEMENT_TOTAL: 'Client remboursé', REMBOURSEMENT_PARTIEL: 'Montant partagé', SANCTION: 'Payé au coursier (sanction)',
};
