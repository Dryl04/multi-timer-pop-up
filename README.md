
# MultiTimerPopup

Extension Chrome permettant de créer jusqu'à 7 timers simultanés dans des fenêtres popup indépendantes, sans barre d'adresse ni onglets.

## 🚀 Fonctionnalités

- **Timers multiples** : Jusqu'à 7 timers simultanés
- **Modes de temps** : Chronomètre (compte en avant) et compte à rebours
- **Interface personnalisable** : Fenêtres redimensionnables et déplaçables
- **Verrouillage** : Protection contre les déplacements accidentels
- **Notifications** : Sons et notifications système à l'expiration
- **Export/Import** : Sauvegarde et restauration des configurations
- **Détection d'interruption** : Alertes en cas d'interruption de timer

## 📋 Prérequis

- **Chrome 88+** (pour le support Manifest V3)
- Node.js et npm (pour les tests de développement)

## 🛠️ Installation

### Installation en mode développeur

1. Clonez ou téléchargez ce projet
2. Ouvrez Chrome et allez dans `chrome://extensions/`
3. Activez le "Mode développeur" (coin supérieur droit)
4. Cliquez sur "Charger l'extension non empaquetée"
5. Sélectionnez le dossier du projet

### Installation depuis le Chrome Web Store

*À venir - l'extension sera bientôt disponible sur le Chrome Web Store*

## 📖 Utilisation

### Créer un timer

1. Cliquez sur l'icône MultiTimerPopup dans la barre d'outils Chrome
2. Une fenêtre popup s'ouvre avec un timer par défaut en mode chronomètre
3. Utilisez les boutons pour démarrer/arrêter et reset le timer

### Modes de timer

**Chronomètre (par défaut)**
- Compte le temps en avant depuis 00:00:00
- Cliquez ▶️ pour démarrer/arrêter
- Cliquez 🔄 pour remettre à zéro

**Compte à rebours**
- Cliquez ↔️ pour basculer en mode countdown
- Définissez la durée avec les champs Heures:Minutes:Secondes
- Le timer décompte jusqu'à 00:00:00
- Une notification et un son se déclenchent à l'expiration

### Personnalisation

**Déplacement**
- Cliquez et glissez la barre d'en-tête pour déplacer la fenêtre

**Redimensionnement**
- Utilisez le coin inférieur droit pour redimensionner

**Verrouillage**
- Cliquez 🔓/🔒 pour verrouiller/déverrouiller le timer
- Un timer verrouillé ne peut pas être déplacé ou redimensionné

### Export/Import

**Exporter**
- Cliquez 📤 dans un timer ou "Exporter tous les timers" dans les options
- Sauvegarde la configuration, position et état de tous les timers

**Importer**
- Cliquez 📥 et sélectionnez un fichier JSON d'export
- Restaure tous les timers avec leurs positions et configurations

## ⚙️ Configuration

Accédez aux options via :
- Clic droit sur l'icône → "Options"
- Ou `chrome://extensions/` → MultiTimerPopup → "Options"

### Options disponibles

- **Sons de notification** : Choix entre bip, carillon ou cloche
- **Comportement** : Auto-focus, notifications persistantes
- **Interface** : Thème et transparence des fenêtres
- **Raccourcis clavier** : Configuration des touches de raccourci

## 🏗️ Architecture du projet

```
MultiTimerPopup/
├── manifest.json              # Configuration extension Chrome
├── service_worker.js           # Logique globale et gestion des timers
├── timer.html                  # Interface de la fenêtre timer
├── timer.css                   # Styles de la fenêtre timer
├── timer.js                    # Script de la fenêtre timer
├── options.html                # Page de configuration
├── options.css                 # Styles de la page d'options
├── options.js                  # Script de la page d'options
├── icons/                      # Icônes de l'extension
│   ├── icon16.png
│   ├── icon48.png
│   ├── icon128.png
│   └── notification.png
├── assets/                     # Ressources (sons, etc.)
│   └── sounds/
│       ├── beep.mp3
│       ├── chime.mp3
│       └── bell.mp3
└── tests/                      # Tests unitaires et E2E
    ├── timer.test.js           # Tests Jest
    └── e2e/
        └── create-timer.spec.js # Tests Puppeteer
```

## 🧪 Tests

### Installation des dépendances de test

```bash
npm install
```

### Tests unitaires (Jest)

```bash
npm test
```

Tests des fonctions utilitaires :
- Calcul du temps restant/écoulé
- Formatage et parsing du temps
- Validation des données JSON
- Export/Import des configurations

### Tests end-to-end (Puppeteer)

```bash
npm run e2e
```

Tests d'intégration :
- Installation de l'extension
- Création et gestion des timers
- Interface utilisateur
- Export/Import
- Fonctionnalités de verrouillage

## 🔧 Développement

### Structure des données

Chaque timer est stocké avec cette structure :

```json
{
  "id": "timer_1234567890_abc123",
  "windowId": 123456789,
  "mode": "chronometre|countdown",
  "initialDuration": 3600000,
  "elapsedTime": 120000,
  "remainingTime": 3480000,
  "position": { "left": 100, "top": 100 },
  "size": { "width": 200, "height": 80 },
  "locked": false,
  "isRunning": false,
  "startTimestamp": 1234567890123,
  "lastUpdateTimestamp": 1234567890123
}
```

### API interne

Le service worker expose ces actions via `chrome.runtime.sendMessage` :

- `getTimerData` : Récupérer les données d'un timer
- `updateTimer` : Mettre à jour un timer
- `removeTimer` : Supprimer un timer
- `timerExpired` : Notifier l'expiration d'un timer
- `exportTimers` : Exporter tous les timers
- `importTimers` : Importer une configuration

### Gestion des erreurs

- **Limite de timers** : Notification si tentative de création du 8ème timer
- **Interruption de timer** : Détection et notification en cas d'interruption
- **Import invalide** : Validation et messages d'erreur pour les fichiers JSON
- **Positions hors écran** : Repositionnement automatique à (100, 100)

## 🎨 Personnalisation

### Ajouter un nouveau son

1. Ajoutez le fichier audio dans `assets/sounds/`
2. Modifiez `options.html` pour inclure le nouveau choix
3. Mettez à jour `options.js` pour gérer le nouveau son
4. Ajoutez la logique de lecture dans `timer.js`

### Modifier le style

Les styles sont dans `timer.css` et `options.css`. Classes principales :

- `.timer-window` : Container principal du timer
- `.header` : Barre d'en-tête draggable
- `.timer-content` : Zone d'affichage et contrôles
- `.locked` : State verrouillé

### Ajouter une fonctionnalité

1. Modifiez la structure de données dans `service_worker.js`
2. Ajoutez l'interface dans `timer.html`
3. Implémentez la logique dans `timer.js`
4. Ajoutez les tests correspondants
5. Mettez à jour la documentation

## 🐛 Dépannage

### Le timer ne se crée pas
- Vérifiez que vous n'avez pas déjà 7 timers ouverts
- Rechargez l'extension dans `chrome://extensions/`
- Consultez les logs dans les outils de développement

### Le timer s'interrompt
- Vérification automatique des interruptions
- Notification en cas de décalage temporel > 5 secondes
- Le timer peut être relancé manuellement

### L'import ne fonctionne pas
- Vérifiez le format JSON du fichier
- Le fichier doit contenir un tableau "timers"
- Maximum 7 timers par import
- Chaque timer doit avoir id, mode, position et size

### Performance dégradée
- Fermez les timers inutilisés
- Réduisez le nombre de timers simultanés
- Redémarrez Chrome si nécessaire

## 📄 Licence

MIT License - voir le fichier LICENSE pour plus de détails

## 🤝 Contribution

Les contributions sont les bienvenues ! Veuillez :

1. Fork le projet
2. Créer une branche pour votre fonctionnalité
3. Ajouter des tests pour votre code
4. Vérifier que tous les tests passent
5. Soumettre une pull request

## 📞 Support

- **Issues** : [GitHub Issues](https://github.com/votre-username/multitimerpopup/issues)
- **Documentation** : Ce README et les commentaires dans le code
- **Chrome Web Store** : *Lien à venir*

## 🔄 Changelog

### v1.0.0
- ✨ Version initiale
- ✅ Support de 7 timers simultanés
- ✅ Modes chronomètre et compte à rebours
- ✅ Interface draggable et redimensionnable
- ✅ Système de verrouillage
- ✅ Export/Import des configurations
- ✅ Notifications sonores et visuelles
- ✅ Détection d'interruption
- ✅ Tests unitaires et E2E complets

---

**MultiTimerPopup v1.0.0** - Une extension Chrome professionnelle pour la gestion de timers multiples 🕐
