/**
 * Textes juridiques (brouillon à faire valider par un juriste camerounais).
 * Sources : loi n° 2010/021 du 21 décembre 2010 régissant le commerce électronique (art. 7, 11, 12, 15, 19-22, 30),
 * loi n° 2024/017 du 23 décembre 2024 relative à la protection des données à caractère personnel
 * (délai de mise en conformité expirant le 23 juin 2026), loi n° 2010/012 du 21 décembre 2010 (cybersécurité).
 * Les informations manquantes sont listées dans `pending` et affichées comme telles : rien n'est inventé.
 * Les taux et délais paramétrés par l'administrateur ne sont jamais écrits en dur : le texte renvoie à l'application.
 */

export type LegalBlock = string | { list: string[] } | { contact: true };

export interface LegalSection {
  id: string;
  title: string;
  blocks: LegalBlock[];
}

export interface LegalDoc {
  key: 'cgu' | 'privacy';
  title: string;
  shortTitle: string;
  updated: string;
  intro: string;
  pending: string[];
  sections: LegalSection[];
}

export const PUBLISHER = {
  name: 'ConfianceCoursier',
  address: 'Pk 12, Douala, Cameroun',
  email: 'williamndongmo899@gmail.com',
  phone: '+237 655 00 23 18',
  phoneHref: '+237655002318',
};

const UPDATED = '6 novembre 2026';

export const CGU: LegalDoc = {
  key: 'cgu',
  title: 'Conditions d’utilisation',
  shortTitle: 'Conditions',
  updated: UPDATED,
  intro:
    'Ces conditions encadrent l’utilisation de ConfianceCoursier par les clients et les coursiers. ' +
    'En créant un compte, vous les acceptez. Lisez-les avant de confier ou de réaliser une course.',
  pending: [
    'Forme juridique, numéro RCCM, capital social et numéro de contribuable de l’éditeur (art. 30 de la loi n° 2010/021).',
    'Validation de l’ensemble du texte par un juriste, notamment sur la conservation des fonds en séquestre et sur l’exercice du droit de rétractation après paiement (l’application ne permet pas encore d’annuler une course payée avant sa réalisation).',
  ],
  sections: [
    {
      id: 'editeur',
      title: 'Éditeur de la plateforme',
      blocks: [
        'La plateforme ConfianceCoursier est éditée par ConfianceCoursier, dont le siège est situé à Pk 12, Douala, Cameroun.',
        { contact: true },
      ],
    },
    {
      id: 'objet',
      title: 'Objet du service',
      blocks: [
        'ConfianceCoursier met en relation des clients qui souhaitent faire réaliser une course au Cameroun (achat, démarche, livraison, retrait) avec des coursiers indépendants dont l’identité a été vérifiée.',
        'ConfianceCoursier n’exécute pas les courses : la prestation est réalisée par le coursier, qui reste indépendant. La plateforme fournit les outils de mise en relation, de discussion, de paiement sous séquestre, de preuves et de règlement des litiges.',
      ],
    },
    {
      id: 'compte',
      title: 'Votre compte',
      blocks: [
        {
          list: [
            'Vous fournissez des informations exactes et à jour (nom, email, téléphone le cas échéant).',
            'Votre adresse email est confirmée par un code à 6 chiffres avant la première connexion.',
            'Vous gardez votre mot de passe secret ; toute action faite depuis votre compte vous est imputée.',
            'Un compte est personnel. Vous choisissez à l’inscription d’être client ou coursier.',
          ],
        },
        'Avant de proposer ses services, un coursier fait vérifier son identité (carte nationale d’identité ou passeport, et photo de vérification). Tant que cette vérification n’est pas validée, il ne peut pas faire d’offre.',
      ],
    },
    {
      id: 'course',
      title: 'Déroulement d’une course',
      blocks: [
        'Les étapes pour conclure une course sont les suivantes (art. 11 et 15 de la loi n° 2010/021) :',
        {
          list: [
            'le client décrit la course : ce qu’il faut faire, où, quand et, s’il y a des achats, leur montant ;',
            'des coursiers vérifiés proposent un tarif ; client et coursier peuvent en discuter dans le chat ;',
            'le client accepte une offre : un récapitulatif affiche le détail et le prix total, que le client peut vérifier et corriger avant de confirmer (art. 12 et 17) ;',
            'le client paie : les fonds sont bloqués en séquestre ;',
            'le coursier réalise la course et envoie les preuves ;',
            'le client vérifie les preuves, puis valide la course ou ouvre un litige ;',
            'chacun note l’autre.',
          ],
        },
        'Le contrat est conclu en français. Le récapitulatif de chaque course et l’historique des opérations restent consultables dans votre espace ; vous pouvez aussi en demander une copie par email (art. 19).',
      ],
    },
    {
      id: 'prix',
      title: 'Prix, frais et commission',
      blocks: [
        'Le tarif de la course est fixé par le coursier et accepté par le client. Le montant des achats éventuels est saisi par le client lui-même : le coursier ne peut pas le modifier.',
        'Des frais de service sont appliqués au client et une commission est prélevée sur la rémunération du coursier. Leurs montants sont fixés par ConfianceCoursier et affichés clairement, toutes taxes et tous frais inclus, avant chaque paiement (art. 15 et 31). Un changement de taux ne s’applique qu’aux nouvelles courses.',
        'Les montants sont exprimés en francs CFA (XAF).',
      ],
    },
    {
      id: 'sequestre',
      title: 'Paiement sous séquestre',
      blocks: [
        'Le paiement se fait par les moyens proposés dans l’application (Mobile Money ou carte bancaire, selon leur disponibilité). Les fonds payés par le client sont bloqués et ne sont versés au coursier que dans l’un des cas suivants :',
        {
          list: [
            'le client valide la course après avoir consulté les preuves ;',
            'le client ne réagit pas dans le délai de validation indiqué dans l’application après l’envoi des preuves : la course est alors validée automatiquement ;',
            'un administrateur tranche un litige en faveur du coursier.',
          ],
        },
        'Les fonds ne sont jamais versés au coursier sans preuves.',
      ],
    },
    {
      id: 'preuves',
      title: 'Preuves et échéances',
      blocks: [
        'Le coursier prouve la réalisation de la course depuis l’application : courte vidéo horodatée et géolocalisée, photos et, en cas d’achat, le reçu.',
        'Si les preuves n’arrivent pas avant l’échéance prévue, le client peut prolonger le délai, annuler la course et être remboursé, ou ouvrir un litige.',
      ],
    },
    {
      id: 'litiges',
      title: 'Litiges entre client et coursier',
      blocks: [
        'En cas de désaccord, le client ou le coursier ouvre un litige depuis la course. Les fonds restent bloqués pendant son examen.',
        'Pour trancher, un administrateur de ConfianceCoursier consulte les preuves et l’historique de la discussion. Le chat de chaque course est conservé à cette fin, ce qu’un bandeau rappelle dans la discussion.',
        'La décision peut libérer les fonds au coursier, rembourser le client, ou les répartir. Elle ne prive aucune des parties de ses recours devant les juridictions compétentes.',
      ],
    },
    {
      id: 'annulation',
      title: 'Annulation, remboursement et rétractation',
      blocks: [
        'Avant le paiement, le client peut annuler sa course sans frais depuis l’application.',
        'Après le paiement, les fonds restent bloqués. Si les preuves n’arrivent pas avant l’échéance, le client peut annuler et être remboursé. Dans les autres cas, il ouvre un litige, qui peut aboutir à un remboursement total ou partiel.',
        'Le client dispose d’un délai de rétractation de quinze jours à compter de la conclusion du contrat pour les services (art. 20 de la loi n° 2010/021). En demandant que la course soit réalisée sans attendre la fin de ce délai, il reconnaît que ce droit ne peut plus s’exercer une fois la course réalisée (art. 22). Pour exercer son droit de rétractation avant la réalisation, il nous contacte par email.',
        'Lorsqu’un remboursement est dû, il intervient dans un délai de quinze jours au plus, par le moyen de paiement utilisé.',
      ],
    },
    {
      id: 'confiance',
      title: 'Notes, signalements et suspension',
      blocks: [
        'Après chaque course, le client et le coursier se notent mutuellement. Tout utilisateur peut en signaler un autre pour un comportement contraire à ces conditions.',
        'Un compte peut être suspendu, automatiquement ou par un administrateur, en cas de mauvaises notes répétées, de signalements fondés ou de manquement grave.',
      ],
    },
    {
      id: 'interdits',
      title: 'Ce qui est interdit',
      blocks: [
        {
          list: [
            'commander ou transporter des biens illicites, dangereux ou contrefaits ;',
            'fournir de fausses informations, de fausses preuves ou une fausse identité ;',
            'proposer ou accepter un paiement en dehors de la plateforme pour une course trouvée sur celle-ci ;',
            'harceler, menacer ou insulter un autre utilisateur ;',
            'tenter de perturber ou de contourner le fonctionnement technique du service.',
          ],
        },
      ],
    },
    {
      id: 'responsabilite',
      title: 'Responsabilités',
      blocks: [
        'Le coursier est responsable de la bonne exécution de la course qu’il a acceptée. Le client est responsable de l’exactitude de sa demande et de la licéité de ce qu’il commande.',
        'ConfianceCoursier met en œuvre les moyens raisonnables pour assurer la disponibilité et la sécurité du service, la vérification d’identité des coursiers et la conservation des fonds en séquestre. Sa responsabilité ne peut être engagée pour un manquement imputable à un utilisateur ou à un cas de force majeure.',
      ],
    },
    {
      id: 'donnees',
      title: 'Données personnelles et communications',
      blocks: [
        'Le traitement de vos données est décrit dans la politique de confidentialité, qui fait partie de ces conditions.',
        'ConfianceCoursier ne vous envoie pas de message promotionnel sans votre accord préalable (art. 7 de la loi n° 2010/021). Les messages liés à vos courses et à la sécurité de votre compte ne sont pas des prospections.',
      ],
    },
    {
      id: 'modifications',
      title: 'Modification des conditions',
      blocks: [
        'Ces conditions peuvent évoluer. La date de mise à jour figure en haut de la page. En cas de changement important, vous en êtes informé dans l’application ou par email avant son entrée en vigueur. Les courses déjà conclues restent régies par les conditions acceptées au moment de leur conclusion.',
      ],
    },
    {
      id: 'droit',
      title: 'Droit applicable et réclamations',
      blocks: [
        'Ces conditions sont régies par le droit camerounais, notamment la loi n° 2010/021 du 21 décembre 2010 régissant le commerce électronique et la loi-cadre n° 2011/012 du 6 mai 2011 portant protection du consommateur.',
        'Pour toute réclamation, contactez-nous d’abord : nous recherchons une solution amiable. À défaut, le litige est porté devant les juridictions camerounaises compétentes.',
        { contact: true },
      ],
    },
  ],
};

export const PRIVACY: LegalDoc = {
  key: 'privacy',
  title: 'Politique de confidentialité',
  shortTitle: 'Confidentialité',
  updated: UPDATED,
  intro:
    'Cette politique explique quelles données ConfianceCoursier collecte, pourquoi, avec qui elles sont partagées, ' +
    'combien de temps elles sont conservées et comment exercer vos droits.',
  pending: [
    'Lieu d’hébergement des serveurs et des fichiers (preuves, documents d’identité).',
    'Autorisations préalables auprès de l’autorité de protection des données (traitement et transferts hors du Cameroun, loi n° 2024/017).',
    'Durées de conservation précises par catégorie de données.',
  ],
  sections: [
    {
      id: 'responsable',
      title: 'Responsable du traitement',
      blocks: [
        'Le responsable du traitement est ConfianceCoursier, Pk 12, Douala, Cameroun.',
        { contact: true },
      ],
    },
    {
      id: 'cadre',
      title: 'Cadre légal',
      blocks: [
        'Vos données sont traitées conformément à la loi n° 2024/017 du 23 décembre 2024 relative à la protection des données à caractère personnel au Cameroun, à la loi n° 2010/012 du 21 décembre 2010 relative à la cybersécurité et à la cybercriminalité, et à la loi n° 2010/021 du 21 décembre 2010 régissant le commerce électronique.',
      ],
    },
    {
      id: 'collecte',
      title: 'Données collectées',
      blocks: [
        {
          list: [
            'Compte : nom complet, email, téléphone (facultatif), rôle, mot de passe (stocké chiffré, jamais en clair).',
            'Vérification d’identité des coursiers : type de pièce (CNI ou passeport), photos recto et verso, photo de vérification.',
            'Courses : description, lieux, délais, montants, offres, statuts et historique.',
            'Preuves : vidéos, photos et reçus envoyés par le coursier, avec leur date, leur heure et, si vous l’autorisez, la position au moment de la capture.',
            'Discussions : messages échangés dans le chat de chaque course.',
            'Paiements : montants, moyen de paiement choisi, statut des opérations et mouvements du séquestre.',
            'Notes, avis et signalements.',
            'Données techniques nécessaires à la sécurité : adresse IP et journaux de connexion, utilisés notamment pour limiter les tentatives abusives.',
          ],
        },
      ],
    },
    {
      id: 'finalites',
      title: 'Pourquoi nous les utilisons',
      blocks: [
        {
          list: [
            'Créer et sécuriser votre compte, confirmer votre email.',
            'Mettre en relation clients et coursiers et permettre la réalisation des courses.',
            'Bloquer, libérer ou rembourser les paiements sous séquestre.',
            'Vérifier l’identité des coursiers et prévenir la fraude.',
            'Examiner et trancher les litiges, traiter les signalements.',
            'Respecter nos obligations légales, notamment la conservation des données de transaction (art. 32 de la loi n° 2010/021).',
          ],
        },
        'Nous ne collectons que les données nécessaires à ces finalités. Lorsque la loi l’exige, nous recueillons votre consentement, que vous pouvez retirer à tout moment.',
      ],
    },
    {
      id: 'destinataires',
      title: 'Qui y a accès',
      blocks: [
        {
          list: [
            'L’autre partie de la course voit uniquement ce qui est utile : nom, note, messages du chat et preuves de la course.',
            'Les administrateurs de ConfianceCoursier, pour la vérification d’identité, les litiges et les signalements.',
            'Nos prestataires techniques, dans la limite de leur mission : opérateurs de paiement, et Brevo pour l’envoi des emails (codes de vérification, liens de réinitialisation).',
            'Les autorités publiques, uniquement sur réquisition légale.',
          ],
        },
        'Vos données ne sont jamais vendues.',
      ],
    },
    {
      id: 'transferts',
      title: 'Transferts hors du Cameroun',
      blocks: [
        'Certains prestataires, comme notre service d’envoi d’emails, peuvent traiter des données hors du Cameroun. Ces transferts ne sont réalisés que vers des destinations offrant un niveau de protection suffisant et dans les conditions prévues par la loi n° 2024/017, y compris l’autorisation préalable de l’autorité compétente lorsqu’elle est requise.',
      ],
    },
    {
      id: 'conservation',
      title: 'Durée de conservation',
      blocks: [
        'Vos données sont conservées tant que votre compte est actif. Après sa fermeture, elles sont supprimées ou anonymisées, à l’exception de celles que nous devons garder plus longtemps pour respecter une obligation légale ou pour gérer un litige en cours.',
        'Les codes de vérification expirent après quelques minutes et les liens de réinitialisation du mot de passe après 15 minutes.',
      ],
    },
    {
      id: 'securite',
      title: 'Sécurité',
      blocks: [
        'Mots de passe chiffrés, confirmation de l’email par code, code supplémentaire pour les administrateurs, limitation des tentatives de connexion et accès aux documents d’identité réservé aux administrateurs : nous protégeons vos données contre la perte, l’accès non autorisé, la modification et la divulgation. En cas de violation de données présentant un risque pour vous, nous vous en informons, ainsi que l’autorité compétente.',
      ],
    },
    {
      id: 'droits',
      title: 'Vos droits',
      blocks: [
        'Vous pouvez à tout moment :',
        {
          list: [
            'accéder à vos données et en obtenir une copie ;',
            'faire corriger des données inexactes (vous pouvez déjà modifier votre profil dans l’application) ;',
            'demander l’effacement de vos données, sous réserve des obligations légales de conservation ;',
            'vous opposer à un traitement, notamment à la prospection commerciale ;',
            'retirer votre consentement lorsque le traitement repose sur celui-ci.',
          ],
        },
        'Pour exercer ces droits, écrivez-nous en précisant votre demande et l’email de votre compte. Nous pouvons vous demander de justifier de votre identité. Vous pouvez aussi saisir l’autorité camerounaise de protection des données à caractère personnel.',
        { contact: true },
      ],
    },
    {
      id: 'stockage',
      title: 'Stockage dans votre navigateur',
      blocks: [
        'L’application enregistre dans votre navigateur les éléments nécessaires à votre session (jeton de connexion, rôle, nom affiché) et votre choix de thème clair ou sombre. Aucun cookie publicitaire ni outil de mesure d’audience tiers n’est utilisé. La déconnexion efface les éléments de session.',
      ],
    },
    {
      id: 'evolution',
      title: 'Évolution de cette politique',
      blocks: [
        'Cette politique peut être mise à jour. La date de mise à jour figure en haut de la page ; en cas de changement important, vous en êtes informé dans l’application ou par email.',
      ],
    },
  ],
};
