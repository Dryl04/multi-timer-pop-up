
// Service Worker pour MultiTimerPopup
// Gère la création, suppression et état des timers

const MAX_TIMERS = 7;
let activeTimers = new Map();

// Installation du service worker
chrome.runtime.onInstalled.addListener(() => {
  console.log('MultiTimerPopup installé');
  initializeStorage();
});

// Initialise le stockage local
async function initializeStorage() {
  try {
    const result = await chrome.storage.local.get(['timers']);
    if (!result.timers) {
      await chrome.storage.local.set({ timers: [] });
    } else {
      // Restaurer les timers existants
      activeTimers = new Map(result.timers.map(timer => [timer.id, timer]));
    }
  } catch (error) {
    console.error('Erreur initialisation storage:', error);
  }
}

// Gestionnaire du clic sur l'icône de l'extension
chrome.action.onClicked.addListener(async (tab) => {
  await createNewTimer();
});

// Créer un nouveau timer
async function createNewTimer() {
  try {
    // Vérifier la limite de timers
    if (activeTimers.size >= MAX_TIMERS) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/notification.png',
        title: 'Limite atteinte',
        message: `Nombre maximal de timers (${MAX_TIMERS}) atteint`
      });
      return;
    }

    // Créer un nouvel ID de timer
    const timerId = `timer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Position par défaut (décalée pour éviter le chevauchement)
    const offset = activeTimers.size * 30;
    const defaultPosition = {
      left: 100 + offset,
      top: 100 + offset
    };

    // Créer la fenêtre popup
    const window = await chrome.windows.create({
      type: "popup",
      url: `timer.html?id=${timerId}`,
      width: 200,
      height: 80,
      focused: false,
      left: defaultPosition.left,
      top: defaultPosition.top
    });

    // Créer l'objet timer
    const newTimer = {
      id: timerId,
      windowId: window.id,
      mode: 'chronometre', // 'chronometre' ou 'countdown'
      initialDuration: 0,
      elapsedTime: 0,
      remainingTime: 0,
      position: defaultPosition,
      size: { width: 200, height: 80 },
      locked: false,
      isRunning: false,
      startTimestamp: null,
      lastUpdateTimestamp: Date.now()
    };

    // Ajouter à la map et sauvegarder
    activeTimers.set(timerId, newTimer);
    await saveTimersToStorage();

    console.log(`Timer créé: ${timerId}`);
  } catch (error) {
    console.error('Erreur création timer:', error);
  }
}

// Sauvegarder les timers dans le storage
async function saveTimersToStorage() {
  try {
    const timersArray = Array.from(activeTimers.values());
    await chrome.storage.local.set({ timers: timersArray });
  } catch (error) {
    console.error('Erreur sauvegarde timers:', error);
  }
}

// Supprimer un timer
async function removeTimer(timerId) {
  try {
    const timer = activeTimers.get(timerId);
    if (timer) {
      // Fermer la fenêtre si elle existe encore
      try {
        await chrome.windows.remove(timer.windowId);
      } catch (e) {
        // La fenêtre peut déjà être fermée
      }
      
      // Supprimer de la map et sauvegarder
      activeTimers.delete(timerId);
      await saveTimersToStorage();
      console.log(`Timer supprimé: ${timerId}`);
    }
  } catch (error) {
    console.error('Erreur suppression timer:', error);
  }
}

// Gestionnaire des messages des timers
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleTimerMessage(message, sender, sendResponse);
  return true; // Indique que la réponse sera asynchrone
});

async function handleTimerMessage(message, sender, sendResponse) {
  try {
    switch (message.action) {
      case 'getTimerData':
        const timer = activeTimers.get(message.timerId);
        sendResponse({ success: true, timer });
        break;

      case 'updateTimer':
        if (activeTimers.has(message.timerId)) {
          const updatedTimer = { ...activeTimers.get(message.timerId), ...message.updates };
          activeTimers.set(message.timerId, updatedTimer);
          await saveTimersToStorage();
          sendResponse({ success: true });
        } else {
          sendResponse({ success: false, error: 'Timer non trouvé' });
        }
        break;

      case 'removeTimer':
        await removeTimer(message.timerId);
        sendResponse({ success: true });
        break;

      case 'timerExpired':
        await handleTimerExpired(message.timerId);
        sendResponse({ success: true });
        break;

      case 'exportTimers':
        const exportData = await exportTimers();
        sendResponse({ success: true, data: exportData });
        break;

      case 'importTimers':
        const importResult = await importTimers(message.data);
        sendResponse(importResult);
        break;

      default:
        sendResponse({ success: false, error: 'Action inconnue' });
    }
  } catch (error) {
    console.error('Erreur traitement message:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Gérer l'expiration d'un timer
async function handleTimerExpired(timerId) {
  try {
    // Créer une notification
    await chrome.notifications.create(`timer-${timerId}`, {
      type: 'basic',
      iconUrl: 'icons/notification.png',
      title: 'Temps écoulé',
      message: `Le timer ${timerId} est terminé.`,
      priority: 2
    });

    console.log(`Timer expiré: ${timerId}`);
  } catch (error) {
    console.error('Erreur expiration timer:', error);
  }
}

// Détecter les interruptions de timer
async function checkTimerInterruption(timerId, expectedTime, actualTime) {
  const timeDiff = Math.abs(expectedTime - actualTime);
  
  // Si la différence est supérieure à 5 secondes, considérer comme une interruption
  if (timeDiff > 5000) {
    try {
      await chrome.notifications.create(`timer-interrupted-${timerId}`, {
        type: 'basic',
        iconUrl: 'icons/notification.png',
        title: 'Timer interrompu',
        message: `Le compte à rebours du timer ${timerId} a été interrompu`
      });
      
      console.log(`Timer interrompu détecté: ${timerId}`);
    } catch (error) {
      console.error('Erreur notification interruption:', error);
    }
  }
}

// Exporter tous les timers
async function exportTimers() {
  const timersArray = Array.from(activeTimers.values());
  return {
    timers: timersArray.map(timer => ({
      id: timer.id,
      mode: timer.mode,
      initialDuration: timer.initialDuration,
      elapsedTime: timer.elapsedTime,
      remainingTime: timer.remainingTime,
      position: timer.position,
      size: timer.size,
      locked: timer.locked
    }))
  };
}

// Importer des timers
async function importTimers(importData) {
  try {
    // Valider la structure JSON
    if (!importData || !Array.isArray(importData.timers)) {
      return { success: false, error: 'Structure JSON invalide' };
    }

    // Valider chaque timer
    for (const timerData of importData.timers) {
      if (!validateTimerData(timerData)) {
        return { success: false, error: 'Données de timer invalides' };
      }
    }

    // Fermer tous les timers existants
    for (const timerId of activeTimers.keys()) {
      await removeTimer(timerId);
    }

    // Créer les nouveaux timers
    for (const timerData of importData.timers) {
      await createTimerFromImport(timerData);
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Valider les données d'un timer
function validateTimerData(timerData) {
  const requiredFields = ['id', 'mode', 'position', 'size'];
  return requiredFields.every(field => timerData.hasOwnProperty(field)) &&
         ['chronometre', 'countdown'].includes(timerData.mode) &&
         typeof timerData.position === 'object' &&
         typeof timerData.size === 'object';
}

// Créer un timer à partir de données d'import
async function createTimerFromImport(timerData) {
  try {
    // Vérifier si on peut créer plus de timers
    if (activeTimers.size >= MAX_TIMERS) {
      console.warn('Limite de timers atteinte lors de l\'import');
      return;
    }

    // Créer la fenêtre popup
    const window = await chrome.windows.create({
      type: "popup",
      url: `timer.html?id=${timerData.id}&import=true`,
      width: timerData.size.width,
      height: timerData.size.height,
      focused: false,
      left: timerData.position.left,
      top: timerData.position.top
    });

    // Créer l'objet timer
    const newTimer = {
      ...timerData,
      windowId: window.id,
      isRunning: false,
      startTimestamp: null,
      lastUpdateTimestamp: Date.now()
    };

    // Ajouter à la map et sauvegarder
    activeTimers.set(timerData.id, newTimer);
    await saveTimersToStorage();
  } catch (error) {
    console.error('Erreur création timer depuis import:', error);
  }
}

// Gestionnaire de fermeture de fenêtre
chrome.windows.onRemoved.addListener(async (windowId) => {
  // Trouver et supprimer le timer associé à cette fenêtre
  for (const [timerId, timer] of activeTimers.entries()) {
    if (timer.windowId === windowId) {
      activeTimers.delete(timerId);
      await saveTimersToStorage();
      console.log(`Timer supprimé par fermeture fenêtre: ${timerId}`);
      break;
    }
  }
});
