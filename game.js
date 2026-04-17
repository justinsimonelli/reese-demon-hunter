// Game State
const gameState = {
    score: 0,
    demonsDefeated: 0,
    totalDemons: 10,
    timeRemaining: 60,
    timerInterval: null,
    demonMoveInterval: null,
    // Speed/difficulty multiplier (increases with "FASTER!" button)
    speedMultiplier: 1,
    danceHitWindow: 2000, // ms to tap a dance target
    // Dance mode state
    gameMode: 'demon', // 'demon', 'dance', 'soda', or 'runner'
    danceTargets: [],
    currentTargetIndex: 0,
    activationOrder: [], // Random order to light up targets
    danceBPM: 160,
    beatInterval: null,
    combo: 0,
    maxCombo: 0,
    danceScore: 0,
    totalBeats: 20,
    // Soda POP! state
    sodaLives: 3,
    sodaScore: 0,
    sodaBubblesPopped: 0,
    sodaTotalBubbles: 15,
    sodaBubbleInterval: null,
    sodaGrowDuration: 5000, // ms for bubble to fully grow (generous for kids!)
    // Runner mode state
    runnerScore: 0,
    runnerDistance: 0,
    runnerSpeed: 5,
    runnerJumping: false,
    runnerFloating: false,
    runnerGameLoop: null,
    runnerObstacles: [],
    runnerCollectibles: [],
    runnerStarted: false,
    runnerLives: 10,
    runnerStarsNeeded: 25,
    runnerHardMode: false
};

// DOM Elements
const startScreen = document.getElementById('start-screen');
const modeScreen = document.getElementById('mode-screen');
const gameScreen = document.getElementById('game-screen');
const winScreen = document.getElementById('win-screen');
const startButton = document.getElementById('start-button');
const demonModeBtn = document.getElementById('demon-mode-btn');
const danceModeBtn = document.getElementById('dance-mode-btn');
const sodaModeBtn = document.getElementById('soda-mode-btn');
const runnerModeBtn = document.getElementById('runner-mode-btn');
const demonContainer = document.getElementById('demon-container');
const scoreDisplay = document.getElementById('score-display');
const timerDisplay = document.getElementById('timer-display');
const heroAction = document.getElementById('hero-action');
const danceCombo = document.getElementById('dance-combo');
const winMessage = document.getElementById('win-message');
const backgroundMusic = document.getElementById('background-music');
const danceMusic = document.getElementById('dance-music');
const sodaMusic = document.getElementById('soda-music');
const runnerMusic = document.getElementById('runner-music');
const backButton = document.getElementById('back-button');

// Check if today is her birthday (April 16)
function isBirthday() {
    const today = new Date();
    return today.getMonth() === 3 && today.getDate() === 16; // Month is 0-indexed
}

function getWinMessage() {
    if (isBirthday()) {
        return "Happy Birthday kiddo!";
    }
    const messages = [
        "You're amazing!",
        "Great job!",
        "You did it!",
        "So cool!",
        "You rock!"
    ];
    return messages[Math.floor(Math.random() * messages.length)];
}

// Demon images
const demonImages = [
    'images/demon1.png',
    'images/demon2.png',
    'images/demon3.png',
    'images/demon4.png'
];

// Dance mode images
const danceImages = [
    'images/bird.png',
    'images/cat.png'
];

// Request fullscreen (skip on iOS - use Add to Home Screen instead)
function requestFullscreen() {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS) return; // iOS uses Add to Home Screen for fullscreen

    const elem = document.documentElement;
    if (elem.requestFullscreen) {
        elem.requestFullscreen();
    } else if (elem.msRequestFullscreen) { // IE/Edge
        elem.msRequestFullscreen();
    }
}

// Start music (only if not already playing)
function startMusic() {
    if (backgroundMusic.paused) {
        backgroundMusic.play();
    }
}

// Stop music
function stopMusic() {
    backgroundMusic.pause();
}

// Spawn demons - 3 at a time until 15 total defeated
function spawnDemons() {
    demonContainer.innerHTML = '';

    // Total demons to defeat and how many visible at once
    gameState.totalDemons = 15;
    gameState.maxVisibleDemons = 3;
    gameState.demonsSpawned = 0;

    // Reset hero position
    heroAction.style.left = '50%';
    heroAction.style.bottom = '20px';
    heroAction.classList.add('idle');

    // Spawn initial batch
    for (let i = 0; i < gameState.maxVisibleDemons; i++) {
        spawnSingleDemon(i * 100); // Stagger spawns slightly
    }

    // Start demon movement
    startDemonMovement();
}

function spawnSingleDemon(delay = 0) {
    if (gameState.demonsSpawned >= gameState.totalDemons) return;

    setTimeout(() => {
        const demon = document.createElement('div');
        demon.className = 'demon';
        demon.dataset.id = gameState.demonsSpawned;

        // Random demon image
        const randomDemon = demonImages[Math.floor(Math.random() * demonImages.length)];
        demon.style.backgroundImage = `url('${randomDemon}')`;

        // Random position (avoiding other demons)
        const pos = getRandomDemonPosition();
        demon.style.left = pos.x + 'px';
        demon.style.top = pos.y + 'px';

        // Random velocity for movement
        const baseSpeed = 1 + Math.random() * 2;
        const speed = baseSpeed * gameState.speedMultiplier;
        const angle = Math.random() * Math.PI * 2;
        demon.dataset.vx = Math.cos(angle) * speed;
        demon.dataset.vy = Math.sin(angle) * speed;

        // Add click/tap handler
        demon.addEventListener('click', () => defeatDemon(demon));

        demonContainer.appendChild(demon);
        gameState.demonsSpawned++;
    }, delay);
}

function getRandomDemonPosition() {
    const demonSize = 100;
    const padding = 20;
    const minX = padding;
    const minY = 80;
    const maxX = window.innerWidth - demonSize - padding;
    const maxY = window.innerHeight - demonSize - 200;

    // Try to find a non-overlapping position
    for (let attempts = 0; attempts < 10; attempts++) {
        const x = minX + Math.random() * (maxX - minX);
        const y = minY + Math.random() * (maxY - minY);

        // Check against existing demons
        const existingDemons = demonContainer.querySelectorAll('.demon:not(.defeated)');
        let overlaps = false;

        for (const existing of existingDemons) {
            const ex = parseFloat(existing.style.left);
            const ey = parseFloat(existing.style.top);
            const distance = Math.sqrt((x - ex) ** 2 + (y - ey) ** 2);
            if (distance < demonSize + 20) {
                overlaps = true;
                break;
            }
        }

        if (!overlaps) {
            return { x, y };
        }
    }

    // Fallback to random position
    return {
        x: minX + Math.random() * (maxX - minX),
        y: minY + Math.random() * (maxY - minY)
    };
}

// Move demons around the screen
function startDemonMovement() {
    // Stop any existing movement
    stopDemonMovement();

    gameState.demonMoveInterval = setInterval(() => {
        const demons = document.querySelectorAll('.demon:not(.defeated)');
        const maxX = window.innerWidth - 100;
        const maxY = window.innerHeight - 250;
        const minX = 10;
        const minY = 80;

        demons.forEach(demon => {
            let x = parseFloat(demon.style.left);
            let y = parseFloat(demon.style.top);
            let vx = parseFloat(demon.dataset.vx);
            let vy = parseFloat(demon.dataset.vy);

            // Update position
            x += vx;
            y += vy;

            // Bounce off edges
            if (x <= minX || x >= maxX) {
                vx = -vx;
                x = Math.max(minX, Math.min(maxX, x));
            }
            if (y <= minY || y >= maxY) {
                vy = -vy;
                y = Math.max(minY, Math.min(maxY, y));
            }

            // Save new values
            demon.style.left = x + 'px';
            demon.style.top = y + 'px';
            demon.dataset.vx = vx;
            demon.dataset.vy = vy;
        });
    }, 30); // ~33fps for smooth movement
}

function stopDemonMovement() {
    if (gameState.demonMoveInterval) {
        clearInterval(gameState.demonMoveInterval);
        gameState.demonMoveInterval = null;
    }
}

// Create sparkle particles
function createSparkles(x, y) {
    const colors = ['#ffeb3b', '#ff9800', '#ff6b9d', '#e91e63', '#9c27b0'];
    for (let i = 0; i < 10; i++) {
        const sparkle = document.createElement('div');
        sparkle.className = 'sparkle';

        // Random offset from center - more spread
        const offsetX = (Math.random() - 0.5) * 120;
        const offsetY = (Math.random() - 0.5) * 120;

        sparkle.style.left = (x + offsetX) + 'px';
        sparkle.style.top = (y + offsetY) + 'px';
        sparkle.style.background = `radial-gradient(circle, ${colors[Math.floor(Math.random() * colors.length)]} 0%, transparent 70%)`;

        demonContainer.appendChild(sparkle);

        // Remove sparkle after animation
        setTimeout(() => sparkle.remove(), 350);
    }
}

// Move hero to attack position
function moveHeroTo(targetX, targetY) {
    // Stop idle animation
    heroAction.classList.remove('idle');

    // Calculate position (center hero on target)
    const heroHeight = heroAction.offsetHeight;
    const bottomPos = window.innerHeight - targetY - heroHeight / 2;

    heroAction.style.left = targetX + 'px';
    heroAction.style.bottom = Math.max(20, bottomPos) + 'px';

    // Add attack animation (faster!)
    heroAction.classList.add('attacking');
    setTimeout(() => {
        heroAction.classList.remove('attacking');
    }, 180);
}

// Return hero to center
function returnHeroToCenter() {
    heroAction.style.left = '50%';
    heroAction.style.bottom = '20px';
    setTimeout(() => {
        heroAction.classList.add('idle');
    }, 120);
}

// Defeat a demon when clicked
function defeatDemon(demon) {
    // Prevent double-clicks
    if (demon.classList.contains('defeated')) return;

    // Get position for sparkles and hero movement
    const rect = demon.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    // Move hero to demon
    moveHeroTo(centerX, centerY);

    // Add defeat animation
    demon.classList.add('defeated');

    // Create sparkle particles
    createSparkles(centerX, centerY);

    // Show fun feedback
    showDemonFeedback();

    // Update score
    gameState.demonsDefeated++;
    updateScore();

    // Remove after animation completes
    setTimeout(() => {
        demon.remove();

        // Check for win
        if (gameState.demonsDefeated >= gameState.totalDemons) {
            setTimeout(showWinScreen, 200);
        } else {
            // Return hero to center and spawn next demon
            returnHeroToCenter();
            spawnSingleDemon();
        }
    }, 250);
}

function showDemonFeedback() {
    const messages = ['POW!', 'BAM!', 'NICE!', 'GOTCHA!', 'BOOM!', 'YEAH!'];
    const feedback = document.createElement('div');
    feedback.className = 'dance-feedback perfect'; // Reuse dance feedback styles
    feedback.textContent = messages[Math.floor(Math.random() * messages.length)];
    document.body.appendChild(feedback);
    setTimeout(() => feedback.remove(), 600);
}

// Update score display
function updateScore() {
    scoreDisplay.textContent = `Demons: ${gameState.demonsDefeated} / ${gameState.totalDemons}`;

    // Pop animation
    scoreDisplay.classList.remove('pop');
    // Force reflow to restart animation
    void scoreDisplay.offsetWidth;
    scoreDisplay.classList.add('pop');
}

// Timer functions
function startTimer() {
    gameState.timeRemaining = 60;
    updateTimerDisplay();
    timerDisplay.classList.remove('warning');

    gameState.timerInterval = setInterval(() => {
        gameState.timeRemaining--;
        updateTimerDisplay();

        // Warning when 10 seconds left
        if (gameState.timeRemaining <= 10) {
            timerDisplay.classList.add('warning');
        }

        // Time's up!
        if (gameState.timeRemaining <= 0) {
            stopTimer();
            handleTimeUp();
        }
    }, 1000);
}

function stopTimer() {
    if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
        gameState.timerInterval = null;
    }
}

function updateTimerDisplay() {
    timerDisplay.textContent = `${gameState.timeRemaining}s`;
}

function handleTimeUp() {
    // For now, just show win screen - you can customize this later!
    showWinScreen();
}

// Start Game - Show mode selection
startButton.addEventListener('click', showModeSelection);

function showModeSelection() {
    startScreen.style.display = 'none';
    modeScreen.style.display = 'flex';
}

// Mode selection handlers (reset speed when starting fresh)
demonModeBtn.addEventListener('click', () => {
    gameState.speedMultiplier = 1;
    gameState.danceHitWindow = 2000;
    startGame('demon');
});
danceModeBtn.addEventListener('click', () => {
    gameState.speedMultiplier = 1;
    gameState.danceHitWindow = 2000;
    startGame('dance');
});
sodaModeBtn.addEventListener('click', () => {
    gameState.speedMultiplier = 1;
    gameState.sodaGrowDuration = 5000;
    startGame('soda');
});
runnerModeBtn.addEventListener('click', () => {
    gameState.speedMultiplier = 1;
    startGame('runner');
});

// Back button during gameplay - returns to mode selection
backButton.addEventListener('click', quitToMenu);

function quitToMenu() {
    // Stop all game activities
    stopTimer();
    stopDemonMovement();
    stopDanceMovement();
    stopRunnerMode();

    // Stop any soda bubble timeouts
    const bubbles = demonContainer.querySelectorAll('.bubble');
    bubbles.forEach(b => {
        clearTimeout(parseInt(b.dataset.timeout));
        b.remove();
    });

    // Clear any remaining elements
    demonContainer.innerHTML = '';

    // Stop all music
    backgroundMusic.pause();
    backgroundMusic.currentTime = 0;
    danceMusic.pause();
    danceMusic.currentTime = 0;
    sodaMusic.pause();
    sodaMusic.currentTime = 0;
    runnerMusic.pause();
    runnerMusic.currentTime = 0;

    // Reset state
    gameState.speedMultiplier = 1;
    gameState.danceHitWindow = 2000;
    gameState.sodaGrowDuration = 5000;

    // Hide game screen and show mode selection
    gameScreen.style.display = 'none';
    timerDisplay.style.display = 'block';
    modeScreen.style.display = 'flex';
}

function startGame(mode) {
    gameState.gameMode = mode;

    // Request fullscreen (works on desktop, ignored if not supported)
    requestFullscreen();

    // Reset game state
    gameState.demonsDefeated = 0;
    gameState.combo = 0;
    gameState.maxCombo = 0;
    gameState.danceScore = 0;
    gameState.currentTargetIndex = 0;

    modeScreen.style.display = 'none';
    gameScreen.style.display = 'block';

    if (mode === 'demon') {
        // Original demon hunter mode
        document.body.style.backgroundImage = "url('images/kpop-background.jpg')";
        heroAction.style.display = 'block';
        timerDisplay.style.display = 'block';
        danceCombo.classList.remove('visible');
        startMusic();
        startTimer();
        spawnDemons();
        updateScore(); // After spawnDemons so dynamic count is set
    } else if (mode === 'dance') {
        // Dance mode - city background
        document.body.style.backgroundImage = "url('images/city.png')";
        heroAction.style.display = 'block';
        scoreDisplay.textContent = 'Score: 0';
        timerDisplay.style.display = 'none';
        danceCombo.classList.remove('visible');
        startDanceMusic();
        startDanceMode();
    } else if (mode === 'soda') {
        // Soda POP! mode
        document.body.style.backgroundImage = "url('images/soda_pop.jpg')";
        heroAction.style.display = 'block'; // Show hero in soda mode too!
        timerDisplay.style.display = 'none';
        danceCombo.classList.remove('visible');
        startSodaMusic();
        startSodaMode();
    } else if (mode === 'runner') {
        // Runner mode - Mario-style side scroller!
        document.body.style.backgroundImage = "none";
        document.body.style.backgroundColor = "#1a1a2e";
        heroAction.style.display = 'none'; // We'll use a different player element
        timerDisplay.style.display = 'none';
        danceCombo.classList.remove('visible');
        startRunnerMusic();
        startRunnerMode();
    }

    console.log('Game started in ' + mode + ' mode!');
}

// Dance mode music
function startDanceMusic() {
    backgroundMusic.pause();
    backgroundMusic.currentTime = 0;
    // Only start if not already playing (keeps music going on replay)
    if (danceMusic.paused) {
        danceMusic.play();
    }
}

function stopDanceMusic() {
    danceMusic.pause();
    danceMusic.currentTime = 0;
}

// Soda POP! music
function startSodaMusic() {
    backgroundMusic.pause();
    backgroundMusic.currentTime = 0;
    danceMusic.pause();
    danceMusic.currentTime = 0;
    // Only start if not already playing (keeps music going on replay)
    if (sodaMusic.paused) {
        sodaMusic.play();
    }
}

function stopSodaMusic() {
    sodaMusic.pause();
    sodaMusic.currentTime = 0;
}

// Runner mode music
function startRunnerMusic() {
    backgroundMusic.pause();
    backgroundMusic.currentTime = 0;
    danceMusic.pause();
    danceMusic.currentTime = 0;
    sodaMusic.pause();
    sodaMusic.currentTime = 0;
    if (runnerMusic.paused) {
        runnerMusic.play();
    }
}

function stopRunnerMusic() {
    runnerMusic.pause();
    runnerMusic.currentTime = 0;
}

// Dance Mode Functions
function startDanceMode() {
    demonContainer.innerHTML = '';
    gameState.danceTargets = [];
    gameState.currentTargetIndex = 0;
    gameState.danceTargetsHit = 0;
    gameState.danceTargetsSpawned = 0;

    // Total targets to complete and how many visible at once
    gameState.totalBeats = 15;
    gameState.maxVisibleTargets = 3;

    // Reset hero
    heroAction.style.left = '50%';
    heroAction.style.bottom = '20px';
    heroAction.classList.add('idle');

    // Update score display
    scoreDisplay.textContent = `Score: 0 (0/${gameState.totalBeats})`;

    // Spawn initial batch of targets after a short delay
    setTimeout(() => {
        for (let i = 0; i < gameState.maxVisibleTargets; i++) {
            spawnDanceTarget();
        }
        // Start the floating movement
        startDanceMovement();
    }, 500);
}

function spawnDanceTarget() {
    if (gameState.danceTargetsSpawned >= gameState.totalBeats) return;

    const target = document.createElement('div');
    target.className = 'dance-target active';
    target.dataset.index = gameState.danceTargetsSpawned;

    // Random dance image (bird or cat)
    const randomImage = danceImages[Math.floor(Math.random() * danceImages.length)];
    target.style.backgroundImage = `url('${randomImage}')`;

    // Random position (avoiding other active targets)
    const pos = getRandomDancePosition();
    target.style.left = pos.x + 'px';
    target.style.top = pos.y + 'px';

    // Random velocity for floating movement
    const baseSpeed = 1 + Math.random() * 2;
    const speed = baseSpeed * gameState.speedMultiplier;
    const angle = Math.random() * Math.PI * 2;
    target.dataset.vx = Math.cos(angle) * speed;
    target.dataset.vy = Math.sin(angle) * speed;

    // Add click handler
    target.addEventListener('click', () => hitDanceTarget(target));

    demonContainer.appendChild(target);
    gameState.danceTargets.push(target);
    gameState.danceTargetsSpawned++;
}

// Move dance targets around the screen
function startDanceMovement() {
    stopDanceMovement();

    gameState.danceTargetMoveInterval = setInterval(() => {
        const targets = demonContainer.querySelectorAll('.dance-target.active');
        const targetSize = 120;
        const maxX = window.innerWidth - targetSize - 20;
        const maxY = window.innerHeight - targetSize - 200;
        const minX = 20;
        const minY = 100;

        targets.forEach(target => {
            let x = parseFloat(target.style.left);
            let y = parseFloat(target.style.top);
            let vx = parseFloat(target.dataset.vx);
            let vy = parseFloat(target.dataset.vy);

            // Update position
            x += vx;
            y += vy;

            // Bounce off edges
            if (x <= minX || x >= maxX) {
                vx = -vx;
                x = Math.max(minX, Math.min(maxX, x));
            }
            if (y <= minY || y >= maxY) {
                vy = -vy;
                y = Math.max(minY, Math.min(maxY, y));
            }

            // Save new values
            target.style.left = x + 'px';
            target.style.top = y + 'px';
            target.dataset.vx = vx;
            target.dataset.vy = vy;
        });
    }, 30);
}

function stopDanceMovement() {
    if (gameState.danceTargetMoveInterval) {
        clearInterval(gameState.danceTargetMoveInterval);
        gameState.danceTargetMoveInterval = null;
    }
}

function getRandomDancePosition() {
    const targetSize = 120;
    const padding = 20;
    const minX = padding;
    const minY = 100;
    const maxX = window.innerWidth - targetSize - padding;
    const maxY = window.innerHeight - targetSize - 200;

    // Try to find a non-overlapping position
    for (let attempts = 0; attempts < 10; attempts++) {
        const x = minX + Math.random() * (maxX - minX);
        const y = minY + Math.random() * (maxY - minY);

        // Check against existing active targets
        const existingTargets = demonContainer.querySelectorAll('.dance-target');
        let overlaps = false;

        for (const existing of existingTargets) {
            const ex = parseFloat(existing.style.left);
            const ey = parseFloat(existing.style.top);
            const distance = Math.sqrt((x - ex) ** 2 + (y - ey) ** 2);
            if (distance < targetSize + 20) {
                overlaps = true;
                break;
            }
        }

        if (!overlaps) {
            return { x, y };
        }
    }

    // Fallback to random position if we couldn't find non-overlapping
    return {
        x: minX + Math.random() * (maxX - minX),
        y: minY + Math.random() * (maxY - minY)
    };
}

function hitDanceTarget(target) {
    // Only count hits on active targets
    if (!target.classList.contains('active')) return;
    if (target.classList.contains('hit-perfect')) return;

    // Get position for sparkles and hero movement
    const rect = target.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    // Move hero to target
    moveHeroTo(centerX, centerY);

    // Add hit animation
    target.classList.remove('active');
    target.classList.add('hit-perfect');

    // Create sparkles
    createSparkles(centerX, centerY);

    // Show fun feedback
    showDanceFeedback('perfect');

    // Update score
    gameState.danceTargetsHit++;
    updateDanceScore();

    // Remove target after animation
    setTimeout(() => {
        target.remove();

        // Check for win
        if (gameState.danceTargetsHit >= gameState.totalBeats) {
            setTimeout(showDanceWinScreen, 200);
        } else {
            // Return hero to center and spawn next target
            returnHeroToCenter();
            spawnDanceTarget();
        }
    }, 250);
}

function showDanceFeedback(type) {
    const feedback = document.createElement('div');
    feedback.className = 'dance-feedback ' + type;

    const messages = {
        perfect: ['PERFECT!', 'AMAZING!', 'WOW!', 'SUPERSTAR!'],
        good: ['GOOD!', 'NICE!', 'YAY!'],
        nice: ['OK!', 'KEEP GOING!']
    };

    const msgArray = messages[type] || messages.good;
    feedback.textContent = msgArray[Math.floor(Math.random() * msgArray.length)];

    document.body.appendChild(feedback);

    setTimeout(() => feedback.remove(), 600);
}

function updateDanceCombo() {
    if (gameState.combo >= 2) {
        danceCombo.textContent = `${gameState.combo}x COMBO!`;
        danceCombo.classList.add('visible');
    } else {
        danceCombo.classList.remove('visible');
    }
}

function updateDanceScore() {
    scoreDisplay.textContent = `Score: ${Math.floor(gameState.danceScore)} (${gameState.danceTargetsHit}/${gameState.totalBeats})`;
    scoreDisplay.classList.remove('pop');
    void scoreDisplay.offsetWidth;
    scoreDisplay.classList.add('pop');
}

function showDanceWinScreen() {
    // Keep music playing for replay!
    stopDanceMovement();

    // Update win screen message for dance mode
    const winTitle = winScreen.querySelector('h1');
    winTitle.textContent = `Amazing Dancing! Score: ${Math.floor(gameState.danceScore)}`;
    winMessage.textContent = getWinMessage();

    gameScreen.style.display = 'none';
    winScreen.style.display = 'flex';
    setTimeout(() => {
        winScreen.classList.add('visible');
    }, 50);
}

// ========== SODA POP! MODE ==========

function startSodaMode() {
    demonContainer.innerHTML = '';
    gameState.sodaLives = 3;
    gameState.sodaScore = 0;
    gameState.sodaBubblesPopped = 0;

    // Reset hero position
    heroAction.style.left = '50%';
    heroAction.style.bottom = '20px';
    heroAction.classList.add('idle');

    // Update display
    scoreDisplay.textContent = `Bubbles: 0 / ${gameState.sodaTotalBubbles}`;
    timerDisplay.style.display = 'block';
    timerDisplay.textContent = '❤️❤️❤️';
    timerDisplay.classList.remove('warning');

    // Start spawning bubbles
    spawnBubble();
}

function spawnBubble() {
    if (gameState.sodaBubblesPopped >= gameState.sodaTotalBubbles) {
        // Won!
        setTimeout(showSodaWinScreen, 500);
        return;
    }

    if (gameState.sodaLives <= 0) {
        // Game over - but for a 5 year old, let's just show win screen anyway
        setTimeout(showSodaWinScreen, 500);
        return;
    }

    // Spawn 1-2 bubbles
    const numBubbles = Math.random() < 0.4 ? 2 : 1;

    for (let i = 0; i < numBubbles; i++) {
        createBubble(i * 200); // Stagger spawns slightly
    }
}

function createBubble(delay = 0) {
    setTimeout(() => {
        const bubble = document.createElement('div');
        bubble.className = 'bubble';

        // Random size (will grow to this)
        const size = 80 + Math.random() * 60; // 80-140px
        bubble.style.width = size + 'px';
        bubble.style.height = size + 'px';

        // Random position
        const maxX = window.innerWidth - size - 40;
        const maxY = window.innerHeight - size - 150;
        const minX = 40;
        const minY = 100;

        const x = minX + Math.random() * (maxX - minX);
        const y = minY + Math.random() * (maxY - minY);

        bubble.style.left = x + 'px';
        bubble.style.top = y + 'px';

        // Set grow duration (faster = harder)
        const growTime = gameState.sodaGrowDuration / gameState.speedMultiplier;
        bubble.style.setProperty('--grow-duration', growTime + 'ms');

        // Click handler - pop the bubble!
        bubble.addEventListener('click', () => popBubble(bubble));

        demonContainer.appendChild(bubble);

        // If not popped in time, it hurts!
        bubble.dataset.timeout = setTimeout(() => {
            if (!bubble.classList.contains('popped')) {
                bubbleHurt(bubble);
            }
        }, growTime);

    }, delay);
}

function popBubble(bubble) {
    if (bubble.classList.contains('popped')) return;

    // Clear the hurt timeout
    clearTimeout(parseInt(bubble.dataset.timeout));

    // Pop animation
    bubble.classList.add('popped');

    // Create pop sparkles
    const rect = bubble.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    createBubbleSparkles(centerX, centerY);

    // Move hero to bubble and attack!
    moveHeroTo(centerX, centerY);

    // Show fun feedback
    showPopFeedback();

    // Update score
    gameState.sodaBubblesPopped++;
    gameState.sodaScore += 100 * gameState.speedMultiplier;
    scoreDisplay.textContent = `Bubbles: ${gameState.sodaBubblesPopped} / ${gameState.sodaTotalBubbles}`;
    scoreDisplay.classList.remove('pop');
    void scoreDisplay.offsetWidth;
    scoreDisplay.classList.add('pop');

    // Remove bubble after animation
    setTimeout(() => {
        bubble.remove();

        // Check if we need more bubbles
        const remainingBubbles = demonContainer.querySelectorAll('.bubble:not(.popped)').length;
        if (remainingBubbles === 0) {
            returnHeroToCenter();
            setTimeout(spawnBubble, 500);
        }
    }, 300);
}

function showPopFeedback() {
    const messages = ['POP!', 'NICE!', 'YAY!', 'WOOHOO!', 'AWESOME!', 'SPLASH!'];
    const feedback = document.createElement('div');
    feedback.className = 'dance-feedback perfect'; // Reuse dance feedback styles
    feedback.textContent = messages[Math.floor(Math.random() * messages.length)];
    document.body.appendChild(feedback);
    setTimeout(() => feedback.remove(), 600);
}

function bubbleHurt(bubble) {
    // Bubble wasn't popped in time!
    bubble.classList.add('popped');
    bubble.remove();

    // Lose a life
    gameState.sodaLives--;
    updateLivesDisplay();

    // Show hurt effect
    showHurtEffect();

    // Check for game over or spawn more
    if (gameState.sodaLives <= 0) {
        setTimeout(showSodaWinScreen, 800);
    } else {
        const remainingBubbles = demonContainer.querySelectorAll('.bubble:not(.popped)').length;
        if (remainingBubbles === 0) {
            setTimeout(spawnBubble, 800);
        }
    }
}

function updateLivesDisplay() {
    const hearts = '❤️'.repeat(gameState.sodaLives) + '🖤'.repeat(3 - gameState.sodaLives);
    timerDisplay.textContent = hearts;
    if (gameState.sodaLives <= 1) {
        timerDisplay.classList.add('warning');
    }
}

function showHurtEffect() {
    // Red flash
    const flash = document.createElement('div');
    flash.className = 'hurt-flash';
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 400);

    // Pain text
    const painWords = ['OW!', 'OUCH!', 'YIKES!', 'EEK!', 'OH NO!'];
    const text = document.createElement('div');
    text.className = 'hurt-text';
    text.textContent = painWords[Math.floor(Math.random() * painWords.length)];
    document.body.appendChild(text);
    setTimeout(() => text.remove(), 600);
}

function createBubbleSparkles(x, y) {
    const colors = ['#ff69b4', '#ff1493', '#ff00ff', '#ffffff', '#ffb6c1'];
    for (let i = 0; i < 8; i++) {
        const sparkle = document.createElement('div');
        sparkle.className = 'sparkle';

        const offsetX = (Math.random() - 0.5) * 100;
        const offsetY = (Math.random() - 0.5) * 100;

        sparkle.style.left = (x + offsetX) + 'px';
        sparkle.style.top = (y + offsetY) + 'px';
        sparkle.style.background = `radial-gradient(circle, ${colors[Math.floor(Math.random() * colors.length)]} 0%, transparent 70%)`;

        demonContainer.appendChild(sparkle);
        setTimeout(() => sparkle.remove(), 350);
    }
}

function showSodaWinScreen() {
    // Stop any remaining bubble timeouts
    const bubbles = demonContainer.querySelectorAll('.bubble');
    bubbles.forEach(b => {
        clearTimeout(parseInt(b.dataset.timeout));
        b.remove();
    });

    // Update win screen message
    const winTitle = winScreen.querySelector('h1');
    if (gameState.sodaLives > 0) {
        winTitle.textContent = `POP STAR! Score: ${Math.floor(gameState.sodaScore)}`;
    } else {
        winTitle.textContent = `Good Try! Score: ${Math.floor(gameState.sodaScore)}`;
    }
    winMessage.textContent = getWinMessage();

    gameScreen.style.display = 'none';
    winScreen.style.display = 'flex';
    setTimeout(() => {
        winScreen.classList.add('visible');
    }, 50);
}

// ========== END SODA POP! MODE ==========

// ========== RUNNER MODE (MARIO-STYLE SIDE SCROLLER) ==========

// Get dynamic ground level based on viewport height (matches CSS media query)
function getRunnerGroundLevel() {
    return window.innerHeight <= 450 ? 50 : 100;
}

// Get scaled heights for obstacles/collectibles based on viewport
function getRunnerHeights() {
    const isMobile = window.innerHeight <= 450;
    return {
        ground: isMobile ? 50 : 100,
        playerHeight: isMobile ? 100 : 150,
        // Ground obstacles - just above ground
        groundObstacle: isMobile ? 50 : 100,
        // Air obstacles - above player's head when standing
        airObstacles: isMobile ? [140, 160, 180, 200] : [280, 300, 320, 340],
        // Mix heights weighted toward ground
        mixedObstacles: isMobile ? [50, 50, 50, 160, 180] : [100, 100, 100, 300, 320],
        // Collectible heights
        groundCollectible: isMobile ? 60 : 120,
        airCollectibles: isMobile ? [60, 90, 120] : [120, 160, 200],
        // Max jump height cap
        maxHeight: isMobile ? 80 : 140
    };
}

function startRunnerMode() {
    demonContainer.innerHTML = '';

    // Reset runner state
    gameState.runnerScore = 0;
    gameState.runnerDistance = 0;
    gameState.runnerSpeed = gameState.runnerHardMode ? 6 : 5;  // Slightly faster in hard mode
    gameState.runnerJumping = false;
    gameState.runnerFloating = false;  // Holding jump to float
    gameState.runnerObstacles = [];
    gameState.runnerCollectibles = [];
    gameState.runnerStarted = false;
    gameState.runnerLives = gameState.runnerHardMode ? 9 : 10;  // Slightly fewer lives in hard mode
    gameState.runnerStarsNeeded = gameState.runnerHardMode ? 15 : 25;  // Less ramen needed but harder to get!

    // Create runner container
    const runnerContainer = document.createElement('div');
    runnerContainer.id = 'runner-container';
    demonContainer.appendChild(runnerContainer);

    // Create ground
    const ground = document.createElement('div');
    ground.id = 'runner-ground';
    runnerContainer.appendChild(ground);

    // Create player (Reese)
    const player = document.createElement('div');
    player.id = 'runner-player';
    player.style.backgroundImage = "url('images/reese_on_cat.png')";
    runnerContainer.appendChild(player);

    // Create lives display (reuse timer display)
    timerDisplay.style.display = 'block';
    timerDisplay.textContent = '❤️'.repeat(gameState.runnerLives);
    timerDisplay.classList.remove('warning');

    // Update score display - show goal and hard mode indicator
    const modeLabel = gameState.runnerHardMode ? '🔥 ' : '';
    scoreDisplay.textContent = `${modeLabel}Ramen: 0 / ${gameState.runnerStarsNeeded}`;

    // Create clouds for background
    createRunnerClouds(runnerContainer);

    // Create tap instructions
    const instructions = document.createElement('div');
    instructions.id = 'runner-instructions';
    instructions.textContent = 'HOLD TO FLY!';
    runnerContainer.appendChild(instructions);

    // Add click/tap handlers for jumping and floating
    runnerContainer.addEventListener('mousedown', handleRunnerJumpStart);
    runnerContainer.addEventListener('mouseup', handleRunnerJumpEnd);
    runnerContainer.addEventListener('mouseleave', handleRunnerJumpEnd);
    runnerContainer.addEventListener('touchstart', handleRunnerJumpStart);
    runnerContainer.addEventListener('touchend', handleRunnerJumpEnd);
    runnerContainer.addEventListener('touchcancel', handleRunnerJumpEnd);

    // Start the game after a brief delay
    setTimeout(() => {
        instructions.remove();
        gameState.runnerStarted = true;
        startRunnerGameLoop();
    }, 1500);
}

function createRunnerClouds(container) {
    // Create 5 decorative clouds
    for (let i = 0; i < 5; i++) {
        const cloud = document.createElement('div');
        cloud.className = 'runner-cloud';
        cloud.style.width = (80 + Math.random() * 100) + 'px';
        cloud.style.height = (40 + Math.random() * 40) + 'px';
        cloud.style.left = (Math.random() * window.innerWidth) + 'px';
        cloud.style.top = (50 + Math.random() * 150) + 'px';
        cloud.dataset.speed = 0.5 + Math.random() * 1;
        container.appendChild(cloud);
    }
}

function handleRunnerJumpStart(e) {
    e.preventDefault();

    if (!gameState.runnerStarted) return;

    const player = document.getElementById('runner-player');
    if (!player) return;

    // Start floating
    gameState.runnerFloating = true;

    // If not already jumping, start the jump
    if (!gameState.runnerJumping) {
        gameState.runnerJumping = true;
        player.classList.remove('running');
        player.classList.add('jumping');

        // Jump physics - use dynamic values based on viewport
        const heights = getRunnerHeights();
        const groundLevel = heights.ground;
        const jumpVelocity = 12;
        const floatGravity = 0.15;   // Very slow fall when holding
        const fallGravity = 1.2;     // Fast fall when released
        const maxHeight = heights.maxHeight;  // Cap height so she can't fly too high

        let velocity = jumpVelocity;
        let currentHeight = 0;
        let lastTime = performance.now();

        function animateJump(currentTime) {
            if (!gameState.runnerStarted) return;

            const deltaTime = Math.min((currentTime - lastTime) / 16.67, 2);
            lastTime = currentTime;

            // Use float gravity if holding, fall gravity if released
            const gravity = gameState.runnerFloating ? floatGravity : fallGravity;

            // Apply gravity
            velocity -= gravity * deltaTime;

            // If floating and at max height, just hover
            if (gameState.runnerFloating && currentHeight >= maxHeight) {
                velocity = Math.min(velocity, 0);
                currentHeight = maxHeight;
            } else {
                currentHeight += velocity * deltaTime;
            }

            // Check if landed
            if (currentHeight <= 0) {
                currentHeight = 0;
                player.style.bottom = groundLevel + 'px';
                gameState.runnerJumping = false;
                gameState.runnerFloating = false;
                player.classList.remove('jumping');
                player.classList.add('running');
                return;
            }

            // Update position
            player.style.bottom = (groundLevel + currentHeight) + 'px';

            requestAnimationFrame(animateJump);
        }

        requestAnimationFrame(animateJump);
    }
}

function handleRunnerJumpEnd(e) {
    e.preventDefault();
    // Stop floating - gravity will take over
    gameState.runnerFloating = false;
}

function startRunnerGameLoop() {
    const player = document.getElementById('runner-player');
    if (player) {
        player.classList.add('running');
    }

    let lastTime = performance.now();
    let lastSpeedIncrease = 0;

    function gameLoop(currentTime) {
        if (!gameState.runnerStarted) return;

        // Calculate delta time for frame-rate independent movement
        const deltaTime = Math.min((currentTime - lastTime) / 16.67, 3); // Normalize to ~60fps
        lastTime = currentTime;

        // Update internal distance (used for speed increases)
        gameState.runnerDistance += (gameState.runnerSpeed / 10) * deltaTime;

        // Spawn obstacles (adjusted for frame rate)
        // Hard mode: MORE demons!
        const obstacleRate = gameState.runnerHardMode ? 0.025 : 0.012;
        if (Math.random() < obstacleRate * gameState.speedMultiplier * deltaTime) {
            spawnRunnerObstacle();
        }

        // Spawn collectibles (adjusted for frame rate)
        // Hard mode: LESS ramen!
        const collectibleRate = gameState.runnerHardMode ? 0.010 : 0.018;
        if (Math.random() < collectibleRate * deltaTime) {
            spawnRunnerCollectible();
        }

        // Move obstacles
        moveRunnerObstacles(deltaTime);

        // Move collectibles
        moveRunnerCollectibles(deltaTime);

        // Move clouds
        moveRunnerClouds(deltaTime);

        // Check collisions
        checkRunnerCollisions();

        // Gradually increase speed every 100m
        const currentMilestone = Math.floor(gameState.runnerDistance / 100);
        if (currentMilestone > lastSpeedIncrease) {
            lastSpeedIncrease = currentMilestone;
            gameState.runnerSpeed = Math.min(gameState.runnerSpeed + 0.5, 15);
        }

        // Continue the loop
        gameState.runnerGameLoop = requestAnimationFrame(gameLoop);
    }

    // Start the loop
    gameState.runnerGameLoop = requestAnimationFrame(gameLoop);
}

function spawnRunnerObstacle() {
    const runnerContainer = document.getElementById('runner-container');
    if (!runnerContainer) return;

    const obstacle = document.createElement('div');
    obstacle.className = 'runner-obstacle demon-obstacle';

    // Use demon image
    const randomDemon = demonImages[Math.floor(Math.random() * demonImages.length)];
    obstacle.style.backgroundImage = `url('${randomDemon}')`;

    // Spawn demons at different heights - use dynamic values based on viewport
    const runnerHeights = getRunnerHeights();
    let height;
    if (gameState.runnerFloating || gameState.runnerJumping) {
        // Player is floating - spawn demons at floating height to chase her down!
        const floatHeights = runnerHeights.airObstacles;
        height = floatHeights[Math.floor(Math.random() * floatHeights.length)];
    } else {
        // Mix of ground demons (jump over) and high demons (walk under)
        const heights = runnerHeights.mixedObstacles;
        height = heights[Math.floor(Math.random() * heights.length)];
    }

    obstacle.style.right = '-80px';
    obstacle.style.bottom = height + 'px';

    runnerContainer.appendChild(obstacle);
    gameState.runnerObstacles.push(obstacle);
}

// Ramen images for collectibles
const ramenImages = [
    'images/mira_ramen.png',
    'images/rumi_ramen.png',
    'images/zoey_ramen.png'
];

function spawnRunnerCollectible() {
    const runnerContainer = document.getElementById('runner-container');
    if (!runnerContainer) return;

    const collectible = document.createElement('div');
    collectible.className = 'runner-collectible';

    // Use random ramen image
    const randomRamen = ramenImages[Math.floor(Math.random() * ramenImages.length)];
    collectible.style.backgroundImage = `url('${randomRamen}')`;

    // If player is floating, put collectibles on the ground to encourage landing
    // Otherwise mix of ground and air - use dynamic values based on viewport
    const runnerHeights = getRunnerHeights();
    let height;
    if (gameState.runnerFloating || gameState.runnerJumping) {
        // Player is in the air - put ramen on ground!
        height = runnerHeights.groundCollectible;
    } else {
        // Player is on ground - put some ramen in the air
        const heights = runnerHeights.airCollectibles;
        height = heights[Math.floor(Math.random() * heights.length)];
    }

    collectible.style.right = '-50px';
    collectible.style.bottom = height + 'px';

    runnerContainer.appendChild(collectible);
    gameState.runnerCollectibles.push(collectible);
}

function moveRunnerObstacles(deltaTime = 1) {
    const speed = gameState.runnerSpeed * gameState.speedMultiplier * deltaTime;

    gameState.runnerObstacles = gameState.runnerObstacles.filter(obstacle => {
        const currentRight = parseFloat(obstacle.style.right) || 0;
        const newRight = currentRight + speed;

        if (newRight > window.innerWidth + 100) {
            obstacle.remove();
            return false;
        }

        obstacle.style.right = newRight + 'px';
        return true;
    });
}

function moveRunnerCollectibles(deltaTime = 1) {
    const speed = gameState.runnerSpeed * gameState.speedMultiplier * deltaTime;

    gameState.runnerCollectibles = gameState.runnerCollectibles.filter(collectible => {
        if (collectible.classList.contains('collected')) return false;

        const currentRight = parseFloat(collectible.style.right) || 0;
        const newRight = currentRight + speed;

        if (newRight > window.innerWidth + 100) {
            collectible.remove();
            return false;
        }

        collectible.style.right = newRight + 'px';
        return true;
    });
}

function moveRunnerClouds(deltaTime = 1) {
    const clouds = document.querySelectorAll('.runner-cloud');
    clouds.forEach(cloud => {
        const speed = parseFloat(cloud.dataset.speed) * deltaTime;
        let left = parseFloat(cloud.style.left);
        left -= speed;

        if (left < -150) {
            left = window.innerWidth + 50;
            cloud.style.top = (50 + Math.random() * 150) + 'px';
        }

        cloud.style.left = left + 'px';
    });
}

function checkRunnerCollisions() {
    const player = document.getElementById('runner-player');
    if (!player) return;

    const playerRect = player.getBoundingClientRect();

    // Check obstacle collisions
    gameState.runnerObstacles.forEach(obstacle => {
        if (obstacle.classList.contains('stomped')) return;

        const obstacleRect = obstacle.getBoundingClientRect();

        // Very generous hitboxes for a 5 year old
        const playerHitbox = {
            left: playerRect.left + 20,
            right: playerRect.right - 20,
            top: playerRect.top + 15,
            bottom: playerRect.bottom - 10
        };

        const obstacleHitbox = {
            left: obstacleRect.left + 15,
            right: obstacleRect.right - 15,
            top: obstacleRect.top + 15,
            bottom: obstacleRect.bottom - 5
        };

        // Check if there's any overlap
        if (playerHitbox.left < obstacleHitbox.right &&
            playerHitbox.right > obstacleHitbox.left &&
            playerHitbox.top < obstacleHitbox.bottom &&
            playerHitbox.bottom > obstacleHitbox.top) {

            // Check if player is stomping (coming from above)
            // Very generous - if player's bottom is in the top 60% of demon, it's a stomp!
            const stompZone = obstacleRect.top + (obstacleRect.height * 0.6);

            if (playerRect.bottom < stompZone && gameState.runnerJumping) {
                // STOMP! Defeat the demon!
                handleRunnerStomp(obstacle);
            } else {
                // Ouch! Hit by demon
                handleRunnerHit(obstacle);
            }
        }
    });

    // Check collectible collisions - generous hitbox
    gameState.runnerCollectibles.forEach(collectible => {
        if (collectible.classList.contains('collected')) return;

        const collectibleRect = collectible.getBoundingClientRect();

        // Expand the collectible hitbox to make it easier to grab
        if (playerRect.left < collectibleRect.right + 10 &&
            playerRect.right > collectibleRect.left - 10 &&
            playerRect.top < collectibleRect.bottom + 10 &&
            playerRect.bottom > collectibleRect.top - 10) {

            // Collected!
            collectRunnerStar(collectible);
        }
    });
}

function handleRunnerHit(obstacle) {
    // Remove the obstacle
    obstacle.remove();
    gameState.runnerObstacles = gameState.runnerObstacles.filter(o => o !== obstacle);

    // Lose a life
    gameState.runnerLives--;

    // Update lives display
    const hearts = '❤️'.repeat(Math.max(0, gameState.runnerLives));
    timerDisplay.textContent = hearts || '💔';

    // Warning when low on lives (2 for hard mode, 3 for normal)
    const warningThreshold = gameState.runnerHardMode ? 2 : 3;
    if (gameState.runnerLives <= warningThreshold) {
        timerDisplay.classList.add('warning');
    }

    // Show hurt effect
    showHurtEffect();

    // Check game over
    if (gameState.runnerLives <= 0) {
        showRunnerWinScreen();
    }
}

function handleRunnerStomp(obstacle) {
    // Mark as stomped so we don't process it again
    obstacle.classList.add('stomped');

    // Remove the obstacle
    obstacle.remove();
    gameState.runnerObstacles = gameState.runnerObstacles.filter(o => o !== obstacle);

    // Create sparkles at stomp location
    const rect = obstacle.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    // Reuse the sparkle effect
    const colors = ['#ffeb3b', '#ff9800', '#ff6b9d', '#e91e63'];
    for (let i = 0; i < 8; i++) {
        const sparkle = document.createElement('div');
        sparkle.className = 'sparkle';
        const offsetX = (Math.random() - 0.5) * 80;
        const offsetY = (Math.random() - 0.5) * 80;
        sparkle.style.left = (centerX + offsetX) + 'px';
        sparkle.style.top = (centerY + offsetY) + 'px';
        sparkle.style.background = `radial-gradient(circle, ${colors[Math.floor(Math.random() * colors.length)]} 0%, transparent 70%)`;
        document.body.appendChild(sparkle);
        setTimeout(() => sparkle.remove(), 350);
    }

    // Show stomp feedback
    const feedback = document.createElement('div');
    feedback.className = 'dance-feedback perfect';
    const stompMessages = ['STOMP!', 'GOTCHA!', 'POW!', 'BOOM!', 'YEAH!'];
    feedback.textContent = stompMessages[Math.floor(Math.random() * stompMessages.length)];
    document.body.appendChild(feedback);
    setTimeout(() => feedback.remove(), 600);
}

function collectRunnerStar(collectible) {
    collectible.classList.add('collected');

    // Update score - count individual stars
    gameState.runnerScore++;
    const modeLabel = gameState.runnerHardMode ? '🔥 ' : '';
    scoreDisplay.textContent = `${modeLabel}Ramen: ${gameState.runnerScore} / ${gameState.runnerStarsNeeded}`;
    scoreDisplay.classList.remove('pop');
    void scoreDisplay.offsetWidth;
    scoreDisplay.classList.add('pop');

    // Show feedback
    const feedback = document.createElement('div');
    feedback.className = 'dance-feedback perfect';
    const ramenMessages = ['YUM!', 'YUMMY!', 'TASTY!', 'DELISH!', 'RAMEN!', 'NOM NOM!'];
    feedback.textContent = ramenMessages[Math.floor(Math.random() * ramenMessages.length)];
    document.body.appendChild(feedback);
    setTimeout(() => feedback.remove(), 600);

    // Remove after animation
    setTimeout(() => collectible.remove(), 300);

    // Check for win!
    if (gameState.runnerScore >= gameState.runnerStarsNeeded) {
        setTimeout(() => showRunnerWinScreen(true), 500);
    }
}

function stopRunnerMode() {
    gameState.runnerStarted = false;
    gameState.runnerFloating = false;
    gameState.runnerJumping = false;

    if (gameState.runnerGameLoop) {
        cancelAnimationFrame(gameState.runnerGameLoop);
        gameState.runnerGameLoop = null;
    }

    // Remove event listeners
    const runnerContainer = document.getElementById('runner-container');
    if (runnerContainer) {
        runnerContainer.removeEventListener('mousedown', handleRunnerJumpStart);
        runnerContainer.removeEventListener('mouseup', handleRunnerJumpEnd);
        runnerContainer.removeEventListener('mouseleave', handleRunnerJumpEnd);
        runnerContainer.removeEventListener('touchstart', handleRunnerJumpStart);
        runnerContainer.removeEventListener('touchend', handleRunnerJumpEnd);
        runnerContainer.removeEventListener('touchcancel', handleRunnerJumpEnd);
    }
}

function showRunnerWinScreen(won = false) {
    stopRunnerMode();

    // Update win screen message
    const winTitle = winScreen.querySelector('h1');

    if (won) {
        // Player collected all the stars!
        winTitle.textContent = `YOU WIN! All ${gameState.runnerStarsNeeded} Ramen!`;
        winMessage.textContent = getWinMessage();
    } else {
        // Player ran out of lives
        winTitle.textContent = `Good Try! Ramen: ${gameState.runnerScore}/${gameState.runnerStarsNeeded}`;
        winMessage.textContent = getWinMessage();
    }

    // Use reese_on_cat image for runner mode win screen
    const winHeroImage = winScreen.querySelector('.hero-image');
    if (winHeroImage) {
        winHeroImage.src = 'images/reese_on_cat.png';
    }

    // Add ramen background for runner mode
    winScreen.classList.add('ramen-win');

    // Add floating ramen cups
    addFloatingRamen();

    gameScreen.style.display = 'none';
    winScreen.style.display = 'flex';
    setTimeout(() => {
        winScreen.classList.add('visible');
    }, 50);
}

function addFloatingRamen() {
    // Remove any existing floating ramen
    document.querySelectorAll('.floating-ramen').forEach(r => r.remove());

    // Add the 3 ramen images floating around
    const ramenImages = [
        'images/mira_ramen.png',
        'images/rumi_ramen.png',
        'images/zoey_ramen.png'
    ];

    ramenImages.forEach((img, index) => {
        const ramen = document.createElement('div');
        ramen.className = 'floating-ramen';
        ramen.style.backgroundImage = `url('${img}')`;
        ramen.style.animationDelay = `${index * 0.5}s`;

        // Position them in corners/edges away from center buttons
        if (index === 0) {
            // Top left corner
            ramen.style.left = '5%';
            ramen.style.top = '5%';
        } else if (index === 1) {
            // Top right corner
            ramen.style.right = '5%';
            ramen.style.top = '10%';
        } else {
            // Bottom left corner
            ramen.style.left = '5%';
            ramen.style.bottom = '5%';
        }

        winScreen.appendChild(ramen);
    });
}

function removeFloatingRamen() {
    document.querySelectorAll('.floating-ramen').forEach(r => r.remove());
    winScreen.classList.remove('ramen-win');

    // Reset hero image back to default
    const winHeroImage = winScreen.querySelector('.hero-image');
    if (winHeroImage) {
        winHeroImage.src = 'images/reese-headon.png';
    }
}

// ========== END RUNNER MODE ==========

function showWinScreen() {
    // Stop the timer and demon movement
    stopTimer();
    stopDemonMovement();

    // Reset win screen message for demon mode
    const winTitle = winScreen.querySelector('h1');
    winTitle.textContent = 'You defeated all the demons!';
    winMessage.textContent = getWinMessage();

    gameScreen.style.display = 'none';
    winScreen.style.display = 'flex';
    // Trigger fade-in
    setTimeout(() => {
        winScreen.classList.add('visible');
    }, 50);
}

// Play Again button
const playAgainButton = document.getElementById('play-again-button');
playAgainButton.addEventListener('click', playAgain);

function playAgain() {
    // Reset speed and difficulty when playing again normally
    gameState.speedMultiplier = 1;
    gameState.danceHitWindow = 2000;
    gameState.sodaGrowDuration = 5000;
    gameState.runnerHardMode = false;  // Reset hard mode

    // Clean up ramen win screen elements
    removeFloatingRamen();

    winScreen.classList.remove('visible');
    winScreen.style.display = 'none';

    if (gameState.gameMode === 'dance') {
        // Replay dance mode directly (music keeps playing!)
        startGame('dance');
    } else if (gameState.gameMode === 'soda') {
        // Replay soda mode directly (music keeps playing!)
        startGame('soda');
    } else if (gameState.gameMode === 'runner') {
        // Replay runner mode
        startGame('runner');
    } else {
        // For demon mode, go back to mode selection
        timerDisplay.style.display = 'block';
        modeScreen.style.display = 'flex';
    }
}

// Harder/Faster button
const harderButton = document.getElementById('harder-button');
harderButton.addEventListener('click', playHarder);

function playHarder() {
    // For runner mode: hard mode with more demons, less ramen
    if (gameState.gameMode === 'runner') {
        gameState.runnerHardMode = true;
        gameState.speedMultiplier = 1.3; // Slightly faster
    } else {
        // Other modes: increase speed (doubles each time, capped at 4x)
        gameState.speedMultiplier = Math.min(gameState.speedMultiplier * 2, 4);
        // Reduce dance hit window (halves each time, min 500ms)
        gameState.danceHitWindow = Math.max(gameState.danceHitWindow / 2, 500);
    }

    // Clean up ramen win screen elements
    removeFloatingRamen();

    winScreen.classList.remove('visible');
    winScreen.style.display = 'none';

    // Replay the same mode but harder!
    startGame(gameState.gameMode);
}

// Home/New Game button
const homeButton = document.getElementById('home-button');
homeButton.addEventListener('click', goHome);

function goHome() {
    // Reset everything and go back to mode selection
    gameState.speedMultiplier = 1;
    gameState.danceHitWindow = 2000;
    gameState.sodaGrowDuration = 5000;
    gameState.runnerHardMode = false;

    // Clean up ramen win screen elements
    removeFloatingRamen();

    // Stop all music
    backgroundMusic.pause();
    backgroundMusic.currentTime = 0;
    danceMusic.pause();
    danceMusic.currentTime = 0;
    sodaMusic.pause();
    sodaMusic.currentTime = 0;
    runnerMusic.pause();
    runnerMusic.currentTime = 0;

    winScreen.classList.remove('visible');
    winScreen.style.display = 'none';
    timerDisplay.style.display = 'block';
    heroAction.style.display = 'block'; // Restore hero visibility

    // Show mode selection
    modeScreen.style.display = 'flex';
}

// Pause music when app is minimized
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        backgroundMusic.pause();
        danceMusic.pause();
        sodaMusic.pause();
        runnerMusic.pause();
    }
});
