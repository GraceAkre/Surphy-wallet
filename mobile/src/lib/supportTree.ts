export type SupportNode = {
  id: string;
  botMessage: string;
  options?: { label: string; nextId: string }[];
  isFinal?: boolean;
};

export const SUPPORT_TREE: Record<string, SupportNode> = {
  // --- Accueil ---
  welcome: {
    id: 'welcome',
    botMessage:
      'Bonjour ! Je suis l\'assistant Surphy. Comment puis-je vous aider aujourd\'hui ?',
    options: [
      { label: 'Transactions', nextId: 'tx_type_select' },
      { label: 'Compte', nextId: 'account_type_select' },
      { label: 'Virements', nextId: 'transfer_failed_answer' },
      { label: 'Carte', nextId: 'card_type_select' },
      { label: 'Autre', nextId: 'other_freetext' },
    ],
  },

  // --- Transactions ---
  tx_type_select: {
    id: 'tx_type_select',
    botMessage: 'Quel problème rencontrez-vous avec vos transactions ?',
    options: [
      { label: 'Transaction échouée', nextId: 'tx_failed_answer' },
      { label: 'Transaction suspecte', nextId: 'tx_suspicious_answer' },
      { label: 'Demande de remboursement', nextId: 'tx_refund_answer' },
    ],
  },

  tx_failed_answer: {
    id: 'tx_failed_answer',
    botMessage:
      'Si votre transaction a échoué, voici les étapes à suivre :\n\n' +
      '1. Vérifiez que votre solde est suffisant.\n' +
      '2. Assurez-vous que votre carte virtuelle est active dans l\'onglet "Carte".\n' +
      '3. Vérifiez votre connexion internet.\n\n' +
      'Si le problème persiste, le montant sera automatiquement recrédité sous 24 à 48h. ' +
      'Vous pouvez aussi nous contacter à support@surphy.fr.',
    isFinal: true,
  },

  tx_suspicious_answer: {
    id: 'tx_suspicious_answer',
    botMessage:
      'Si vous constatez une transaction que vous n\'avez pas effectuée :\n\n' +
      '1. Bloquez immédiatement votre carte depuis l\'onglet "Carte".\n' +
      '2. Vérifiez l\'historique de vos transactions dans "Historique".\n' +
      '3. Contactez-nous au plus vite à support@surphy.fr avec le détail de la transaction.\n\n' +
      'Notre système de détection de fraude analyse chaque opération en temps réel pour vous protéger.',
    isFinal: true,
  },

  tx_refund_answer: {
    id: 'tx_refund_answer',
    botMessage:
      'Pour demander un remboursement :\n\n' +
      '1. Rendez-vous dans "Historique" et sélectionnez la transaction concernée.\n' +
      '2. Notez l\'identifiant de la transaction.\n' +
      '3. Envoyez un email à support@surphy.fr en précisant :\n' +
      '   - L\'identifiant de la transaction\n' +
      '   - Le motif du remboursement\n\n' +
      'Nous traiterons votre demande sous 5 jours ouvrés.',
    isFinal: true,
  },

  // --- Compte ---
  account_type_select: {
    id: 'account_type_select',
    botMessage: 'Quel problème rencontrez-vous avec votre compte ?',
    options: [
      { label: 'Problème de connexion', nextId: 'account_login_answer' },
      { label: 'Mot de passe oublié', nextId: 'account_password_answer' },
    ],
  },

  account_login_answer: {
    id: 'account_login_answer',
    botMessage:
      'Si vous n\'arrivez pas à vous connecter :\n\n' +
      '1. Vérifiez que vous utilisez bien l\'email associé à votre compte.\n' +
      '2. Vérifiez votre dossier de spams pour le code OTP.\n' +
      '3. Essayez de fermer et relancer l\'application.\n\n' +
      'Si le problème persiste, contactez-nous à support@surphy.fr avec votre adresse email.',
    isFinal: true,
  },

  account_password_answer: {
    id: 'account_password_answer',
    botMessage:
      'Pour réinitialiser votre mot de passe :\n\n' +
      '1. Allez dans Profil > Sécurité > "Changer de mot de passe".\n' +
      '2. Un email de réinitialisation sera envoyé à votre adresse.\n' +
      '3. Suivez le lien reçu par email.\n\n' +
      'Si vous ne recevez pas l\'email, vérifiez vos spams ou contactez support@surphy.fr.',
    isFinal: true,
  },

  // --- Virements ---
  transfer_failed_answer: {
    id: 'transfer_failed_answer',
    botMessage:
      'Si votre virement a échoué :\n\n' +
      '1. Vérifiez que le destinataire est bien inscrit sur Surphy.\n' +
      '2. Assurez-vous que votre solde est suffisant.\n' +
      '3. Vérifiez votre connexion internet.\n\n' +
      'Les virements entre utilisateurs Surphy sont instantanés. ' +
      'Si le montant a été débité mais non reçu, contactez support@surphy.fr.',
    isFinal: true,
  },

  // --- Carte ---
  card_type_select: {
    id: 'card_type_select',
    botMessage: 'Quel problème rencontrez-vous avec votre carte ?',
    options: [
      { label: 'Carte bloquée / verrouillée', nextId: 'card_locked_answer' },
      { label: 'Paiement refusé', nextId: 'card_payment_refused_answer' },
      { label: 'Carte compromise', nextId: 'card_compromised_answer' },
      { label: 'Autre problème', nextId: 'card_other_freetext' },
    ],
  },

  card_locked_answer: {
    id: 'card_locked_answer',
    botMessage:
      'Si votre carte est bloquée ou verrouillée :\n\n' +
      '1. Rendez-vous dans l\'onglet "Carte".\n' +
      '2. Appuyez sur le bouton "Déverrouiller".\n' +
      '3. Confirmez l\'action.\n\n' +
      'Votre carte sera réactivée immédiatement et vous pourrez effectuer des paiements à nouveau.',
    isFinal: true,
  },

  card_payment_refused_answer: {
    id: 'card_payment_refused_answer',
    botMessage:
      'Si un paiement a été refusé, vérifiez les points suivants :\n\n' +
      '1. Votre solde est suffisant pour le montant demandé.\n' +
      '2. Vos plafonds (journalier et mensuel) ne sont pas atteints.\n' +
      '3. Votre carte n\'est pas verrouillée (onglet "Carte").\n' +
      '4. Votre connexion internet est stable.\n\n' +
      'Si le problème persiste, contactez-nous à support@surphy.fr.',
    isFinal: true,
  },

  card_compromised_answer: {
    id: 'card_compromised_answer',
    botMessage:
      'Si vous pensez que votre carte est compromise :\n\n' +
      '1. Verrouillez immédiatement votre carte depuis l\'onglet "Carte".\n' +
      '2. Vérifiez votre historique de transactions pour repérer les opérations suspectes.\n' +
      '3. Contactez-nous sans délai à support@surphy.fr avec le détail des transactions non reconnues.\n\n' +
      'Notre équipe traitera votre signalement en priorité.',
    isFinal: true,
  },

  card_other_freetext: {
    id: 'card_other_freetext',
    botMessage:
      'Décrivez votre problème de carte ci-dessous et nous ferons de notre mieux pour vous aider.\n\n' +
      'Pour une assistance personnalisée, vous pouvez aussi nous écrire à support@surphy.fr.',
    isFinal: true,
  },

  // --- Autre ---
  other_freetext: {
    id: 'other_freetext',
    botMessage:
      'Décrivez votre problème ci-dessous et nous ferons de notre mieux pour vous aider.\n\n' +
      'Pour une assistance personnalisée, vous pouvez aussi nous écrire à support@surphy.fr.',
    isFinal: true,
  },
};
