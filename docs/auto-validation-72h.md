# Rendre réglable l'auto-validation à 72 h

## C'est quoi, en une phrase

Quand le coursier a envoyé ses preuves (vidéo, photos, reçus), le client a **72 heures** pour réagir.
S'il ne fait rien, la course est **validée automatiquement** et le coursier est payé.

## Comment ça se passe aujourd'hui

Exemple : le coursier envoie ses preuves **lundi à 10 h**.

| Moment | Ce qui se passe |
|---|---|
| Lundi 10 h | Preuves envoyées. Le serveur note la date limite : **jeudi 10 h**. |
| Avant jeudi 10 h | Le client peut **valider** (le coursier est payé) ou **ouvrir un litige** (l'argent reste bloqué). |
| Jeudi 10 h, sans réponse | La course est **validée automatiquement**. Le coursier est payé, la plateforme garde sa part. |

Les 72 heures sont **écrites dans le code** (`ProofService.AUTO_VALIDATE_HOURS = 72`). Pour les changer, il faut
modifier le code et redéployer.

## Ce que « réglable » voudrait dire

Un champ de plus dans l'écran admin **Règles et délais** :

> **Validation automatique** — sans réponse du client après l'envoi des preuves, la course est validée et le
> coursier payé. Entre **24 et 168 heures** (7 jours). Par défaut : **72 heures**.

Comme les autres réglages, chaque modification serait **notée dans l'historique** (qui, quand, avant → après).

## Ce qui changerait, et ce qui ne changerait pas

- **Les courses déjà en attente gardent leur date limite.** Elle est fixée au moment où le coursier envoie ses
  preuves. Un nouveau délai ne vaut que pour les preuves envoyées **après** l'enregistrement. Personne ne voit
  donc sa date limite raccourcir en cours de route.
- **Les écrans suivent tout seuls.** Les pages de paiement (client) et d'envoi des preuves (coursier) lisent déjà
  ce délai sur le serveur : elles afficheraient la nouvelle valeur sans autre modification.
- **Les conditions d'utilisation n'ont pas à changer.** Elles parlent déjà du « délai de validation indiqué dans
  l'application », sans citer 72 h.

## À quoi faire attention

- **Délai trop court** (24 h, par exemple) : un client absent un jour perd la possibilité de contester. Plus de
  mécontentement, et des litiges ouverts trop tard.
- **Délai trop long** (7 jours) : le coursier attend son argent plus longtemps, ce qui le décourage.
- 72 h est un bon équilibre : un week-end entier passe sans que le client perde son recours.

## Mon avis

C'est un petit ajout, de la même taille que les autres délais : un réglage, une ligne dans l'écran et des tests.
Il n'a d'intérêt que si tu penses vraiment ajuster ce délai, par exemple après les premiers retours des
utilisateurs. Sinon, le laisser fixe à 72 h est tout à fait correct.

**Décision (2026-11-08) : ajouté.** Le champ « Validation automatique » est dans l'écran admin Règles et délais
(24 à 168 h, 72 h par défaut, réglage `auto_validate_hours`), noté dans l'historique des réglages.
