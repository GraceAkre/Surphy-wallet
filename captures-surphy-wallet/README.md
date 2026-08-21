# Captures d'écran — Surphy Wallet

44 captures de l'application mobile, prises sur **simulateur iOS** (rendu natif, barre de statut incluse).

| | |
|---|---|
| **Appareil** | iPhone 17 Pro — iOS 26.2 |
| **Résolution** | 1206 × 2622 px (@3x) |
| **Runtime** | Expo Go 2.32.18 (SDK 52), Metro en local |
| **Backend** | Supabase `kzwkauprdpkrrwotwost` + API ML sur Render (`surphy-wallet.onrender.com`) |
| **Données** | Réelles (comptes de test), pas de mock |
| **Date** | 21 août 2026 |

Comptes utilisés : `jordan.josub@epitech.digital` (étudiant) et `jordan.josub@analyst.surphy.fr` (analyste).

---

## `01-etudiant/` — Parcours étudiant (30 captures)

### Authentification & légal
| Fichier | Écran |
|---|---|
| `01-onboarding.png` | Onboarding — accroche « Smart Wallet pour Étudiants » |
| `02-connexion.png` | Connexion par e-mail institutionnel |
| `03-conditions-utilisation.png` | Conditions générales d'utilisation |
| `04-politique-confidentialite.png` | Politique de confidentialité |
| `30-verification-otp.png` | Vérification OTP à 6 chiffres |

### Accueil & compte
| Fichier | Écran |
|---|---|
| `05-accueil.png` | Accueil — solde, actions rapides, multi-campus, alerte sécurité |
| `06-accueil-suite.png` | Accueil (défilé) — activités récentes |
| `11-profil.png` → `13-profil-fin.png` | Profil — identité, compte, sécurité, préférences |

### Transactions
| Fichier | Écran |
|---|---|
| `07-historique.png` | Historique — recherche + filtres (Tout / Validées / En revue / Bloquées) |
| `08-historique-suite.png` | Historique (défilé) |
| `27-historique-bloquees.png` | Historique filtré sur les transactions bloquées + résumé du mois |
| `25-detail-transaction.png` | Détail d'une transaction bloquée |
| `26-detail-transaction-suite.png` | Détail — **analyse de risque, score ML 75/100 et règles déclenchées** |

### Carte virtuelle
| Fichier | Écran |
|---|---|
| `09-carte-virtuelle.png` | Carte virtuelle + actions (verrouiller, limites, code PIN) |
| `10-carte-details.png` | Carte — détails révélés |

### Mouvements d'argent
| Fichier | Écran |
|---|---|
| `17-envoyer.png` | Faire un virement |
| `18-selection-destinataire.png` | Sélection du destinataire (utilisateur / groupe) |
| `15-recevoir.png` | Demander un virement |
| `16-deposer.png` | Déposer des fonds |
| `19-multi-campus.png` | Surphy Multi-Campus — soldes par campus partenaire |
| `20-transfert-inter-campus.png` | Transfert inter-campus |

### Sécurité & IA
| Fichier | Écran |
|---|---|
| `23-alerte-securite.png` | Vérification requise — motifs de l'alerte IA |
| `24-alerte-securite-suite.png` | Vérification — actions (signaler la fraude, bloquer la carte) |
| `28-jauge-de-risque.png` | **Analyse de risque — jauge + règles pondérées (R3, R5, R7)** |
| `29-jauge-de-risque-suite.png` | Analyse de risque (défilé) |

### Notifications & support
| Fichier | Écran |
|---|---|
| `14-notifications.png` | Notifications |
| `21-support-chat.png` | Support — assistant Surphy Bot |
| `22-support-chat-reponse.png` | Support — réponse de l'assistant |

---

## `02-analyste/` — Parcours analyste fraude (14 captures)

| Fichier | Écran |
|---|---|
| `01-dashboard.png` | Dashboard — score ML moyen, file d'attente, urgentes, transactions suspectes |
| `02-dashboard-suite.png` | Dashboard (défilé) |
| `03-notifications-analyste.png` | Notifications analyste — flux des transactions scorées |
| `04-alertes.png` | Alertes — filtres par score, décision et période |
| `05-alertes-suite.png` | Alertes (défilé) |
| `06-detail-alerte.png` | **Détail alerte — jauge 75/100 + contributions par règle (R9 +35, R1 +30)** |
| `07-detail-alerte-suite.png` | Détail alerte — informations transaction |
| `08-detail-alerte-actions.png` | **Labellisation — Fraude / Légitime / Doublon / Abonnement + notes** |
| `09-profil-analyste.png` | Profil analyste — rôle « Analyste Fraude » |
| `10-profil-analyste-suite.png` | **Sensibilité ML — Souple / Normal / Strict avec seuils** |
| `11-profil-analyste-fin.png` | Profil analyste (fin) |
| `12-recapitulatif-hebdo.png` | Récapitulatif hebdomadaire — métriques de la semaine |
| `13-recapitulatif-hebdo-suite.png` | Récapitulatif hebdo (défilé) |
| `14-info-sensibilite-ml.png` | **Niveaux de sensibilité — seuils exacts des 3 modes** |

---

## Anomalies relevées pendant la campagne

Trois écrans ne sont **atteignables par aucun parcours utilisateur** :

1. **`RiskGauge`** (`28`, `29`) — l'écran est bien enregistré dans le navigateur (`App.tsx`) mais aucun composant n'appelle `navigate('RiskGauge')`.
2. **`OTPVerification`** (`30`) — même situation : enregistré, jamais appelé. Le flux de connexion utilise un mot de passe, pas d'OTP.
3. **`Explicability`** — `VerificationScreen.tsx:210` appelle `navigation.navigate('Explicability', …)`, mais **aucun `Stack.Screen` de ce nom n'existe**. Résultat : un toast d'erreur `The action 'NAVIGATE' … was not handled` au clic sur « En savoir plus sur l'IA de détection ». Le composant `ExplicabilityModal.tsx` est par ailleurs une modale à props (`visible` / `onClose` / `reasons`), pas un écran de navigation — il n'est monté nulle part.

Autre point : sur l'écran **Vérification** (`23`), la flèche de retour appelle bien `navigation.goBack()` mais ne produit aucun effet — impossible de quitter l'écran sans le valider.

Les deux premiers écrans ont pu être capturés en pointant temporairement `initialRouteName` dessus ; **ces modifications ont été annulées**, le code source est inchangé.
