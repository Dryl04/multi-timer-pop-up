
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TimerComponent } from '@/components/TimerComponent';
import { OptionsPanel } from '@/components/OptionsPanel';
import { ExportImport } from '@/components/ExportImport';
import { Play, Square, RotateCcw, Plus, Settings, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const MAX_TIMERS = 7;

interface Timer {
  id: string;
  mode: 'chronometre' | 'countdown';
  initialDuration: number;
  elapsedTime: number;
  remainingTime: number;
  position: { left: number; top: number };
  size: { width: number; height: number };
  locked: boolean;
  isRunning: boolean;
  startTimestamp: number | null;
}

const Index = () => {
  const [timers, setTimers] = useState<Timer[]>([]);
  const [activeTab, setActiveTab] = useState('timers');
  const { toast } = useToast();

  // Créer un nouveau timer
  const createNewTimer = () => {
    if (timers.length >= MAX_TIMERS) {
      toast({
        title: "Limite atteinte",
        description: `Nombre maximal de timers (${MAX_TIMERS}) atteint`,
        variant: "destructive"
      });
      return;
    }

    const newTimer: Timer = {
      id: `timer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      mode: 'chronometre',
      initialDuration: 0,
      elapsedTime: 0,
      remainingTime: 0,
      position: { 
        left: 100 + timers.length * 30, 
        top: 100 + timers.length * 30 
      },
      size: { width: 200, height: 80 },
      locked: false,
      isRunning: false,
      startTimestamp: null
    };

    setTimers(prev => [...prev, newTimer]);
    
    toast({
      title: "Timer créé",
      description: `Nouveau timer ${newTimer.id} créé avec succès`
    });
  };

  // Supprimer un timer
  const removeTimer = (timerId: string) => {
    setTimers(prev => prev.filter(timer => timer.id !== timerId));
    toast({
      title: "Timer supprimé",
      description: `Timer ${timerId} supprimé`
    });
  };

  // Mettre à jour un timer
  const updateTimer = (timerId: string, updates: Partial<Timer>) => {
    setTimers(prev => prev.map(timer => 
      timer.id === timerId ? { ...timer, ...updates } : timer
    ));
  };

  // Exporter tous les timers
  const exportTimers = () => {
    const exportData = {
      timers: timers.map(timer => ({
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

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `multitimer_export_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Export réussi",
      description: "Fichier de timers téléchargé"
    });
  };

  // Importer des timers
  const importTimers = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importData = JSON.parse(e.target?.result as string);
        
        if (!importData.timers || !Array.isArray(importData.timers)) {
          throw new Error('Structure JSON invalide');
        }

        if (importData.timers.length > MAX_TIMERS) {
          throw new Error(`Trop de timers (maximum ${MAX_TIMERS})`);
        }

        setTimers(importData.timers);
        toast({
          title: "Import réussi",
          description: `${importData.timers.length} timer(s) importé(s)`
        });
      } catch (error) {
        toast({
          title: "Erreur d'import",
          description: "Fichier d'import invalide",
          variant: "destructive"
        });
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            MultiTimerPopup
          </h1>
          <p className="text-lg text-gray-600">
            Extension Chrome pour la gestion de timers multiples
          </p>
          <div className="mt-4 flex justify-center gap-4">
            <Button onClick={createNewTimer} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Nouveau Timer ({timers.length}/{MAX_TIMERS})
            </Button>
            <Button onClick={exportTimers} variant="outline" className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              Exporter
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="timers">Timers Actifs</TabsTrigger>
            <TabsTrigger value="options">Options</TabsTrigger>
            <TabsTrigger value="extension">Fichiers Extension</TabsTrigger>
          </TabsList>
          
          <TabsContent value="timers" className="space-y-4">
            {timers.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <div className="text-6xl mb-4">⏱️</div>
                  <h3 className="text-xl font-semibold mb-2">Aucun timer actif</h3>
                  <p className="text-gray-600 mb-4">Créez votre premier timer pour commencer</p>
                  <Button onClick={createNewTimer}>
                    <Plus className="w-4 h-4 mr-2" />
                    Créer un timer
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {timers.map(timer => (
                  <TimerComponent
                    key={timer.id}
                    timer={timer}
                    onUpdate={updateTimer}
                    onRemove={removeTimer}
                  />
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="options">
            <OptionsPanel />
          </TabsContent>
          
          <TabsContent value="extension">
            <ExportImport onImport={importTimers} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
