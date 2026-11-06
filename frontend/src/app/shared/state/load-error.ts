/**
 * Chargement secondaire en échec (TICK-077) : la page reste utilisable avec une valeur de repli,
 * mais l'échec n'est plus avalé en silence — il est journalisé avec son contexte et le repli appliqué.
 * Les chargements principaux, eux, affichent <app-error-state> avec « Réessayer ».
 */
export function warnLoadFailed(context: string, fallback: string): (err: unknown) => void {
  return (err: unknown) => console.warn(`[chargement secondaire] ${context} — repli : ${fallback}`, err);
}
