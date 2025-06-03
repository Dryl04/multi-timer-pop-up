
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, Upload, Copy, Code, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ExportImportProps {
  onImport: (file: File) => void;
}

export const ExportImport = ({ onImport }: ExportImportProps) => {
  const { toast } = useToast();

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onImport(file);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copié dans le presse-papiers",
      description: "Le contenu a été copié"
    });
  };

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Fichier téléchargé",
      description: `${filename} a été téléchargé`
    });
  };

  // Contenu des fichiers d'extension Chrome
  const manifestContent = JSON.stringify({
    "manifest_version": 3,
    "name": "MultiTimerPopup",
    "version": "1.0.0",
    "description": "Extension pour créer jusqu'à 7 timers simultanés dans des fenêtres popup indépendantes",
    "minimum_chrome_version": "88.0",
    "permissions": [
      "storage",
      "notifications",
      "windows"
    ],
    "background": {
      "service_worker": "service_worker.js"
    },
    "action": {
      "default_popup": "",
      "default_title": "Créer un nouveau timer",
      "default_icon": {
        "16": "icons/icon16.png",
        "48": "icons/icon48.png",
        "128": "icons/icon128.png"
      }
    },
    "icons": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    },
    "options_page": "options.html",
    "web_accessible_resources": [
      {
        "resources": ["assets/sounds/*.mp3", "assets/sounds/*.wav"],
        "matches": ["<all_urls>"]
      }
    ]
  }, null, 2);

  const serviceWorkerContent = `// Service Worker pour MultiTimerPopup
const MAX_TIMERS = 7;
let activeTimers = new Map();

chrome.runtime.onInstalled.addListener(() => {
  console.log('MultiTimerPopup installé');
  initializeStorage();
});

async function initializeStorage() {
  try {
    const result = await chrome.storage.local.get(['timers']);
    if (!result.timers) {
      await chrome.storage.local.set({ timers: [] });
    } else {
      activeTimers = new Map(result.timers.map(timer => [timer.id, timer]));
    }
  } catch (error) {
    console.error('Erreur initialisation storage:', error);
  }
}

chrome.action.onClicked.addListener(async (tab) => {
  await createNewTimer();
});

async function createNewTimer() {
  try {
    if (activeTimers.size >= MAX_TIMERS) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/notification.png',
        title: 'Limite atteinte',
        message: \`Nombre maximal de timers (\${MAX_TIMERS}) atteint\`
      });
      return;
    }

    const timerId = \`timer_\${Date.now()}_\${Math.random().toString(36).substr(2, 9)}\`;
    const offset = activeTimers.size * 30;
    
    const window = await chrome.windows.create({
      type: "popup",
      url: \`timer.html?id=\${timerId}\`,
      width: 200,
      height: 80,
      focused: false,
      left: 100 + offset,
      top: 100 + offset
    });

    const newTimer = {
      id: timerId,
      windowId: window.id,
      mode: 'chronometre',
      initialDuration: 0,
      elapsedTime: 0,
      remainingTime: 0,
      position: { left: 100 + offset, top: 100 + offset },
      size: { width: 200, height: 80 },
      locked: false,
      isRunning: false,
      startTimestamp: null,
      lastUpdateTimestamp: Date.now()
    };

    activeTimers.set(timerId, newTimer);
    await saveTimersToStorage();
  } catch (error) {
    console.error('Erreur création timer:', error);
  }
}

async function saveTimersToStorage() {
  try {
    const timersArray = Array.from(activeTimers.values());
    await chrome.storage.local.set({ timers: timersArray });
  } catch (error) {
    console.error('Erreur sauvegarde timers:', error);
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleTimerMessage(message, sender, sendResponse);
  return true;
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
        }
        break;
      case 'timerExpired':
        await chrome.notifications.create(\`timer-\${message.timerId}\`, {
          type: 'basic',
          iconUrl: 'icons/notification.png',
          title: 'Temps écoulé',
          message: \`Le timer \${message.timerId} est terminé.\`,
          priority: 2
        });
        sendResponse({ success: true });
        break;
    }
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}`;

  const timerHtmlContent = `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MultiTimer</title>
    <link rel="stylesheet" href="timer.css">
</head>
<body>
    <div class="timer-window" id="timerWindow">
        <div class="header" id="header">
            <div class="header-left">
                <button id="toggle-mode" title="Basculer mode">↔️</button>
                <button id="toggle-lock" title="Verrouiller">🔓</button>
            </div>
            <div class="header-right">
                <button id="close-timer" title="Fermer">×</button>
            </div>
        </div>
        
        <div class="timer-content">
            <div class="time-display" id="timeDisplay">00:00:00</div>
            
            <div class="countdown-input" id="countdownInput" style="display: none;">
                <input type="number" id="hours" min="0" max="23" value="0" placeholder="H">
                <span>:</span>
                <input type="number" id="minutes" min="0" max="59" value="0" placeholder="M">
                <span>:</span>
                <input type="number" id="seconds" min="0" max="59" value="0" placeholder="S">
            </div>
            
            <div class="controls">
                <button id="start-stop" title="Démarrer/Arrêter">▶️</button>
                <button id="reset" title="Reset">🔄</button>
            </div>
        </div>
        
        <div class="resize-handle" id="resizeHandle"></div>
    </div>
    
    <script src="timer.js"></script>
</body>
</html>`;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Import de timers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Importez un fichier JSON contenant des configurations de timers précédemment exportées.
            </p>
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="w-5 h-5" />
            Fichiers de l'extension Chrome
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            Téléchargez les fichiers nécessaires pour installer l'extension Chrome MultiTimerPopup.
          </p>
          
          <Tabs defaultValue="manifest" className="w-full">
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="manifest">manifest.json</TabsTrigger>
              <TabsTrigger value="service-worker">service_worker.js</TabsTrigger>
              <TabsTrigger value="timer-html">timer.html</TabsTrigger>
              <TabsTrigger value="instructions">Instructions</TabsTrigger>
            </TabsList>
            
            <TabsContent value="manifest" className="space-y-4">
              <div className="flex justify-between items-center">
                <Badge variant="secondary">manifest.json</Badge>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => copyToClipboard(manifestContent)}>
                    <Copy className="w-4 h-4 mr-1" />
                    Copier
                  </Button>
                  <Button size="sm" onClick={() => downloadFile(manifestContent, 'manifest.json', 'application/json')}>
                    <Download className="w-4 h-4 mr-1" />
                    Télécharger
                  </Button>
                </div>
              </div>
              <Textarea
                value={manifestContent}
                readOnly
                className="font-mono text-xs h-80"
              />
            </TabsContent>
            
            <TabsContent value="service-worker" className="space-y-4">
              <div className="flex justify-between items-center">
                <Badge variant="secondary">service_worker.js</Badge>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => copyToClipboard(serviceWorkerContent)}>
                    <Copy className="w-4 h-4 mr-1" />
                    Copier
                  </Button>
                  <Button size="sm" onClick={() => downloadFile(serviceWorkerContent, 'service_worker.js', 'text/javascript')}>
                    <Download className="w-4 h-4 mr-1" />
                    Télécharger
                  </Button>
                </div>
              </div>
              <Textarea
                value={serviceWorkerContent}
                readOnly
                className="font-mono text-xs h-80"
              />
            </TabsContent>
            
            <TabsContent value="timer-html" className="space-y-4">
              <div className="flex justify-between items-center">
                <Badge variant="secondary">timer.html</Badge>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => copyToClipboard(timerHtmlContent)}>
                    <Copy className="w-4 h-4 mr-1" />
                    Copier
                  </Button>
                  <Button size="sm" onClick={() => downloadFile(timerHtmlContent, 'timer.html', 'text/html')}>
                    <Download className="w-4 h-4 mr-1" />
                    Télécharger
                  </Button>
                </div>
              </div>
              <Textarea
                value={timerHtmlContent}
                readOnly
                className="font-mono text-xs h-80"
              />
            </CardContent>
            
            <TabsContent value="instructions" className="space-y-4">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Installation de l'extension</h3>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>Téléchargez tous les fichiers nécessaires (manifest.json, service_worker.js, timer.html, timer.css, timer.js)</li>
                  <li>Créez un dossier pour votre extension (ex: "MultiTimerPopup")</li>
                  <li>Placez tous les fichiers dans ce dossier</li>
                  <li>Créez un dossier "icons" et ajoutez les icônes (16x16, 48x48, 128x128 pixels)</li>
                  <li>Ouvrez Chrome et allez à chrome://extensions/</li>
                  <li>Activez le "Mode développeur" en haut à droite</li>
                  <li>Cliquez sur "Charger l'extension non empaquetée"</li>
                  <li>Sélectionnez le dossier contenant votre extension</li>
                </ol>
                
                <h3 className="text-lg font-semibold mt-6">Fichiers additionnels requis</h3>
                <ul className="list-disc list-inside space-y-2 text-sm">
                  <li><strong>timer.css</strong> - Styles pour l'interface timer</li>
                  <li><strong>timer.js</strong> - Logique JavaScript pour les timers</li>
                  <li><strong>options.html/css/js</strong> - Page de configuration</li>
                  <li><strong>icons/</strong> - Icônes de l'extension (16x16, 48x48, 128x128)</li>
                  <li><strong>assets/sounds/</strong> - Fichiers audio pour les notifications</li>
                </ul>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
