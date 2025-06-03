
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  Pause, 
  Square, 
  RotateCcw, 
  Lock, 
  Unlock, 
  X, 
  ArrowLeftRight 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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

interface TimerComponentProps {
  timer: Timer;
  onUpdate: (timerId: string, updates: Partial<Timer>) => void;
  onRemove: (timerId: string) => void;
}

export const TimerComponent = ({ timer, onUpdate, onRemove }: TimerComponentProps) => {
  const [timeDisplay, setTimeDisplay] = useState('00:00:00');
  const [countdownInput, setCountdownInput] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const { toast } = useToast();

  // Formatage du temps
  const formatTime = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Mise à jour de l'affichage du temps
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (timer.isRunning) {
      interval = setInterval(() => {
        const now = Date.now();
        
        if (timer.mode === 'chronometre') {
          const sessionElapsed = timer.startTimestamp ? now - timer.startTimestamp : 0;
          const totalElapsed = timer.elapsedTime + sessionElapsed;
          setTimeDisplay(formatTime(Math.floor(totalElapsed / 1000)));
        } else if (timer.mode === 'countdown') {
          const sessionElapsed = timer.startTimestamp ? now - timer.startTimestamp : 0;
          const remaining = Math.max(0, timer.remainingTime - sessionElapsed);
          setTimeDisplay(formatTime(Math.floor(remaining / 1000)));
          
          // Vérifier si le countdown est terminé
          if (remaining <= 0) {
            onUpdate(timer.id, { isRunning: false, startTimestamp: null });
            toast({
              title: "Temps écoulé",
              description: `Le timer ${timer.id} est terminé.`,
            });
          }
        }
      }, 1000);
    } else {
      if (timer.mode === 'chronometre') {
        setTimeDisplay(formatTime(Math.floor(timer.elapsedTime / 1000)));
      } else {
        setTimeDisplay(formatTime(Math.floor(timer.remainingTime / 1000)));
      }
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timer, onUpdate, toast]);

  // Démarrer/Arrêter le timer
  const toggleTimer = () => {
    if (timer.isRunning) {
      // Arrêter le timer
      const now = Date.now();
      const sessionElapsed = timer.startTimestamp ? now - timer.startTimestamp : 0;
      
      if (timer.mode === 'chronometre') {
        onUpdate(timer.id, {
          isRunning: false,
          elapsedTime: timer.elapsedTime + sessionElapsed,
          startTimestamp: null
        });
      } else {
        onUpdate(timer.id, {
          isRunning: false,
          remainingTime: Math.max(0, timer.remainingTime - sessionElapsed),
          startTimestamp: null
        });
      }
    } else {
      // Démarrer le timer
      if (timer.mode === 'countdown' && timer.remainingTime <= 0) {
        // Configurer le countdown avec les valeurs d'input
        const totalSeconds = countdownInput.hours * 3600 + countdownInput.minutes * 60 + countdownInput.seconds;
        if (totalSeconds > 0) {
          onUpdate(timer.id, {
            isRunning: true,
            remainingTime: totalSeconds * 1000,
            startTimestamp: Date.now()
          });
        }
      } else {
        onUpdate(timer.id, {
          isRunning: true,
          startTimestamp: Date.now()
        });
      }
    }
  };

  // Reset du timer
  const resetTimer = () => {
    if (timer.mode === 'chronometre') {
      onUpdate(timer.id, {
        isRunning: false,
        elapsedTime: 0,
        startTimestamp: null
      });
    } else {
      onUpdate(timer.id, {
        isRunning: false,
        remainingTime: 0,
        startTimestamp: null
      });
    }
  };

  // Basculer le mode
  const toggleMode = () => {
    const newMode = timer.mode === 'chronometre' ? 'countdown' : 'chronometre';
    onUpdate(timer.id, {
      mode: newMode,
      isRunning: false,
      elapsedTime: 0,
      remainingTime: 0,
      startTimestamp: null
    });
  };

  // Basculer le verrouillage
  const toggleLock = () => {
    onUpdate(timer.id, { locked: !timer.locked });
  };

  return (
    <Card className={`relative ${timer.locked ? 'ring-2 ring-red-300' : ''}`}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Badge variant={timer.mode === 'chronometre' ? 'default' : 'secondary'}>
              {timer.mode === 'chronometre' ? 'Chronomètre' : 'Compte à rebours'}
            </Badge>
            <Button
              size="sm"
              variant="ghost"
              onClick={toggleMode}
              disabled={timer.isRunning}
              title="Basculer mode"
            >
              <ArrowLeftRight className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={toggleLock}
              title={timer.locked ? "Déverrouiller" : "Verrouiller"}
            >
              {timer.locked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onRemove(timer.id)}
              title="Fermer"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="text-center">
          <div className={`text-2xl font-mono font-bold ${
            timer.mode === 'countdown' && timer.remainingTime <= 5000 && timer.isRunning 
              ? 'text-red-600 animate-pulse' 
              : timer.mode === 'countdown' 
                ? 'text-red-600' 
                : 'text-blue-600'
          }`}>
            {timeDisplay}
          </div>
        </div>

        {timer.mode === 'countdown' && !timer.isRunning && timer.remainingTime <= 0 && (
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs text-gray-500">H</label>
              <Input
                type="number"
                min="0"
                max="23"
                value={countdownInput.hours}
                onChange={(e) => setCountdownInput(prev => ({ ...prev, hours: parseInt(e.target.value) || 0 }))}
                className="text-center h-8"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">M</label>
              <Input
                type="number"
                min="0"
                max="59"
                value={countdownInput.minutes}
                onChange={(e) => setCountdownInput(prev => ({ ...prev, minutes: parseInt(e.target.value) || 0 }))}
                className="text-center h-8"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">S</label>
              <Input
                type="number"
                min="0"
                max="59"
                value={countdownInput.seconds}
                onChange={(e) => setCountdownInput(prev => ({ ...prev, seconds: parseInt(e.target.value) || 0 }))}
                className="text-center h-8"
              />
            </div>
          </div>
        )}

        <div className="flex justify-center gap-2">
          <Button
            size="sm"
            onClick={toggleTimer}
            disabled={timer.locked}
            title={timer.isRunning ? "Arrêter" : "Démarrer"}
          >
            {timer.isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={resetTimer}
            disabled={timer.locked || timer.isRunning}
            title="Reset"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="text-xs text-gray-500 text-center">
          ID: {timer.id.split('_')[1]}
        </div>
      </CardContent>
    </Card>
  );
};
