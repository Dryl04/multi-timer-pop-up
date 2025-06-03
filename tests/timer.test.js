
// Tests unitaires pour MultiTimerPopup
// Utilise Jest pour les tests

/**
 * Tests pour les fonctions utilitaires de timer
 */

// Mock de l'API Chrome pour les tests
global.chrome = {
    storage: {
        local: {
            get: jest.fn(),
            set: jest.fn(),
            clear: jest.fn()
        }
    },
    runtime: {
        sendMessage: jest.fn(),
        onMessage: {
            addListener: jest.fn()
        }
    },
    notifications: {
        create: jest.fn()
    },
    windows: {
        create: jest.fn(),
        remove: jest.fn(),
        onRemoved: {
            addListener: jest.fn()
        }
    }
};

// Fonctions utilitaires à tester
const TimerUtils = {
    /**
     * Calcule le temps restant pour un countdown
     */
    calculateRemainingTime(initialDuration, startTimestamp, nowTimestamp) {
        const elapsed = nowTimestamp - startTimestamp;
        return Math.max(0, initialDuration - elapsed);
    },

    /**
     * Calcule le temps écoulé pour un chronomètre
     */
    calculateElapsedTime(startTimestamp, nowTimestamp, previousElapsed = 0) {
        const sessionElapsed = nowTimestamp - startTimestamp;
        return previousElapsed + sessionElapsed;
    },

    /**
     * Formate le temps en hh:mm:ss
     */
    formatTime(totalSeconds) {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    },

    /**
     * Parse le temps formaté en secondes
     */
    parseTime(timeString) {
        const parts = timeString.split(':').map(Number);
        if (parts.length !== 3) return 0;
        
        const [hours, minutes, seconds] = parts;
        return hours * 3600 + minutes * 60 + seconds;
    },

    /**
     * Valide les données d'un timer
     */
    validateTimerData(timerData) {
        const requiredFields = ['id', 'mode', 'position', 'size'];
        return requiredFields.every(field => timerData.hasOwnProperty(field)) &&
               ['chronometre', 'countdown'].includes(timerData.mode) &&
               typeof timerData.position === 'object' &&
               typeof timerData.size === 'object' &&
               typeof timerData.position.left === 'number' &&
               typeof timerData.position.top === 'number' &&
               typeof timerData.size.width === 'number' &&
               typeof timerData.size.height === 'number';
    },

    /**
     * Génère les données JSON pour l'export
     */
    buildExportJSON(timersList) {
        return {
            timers: timersList.map(timer => ({
                id: timer.id,
                mode: timer.mode,
                initialDuration: timer.initialDuration || 0,
                elapsedTime: timer.elapsedTime || 0,
                remainingTime: timer.remainingTime || 0,
                position: timer.position,
                size: timer.size,
                locked: timer.locked || false
            }))
        };
    },

    /**
     * Valide le JSON d'import
     */
    validateImportJSON(rawJSON) {
        try {
            const data = typeof rawJSON === 'string' ? JSON.parse(rawJSON) : rawJSON;
            
            if (!data || typeof data !== 'object') {
                return { valid: false, error: 'Format JSON invalide' };
            }
            
            if (!Array.isArray(data.timers)) {
                return { valid: false, error: 'Propriété "timers" manquante ou invalide' };
            }
            
            for (let i = 0; i < data.timers.length; i++) {
                if (!this.validateTimerData(data.timers[i])) {
                    return { valid: false, error: `Timer ${i + 1} invalide` };
                }
            }
            
            if (data.timers.length > 7) {
                return { valid: false, error: 'Trop de timers (maximum 7)' };
            }
            
            return { valid: true, data };
        } catch (error) {
            return { valid: false, error: 'JSON mal formé' };
        }
    }
};

describe('TimerUtils', () => {
    describe('calculateRemainingTime', () => {
        test('calcule correctement le temps restant', () => {
            const initialDuration = 60000; // 1 minute en ms
            const startTime = 1000;
            const currentTime = 31000; // 30 secondes plus tard
            
            const remaining = TimerUtils.calculateRemainingTime(initialDuration, startTime, currentTime);
            expect(remaining).toBe(30000); // 30 secondes restantes
        });

        test('retourne 0 quand le temps est écoulé', () => {
            const initialDuration = 30000; // 30 secondes
            const startTime = 1000;
            const currentTime = 50000; // 49 secondes plus tard
            
            const remaining = TimerUtils.calculateRemainingTime(initialDuration, startTime, currentTime);
            expect(remaining).toBe(0);
        });

        test('gère les valeurs négatives', () => {
            const initialDuration = 10000;
            const startTime = 1000;
            const currentTime = 20000; // Dépassement
            
            const remaining = TimerUtils.calculateRemainingTime(initialDuration, startTime, currentTime);
            expect(remaining).toBe(0);
        });
    });

    describe('calculateElapsedTime', () => {
        test('calcule le temps écoulé avec temps précédent', () => {
            const startTime = 1000;
            const currentTime = 6000;
            const previousElapsed = 10000;
            
            const elapsed = TimerUtils.calculateElapsedTime(startTime, currentTime, previousElapsed);
            expect(elapsed).toBe(15000); // 10000 + 5000
        });

        test('calcule le temps écoulé sans temps précédent', () => {
            const startTime = 2000;
            const currentTime = 7000;
            
            const elapsed = TimerUtils.calculateElapsedTime(startTime, currentTime);
            expect(elapsed).toBe(5000);
        });
    });

    describe('formatTime', () => {
        test('formate les secondes en hh:mm:ss', () => {
            expect(TimerUtils.formatTime(0)).toBe('00:00:00');
            expect(TimerUtils.formatTime(59)).toBe('00:00:59');
            expect(TimerUtils.formatTime(60)).toBe('00:01:00');
            expect(TimerUtils.formatTime(3661)).toBe('01:01:01');
            expect(TimerUtils.formatTime(86399)).toBe('23:59:59');
        });

        test('gère les grandes valeurs', () => {
            expect(TimerUtils.formatTime(90061)).toBe('25:01:01'); // Plus de 24h
        });
    });

    describe('parseTime', () => {
        test('parse le format hh:mm:ss en secondes', () => {
            expect(TimerUtils.parseTime('00:00:00')).toBe(0);
            expect(TimerUtils.parseTime('00:00:59')).toBe(59);
            expect(TimerUtils.parseTime('00:01:00')).toBe(60);
            expect(TimerUtils.parseTime('01:01:01')).toBe(3661);
            expect(TimerUtils.parseTime('23:59:59')).toBe(86399);
        });

        test('gère les formats invalides', () => {
            expect(TimerUtils.parseTime('invalid')).toBe(0);
            expect(TimerUtils.parseTime('1:2')).toBe(0);
            expect(TimerUtils.parseTime('1:2:3:4')).toBe(0);
        });
    });

    describe('validateTimerData', () => {
        test('valide les données correctes', () => {
            const validTimer = {
                id: 'timer_123',
                mode: 'chronometre',
                position: { left: 100, top: 100 },
                size: { width: 200, height: 80 }
            };
            
            expect(TimerUtils.validateTimerData(validTimer)).toBe(true);
        });

        test('rejette les données incomplètes', () => {
            const invalidTimer = {
                id: 'timer_123',
                mode: 'chronometre'
                // position et size manquants
            };
            
            expect(TimerUtils.validateTimerData(invalidTimer)).toBe(false);
        });

        test('rejette les modes invalides', () => {
            const invalidTimer = {
                id: 'timer_123',
                mode: 'invalid_mode',
                position: { left: 100, top: 100 },
                size: { width: 200, height: 80 }
            };
            
            expect(TimerUtils.validateTimerData(invalidTimer)).toBe(false);
        });

        test('rejette les positions/tailles invalides', () => {
            const invalidTimer = {
                id: 'timer_123',
                mode: 'chronometre',
                position: { left: 'invalid', top: 100 },
                size: { width: 200, height: 80 }
            };
            
            expect(TimerUtils.validateTimerData(invalidTimer)).toBe(false);
        });
    });

    describe('buildExportJSON', () => {
        test('génère un JSON d\'export correct', () => {
            const timers = [
                {
                    id: 'timer_1',
                    mode: 'chronometre',
                    elapsedTime: 5000,
                    position: { left: 100, top: 100 },
                    size: { width: 200, height: 80 },
                    locked: false
                },
                {
                    id: 'timer_2',
                    mode: 'countdown',
                    initialDuration: 60000,
                    remainingTime: 30000,
                    position: { left: 200, top: 200 },
                    size: { width: 220, height: 90 },
                    locked: true
                }
            ];
            
            const exportJSON = TimerUtils.buildExportJSON(timers);
            
            expect(exportJSON).toHaveProperty('timers');
            expect(exportJSON.timers).toHaveLength(2);
            expect(exportJSON.timers[0].id).toBe('timer_1');
            expect(exportJSON.timers[1].mode).toBe('countdown');
        });

        test('gère les valeurs par défaut', () => {
            const timers = [
                {
                    id: 'timer_1',
                    mode: 'chronometre',
                    position: { left: 100, top: 100 },
                    size: { width: 200, height: 80 }
                }
            ];
            
            const exportJSON = TimerUtils.buildExportJSON(timers);
            
            expect(exportJSON.timers[0].elapsedTime).toBe(0);
            expect(exportJSON.timers[0].locked).toBe(false);
        });
    });

    describe('validateImportJSON', () => {
        test('valide un JSON correct', () => {
            const validJSON = {
                timers: [
                    {
                        id: 'timer_1',
                        mode: 'chronometre',
                        position: { left: 100, top: 100 },
                        size: { width: 200, height: 80 }
                    }
                ]
            };
            
            const result = TimerUtils.validateImportJSON(validJSON);
            expect(result.valid).toBe(true);
            expect(result.data).toEqual(validJSON);
        });

        test('rejette un JSON invalide', () => {
            const invalidJSON = {
                timers: 'not an array'
            };
            
            const result = TimerUtils.validateImportJSON(invalidJSON);
            expect(result.valid).toBe(false);
            expect(result.error).toContain('timers');
        });

        test('rejette plus de 7 timers', () => {
            const tooManyTimers = {
                timers: Array(8).fill(0).map((_, i) => ({
                    id: `timer_${i}`,
                    mode: 'chronometre',
                    position: { left: 100, top: 100 },
                    size: { width: 200, height: 80 }
                }))
            };
            
            const result = TimerUtils.validateImportJSON(tooManyTimers);
            expect(result.valid).toBe(false);
            expect(result.error).toContain('maximum 7');
        });

        test('gère les chaînes JSON', () => {
            const jsonString = '{"timers": [{"id": "timer_1", "mode": "chronometre", "position": {"left": 100, "top": 100}, "size": {"width": 200, "height": 80}}]}';
            
            const result = TimerUtils.validateImportJSON(jsonString);
            expect(result.valid).toBe(true);
        });

        test('gère les JSON mal formés', () => {
            const malformedJSON = '{"timers": [invalid}';
            
            const result = TimerUtils.validateImportJSON(malformedJSON);
            expect(result.valid).toBe(false);
            expect(result.error).toContain('mal formé');
        });
    });
});

// Tests d'intégration pour les interactions entre composants
describe('Integration Tests', () => {
    test('cycle complet de timer chronomètre', () => {
        const startTime = 1000;
        const endTime = 6000;
        
        // Calculer le temps écoulé
        const elapsed = TimerUtils.calculateElapsedTime(startTime, endTime);
        expect(elapsed).toBe(5000);
        
        // Formater le temps
        const formatted = TimerUtils.formatTime(Math.floor(elapsed / 1000));
        expect(formatted).toBe('00:00:05');
        
        // Parser le temps
        const parsed = TimerUtils.parseTime(formatted);
        expect(parsed).toBe(5);
    });

    test('cycle complet de timer countdown', () => {
        const initialDuration = 60000; // 1 minute
        const startTime = 1000;
        const currentTime = 31000; // 30 secondes plus tard
        
        // Calculer le temps restant
        const remaining = TimerUtils.calculateRemainingTime(initialDuration, startTime, currentTime);
        expect(remaining).toBe(30000);
        
        // Formater le temps restant
        const formatted = TimerUtils.formatTime(Math.floor(remaining / 1000));
        expect(formatted).toBe('00:00:30');
    });

    test('export puis import de timers', () => {
        const originalTimers = [
            {
                id: 'timer_1',
                mode: 'chronometre',
                elapsedTime: 5000,
                position: { left: 100, top: 100 },
                size: { width: 200, height: 80 },
                locked: false
            }
        ];
        
        // Export
        const exportData = TimerUtils.buildExportJSON(originalTimers);
        
        // Validation import
        const validation = TimerUtils.validateImportJSON(exportData);
        expect(validation.valid).toBe(true);
        
        // Vérifier que les données sont préservées
        expect(validation.data.timers[0].id).toBe('timer_1');
        expect(validation.data.timers[0].elapsedTime).toBe(5000);
    });
});
