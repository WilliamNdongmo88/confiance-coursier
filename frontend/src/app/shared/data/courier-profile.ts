/**
 * TICK-089 — données partagées du profil coursier : villes proposées (saisie libre possible) et moyens
 * de déplacement (mêmes valeurs que le serveur : A_PIED | VELO | MOTO | VOITURE | TRICYCLE).
 */
export const CAMEROON_CITIES = ['Douala', 'Yaoundé', 'Bafoussam', 'Bamenda', 'Garoua', 'Maroua', 'Ngaoundéré', 'Bertoua',
  'Ebolowa', 'Buea', 'Limbe', 'Kribi', 'Kumba', 'Dschang', 'Nkongsamba', 'Edéa'];

export const VEHICLES: { value: string; label: string }[] = [
  { value: 'MOTO', label: 'Moto' },
  { value: 'VOITURE', label: 'Voiture' },
  { value: 'TRICYCLE', label: 'Tricycle' },
  { value: 'VELO', label: 'Vélo' },
  { value: 'A_PIED', label: 'À pied' },
];

export function vehicleLabel(v: string | null | undefined): string {
  return VEHICLES.find((x) => x.value === v)?.label ?? '';
}

/** Ville comparable : minuscules, sans accents ni espaces superflus (« Yaoundé » = « yaounde »). */
export function normalizeCity(c: string | null | undefined): string {
  return (c ?? '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/** Ville d'une course : partie avant « - » dans « Ville - Quartier ». */
export function courseCity(zone: string | null | undefined): string {
  return (zone ?? '').split(' - ')[0].trim();
}
