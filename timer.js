
// Script principal pour la fenêtre timer
class TimerWindow {
    constructor() {
        this.timerId = null;
        this.timerData = null;
        this.intervalId = null;
        this.isDragging = false;
        this.isResizing = false;
        this.dragOffset = { x: 0, y: 0 };
        this.audioContext = null;
        
        this.init();
    }

    async init() {
        // Extraire l'ID du timer depuis l'URL
        const urlParams = new URLSearchParams(window.location.search);
        this.timerId = urlParams.get('id');
        const isImport = urlParams.get('import') === 'true';

        if (!this.timerId) {
            console.error('ID de timer manquant');
            return;
        }

        // Charger les données du timer
        await this.loadTimerData();
        
        // Initialiser l'interface
        this.initializeUI();
        
        // Configurer les gestionnaires d'événements
        this.setupEventListeners();
        
        // Démarrer la mise à jour du timer
        this.startTimerUpdate();

        console.log(`Timer initialisé: ${this.timerId}`);
    }

    async loadTimerData() {
        try {
            const response = await chrome.runtime.sendMessage({
                action: 'getTimerData',
                timerId: this.timerId
            });

            if (response.success && response.timer) {
                this.timerData = response.timer;
                this.updateUI();
            } else {
                console.error('Impossible de charger les données du timer');
            }
        } catch (error) {
            console.error('Erreur chargement données timer:', error);
        }
    }

    initializeUI() {
        // Initialiser l'affichage en fonction du mode
        this.updateModeDisplay();
        
        // Appliquer l'état de verrouillage
        if (this.timerData?.locked) {
            this.toggleLock();
        }
    }

    setupEventListeners() {
        // Boutons de contrôle
        document.getElementById('start-stop').addEventListener('click', () => this.toggleTimer());
        document.getElementById('reset').addEventListener('click', () => this.resetTimer());
        document.getElementById('toggle-mode').addEventListener('click', () => this.toggleMode());
        document.getElementById('toggle-lock').addEventListener('click', () => this.toggleLock());
        document.getElementById('close-timer').addEventListener('click', () => this.closeTimer());
        document.getElementById('export').addEventListener('click', () => this.exportTimer());
        document.getElementById('import').addEventListener('click', () => this.importTimer());

        // Gestionnaire pour le fichier d'import
        document.getElementById('importFile').addEventListener('change', (e) => this.handleImportFile(e));

        // Gestionnaires pour le drag & drop de la fenêtre
        const header = document.getElementById('header');
        header.addEventListener('mousedown', (e) => this.startDrag(e));
        document.addEventListener('mousemove', (e) => this.onDrag(e));
        document.addEventListener('mouseup', () => this.stopDrag());

        // Gestionnaires pour le redimensionnement
        const resizeHandle = document.getElementById('resizeHandle');
        resizeHandle.addEventListener('mousedown', (e) => this.startResize(e));
        document.addEventListener('mousemove', (e) => this.onResize(e));
        document.addEventListener('mouseup', () => this.stopResize());

        // Gestionnaires pour les champs de saisie du countdown
        const timeInputs = ['hours', 'minutes', 'seconds'];
        timeInputs.forEach(id => {
            const input = document.getElementById(id);
            input.addEventListener('change', () => this.updateCountdownDuration());
            input.addEventListener('input', () => this.validateTimeInput(input));
        });

        // Empêcher la sélection de texte lors du drag
        document.addEventListener('selectstart', (e) => {
            if (this.isDragging || this.isResizing) {
                e.preventDefault();
            }
        });
    }

    async toggleTimer() {
        if (!this.timerData) return;

        if (this.timerData.isRunning) {
            // Arrêter le timer
            await this.stopTimer();
        } else {
            // Démarrer le timer
            await this.startTimer();
        }
    }

    async startTimer() {
        if (this.timerData.mode === 'countdown') {
            // Pour le countdown, s'assurer qu'il y a du temps restant
            if (this.timerData.remainingTime <= 0) {
                this.updateCountdownDuration();
                if (this.timerData.remainingTime <= 0) {
                    alert('Veuillez définir une durée pour le compte à rebours');
                    return;
                }
            }
        }

        this.timerData.isRunning = true;
        this.timerData.startTimestamp = Date.now();
        this.timerData.lastUpdateTimestamp = Date.now();

        await this.updateTimerData();
        this.updateStartStopButton();
    }

    async stopTimer() {
        if (this.timerData.mode === 'chronometre') {
            // Mettre à jour le temps écoulé
            const now = Date.now();
            const elapsed = now - this.timerData.startTimestamp;
            this.timerData.elapsedTime += elapsed;
        } else if (this.timerData.mode === 'countdown') {
            // Mettre à jour le temps restant
            const now = Date.now();
            const elapsed = now - this.timerData.startTimestamp;
            this.timerData.remainingTime = Math.max(0, this.timerData.remainingTime - elapsed);
        }

        this.timerData.isRunning = false;
        this.timerData.startTimestamp = null;
        this.timerData.lastUpdateTimestamp = Date.now();

        await this.updateTimerData();
        this.updateStartStopButton();
    }

    async resetTimer() {
        this.timerData.isRunning = false;
        this.timerData.startTimestamp = null;
        this.timerData.elapsedTime = 0;
        
        if (this.timerData.mode === 'countdown') {
            this.timerData.remainingTime = this.timerData.initialDuration;
        }

        await this.updateTimerData();
        this.updateDisplay();
        this.updateStartStopButton();
    }

    async toggleMode() {
        await this.stopTimer();
        
        this.timerData.mode = this.timerData.mode === 'chronometre' ? 'countdown' : 'chronometre';
        this.timerData.elapsedTime = 0;
        this.timerData.remainingTime = 0;
        
        await this.updateTimerData();
        this.updateModeDisplay();
        this.updateDisplay();
    }

    toggleLock() {
        this.timerData.locked = !this.timerData.locked;
        
        const timerWindow = document.getElementById('timerWindow');
        const lockButton = document.getElementById('toggle-lock');
        
        if (this.timerData.locked) {
            timerWindow.classList.add('locked');
            lockButton.textContent = '🔒';
            lockButton.title = 'Déverrouiller';
        } else {
            timerWindow.classList.remove('locked');
            lockButton.textContent = '🔓';
            lockButton.title = 'Verrouiller';
        }
        
        this.updateTimerData();
    }

    async closeTimer() {
        try {
            await chrome.runtime.sendMessage({
                action: 'removeTimer',
                timerId: this.timerId
            });
            window.close();
        } catch (error) {
            console.error('Erreur fermeture timer:', error);
        }
    }

    async exportTimer() {
        try {
            const response = await chrome.runtime.sendMessage({
                action: 'exportTimers'
            });

            if (response.success) {
                const dataStr = JSON.stringify(response.data, null, 2);
                const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
                
                const exportFileDefaultName = `multitimer_export_${new Date().toISOString().slice(0,10)}.json`;
                
                const linkElement = document.createElement('a');
                linkElement.setAttribute('href', dataUri);
                linkElement.setAttribute('download', exportFileDefaultName);
                linkElement.click();
            }
        } catch (error) {
            console.error('Erreur export:', error);
            alert('Erreur lors de l\'export');
        }
    }

    importTimer() {
        document.getElementById('importFile').click();
    }

    async handleImportFile(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            const text = await file.text();
            const importData = JSON.parse(text);
            
            const response = await chrome.runtime.sendMessage({
                action: 'importTimers',
                data: importData
            });

            if (response.success) {
                alert('Import réussi!');
                window.close(); // Fermer cette fenêtre car de nouveaux timers vont être créés
            } else {
                alert(`Erreur import: ${response.error}`);
            }
        } catch (error) {
            console.error('Erreur import fichier:', error);
            alert('Fichier d\'import invalide');
        }
    }

    startTimerUpdate() {
        // Mettre à jour le timer toutes les 1000ms
        this.intervalId = setInterval(() => {
            this.updateDisplay();
            this.checkTimerExpired();
        }, 1000);
    }

    updateDisplay() {
        if (!this.timerData) return;

        let displayTime;
        
        if (this.timerData.mode === 'chronometre') {
            let totalElapsed = this.timerData.elapsedTime;
            if (this.timerData.isRunning && this.timerData.startTimestamp) {
                totalElapsed += Date.now() - this.timerData.startTimestamp;
            }
            displayTime = this.formatTime(Math.floor(totalElapsed / 1000));
        } else {
            let totalRemaining = this.timerData.remainingTime;
            if (this.timerData.isRunning && this.timerData.startTimestamp) {
                const elapsed = Date.now() - this.timerData.startTimestamp;
                totalRemaining = Math.max(0, this.timerData.remainingTime - elapsed);
            }
            displayTime = this.formatTime(Math.floor(totalRemaining / 1000));
        }

        document.getElementById('timeDisplay').textContent = displayTime;
    }

    checkTimerExpired() {
        if (this.timerData.mode === 'countdown' && this.timerData.isRunning) {
            let totalRemaining = this.timerData.remainingTime;
            if (this.timerData.startTimestamp) {
                const elapsed = Date.now() - this.timerData.startTimestamp;
                totalRemaining = Math.max(0, this.timerData.remainingTime - elapsed);
            }

            if (totalRemaining <= 0) {
                this.onTimerExpired();
            }
        }
    }

    async onTimerExpired() {
        // Arrêter le timer
        await this.stopTimer();
        
        // Marquer comme expiré
        document.getElementById('timerWindow').classList.add('expired');
        
        // Jouer le son
        this.playNotificationSound();
        
        // Envoyer notification au service worker
        try {
            await chrome.runtime.sendMessage({
                action: 'timerExpired',
                timerId: this.timerId
            });
        } catch (error) {
            console.error('Erreur notification expiration:', error);
        }
    }

    playNotificationSound() {
        try {
            // Créer un son simple avec Web Audio API
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
            gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.5);
        } catch (error) {
            console.error('Erreur lecture son:', error);
        }
    }

    updateModeDisplay() {
        const timerWindow = document.getElementById('timerWindow');
        const countdownInput = document.getElementById('countdownInput');
        
        // Supprimer les classes de mode existantes
        timerWindow.classList.remove('chronometre-mode', 'countdown-mode');
        
        if (this.timerData.mode === 'countdown') {
            timerWindow.classList.add('countdown-mode');
            countdownInput.style.display = 'flex';
        } else {
            timerWindow.classList.add('chronometre-mode');
            countdownInput.style.display = 'none';
        }
    }

    updateStartStopButton() {
        const button = document.getElementById('start-stop');
        if (this.timerData.isRunning) {
            button.textContent = '⏸️';
            button.title = 'Arrêter';
        } else {
            button.textContent = '▶️';
            button.title = 'Démarrer';
        }
    }

    updateCountdownDuration() {
        const hours = parseInt(document.getElementById('hours').value) || 0;
        const minutes = parseInt(document.getElementById('minutes').value) || 0;
        const seconds = parseInt(document.getElementById('seconds').value) || 0;
        
        const totalSeconds = hours * 3600 + minutes * 60 + seconds;
        this.timerData.initialDuration = totalSeconds * 1000; // convertir en millisecondes
        this.timerData.remainingTime = this.timerData.initialDuration;
        
        this.updateTimerData();
    }

    validateTimeInput(input) {
        const value = parseInt(input.value);
        const max = parseInt(input.max);
        const min = parseInt(input.min);
        
        if (value > max) {
            input.value = max;
        } else if (value < min) {
            input.value = min;
        }
    }

    formatTime(totalSeconds) {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    async updateTimerData() {
        try {
            await chrome.runtime.sendMessage({
                action: 'updateTimer',
                timerId: this.timerId,
                updates: this.timerData
            });
        } catch (error) {
            console.error('Erreur mise à jour timer:', error);
        }
    }

    updateUI() {
        if (!this.timerData) return;
        
        this.updateModeDisplay();
        this.updateDisplay();
        this.updateStartStopButton();
        
        // Mettre à jour les champs de saisie du countdown
        if (this.timerData.mode === 'countdown' && this.timerData.initialDuration > 0) {
            const totalSeconds = Math.floor(this.timerData.initialDuration / 1000);
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;
            
            document.getElementById('hours').value = hours;
            document.getElementById('minutes').value = minutes;
            document.getElementById('seconds').value = seconds;
        }
    }

    // Gestionnaires de drag & drop
    startDrag(e) {
        if (this.timerData?.locked) return;
        
        this.isDragging = true;
        this.dragOffset = {
            x: e.clientX - window.screenX,
            y: e.clientY - window.screenY
        };
        e.preventDefault();
    }

    onDrag(e) {
        if (!this.isDragging || this.timerData?.locked) return;
        
        const newX = e.screenX - this.dragOffset.x;
        const newY = e.screenY - this.dragOffset.y;
        
        // Maintenir la fenêtre dans les limites de l'écran
        const maxX = screen.width - window.outerWidth;
        const maxY = screen.height - window.outerHeight;
        
        const clampedX = Math.max(0, Math.min(newX, maxX));
        const clampedY = Math.max(0, Math.min(newY, maxY));
        
        window.moveTo(clampedX, clampedY);
        
        // Mettre à jour la position dans les données
        if (this.timerData) {
            this.timerData.position = { left: clampedX, top: clampedY };
            this.updateTimerData();
        }
    }

    stopDrag() {
        this.isDragging = false;
    }

    // Gestionnaires de redimensionnement
    startResize(e) {
        if (this.timerData?.locked) return;
        
        this.isResizing = true;
        this.resizeStartX = e.clientX;
        this.resizeStartY = e.clientY;
        this.resizeStartWidth = window.outerWidth;
        this.resizeStartHeight = window.outerHeight;
        e.preventDefault();
    }

    onResize(e) {
        if (!this.isResizing || this.timerData?.locked) return;
        
        const deltaX = e.clientX - this.resizeStartX;
        const deltaY = e.clientY - this.resizeStartY;
        
        const newWidth = Math.max(180, this.resizeStartWidth + deltaX);
        const newHeight = Math.max(120, this.resizeStartHeight + deltaY);
        
        window.resizeTo(newWidth, newHeight);
        
        // Mettre à jour la taille dans les données
        if (this.timerData) {
            this.timerData.size = { width: newWidth, height: newHeight };
            this.updateTimerData();
        }
    }

    stopResize() {
        this.isResizing = false;
    }
}

// Initialiser la fenêtre timer quand le DOM est chargé
document.addEventListener('DOMContentLoaded', () => {
    new TimerWindow();
});
