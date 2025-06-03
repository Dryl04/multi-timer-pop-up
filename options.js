
// Script pour la page d'options
class OptionsManager {
    constructor() {
        this.defaultOptions = {
            notificationSound: 'beep',
            autoFocus: true,
            persistentNotifications: true,
            soundEnabled: true,
            defaultTheme: 'light',
            windowOpacity: 100
        };
        
        this.init();
    }

    async init() {
        // Charger les options existantes
        await this.loadOptions();
        
        // Configurer les gestionnaires d'événements
        this.setupEventListeners();
        
        console.log('Options manager initialisé');
    }

    async loadOptions() {
        try {
            const result = await chrome.storage.local.get(['options']);
            const savedOptions = result.options || {};
            
            // Fusionner avec les options par défaut
            this.options = { ...this.defaultOptions, ...savedOptions };
            
            // Appliquer les options à l'interface
            this.applyOptionsToUI();
        } catch (error) {
            console.error('Erreur chargement options:', error);
            this.options = { ...this.defaultOptions };
        }
    }

    applyOptionsToUI() {
        // Sons de notification
        const soundRadio = document.querySelector(`input[name="notification-sound"][value="${this.options.notificationSound}"]`);
        if (soundRadio) {
            soundRadio.checked = true;
        }

        // Comportements
        document.getElementById('auto-focus').checked = this.options.autoFocus;
        document.getElementById('persistent-notifications').checked = this.options.persistentNotifications;
        document.getElementById('sound-enabled').checked = this.options.soundEnabled;

        // Interface
        document.getElementById('default-theme').value = this.options.defaultTheme;
        document.getElementById('window-opacity').value = this.options.windowOpacity;
        document.getElementById('opacity-value').textContent = `${this.options.windowOpacity}%`;
    }

    setupEventListeners() {
        // Sons de notification
        document.querySelectorAll('input[name="notification-sound"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.options.notificationSound = e.target.value;
                }
            });
        });

        // Boutons de prévisualisation des sons
        document.querySelectorAll('.preview-sound').forEach(button => {
            button.addEventListener('click', (e) => {
                const soundType = e.target.dataset.sound;
                this.previewSound(soundType);
            });
        });

        // Comportements
        document.getElementById('auto-focus').addEventListener('change', (e) => {
            this.options.autoFocus = e.target.checked;
        });

        document.getElementById('persistent-notifications').addEventListener('change', (e) => {
            this.options.persistentNotifications = e.target.checked;
        });

        document.getElementById('sound-enabled').addEventListener('change', (e) => {
            this.options.soundEnabled = e.target.checked;
        });

        // Interface
        document.getElementById('default-theme').addEventListener('change', (e) => {
            this.options.defaultTheme = e.target.value;
        });

        document.getElementById('window-opacity').addEventListener('input', (e) => {
            this.options.windowOpacity = parseInt(e.target.value);
            document.getElementById('opacity-value').textContent = `${this.options.windowOpacity}%`;
        });

        // Actions de gestion des données
        document.getElementById('export-all').addEventListener('click', () => this.exportAllTimers());
        document.getElementById('import-timers').addEventListener('click', () => this.importTimers());
        document.getElementById('clear-data').addEventListener('click', () => this.clearAllData());

        // Gestionnaire pour le fichier d'import
        document.getElementById('import-file').addEventListener('change', (e) => this.handleImportFile(e));

        // Boutons de sauvegarde et reset
        document.getElementById('save-options').addEventListener('click', () => this.saveOptions());
        document.getElementById('reset-options').addEventListener('click', () => this.resetOptions());

        // Raccourcis clavier
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
    }

    previewSound(soundType) {
        try {
            // Créer un son de prévisualisation simple avec Web Audio API
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            // Différentes fréquences pour différents sons
            const frequencies = {
                'beep': 800,
                'chime': [523, 659, 784], // Do, Mi, Sol
                'bell': 1000
            };
            
            if (soundType === 'chime') {
                // Jouer les 3 notes en séquence
                frequencies[soundType].forEach((freq, index) => {
                    const osc = audioContext.createOscillator();
                    const gain = audioContext.createGain();
                    
                    osc.connect(gain);
                    gain.connect(audioContext.destination);
                    
                    osc.frequency.setValueAtTime(freq, audioContext.currentTime + index * 0.2);
                    gain.gain.setValueAtTime(0.3, audioContext.currentTime + index * 0.2);
                    gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + index * 0.2 + 0.3);
                    
                    osc.start(audioContext.currentTime + index * 0.2);
                    osc.stop(audioContext.currentTime + index * 0.2 + 0.3);
                });
            } else {
                oscillator.frequency.setValueAtTime(frequencies[soundType], audioContext.currentTime);
                gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
                
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.5);
            }
        } catch (error) {
            console.error('Erreur prévisualisation son:', error);
            alert('Impossible de jouer le son de prévisualisation');
        }
    }

    async exportAllTimers() {
        try {
            const response = await chrome.runtime.sendMessage({
                action: 'exportTimers'
            });

            if (response.success) {
                // Ajouter les options à l'export
                const exportData = {
                    ...response.data,
                    options: this.options,
                    exportDate: new Date().toISOString(),
                    version: '1.0.0'
                };

                const dataStr = JSON.stringify(exportData, null, 2);
                const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
                
                const exportFileDefaultName = `multitimer_complete_export_${new Date().toISOString().slice(0,10)}.json`;
                
                const linkElement = document.createElement('a');
                linkElement.setAttribute('href', dataUri);
                linkElement.setAttribute('download', exportFileDefaultName);
                linkElement.click();
                
                this.showFeedback('Export réussi!', 'success');
            } else {
                this.showFeedback('Erreur lors de l\'export', 'error');
            }
        } catch (error) {
            console.error('Erreur export:', error);
            this.showFeedback('Erreur lors de l\'export', 'error');
        }
    }

    importTimers() {
        document.getElementById('import-file').click();
    }

    async handleImportFile(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            const text = await file.text();
            const importData = JSON.parse(text);
            
            // Valider la structure
            if (!importData.timers || !Array.isArray(importData.timers)) {
                throw new Error('Structure de fichier invalide');
            }
            
            // Importer les timers
            const response = await chrome.runtime.sendMessage({
                action: 'importTimers',
                data: { timers: importData.timers }
            });

            if (response.success) {
                // Importer les options si disponibles
                if (importData.options) {
                    this.options = { ...this.defaultOptions, ...importData.options };
                    this.applyOptionsToUI();
                    await this.saveOptions(false); // Sauver sans message
                }
                
                this.showFeedback('Import réussi!', 'success');
            } else {
                this.showFeedback(`Erreur import: ${response.error}`, 'error');
            }
        } catch (error) {
            console.error('Erreur import fichier:', error);
            this.showFeedback('Fichier d\'import invalide', 'error');
        }
        
        // Reset du champ de fichier
        event.target.value = '';
    }

    async clearAllData() {
        if (confirm('Êtes-vous sûr de vouloir effacer toutes les données? Cette action est irréversible.')) {
            try {
                // Effacer les timers
                const timers = await chrome.storage.local.get(['timers']);
                if (timers.timers) {
                    for (const timer of timers.timers) {
                        await chrome.runtime.sendMessage({
                            action: 'removeTimer',
                            timerId: timer.id
                        });
                    }
                }
                
                // Effacer le storage
                await chrome.storage.local.clear();
                
                // Réinitialiser les options
                this.options = { ...this.defaultOptions };
                this.applyOptionsToUI();
                
                this.showFeedback('Toutes les données ont été effacées', 'success');
            } catch (error) {
                console.error('Erreur effacement données:', error);
                this.showFeedback('Erreur lors de l\'effacement', 'error');
            }
        }
    }

    async saveOptions(showFeedback = true) {
        try {
            await chrome.storage.local.set({ options: this.options });
            
            if (showFeedback) {
                this.showFeedback('Options sauvegardées!', 'success');
            }
        } catch (error) {
            console.error('Erreur sauvegarde options:', error);
            this.showFeedback('Erreur lors de la sauvegarde', 'error');
        }
    }

    async resetOptions() {
        if (confirm('Réinitialiser toutes les options aux valeurs par défaut?')) {
            this.options = { ...this.defaultOptions };
            this.applyOptionsToUI();
            await this.saveOptions();
        }
    }

    handleKeyboardShortcuts(e) {
        // Raccourci pour sauvegarder (Ctrl+S)
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            this.saveOptions();
        }
        
        // Raccourci pour exporter (Ctrl+E)
        if (e.ctrlKey && e.key === 'e') {
            e.preventDefault();
            this.exportAllTimers();
        }
        
        // Raccourci pour importer (Ctrl+I)
        if (e.ctrlKey && e.key === 'i') {
            e.preventDefault();
            this.importTimers();
        }
    }

    showFeedback(message, type = 'info') {
        // Créer un élément de feedback temporaire
        const feedback = document.createElement('div');
        feedback.className = `feedback feedback-${type}`;
        feedback.textContent = message;
        
        // Styles inline pour le feedback
        Object.assign(feedback.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '12px 20px',
            borderRadius: '6px',
            color: 'white',
            fontWeight: 'bold',
            zIndex: '1000',
            animation: 'slideInRight 0.3s ease-out',
            backgroundColor: type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8'
        });
        
        document.body.appendChild(feedback);
        
        // Supprimer après 3 secondes
        setTimeout(() => {
            feedback.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => {
                if (feedback.parentNode) {
                    feedback.parentNode.removeChild(feedback);
                }
            }, 300);
        }, 3000);
    }
}

// Ajouter les animations CSS pour le feedback
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Initialiser le gestionnaire d'options quand le DOM est chargé
document.addEventListener('DOMContentLoaded', () => {
    new OptionsManager();
});
