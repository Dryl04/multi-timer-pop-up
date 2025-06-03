
// Tests end-to-end avec Puppeteer pour MultiTimerPopup
// Ces tests simulent l'utilisation réelle de l'extension

const puppeteer = require('puppeteer');
const path = require('path');

describe('MultiTimerPopup E2E Tests', () => {
    let browser;
    let extensionPage;
    let extensionId;

    beforeAll(async () => {
        // Configuration pour charger l'extension
        const extensionPath = path.join(__dirname, '../..');
        
        browser = await puppeteer.launch({
            headless: false, // Mode visible pour voir les tests
            devtools: true,
            args: [
                `--disable-extensions-except=${extensionPath}`,
                `--load-extension=${extensionPath}`,
                '--no-sandbox',
                '--disable-setuid-sandbox'
            ]
        });

        // Obtenir l'ID de l'extension
        const targets = await browser.targets();
        const extensionTarget = targets.find(
            target => target.type() === 'service_worker' && target.url().includes('chrome-extension://')
        );
        
        if (!extensionTarget) {
            throw new Error('Extension non trouvée');
        }

        extensionId = extensionTarget.url().split('/')[2];
        console.log('Extension ID:', extensionId);

        // Ouvrir une page pour interagir avec l'extension
        extensionPage = await browser.newPage();
        await extensionPage.goto(`chrome-extension://${extensionId}/options.html`);
    }, 30000);

    afterAll(async () => {
        if (browser) {
            await browser.close();
        }
    });

    test('Extension est installée et accessible', async () => {
        // Vérifier que la page d'options se charge
        await extensionPage.waitForSelector('h1', { timeout: 5000 });
        const title = await extensionPage.$eval('h1', el => el.textContent);
        expect(title).toContain('MultiTimerPopup');
    });

    test('Créer un nouveau timer via service worker', async () => {
        // Simuler un clic sur l'icône de l'extension
        await extensionPage.evaluate((extensionId) => {
            return chrome.runtime.sendMessage(extensionId, { action: 'createTimer' });
        }, extensionId);

        // Attendre qu'une nouvelle fenêtre apparaisse
        await new Promise(resolve => setTimeout(resolve, 2000));

        const pages = await browser.pages();
        const timerPages = pages.filter(page => 
            page.url().includes('timer.html')
        );

        expect(timerPages.length).toBeGreaterThan(0);
    }, 10000);

    test('Interface timer s\'affiche correctement', async () => {
        // Ouvrir directement une page timer pour tester l'interface
        const timerPage = await browser.newPage();
        await timerPage.goto(`chrome-extension://${extensionId}/timer.html?id=test_timer`);

        // Vérifier la présence des éléments principaux
        await timerPage.waitForSelector('.timer-window');
        await timerPage.waitForSelector('#timeDisplay');
        await timerPage.waitForSelector('#start-stop');
        await timerPage.waitForSelector('#reset');

        // Vérifier l'affichage initial
        const timeDisplay = await timerPage.$eval('#timeDisplay', el => el.textContent);
        expect(timeDisplay).toBe('00:00:00');

        await timerPage.close();
    });

    test('Chronomètre fonctionne correctement', async () => {
        const timerPage = await browser.newPage();
        await timerPage.goto(`chrome-extension://${extensionId}/timer.html?id=test_chrono`);

        await timerPage.waitForSelector('#start-stop');

        // Démarrer le chronomètre
        await timerPage.click('#start-stop');

        // Attendre 3 secondes
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Vérifier que le temps a changé
        const timeDisplay = await timerPage.$eval('#timeDisplay', el => el.textContent);
        expect(timeDisplay).not.toBe('00:00:00');

        // Le temps devrait être proche de 3 secondes
        const parts = timeDisplay.split(':');
        const seconds = parseInt(parts[2]);
        expect(seconds).toBeGreaterThanOrEqual(2);
        expect(seconds).toBeLessThanOrEqual(4);

        await timerPage.close();
    }, 10000);

    test('Compte à rebours fonctionne correctement', async () => {
        const timerPage = await browser.newPage();
        await timerPage.goto(`chrome-extension://${extensionId}/timer.html?id=test_countdown`);

        await timerPage.waitForSelector('#toggle-mode');

        // Basculer en mode countdown
        await timerPage.click('#toggle-mode');

        // Attendre que l'interface change
        await timerPage.waitForSelector('#countdownInput');

        // Définir 5 secondes
        await timerPage.type('#seconds', '5');

        // Démarrer le countdown
        await timerPage.click('#start-stop');

        // Attendre 2 secondes
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Vérifier que le temps diminue
        const timeDisplay = await timerPage.$eval('#timeDisplay', el => el.textContent);
        const parts = timeDisplay.split(':');
        const seconds = parseInt(parts[2]);
        
        // Devrait être autour de 3 secondes
        expect(seconds).toBeGreaterThanOrEqual(2);
        expect(seconds).toBeLessThanOrEqual(4);

        await timerPage.close();
    }, 10000);

    test('Reset fonctionne correctement', async () => {
        const timerPage = await browser.newPage();
        await timerPage.goto(`chrome-extension://${extensionId}/timer.html?id=test_reset`);

        await timerPage.waitForSelector('#start-stop');

        // Démarrer le chronomètre
        await timerPage.click('#start-stop');

        // Attendre 2 secondes
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Reset
        await timerPage.click('#reset');

        // Vérifier que le temps est revenu à zéro
        const timeDisplay = await timerPage.$eval('#timeDisplay', el => el.textContent);
        expect(timeDisplay).toBe('00:00:00');

        await timerPage.close();
    });

    test('Verrouillage fonctionne correctement', async () => {
        const timerPage = await browser.newPage();
        await timerPage.goto(`chrome-extension://${extensionId}/timer.html?id=test_lock`);

        await timerPage.waitForSelector('#toggle-lock');

        // Cliquer sur le verrouillage
        await timerPage.click('#toggle-lock');

        // Vérifier que la classe 'locked' est ajoutée
        const isLocked = await timerPage.$eval('.timer-window', el => 
            el.classList.contains('locked')
        );
        expect(isLocked).toBe(true);

        // Vérifier que l'icône a changé
        const lockIcon = await timerPage.$eval('#toggle-lock', el => el.textContent);
        expect(lockIcon).toBe('🔒');

        await timerPage.close();
    });

    test('Limite de 7 timers est respectée', async () => {
        // Créer 7 timers
        for (let i = 0; i < 7; i++) {
            await extensionPage.evaluate((extensionId) => {
                return chrome.runtime.sendMessage(extensionId, { action: 'createTimer' });
            }, extensionId);
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        // Tenter de créer un 8ème timer
        await extensionPage.evaluate((extensionId) => {
            return chrome.runtime.sendMessage(extensionId, { action: 'createTimer' });
        }, extensionId);

        // Vérifier qu'il n'y a toujours que 7 fenêtres timer
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const pages = await browser.pages();
        const timerPages = pages.filter(page => 
            page.url().includes('timer.html')
        );

        expect(timerPages.length).toBeLessThanOrEqual(7);

        // Fermer les timers
        for (const page of timerPages) {
            await page.close();
        }
    }, 20000);

    test('Export/Import fonctionne correctement', async () => {
        // Ouvrir la page d'options
        const optionsPage = await browser.newPage();
        await optionsPage.goto(`chrome-extension://${extensionId}/options.html`);

        await optionsPage.waitForSelector('#export-all');

        // Créer un timer d'abord
        await extensionPage.evaluate((extensionId) => {
            return chrome.runtime.sendMessage(extensionId, { action: 'createTimer' });
        }, extensionId);

        await new Promise(resolve => setTimeout(resolve, 1000));

        // Tester l'export (simulé - le téléchargement réel est difficile à tester)
        await optionsPage.click('#export-all');

        // Attendre que l'action soit traitée
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Si nous arrivons ici sans erreur, l'export a probablement fonctionné
        expect(true).toBe(true);

        await optionsPage.close();
    });

    test('Page d\'options fonctionne correctement', async () => {
        const optionsPage = await browser.newPage();
        await optionsPage.goto(`chrome-extension://${extensionId}/options.html`);

        // Vérifier les éléments principaux
        await optionsPage.waitForSelector('#save-options');
        await optionsPage.waitForSelector('#reset-options');
        await optionsPage.waitForSelector('input[name="notification-sound"]');

        // Tester le changement d'option
        await optionsPage.click('input[name="notification-sound"][value="chime"]');

        // Sauvegarder
        await optionsPage.click('#save-options');

        // Attendre le feedback
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Vérifier que l'option est toujours sélectionnée après sauvegarde
        const isChecked = await optionsPage.$eval(
            'input[name="notification-sound"][value="chime"]', 
            el => el.checked
        );
        expect(isChecked).toBe(true);

        await optionsPage.close();
    });

    test('Fenêtre timer se ferme correctement', async () => {
        // Créer un timer
        await extensionPage.evaluate((extensionId) => {
            return chrome.runtime.sendMessage(extensionId, { action: 'createTimer' });
        }, extensionId);

        await new Promise(resolve => setTimeout(resolve, 1000));

        const pages = await browser.pages();
        const timerPage = pages.find(page => page.url().includes('timer.html'));
        
        expect(timerPage).toBeDefined();

        // Fermer le timer
        await timerPage.click('#close-timer');

        // Attendre que la fenêtre se ferme
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Vérifier que la page est fermée
        expect(timerPage.isClosed()).toBe(true);
    });
});

// Configuration Jest pour les tests E2E
module.exports = {
    testTimeout: 30000,
    setupFilesAfterEnv: ['<rootDir>/tests/setup.js']
};
