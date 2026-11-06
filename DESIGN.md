---
name: ConfianceCoursier
description: Vos courses au Cameroun, faites par un coursier vérifié, payées seulement sur preuves.
colors:
  vert-coffre: "#123b32"
  vert-coffre-2: "#1b5144"
  feuille: "#17634f"
  feuille-sombre: "#104d3d"
  feuille-tendre: "#e5f1e8"
  lime-eclat: "#d7ed9a"
  lime-eclat-2: "#c8e480"
  papier: "#f5f7f4"
  papier-2: "#f0f3ef"
  blanc: "#ffffff"
  encre: "#15241f"
  sauge: "#6d7a71"
  sauge-lisible: "#56635c"
  ligne: "#e2e8e2"
  ligne-2: "#d1dad2"
  succes: "#26845d"
  succes-fond: "#e4f3e9"
  alerte: "#a66b16"
  alerte-fond: "#fff3dc"
  danger: "#b54843"
  danger-fond: "#fbeae8"
  or-avis: "#d99d45"
  nuit-papier: "#18221d"
  nuit-surface: "#1f2c26"
  nuit-encre: "#f3f7f5"
  nuit-sauge: "#b0c0b7"
  nuit-ligne: "#2e4037"
  nuit-feuille: "#3e8a6b"
typography:
  display:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "clamp(42px, 5.25vw, 68px)"
    fontWeight: 780
    lineHeight: 1.02
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "clamp(30px, 3.2vw, 43px)"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.04em"
  title:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "17px"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "13px"
    fontWeight: 700
    lineHeight: 1.3
rounded:
  sm: "8px"
  md: "9px"
  lg: "13px"
  xl: "18px"
  pill: "99px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "48px"
  section: "93px"
  section-mobile: "63px"
components:
  button-primary:
    backgroundColor: "{colors.feuille}"
    textColor: "{colors.blanc}"
    rounded: "{rounded.md}"
    height: "48px"
    padding: "0 19px"
  button-primary-hover:
    backgroundColor: "{colors.vert-coffre-2}"
  button-coffre:
    backgroundColor: "{colors.vert-coffre}"
    textColor: "{colors.blanc}"
    rounded: "{rounded.md}"
    height: "46px"
    padding: "0 19px"
  button-secondary:
    backgroundColor: "{colors.blanc}"
    textColor: "{colors.vert-coffre}"
    rounded: "{rounded.md}"
    height: "46px"
    padding: "0 19px"
  button-lime:
    backgroundColor: "{colors.lime-eclat}"
    textColor: "{colors.vert-coffre}"
    rounded: "{rounded.md}"
    height: "46px"
    padding: "0 19px"
  button-danger:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.blanc}"
    rounded: "{rounded.md}"
    height: "48px"
  card:
    backgroundColor: "{colors.blanc}"
    rounded: "{rounded.lg}"
    padding: "24px"
  input:
    backgroundColor: "{colors.blanc}"
    textColor: "{colors.encre}"
    rounded: "{rounded.sm}"
    height: "44px"
    padding: "0 14px"
  badge-succes:
    backgroundColor: "{colors.succes-fond}"
    textColor: "{colors.succes}"
    rounded: "{rounded.pill}"
  badge-alerte:
    backgroundColor: "{colors.alerte-fond}"
    textColor: "{colors.alerte}"
    rounded: "{rounded.pill}"
  badge-danger:
    backgroundColor: "{colors.danger-fond}"
    textColor: "{colors.danger}"
    rounded: "{rounded.pill}"
  bottom-nav:
    backgroundColor: "{colors.blanc}"
    textColor: "{colors.sauge-lisible}"
    height: "56px"
---

# Design System: ConfianceCoursier

## Overview

**Creative North Star: "Le Tiers de confiance"**

ConfianceCoursier se présente comme une institution discrète qui tient l'argent pendant la course et prouve chaque étape. Le design reste sobre et rassurant : peu d'effets, beaucoup de clarté. La confiance vient de la lisibilité, de la retenue et de l'honnêteté de ce qui est montré, jamais de l'emphase. Une couleur dominante, le vert coffre profond, porte la gravité du séquestre. Le lime éclat est l'unique signal lumineux et appelle l'action.

Les surfaces s'empilent en couches nettement visibles. Le papier ivoire sert de fond, les cartes blanches posées dessus portent le contenu, et des éléments flottants (la carte « Course protégée », les feuilles modales, les menus) passent au-dessus avec une ombre ample. Le relief sert à dire « ceci est au premier plan », pas à décorer. Les composants sont doux et accueillants : arrondis généreux, couleurs tendres pour les fonds d'état, rien d'anguleux ni d'intimidant pour quelqu'un qui confie son argent à un inconnu.

La référence est la maquette v2 (`maquette-v2/`), dont l'application reprend le langage visuel : forêt et ivoire, titres serrés en Inter, photo arrondie en goutte, bandes pleine largeur en vert coffre.

**Key Characteristics:**
- Fond ivoire chaud, cartes blanches, bandes pleine largeur en vert coffre pour les moments de réassurance.
- Une seule couleur d'accent lumineuse (lime éclat), jamais utilisée pour du texte sur fond clair.
- Titres très serrés et lourds, corps de texte aéré et gris sauge.
- Couches visibles : repos, carte posée, élément flottant.
- Clair et sombre maintenus à égalité.

## Colors

Une palette forêt et ivoire, avec un vert coffre profond qui porte la gravité, une feuille plus vive pour les actions et un lime éclat qui signale l'essentiel.

### Primary
- **Vert coffre** (vert-coffre) : la couleur de la marque et du séquestre. Bouton principal du site public, pastille du logo, bandes pleine largeur (« Une preuve à chaque étape »), barre latérale de l'application. Le **Vert coffre 2** (vert-coffre-2) sert à son survol et aux surfaces secondaires en mode sombre.
- **Feuille** (feuille) : la couleur d'action dans l'application (boutons principaux, onglet actif, liens). **Feuille sombre** (feuille-sombre) pour le survol. **Feuille tendre** (feuille-tendre) pour les fonds d'icône et d'information.

### Secondary
- **Lime éclat** (lime-eclat) : le signal. Bouton sur fond vert coffre, accent du titre en mode sombre, sélection de texte, logo en sombre. **Lime éclat 2** (lime-eclat-2) pour son survol.

### Tertiary
- **Or avis** (or-avis) : réservé aux notes en étoiles. Jamais décoratif.

### Neutral
- **Papier** (papier) : fond de toutes les pages. **Papier 2** (papier-2) pour les zones en retrait.
- **Blanc** (blanc) : surfaces des cartes, champs, barre basse.
- **Encre** (encre) : titres et texte principal.
- **Sauge** (sauge) : texte secondaire de grande taille (≥ 18 px ou gras ≥ 14 px). **Sauge lisible** (sauge-lisible) : tout texte secondaire plus petit, pour rester au-dessus de 4,5:1.
- **Ligne** (ligne) et **Ligne 2** (ligne-2) : bordures des cartes, séparateurs, contour des champs.
- **Statuts** : succès, alerte et danger avec chacun leur fond tendre (succes / succes-fond, alerte / alerte-fond, danger / danger-fond), utilisés par les badges de statut de course et les bandeaux.
- **Nuit** (mode sombre) : nuit-papier (fond), nuit-surface (cartes), nuit-encre (texte), nuit-sauge (secondaire), nuit-ligne (bordures), nuit-feuille (actions). Le lime éclat reste identique.

### Named Rules
**La Règle du signal unique.** Le lime éclat est le seul accent lumineux. Il marque l'action ou l'information clé d'un écran, jamais plus de deux éléments à la fois, et jamais en texte sur papier ou sur blanc (contraste insuffisant).

**La Règle du gris lisible.** Sous 16 px, le texte secondaire est en sauge lisible, jamais en sauge ni plus clair. Aucune couleur en dur dans un composant : tout passe par les jetons, y compris en mode sombre.

## Typography

**Display Font:** Inter (avec ui-sans-serif, system-ui, Segoe UI)
**Body Font:** Inter (même pile)

**Character:** une seule famille travaillée en contraste de graisse. Les titres sont lourds et très serrés, le corps est léger et aéré : l'autorité du tiers de confiance, sans raideur.

### Hierarchy
- **Display** (780, clamp(42px, 5.25vw, 68px), 1.02) : le titre du hero uniquement, avec sa seconde ligne en feuille (lime éclat en sombre).
- **Headline** (700, clamp(30px, 3.2vw, 43px), 1.1) : titres de section des pages publiques.
- **Title** (700, 15 à 17 px, 1.3) : titres de carte, d'écran et d'étape.
- **Body** (400, 15 à 16 px, 1.55 à 1.72) : paragraphes, 65 à 75 caractères par ligne au maximum.
- **Label** (600 à 700, 12 à 13 px) : métadonnées, badges, libellés de champ. Jamais sous 12 px pour un texte, jamais sous 11 px pour un libellé fonctionnel.

### Named Rules
**La Règle du titre qui parle seul.** Aucune petite étiquette en capitales au-dessus d'un titre. Le titre porte son propre poids.

**La Règle du plancher.** Interlettrage jamais en dessous de -0,04em, taille de texte jamais sous 12 px.

## Layout

Le site public s'organise en sections pleine largeur avec un conteneur de 1180 px au maximum et des marges de 24 px (16 à 18 px sur mobile). Le rythme vertical est ample : 93 px entre les sections sur desktop, 63 px sur mobile. Le hero est en deux colonnes (texte, puis photo en goutte) et passe en une seule colonne sous 680 px. La navigation se replie en menu sous 900 px.

L'application est pensée pour le téléphone : une colonne et une action principale par écran, une barre de navigation basse à 4 onglets sous 768 px, une barre latérale fixe (242 à 260 px) au-dessus. Toutes les cibles tactiles font au moins 44 px, et les écrans plein cadre (chat) utilisent `100dvh` et la zone sûre du bas.

## Elevation & Depth

Le système fonctionne en couches nettement marquées. Le papier est le sol, les cartes blanches sont posées dessus avec une ombre à peine perceptible, et les éléments au premier plan flottent avec une ombre ample et douce, toujours décalée vers le bas. Les ombres sont teintées de vert forêt, jamais de noir pur ni sans décalage.

### Shadow Vocabulary
- **Posé** (`box-shadow: 0 5px 20px rgb(23 49 34 / .035)`) : cartes au repos.
- **Bouton** (`box-shadow: 0 4px 12px #123b3214`) : boutons pleins ; au survol, `0 7px 18px #123b3224` avec une montée de 1 px.
- **Flottant** (`box-shadow: 0 15px 45px #142b1d1c`) : cartes au premier plan, feuilles modales, menus.
- **Vitrine** (`box-shadow: 0 30px 80px #1d3b2b22`) : la photo du hero uniquement.

### Named Rules
**La Règle des couches.** Trois niveaux seulement : sol, posé, flottant. Un élément ne flotte que s'il est réellement au-dessus du reste (superposé, modal, déroulant). Jamais de carte dans une carte.

## Shapes

Des formes douces et accueillantes. Champs et petits boutons en 8 px, boutons en 9 à 10 px, cartes en 12 à 13 px, grands visuels en 18 px, badges et puces en pilule. La signature est la **goutte** de la photo du hero : trois coins à 18 px et le coin haut droit très ouvert (108 px, 76 px sur mobile). Les bordures font 1 px, en ligne, jamais d'accent coloré épais sur un côté.

## Components

### Buttons
- **Shape:** arrondi doux (9 px), hauteur 46 à 48 px (44 px minimum), graisse 700 à 750, icône de flèche à droite pour les actions qui font avancer.
- **Primary:** feuille sur blanc dans l'application ; vert coffre sur blanc pour les CTA du site public. Ombre « Bouton ».
- **Hover / Focus:** passage au vert coffre 2, montée de 1 px, ombre renforcée. Focus clavier : anneau de 3 px décalé de 3 px.
- **Secondary:** blanc, bordure ligne, texte vert coffre ; au survol, fond papier 2.
- **Lime:** lime éclat et texte vert coffre, uniquement sur fond vert coffre.
- **Danger:** danger plein pour les actions irréversibles (suspendre, ouvrir un litige confirmé).

### Chips
- **Style:** badges de statut en pilule, fond tendre et texte de la même famille (succès, alerte, danger, info en feuille tendre, neutre en papier 2), 12 px gras.
- **State:** le libellé et la couleur viennent du statut de la course et du rôle (helper `courseStatus`), jamais choisis à la main.

### Cards / Containers
- **Corner Style:** 13 px.
- **Background:** blanc sur papier (nuit-surface en sombre).
- **Shadow Strategy:** « Posé » au repos, « Flottant » quand la carte passe au premier plan.
- **Border:** 1 px ligne.
- **Internal Padding:** 18 à 25 px.

### Inputs / Fields
- **Style:** blanc, bordure 1 px, arrondi 8 px, hauteur 44 px, texte 16 px sur mobile (pas de zoom iOS).
- **Focus:** bordure vert sauge et halo feuille de 3 px très léger.
- **Error / Disabled:** bordure et message en danger sous le champ ; désactivé en papier 2 avec texte sauge.

### Navigation
- **Site public :** barre collante translucide (blanc à 88 %, flou), logo en pastille vert coffre, liens 13 px gras en sauge lisible, menu repliable sous 900 px.
- **Application mobile :** barre basse blanche à 4 onglets par rôle (56 px de haut), icône et libellé, onglet actif en feuille avec un trait de 3 px en haut, pastille de compteur en danger.
- **Application desktop :** barre latérale fixe en vert coffre.

### La carte « Course protégée »
La carte signature : une carte blanche flottante posée en débord sur la photo, avec pastille d'icône bouclier, titre et sous-titre, puis un pied séparé par un filet (« Paiement sécurisé · Vérifié »). Elle incarne le Tiers de confiance : la garantie au premier plan. Elle reste claire en mode sombre pour rester lisible sur la photo.

## Do's and Don'ts

### Do:
- **Do** poser chaque contenu sur une carte blanche à 13 px sur le papier, et réserver l'ombre « Flottant » aux éléments réellement au premier plan.
- **Do** utiliser la feuille pour l'action principale de l'application et le vert coffre pour les CTA du site public, une action principale par écran.
- **Do** garder le texte secondaire en sauge lisible sous 16 px et vérifier 4,5:1 en clair comme en sombre.
- **Do** passer toute couleur par un jeton, y compris dans les composants et en mode sombre.
- **Do** garder des cibles tactiles d'au moins 44 px et un focus clavier visible.

### Don't:
- **Don't** mettre une petite étiquette en capitales au-dessus d'un titre.
- **Don't** utiliser le lime éclat pour du texte sur fond clair ni pour plus de deux éléments par écran.
- **Don't** afficher d'avis, d'étoiles, d'avatars ou de compteurs sans source réelle.
- **Don't** imbriquer des cartes, ni ajouter un accent coloré épais sur un bord de carte.
- **Don't** écrire de `style=""` ni de couleur hexadécimale en dur dans un composant.
