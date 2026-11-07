# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Trois rôles, tous principalement sur mobile.

- **Client** (deux publics à égalité) :
  - la **diaspora camerounaise**, qui fait réaliser à distance des achats et démarches pour ses proches au Cameroun ;
  - les **résidents au Cameroun**, qui délèguent localement leurs courses (marché, pharmacie, colis, démarches).
  Leur besoin commun : confier une tâche à quelqu'un qu'ils ne connaissent pas, sans risquer leur argent.
- **Coursier** : travailleur indépendant au Cameroun, identité vérifiée (KYC), qui répond aux demandes, négocie son tarif dans le chat, réalise la course et fournit les preuves pour être payé.
- **Administrateur** : arbitre les litiges, valide les identités (KYC), traite les signalements et les courses bloquées, règle les paramètres de la plateforme (taux, tarif minimum, délais, encaissement).

## Product Purpose

Permettre de faire réaliser une course au Cameroun par un inconnu en toute confiance : l'argent du client reste bloqué tant que le coursier n'a pas prouvé que la course est faite, et le coursier a la garantie d'être payé quand il a livré. Succès = une course payée, réalisée, prouvée, validée et notée des deux côtés, sans litige.

## Positioning

La confiance n'est pas une promesse, c'est un mécanisme :
- **séquestre** : fonds bloqués au paiement, libérés seulement sur validation du client, automatiquement 72 h après l'envoi des preuves, ou par décision de l'admin en litige ;
- **preuves obligatoires** : vidéo ≤ 30 s horodatée et géolocalisée, photos, reçu si achat, prises depuis l'app ;
- **double déclaration** : le coursier fixe son tarif, le client saisit lui-même le montant des achats (le coursier ne peut pas gonfler les frais) ;
- **échéance de preuves** : sans preuves dans les délais, le client prolonge, annule et est remboursé, ou ouvre un litige — les fonds ne sont jamais versés sans preuves ;
- **identité vérifiée** des coursiers avant toute offre, notation obligatoire des deux côtés, suspension automatique sur mauvaises notes ou signalements.

## Operating Context

- Usage majoritairement sur téléphone, réseaux mobiles parfois lents ou instables (envoi des preuves avec reprise).
- Paiement : MTN Mobile Money, Orange Money, carte bancaire. Montants en XAF.
- Parcours client : décrire la course → recevoir des offres de coursiers → discuter dans le chat → accepter et payer (séquestre) → suivre → vérifier les preuves → libérer ou ouvrir un litige → noter.
- Parcours coursier : voir les demandes → proposer son tarif (net affiché) → réaliser → filmer/photographier les preuves → être payé → noter le client.
- Le chat est archivé et lisible par l'admin en cas de litige (bandeau d'avertissement).

## Capabilities and Constraints

- **Couverture** : tout le Cameroun, sans restriction de ville. **Langue** : français uniquement au lancement (pas de sélecteur de langue).
- Application Angular (web mobile-first, installable/PWA), backend Spring Boot ; navigation basse à 4 onglets par rôle sur mobile.
- Frais client, commission coursier, tarif minimum et délais (échéance de preuves, délai de grâce, validation automatique 72 h) sont **paramétrés par l'admin** ; ne jamais afficher de taux en dur — les lire du serveur.
- États de course : publiée, paiement à faire, en cours, en retard, preuves à valider, litige, terminée, remboursée, annulée.
- Les nouveaux taux ne s'appliquent qu'aux nouvelles courses.

## Brand Commitments

- Nom : **ConfianceCoursier**.
- Référence visuelle validée par l'utilisateur : **maquette-v2** (`maquette-v2/`). Pas de maquette-v3. Les écrans sont retravaillés un par un à partir des captures et consignes de l'utilisateur.
- Voix : vouvoiement, français simple et concret, vocabulaire de l'app (course, coursier, séquestre, preuves, litige, valider/libérer).

## Evidence on Hand

- **Aucune preuve sociale réelle pour l'instant** : pas d'avis clients, pas de chiffres d'activité, pas de partenaires, pas de presse. Ne jamais en inventer (ni avatars d'avis, ni étoiles, ni compteurs).
- **Pas d'entité légale renseignée** : pas de page « Mentions légales » tant que de vraies informations n'existent pas.
- **Pas de photos réelles** de coursiers ou de courses : l'image du hero (`frontend/public/img/courier-hero.webp`, issue de la maquette v2) est une illustration, à ne jamais présenter comme un coursier réel de la plateforme.
- Ce qui peut être montré : le fonctionnement réel (séquestre, preuves, KYC, litige, échéances) et l'interface elle-même.

## Product Principles

1. **Pas d'argent sans preuve** : chaque écran qui touche à un paiement dit où est l'argent et ce qui le débloque.
2. **Une action principale par écran**, pilotée par le statut de la course et le rôle.
3. **Rien de factice** : aucune donnée, badge, métrique ou avis sans source réelle.
4. **Pensé pour le téléphone et le réseau mobile** d'abord : légèreté, reprise après coupure, états de chargement, vide et erreur systématiques.
5. **Les deux côtés sont protégés** : le client contre la non-livraison, le coursier contre la non-validation (72 h).

## Accessibility & Inclusion

- Cibles tactiles ≥ 44 px, contraste WCAG AA (texte ≥ 4,5:1) en clair et en sombre, `100dvh` pour le clavier mobile, focus clavier visible.
- Mode clair et mode sombre maintenus tous les deux.
