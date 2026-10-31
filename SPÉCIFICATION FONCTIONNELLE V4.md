# SPÉCIFICATION FONCTIONNELLE V5.0

## Projet : ConfianceCoursier — Plateforme de coursier de confiance

**Statut : Validé**
**Dernière mise à jour : 28 Octobre 2026**
**Base : Fusion des versions V3.0 (22 Oct 2025) et V4.0 (28 Oct 2026)**

---

## 1. RÈGLES MÉTIER CRITIQUES

### 1.1 Modèle Économique et Commissions

- **Frais de service Client** : Configurable par l'admin (0% par défaut). Appliqué sur le montant total. Le client paie le prix juste.
- **Frais de service Coursier** : Configurable par l'admin (20% par défaut). Déduits du salaire net du coursier.
- **Tarif Minimum Coursier** : Configurable par l'admin (ex: 5 000 XAF). **Bloquant** : une offre en dessous de ce seuil est refusée.
- **Affichage** : Le client voit le montant total à payer. Le coursier voit son net perçu (après déduction des frais de service).

### 1.2 Double Déclaration (Sécurité)

- Le **Coursier** propose uniquement son **Tarif (salaire)** via le chat.
- Le **Client** saisit lui-même les **Frais réels (achats)** lors du paiement.
- Le système additionne les deux pour former le **Total Escrow**.
- Ce mécanisme empêche le coursier de gonfler artificiellement les frais réels et protège le client.

### 1.3 Séquestre (Escrow)

- Les fonds sont bloqués lors du paiement du client.
- Libération au coursier uniquement si :
  - Validation explicite du client.
  - Ou validation automatique après **72h**.
  - Ou décision de l'admin en cas de litige.
- En cas de litige, les fonds restent bloqués jusqu'à l'arbitrage.
- Libération → envoi direct au coursier (pas de wallet intermédiaire).

### 1.4 Preuves (Anti-Fraude) et Traçabilité

- **Vidéo** : Obligatoire, max 10 secondes, horodatée et géolocalisée.
- **Photos** : Obligatoire, min 1, max 10.
- **Reçu** : Obligatoire si achat.
- **Sécurité** : Métadonnées EXIF préservées, upload uniquement via l'app, détection de doublons (hash SHA-256).
- **Chat** : Archivé et lisible par l'admin en cas de litige. Un bandeau avertit les utilisateurs que les échanges sont tracés.

### 1.5 Notation et Confiance

- Note obligatoire des deux côtés pour clôturer la course (blocage de la clôture sans note).
- **Coursier** : 2 notes ≤ 2⭐ sur 30 jours glissants → suspension provisoire automatique + email de justification sous 72h.
- **Client** : Moyenne > 3⭐ → Badge "⭐ Client de confiance".

### 1.6 Signalements (Nouveau — V4.0)

- Indépendants des litiges (qui sont liés à une course spécifique).
- Motifs : Harcèlement, Fraude, Injures, Faux profil.
- **Règle** : 3 signalements en 30 jours = suspension automatique du compte signalé, en attente de l'arbitrage admin.

---

## 2. PARCOURS UTILISATEUR

### 2.1 Parcours Client

1. Inscription / Connexion (email + OTP).
2. Création de la course (Type, Description, Zone, Date, Preuves attendues).
3. Sélection du coursier (Top 5 recommandés ou liste complète).
4. **Chat** : Négociation des modalités et du tarif.
5. **Paiement** : Saisie des frais réels + paiement Escrow via Stripe, MTN ou Orange Money.
6. **Suivi** : Timeline de statut (Payée → En cours → Preuves soumises).
7. **Validation** : Inspection des preuves → Validation ou **ouverture de litige**.
8. **Notation** : Note obligatoire du coursier.
9. **Historique** : Accès aux reçus PDF/Image et à l'historique.

Modification ajouter:

- "Lors de la création de la course, le client ne choisit plus un coursier. La course est publiée et devient visible par tous les coursiers disponibles."

- "Les coursiers peuvent initier un chat avec le client pour proposer leurs tarifs. Le client peut discuter avec plusieurs coursiers simultanément."

- "Dès que le client accepte l'offre d'un coursier, le statut de la course passe à ASSIGNED. Un email est envoyé à tous les autres coursiers ayant initié un chat pour les informer que la course est prise."

### 2.2 Parcours Coursier

1. Inscription + Upload KYC (CNI Recto/Verso + Selfie).
2. Attente de validation par l'admin (24-48h).
3. Réception des demandes de course.
4. **Chat** : Proposition d'une offre (Tarif uniquement).
5. Exécution de la course.
6. **Upload des preuves** : Vidéo, photos, reçus.
7. Réception des fonds (après validation client).
8. **Notation** : Note obligatoire du client.
9. Consultation des gains nets (déduction faite des 20%).
10. **Ouverture de litige** (en cas de problème avec le client).

### 2.3 Parcours Admin

1. Dashboard (alertes KYC, litiges, signalements, statistiques).
2. Validation des KYC.
3. Arbitrage des litiges (avec accès aux preuves et au chat).
4. Traitement des signalements (suspension, avertissement).
5. Configuration des taux (commissions, tarif minimum).
6. Gestion des utilisateurs (suspension, blocage, consultation de l'historique des litiges).

---

## 3. INTERFACES ET ÉCRANS (MAQUETTE)

### 3.1 Public

- `index.html` : Landing page.
- `faq.html`, `legal.html`, `support.html` : Pages secondaires.
- `login.html`, `register.html`, `verify-otp.html` : Authentification.

### 3.2 Client

- `dashboard.html` : Vue d'ensemble.
- `create-course.html` : Formulaire de création.
- `select-courier.html` : Choix du coursier.
- `chat.html` : Négociation.
- `pay.html` : Paiement Escrow (saisie des frais réels).
- `course-detail.html` : Suivi de la course.
- `validate.html` : Validation des preuves.
- `dispute-form.html` : Formulaire d'ouverture de litige.
- `report-user.html` : Signalement d'un utilisateur.
- `rate.html` : Notation du coursier.
- `history.html` : Historique.
- `profile.html` : Profil.

### 3.3 Coursier

- `dashboard.html` : Vue d'ensemble + missions.
- `kyc.html` : Vérification d'identité.
- `chat.html` : Négociation + Proposition d'offre.
- `proofs.html` : Upload des preuves.
- `earnings.html` : Gains nets.
- `rate-client.html` : Notation du client.
- `history.html` : Historique.
- `profile.html` : Profil.
- `dispute-form.html` : Formulaire d'ouverture de litige.
- `report-user.html` : Signalement d'un utilisateur.

### 3.4 Admin

- `dashboard.html` : Vue d'ensemble (alertes KYC, litiges, signalements).
- `kyc.html` : Validation des pièces d'identité.
- `disputes.html` : Arbitrage des litiges (avec modale de preuves).
- `reports.html` : Traitement des signalements.
- `commissions.html` : Configuration des taux (commissions + tarif minimum).
- `users.html` : Gestion des utilisateurs + historique des litiges.

---

## 4. MODULE CHAT INTERNE

### 4.1 Fonctionnalités

- **Chat 1-1** entre Client et Coursier, attaché à une **Course** spécifique.
- **Ouverture automatique** dès la sélection du coursier par le client.
- **Temps réel** via WebSocket (Spring Boot STOMP).
- **Fermeture + archivage** à la clôture de la course.
- **Historique conservé** et consultable par l'admin en cas de litige.
- **Bandeau d'avertissement** : les utilisateurs sont informés que les échanges sont tracés.

### 4.2 Règles métier

| #   | Règle                                                                        |
| --- | ---------------------------------------------------------------------------- |
| C1  | Le chat est **toujours lié à une course** (pas de chat libre).               |
| C2  | Seuls Client, Coursier et Admin (lecture seule) y ont accès.                 |
| C3  | Le chat est **archivé** après clôture de la course.                          |
| C4  | Messages **horodatés et non modifiables** (audit).                           |
| C5  | Pièces jointes : **Images + PDF, max 10 Mo**.                                |
| C6  | Détection basique de contenu abusif → signalement admin.                     |
| C7  | Le chat reste ouvert de la sélection jusqu'à clôture.                        |
| C8  | **24h sans réponse du coursier → le client peut choisir un autre coursier**. |

---

## 5. PAIEMENT ET SÉQUESTRE (ESCROW)

| Canal                   | Public                    | Implémentation          |
| ----------------------- | ------------------------- | ----------------------- |
| Stripe (carte bancaire) | Diaspora (EUR, USD, CAD…) | Stripe Connect + Escrow |
| MTN Mobile Money        | Cameroun                  | API MTN MoMo            |
| Orange Money            | Cameroun                  | API Orange Money        |

**Règles** :

- Devise de référence : **XAF (FCFA)**.
- Conversion automatique EUR/USD → XAF au moment du paiement.
- **Double déclaration** : Total Escrow = Tarif coursier (déclaré via chat) + Frais réels (saisis par le client).
- Fonds bloqués jusqu'à validation client OU expiration du délai (72h).
- Libération → envoi direct au coursier (pas de wallet intermédiaire).
- Retrait coursier : **Manuel en Phase 1**, automatique via API MTN/Orange en Phase 2.

---

## 6. LITIGES

### 6.1 Typologie

**A. Côté CLIENT**
| Code | Motif |
|------|-------|
| L-C1 | Course non effectuée |
| L-C2 | Course partiellement effectuée |
| L-C3 | Preuves insuffisantes / non conformes |
| L-C4 | Détournement de fonds |
| L-C5 | Comportement irrespectueux du coursier |
| L-C6 | Retard important non justifié |

**B. Côté COURSIER**
| Code | Motif |
|------|-------|
| L-F1 | Client ne valide pas alors que la course est faite |
| L-F2 | Client refuse de payer un supplément légitime |
| L-F3 | Client injurieux / menaçant |
| L-F4 | Fausse accusation |

**C. Systémiques**
| Code | Motif |
|------|-------|
| L-S1 | Paiement échoué mais course lancée |
| L-S2 | Preuve illisible / corrompue |
| L-S3 | Double paiement |

### 6.2 Workflow litige

1. Ouverture par client ou coursier via le formulaire dédié.
2. Notification admin + partie adverse.
3. Admin examine preuves + **historique du chat**.
4. Décision : `REMBOURSEMENT_TOTAL` / `REMBOURSEMENT_PARTIEL` / `LIBERATION_FONDS` / `SANCTION`.
5. Notification aux deux parties.
6. Traçabilité (audit log).

**Arbitre unique : Admin.**

---

## 7. SIGNALEMENTS (Nouveau — V4.0)

### 7.1 Règles

- Indépendants des litiges (pas nécessairement liés à une course).
- Motifs : Harcèlement, Fraude, Injures, Faux profil.
- **3 signalements en 30 jours glissants** → suspension automatique du compte signalé, en attente de l'arbitrage admin.
- Traitement par l'admin via `admin/reports.html` : suspension, avertissement, ou rejet du signalement.

### 7.2 Workflow signalement

1. Signalement par un utilisateur via `report-user.html`.
2. Notification admin.
3. Admin examine les signalements et l'historique du compte signalé.
4. Décision : `SUSPENSION` / `AVERTISSEMENT` / `REJET`.
5. Notification à l'utilisateur signalé et au(x) signalant(s).

---

## 8. SYSTÈME DE NOTATION

| Règle | Seuil                                                    | Action automatique                                                               |
| ----- | -------------------------------------------------------- | -------------------------------------------------------------------------------- |
| R-N1  | Coursier reçoit **2 notes ≤ 2⭐ sur 30 jours glissants** | • Notification admin<br>• Suspension provisoire<br>• Email justificatif sous 72h |
| R-N2  | Coursier moyenne < 2.5⭐ sur 10 dernières courses        | Révision admin                                                                   |
| R-N3  | Client moyenne **> 3⭐**                                 | Badge visible **"⭐ Client de confiance"**                                       |
| R-N4  | Client moyenne < 2⭐                                     | Signalement admin                                                                |
| R-N5  | Note obligatoire                                         | Blocage de la clôture sans note                                                  |

---

## 9. COMMISSIONS ET MONÉTISATION

- **Commission configurable par l'admin** :
  - Globale (% par défaut : 0% client / 20% coursier).
  - Par coursier (override).
  - Par course (override exceptionnel).
- **Tarif minimum coursier** configurable (ex: 5 000 XAF), bloquant.
- Interface admin dédiée (`admin/commissions.html`).

---

## 10. NOTIFICATIONS (EMAIL UNIQUEMENT)

| Événement                         | Destinataire           |
| --------------------------------- | ---------------------- |
| Inscription                       | Client / Coursier      |
| KYC soumis                        | Coursier               |
| KYC validé/rejeté                 | Coursier               |
| Nouvelle course assignée          | Coursier               |
| Nouveau message chat (hors ligne) | Client / Coursier      |
| Paiement reçu                     | Client + Coursier      |
| Preuves soumises                  | Client                 |
| Course validée                    | Coursier               |
| Validation auto (72h)             | Client + Coursier      |
| Litige ouvert                     | Admin + partie adverse |
| Décision litige                   | Client + Coursier      |
| Signalement reçu                  | Admin                  |
| Décision signalement              | Utilisateur signalé    |
| Mauvaise note reçue               | Coursier + Admin       |
| Suspension provisoire             | Coursier + Admin       |
| Badge obtenu                      | Client                 |

---

## 11. LANGUES ET LOCALISATION

- **Français (FR)** + **Anglais (EN)**.
- Devise : **XAF uniquement**.

---

## 12. CIBLE CLIENT

| Profil                        | Description                                                           | Cas d'usage                                                                                                           |
| ----------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **Client Diaspora**           | Vit à l'étranger, commande pour une course ou autre tâche au Cameroun | "Achat d'aliments et épices locaux, ou tout autre produit moins cher au pays ou absent à l'étranger, pour expédition" |
| **Client Local Inter-villes** | Vit au Cameroun mais dans une autre ville que la course               | "Je suis à Yaoundé, je veux que quelqu'un récupère un colis à Douala"                                                 |

---

## 13. HORS SCOPE V1 (POUR PLUS TARD)

- ❌ App mobile native.
- ❌ Suivi temps réel / tracking GPS du coursier (V2).
- ❌ Attribution automatique de coursier.
- ❌ Programme de fidélité / abonnement.
- ❌ API ouverte partenaires.
- ❌ IA anti-fraude.
- ❌ Retrait automatique via API MTN/Orange (Phase 2).

---

## 14. RÉCAPITULATIF DES DÉCISIONS VALIDÉES

| #   | Sujet                      | Décision                                                 |
| --- | -------------------------- | -------------------------------------------------------- |
| 1   | Type de projet             | SaaS multi-tenant (PWA)                                  |
| 2   | Devise                     | XAF uniquement                                           |
| 3   | Paiement                   | Stripe + MTN MoMo + Orange Money                         |
| 4   | Escrow                     | Oui — libération après validation ou 72h                 |
| 5   | Wallet coursier            | ❌ Supprimé — envoi direct + historique                  |
| 6   | Coursiers                  | Multi-coursiers                                          |
| 7   | KYC coursier               | CNI/Passeport recto-verso + selfie + OTP                 |
| 8   | Preuves                    | Vidéo ≤10s + Photos + Reçus (obligatoires)               |
| 9   | Délai validation auto      | 72h                                                      |
| 10  | Suivi temps réel           | ❌ Retiré du MVP (V2)                                    |
| 11  | Reçus                      | PDF + Image téléchargeables                              |
| 12  | Notation                   | Obligatoire des deux côtés                               |
| 13  | Seuil suspension coursier  | 2 notes ≤ 2⭐ sur 30 jours glissants                     |
| 14  | Badge client               | Visible "⭐ Client de confiance" (>3⭐)                  |
| 15  | Litiges                    | Admin arbitre unique                                     |
| 16  | Commission                 | Configurable admin (0% client / 20% coursier par défaut) |
| 17  | Langues                    | FR + EN                                                  |
| 18  | Notifications              | Email uniquement                                         |
| 19  | Retrait coursier           | Manuel en Phase 1, auto en Phase 2                       |
| 20  | Cible client               | Diaspora + Locaux inter-villes                           |
| 21  | Chat interne               | ✅ INCLUS — temps réel (WebSocket)                       |
| 22  | Sélection coursier         | Recommandé système (top 5) OU choix manuel               |
| 23  | Ouverture chat             | Dès sélection coursier, jusqu'à clôture                  |
| 24  | Pièces jointes chat        | Images + PDF, max 10 Mo                                  |
| 25  | Sans réponse coursier      | 24h → client peut réattribuer                            |
| 26  | Négociation pré-paiement   | Le coursier initie, accord mutuel avant paiement         |
| 27  | Formulaire de litige       | Page dédiée pour Client et Coursier                      |
| 28  | **Double déclaration**     | **Coursier = Tarif seul / Client = Frais réels (V4.0)**  |
| 29  | **Tarif minimum coursier** | **Configurable admin, bloquant (V4.0)**                  |
| 30  | **Signalements**           | **Indépendants des litiges — 3/30j = suspension (V4.0)** |
| 31  | **Page report-user**       | **Ajoutée pour Client et Coursier (V4.0)**               |
| 32  | **Page admin/reports**     | **Ajoutée pour traitement des signalements (V4.0)**      |

---

## 15. PROCHAINES ÉTAPES

1. ✅ **Spécification fonctionnelle validée (V5.0 — fusion V3.0 + V4.0)**
2. 🚀 **Spécification technique** (architecture, stack, modèle de données, API, sécurité, chat WebSocket, déploiement)
3. 🎨 Wireframes / maquettes (à mettre à jour avec les écrans V4.0 : `report-user.html`, `admin/reports.html`)
4. 🗓️ Plan de développement par sprints
5. 💻 Implémentation
6. 🌍 Déploiement en production

---

### Notes de fusion

- **Conservé de V3.0** : l'intégralité des sections détaillées (parcours, chat, paiement, litiges, notation, notifications, cible client, hors scope, récapitulatif).
- **Intégré de V4.0** : la double déclaration (section 1.2), le tarif minimum coursier (1.1 + 9), les signalements (1.6 + 7), les pages `report-user.html` et `admin/reports.html` (3.2, 3.3, 3.4), les notifications associées (10), et les décisions 28–32 du récapitulatif.
- **Mis à jour** : le parcours admin (2.3) inclut désormais le traitement des signalements ; l'escrow (5) précise la double déclaration ; les prochaines étapes signalent la mise à jour des maquettes.
