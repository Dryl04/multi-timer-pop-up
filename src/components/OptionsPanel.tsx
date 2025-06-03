
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Volume2, Bell, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const OptionsPanel = () => {
  const [settings, setSettings] = useState({
    notificationSound: 'beep',
    autoFocus: true,
    persistentNotifications: true,
    soundEnabled: true,
    defaultTheme: 'light',
    windowOpacity: 100
  });

  const { toast } = useToast();

  const updateSetting = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const saveSettings = () => {
    // Dans une vraie extension, on sauvegarderait dans chrome.storage.local
    localStorage.setItem('multitimerSettings', JSON.stringify(settings));
    toast({
      title: "Paramètres sauvegardés",
      description: "Vos préférences ont été enregistrées"
    });
  };

  const resetSettings = () => {
    setSettings({
      notificationSound: 'beep',
      autoFocus: true,
      persistentNotifications: true,
      soundEnabled: true,
      defaultTheme: 'light',
      windowOpacity: 100
    });
    toast({
      title: "Paramètres réinitialisés",
      description: "Tous les paramètres ont été remis par défaut"
    });
  };

  const playPreviewSound = (sound: string) => {
    // Simulation de la lecture d'un son
    toast({
      title: "Aperçu du son",
      description: `Lecture du son: ${sound}`
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="w-5 h-5" />
            Sons de notification
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {[
              { value: 'beep', label: 'Bip classique' },
              { value: 'chime', label: 'Carillon' },
              { value: 'bell', label: 'Cloche' }
            ].map((sound) => (
              <div key={sound.value} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <input
                    type="radio"
                    name="notification-sound"
                    value={sound.value}
                    checked={settings.notificationSound === sound.value}
                    onChange={(e) => updateSetting('notificationSound', e.target.value)}
                    className="text-blue-600"
                  />
                  <span>{sound.label}</span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => playPreviewSound(sound.value)}
                >
                  🔊
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Comportement des timers
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="auto-focus">Mettre automatiquement au premier plan les timers expirés</Label>
            <Switch
              id="auto-focus"
              checked={settings.autoFocus}
              onCheckedChange={(checked) => updateSetting('autoFocus', checked)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="persistent-notifications">Notifications persistantes</Label>
            <Switch
              id="persistent-notifications"
              checked={settings.persistentNotifications}
              onCheckedChange={(checked) => updateSetting('persistentNotifications', checked)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="sound-enabled">Activer les sons de notification</Label>
            <Switch
              id="sound-enabled"
              checked={settings.soundEnabled}
              onCheckedChange={(checked) => updateSetting('soundEnabled', checked)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Interface
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Thème par défaut</Label>
            <Select value={settings.defaultTheme} onValueChange={(value) => updateSetting('defaultTheme', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Clair</SelectItem>
                <SelectItem value="dark">Sombre</SelectItem>
                <SelectItem value="auto">Automatique</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>Transparence des fenêtres: {settings.windowOpacity}%</Label>
            <Slider
              value={[settings.windowOpacity]}
              onValueChange={(value) => updateSetting('windowOpacity', value[0])}
              min={70}
              max={100}
              step={5}
              className="w-full"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Raccourcis clavier</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { key: 'Ctrl + Shift + T', description: 'Créer un nouveau timer' },
              { key: 'Échap', description: 'Fermer le timer actuel' },
              { key: 'Espace', description: 'Démarrer/Arrêter le timer' },
              { key: 'R', description: 'Reset du timer' }
            ].map((shortcut, index) => (
              <div key={index} className="flex justify-between items-center">
                <Badge variant="outline" className="font-mono">
                  {shortcut.key}
                </Badge>
                <span className="text-sm text-gray-600">{shortcut.description}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>À propos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p><strong>MultiTimerPopup v1.0.0</strong></p>
            <p>Extension Chrome pour la gestion de timers multiples</p>
            <p>Limite: 7 timers simultanés maximum</p>
            <p>Compatible avec Chrome 88+</p>
          </div>
        </CardContent>
      </Card>

      <Separator />

      <div className="flex gap-4">
        <Button onClick={saveSettings} className="flex-1">
          Sauvegarder les paramètres
        </Button>
        <Button onClick={resetSettings} variant="outline" className="flex-1">
          Réinitialiser
        </Button>
      </div>
    </div>
  );
};
