# Guide Utilisateur — Système de Gestion Scolaire

## Introduction

Ce guide explique comment utiliser le système de gestion scolaire selon votre rôle. L'application est accessible via un navigateur web et dispose de quatre profils : **Directeur**, **Formateur**, **Stagiaire** et **Surveillant**.

---

## 1. Connexion à l'application

L'accès à l'application se fait en trois étapes :

### Étape 1 — Identifiants

1. Ouvrez votre navigateur et accédez à l'URL de l'application
2. Saisissez votre **adresse email** et votre **mot de passe**
3. Cliquez sur **Se connecter**

### Étape 2 — Vérification email

Un code à usage unique (OTP) est envoyé à votre adresse email.

1. Consultez votre boîte mail
2. Saisissez le **code reçu** dans le champ prévu
3. Cliquez sur **Vérifier**

> Le code expire après quelques minutes. Si vous ne l'avez pas reçu, cliquez sur **Renvoyer le code**.

### Étape 3 — Authentification à deux facteurs (2FA)

Si la 2FA est activée sur votre compte :

1. Ouvrez votre application d'authentification (Google Authenticator, etc.)
2. Saisissez le **code à 6 chiffres** affiché
3. Cliquez sur **Valider**

Vous êtes ensuite redirigé automatiquement vers votre tableau de bord.

---

### Mot de passe oublié

1. Sur la page de connexion, cliquez sur **Mot de passe oublié**
2. Saisissez votre adresse email et confirmez
3. Consultez votre email et cliquez sur le lien de réinitialisation
4. Choisissez un nouveau mot de passe et confirmez

---

### Changer de thème (clair / sombre)

Le bouton de bascule du thème est disponible dans la barre supérieure. Votre préférence est sauvegardée automatiquement.

---

## 2. Profil Directeur

Le Directeur dispose d'un accès complet à toutes les fonctionnalités de gestion de l'établissement.

### 2.1 Tableau de bord

La page d'accueil affiche :
- Les **statistiques globales** : nombre total de stagiaires, formateurs, filières, groupes, modules et salles
- Les **activités récentes** de l'établissement
- La **répartition des stagiaires par filière** sous forme de graphique

---

### 2.2 Gestion des Stagiaires

**Accès :** Menu latéral → Personnes → Stagiaires

**Consulter la liste**
- La liste affiche tous les stagiaires avec leur nom, groupe, statut et contact
- Utilisez la barre de **recherche** pour filtrer par nom ou email
- Cliquez sur **Sort By A-Z / Z-A** pour trier alphabétiquement
- Ajustez le nombre d'entrées par page (10, 25, 50)

**Ajouter un stagiaire**
1. Cliquez sur **Nouveau stagiaire**
2. Remplissez les informations : nom, prénom, email, CEF, CNE, CIN, groupe, date de naissance, adresse
3. Cliquez sur **Enregistrer**

**Modifier un stagiaire**
1. Cliquez sur l'icône de menu (⋮) en fin de ligne
2. Sélectionnez **Modifier**
3. Apportez vos modifications et cliquez sur **Enregistrer**

**Voir le profil complet**
- Cliquez sur le nom du stagiaire pour afficher sa fiche détaillée (absences, notes, groupe, contact)

**Supprimer un stagiaire**
1. Cliquez sur le menu (⋮) → **Supprimer**
2. Confirmez la suppression dans la boîte de dialogue

---

### 2.3 Gestion des Formateurs

**Accès :** Menu latéral → Personnes → Formateurs

Les opérations sont identiques à la gestion des stagiaires. Informations spécifiques à renseigner : matricule, spécialisation, date de recrutement, modules enseignés.

---

### 2.4 Filières

**Accès :** Menu latéral → Académique → Filières

Permet de créer et gérer les filières de formation (ex. Développement Digital, Réseaux Informatiques).

Champs : code, nom, description, durée (en mois), niveau, secteur.

---

### 2.5 Groupes

**Accès :** Menu latéral → Académique → Groupes

Chaque groupe appartient à une filière. Champs : nom, filière, année (1 ou 2), année scolaire, nombre maximum de stagiaires.

---

### 2.6 Modules

**Accès :** Menu latéral → Académique → Modules

Chaque module est rattaché à une filière. Champs : code, nom, coefficient, heures totales, semestre.

---

### 2.7 Salles

**Accès :** Menu latéral → Académique → Salles

Types disponibles : Cours, TP, Amphi, Réunion. Champs : nom, type, capacité, bâtiment, équipements.

---

### 2.8 Emploi du temps

**Accès :** Menu latéral → Académique → Emploi du temps

1. Sélectionnez un **formateur** dans le premier filtre
2. Sélectionnez une **filière** (filtrée selon le formateur)
3. Sélectionnez un **groupe** (filtré selon la filière)
4. Sélectionnez une **semaine**

L'emploi du temps s'affiche sous forme de grille avec les créneaux horaires (08:30–18:30) et les jours de la semaine. Chaque cellule indique la salle et le type de séance (Présentiel / À distance).

**Pauses :** Morning Break (10:50–11:10) et Evening Break (15:50–16:10).

---

### 2.9 Examens & Notes

**Accès :** Menu latéral → Académique → Examens & Notes

**Créer un examen**
1. Cliquez sur **Nouvel examen**
2. Renseignez : module, groupe, salle, formateur, type (Contrôle, EFM, EFF, Rattrapage), date, heure début/fin
3. Enregistrez

**Saisir les notes**
1. Sélectionnez la filière, le groupe et le module
2. Le tableau des stagiaires du groupe s'affiche avec les colonnes de contrôles
3. Saisissez les notes (sur 20) pour chaque stagiaire
4. Cochez **Absent** pour les absents lors de l'examen
5. Cliquez sur **Enregistrer les notes**

---

### 2.10 Absences

**Accès :** Menu latéral → Gestion → Absences

Affiche toutes les absences avec leur statut (Non justifiée, En attente, Justifiée).

**Ajouter une absence**
1. Cliquez sur **Nouvelle absence**
2. Sélectionnez le stagiaire, le module, la date, les heures
3. Enregistrez

**Justifier / Rejeter une absence**
- Cliquez sur le menu (⋮) d'une absence → **Justifier** ou **Rejeter**

---

### 2.11 Utilisateurs

**Accès :** Menu latéral → Gestion des utilisateurs → Utilisateurs

Permet de créer des comptes pour tous les rôles (directeur, formateur, stagiaire, surveillant) et de les activer ou désactiver.

---

### 2.12 Paramètres

**Accès :** Menu latéral → Paramètres généraux

Permet de modifier votre profil (nom, prénom, téléphone, avatar) et de changer votre mot de passe.

---

## 3. Profil Formateur

### 3.1 Tableau de bord

Résumé des modules enseignés, des examens à venir et des absences récentes.

---

### 3.2 Modules

**Accès :** Menu latéral → Académique → Modules

Affiche la liste des modules que vous enseignez, avec les filières et groupes associés.

---

### 3.3 Emploi du temps

**Accès :** Menu latéral → Académique → Emploi du temps

Votre emploi du temps est automatiquement filtré sur votre profil.

1. Sélectionnez une **filière**
2. Sélectionnez un **groupe**
3. Sélectionnez une **semaine**

La grille affiche vos séances avec la salle, le groupe et le type (Présentiel / À distance).

---

### 3.4 Examens & Notes

**Accès :** Menu latéral → Académique → Examens & Notes

1. Sélectionnez la **filière**, le **groupe** et le **module**
2. Le tableau de saisie des notes apparaît avec un contrôle par colonne
3. Saisissez les notes et cochez les absents
4. Cliquez sur **Enregistrer les notes**

> Les notes déjà enregistrées s'affichent automatiquement et peuvent être modifiées.

---

### 3.5 Absences

**Accès :** Menu latéral → Académique → Absences

Permet de consulter et saisir les absences des stagiaires pour vos modules.

**Saisir une absence**
1. Cliquez sur **Nouvelle absence**
2. Sélectionnez le stagiaire, le module, la date, le créneau horaire
3. Enregistrez

---

### 3.6 Paramètres généraux

Modifier votre profil et changer votre mot de passe.

---

## 4. Profil Stagiaire

### 4.1 Tableau de bord

Vue synthétique de votre situation : modules en cours, prochains examens, dernières absences et résultats récents.

---

### 4.2 Modules

**Accès :** Menu latéral → Académique → Modules

Liste de tous les modules de votre filière avec les informations (coefficient, heures, semestre, formateur).

---

### 4.3 Emploi du temps

**Accès :** Menu latéral → Académique → Emploi du temps

Affiche votre emploi du temps hebdomadaire. Sélectionnez la semaine souhaitée pour naviguer dans le calendrier.

---

### 4.4 Absences

**Accès :** Menu latéral → Académique → Absences

Consultez la liste de vos absences avec leur statut :
- **Non justifiée** : aucun justificatif fourni
- **En attente** : justificatif soumis, en cours de traitement
- **Justifiée** : absence validée par l'administration

---

### 4.5 Examens & Notes

**Accès :** Menu latéral → Académique → Examens & Notes

Consultez vos résultats par module :
- Notes obtenues à chaque contrôle
- Mentions des absences lors des examens
- Moyennes calculées automatiquement

---

### 4.6 Paramètres généraux

Modifier votre profil personnel et changer votre mot de passe.

---

## 5. Profil Surveillant

Le Surveillant dispose d'un accès en **lecture seule** sur l'ensemble des données de l'établissement.

### Pages disponibles

| Page | Description |
|------|-------------|
| Tableau de bord | Vue globale de l'établissement |
| Stagiaires | Consultation de la liste et des profils |
| Formateurs | Consultation de la liste et des profils |
| Groupes | Liste des groupes par filière |
| Salles | Liste des salles et disponibilités |
| Modules | Liste des modules par filière |
| Filières | Liste des filières |
| Emploi du temps | Consultation par formateur / filière / groupe |
| Examens | Calendrier des examens |
| Absences | Suivi des absences |

> Le Surveillant ne peut pas créer, modifier ni supprimer de données.

---

## 6. Fonctionnalités communes

### Recherche et tri

- La barre de **recherche** filtre les résultats en temps réel sur la plupart des pages
- Le bouton **Sort By A-Z / Z-A** trie la liste alphabétiquement
- Le sélecteur de **lignes par page** ajuste le nombre d'entrées affichées (10, 25, 50)

### Navigation entre pages

Utilisez les flèches de pagination en bas de tableau pour naviguer entre les pages de résultats.

### Thème clair / sombre

Le bouton de bascule dans la barre supérieure permet de passer du thème clair au thème sombre. La préférence est sauvegardée entre les sessions.

### Déconnexion

Cliquez sur votre nom dans la barre supérieure, puis sur **Déconnexion**.

---

## 7. Résolution des problèmes courants

| Problème | Solution |
|----------|----------|
| Je ne reçois pas le code OTP | Vérifiez vos spams. Cliquez sur "Renvoyer le code" après 60 secondes |
| La page ne se charge pas | Vérifiez votre connexion internet. Actualisez la page (F5) |
| Je suis déconnecté automatiquement | Votre session a expiré. Reconnectez-vous |
| Je vois "Non autorisé" | Votre compte n'a pas les droits nécessaires. Contactez le directeur |
| Les données ne s'affichent pas | Le serveur backend est peut-être indisponible. Contactez l'administrateur |
