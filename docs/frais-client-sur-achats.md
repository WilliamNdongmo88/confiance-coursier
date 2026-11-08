# Les frais de service client, expliqués simplement

> **Décision (8 novembre 2026) : choix A retenu.** Les frais de service client restent calculés sur le tarif du coursier **et** sur les achats avancés. La page `/admin/commissions` le précise.

## L'histoire de départ

Alice demande à un coursier : **« Va au marché m'acheter de la farine et des épices, et apporte-les-moi. »**

- Le coursier demande **10 000 XAF** pour son travail (se déplacer, acheter, livrer).
- Les articles coûtent **60 000 XAF** au marché.

Alice paie donc **les deux** sur la plateforme :

- 10 000 XAF pour **le travail du coursier** ;
- 60 000 XAF pour **la farine et les épices** (on les appelle les « achats avancés »).

Les 60 000 XAF ne sont pas un gain pour personne : ils servent juste à **acheter les articles**. Le coursier les récupère en entier, sur présentation du reçu.

## La question

La plateforme prend des **frais de service** à Alice : 1 % sur ta capture.

**1 %… de quoi ?**

### Réponse actuelle : 1 % de tout (travail + articles)

- 1 % de 70 000 XAF = **700 XAF de frais**.
- Alice paie **70 700 XAF** au total.

### Autre possibilité : 1 % du travail seulement

- 1 % de 10 000 XAF = **100 XAF de frais**.
- Alice paie **70 100 XAF** au total.

**La seule différence** : est-ce que la plateforme prend aussi un pourcentage sur **le prix de la farine et des épices** ?

## Une image pour comprendre

C'est comme si tu envoyais quelqu'un faire tes courses avec ton argent :

- **Aujourd'hui**, la plateforme prend un pourcentage sur le service **et aussi** sur le panier de courses. Plus le panier est cher, plus Alice paie de frais, même si le coursier fait exactement le même travail.
- **Avec l'autre possibilité**, la plateforme ne prend un pourcentage que sur le service. Que le panier coûte 5 000 ou 60 000 XAF, les frais restent les mêmes.

## Avec des frais à 5 %, la différence se voit mieux

| | Aujourd'hui (travail + articles) | Travail seulement |
|---|---|---|
| Frais payés par Alice | 3 500 XAF | 500 XAF |
| Total payé par Alice | 73 500 XAF | 70 500 XAF |
| Ce que gagne la plateforme | 5 500 XAF | 2 500 XAF |
| Ce que reçoit le coursier | 68 000 XAF | 68 000 XAF |

## Le coursier n'est pas concerné

Dans les deux cas, **le coursier reçoit 68 000 XAF** :

- son travail : 10 000 XAF, moins 20 % de commission (2 000 XAF), soit 8 000 XAF ;
- plus le remboursement de ses achats : 60 000 XAF.

Ce choix ne concerne **que le client et la plateforme**.

## Les deux choix

**Choix A : garder comme aujourd'hui (pourcentage sur tout).**
- La plateforme gagne plus sur les grosses commandes.
- Argument : elle protège aussi l'argent des articles (bloqué jusqu'à la validation, vérifié avec le reçu).

**Choix B : pourcentage sur le travail seulement.**
- Plus juste et plus facile à comprendre pour le client : « les frais, c'est X % du prix du coursier ».
- Une grosse commande au marché ne coûte pas plus cher en frais.
- La plateforme gagne un peu moins sur les commandes avec de gros achats.

**Ma recommandation : le choix B.**

## Ce qu'il faut me dire

Simplement **« A »** ou **« B »**.

Si c'est B, je modifie :

- le calcul au moment du paiement, avec des tests ;
- l'exemple de la page `/admin/commissions` ;
- le récapitulatif de l'écran de paiement du client.

Les courses déjà payées ne changent pas.
