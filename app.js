// --- GLOBALS & ENGINE SETTINGS ---
let currentDevice = ''; let serialPort = null; let serialReader = null;
let saveTimeout;
const obsChannel = new BroadcastChannel('archsense_obs_sync'); // OBS Broadcast Channel

let appSettings = {
    inspectionEnabled: true, voiceAlerts: false, inspectionTime: 15, inspGrace: 2, holdDelay: 0.6, scrambleLen: 20,
    scrambleMoves: ['U', 'D', 'R', 'L', 'F', 'B'], trimPct: 5, plusPenalty: 2000, timerDecimals: 3,
    timerUpdateRate: 10, batterySaver: true, sleepTimeout: 30, sensorThreshold: 40, sensorDebounce: 15,
    themeName: 'oled', bgColor: '#000000',
    textColor: '#ffffff', accentColor: '#4CAF50', timerColor: '#ffffff', timerGlow: 'transparent',
    bgImage: '', timerFont: "'Roboto Mono', monospace", timerScale: 1.0, uiOpacity: 1.0,
    uiBlur: 10, uiRadius: 8, focusStyle: 'fade', focusFadeTime: 0.5,
    cubeTop: 'white', cubeFront: 'green',
    oledLine2: 'ao5', oledBootLogoData: null,
    quickSettings: []
};

const presetThemes = {
    'oled': { bg: '#000000', text: '#ffffff', acc: '#4CAF50', tColor: '#ffffff', glow: 'transparent' },
    'bliss': { bg: '#f0f4f8', text: '#1a1a1a', acc: '#2196F3', tColor: '#1a1a1a', glow: 'transparent' },
    'cappuccino': { bg: '#3e2723', text: '#d7ccc8', acc: '#ffb300', tColor: '#ffecb3', glow: 'rgba(255, 179, 0, 0.4)' },
    'mocha': { bg: '#4e342e', text: '#eefeeb', acc: '#8d6e63', tColor: '#ffffff', glow: 'transparent' },
    'neon': { bg: '#0f0f1b', text: '#e0e0e0', acc: '#ff00ff', tColor: '#00ffff', glow: 'rgba(0, 255, 255, 0.6)' }
};

const trainerAlgorithms = {
    "PLL": {
        "T Perm": "R U R' U' R' F R2 U' R' U' R U R' F'",
        "Jb Perm": "R U R' F' R U R' U' R' F R2 U' R' U'",
        "Y Perm": "F R U' R' U' R U R' F' R U R' U' R' F R F'",
        "Ua Perm": "R U' R U R U R U' R' U' R2",
        "Ub Perm": "R2 U R U R' U' R' U' R' U R'",
        "H Perm": "M2 U M2 U2 M2 U M2",
        "Z Perm": "M2 U M2 U M' U2 M2 U2 M' U2",
        "G Perm (Ga)": "R2 U R' U R' U' R U' R2 U' D R' U R D'"
    },
    "OLL": {
        "Sune (27)": "R U R' U R U2 R'",
        "Anti-Sune (26)": "R U2 R' U' R U' R'",
        "H (21)": "F R U R' U' R U R' U' F'",
        "Pi (22)": "R U2 R2 U' R2 U' R2 U2 R",
        "T (33)": "R U R' U' R' F R F'",
        "L (31)": "R' U' R U' R' U y' R' U R B"
    }
};

let sessions = []; let activeSessionId = null;
let currentTrainingMode = 'standard'; let bldMemoTime = 0;
let scrambleHistory = []; let scrambleViewIndex = 0; let pendingScramble = ""; let espInputBuffer = "";

let timerState = 'idle'; let startTime = 0; let finalTimeMs = 0; let timerInterval;
let inspectStartTime = 0; let inspectionInterval; let activeInspectionPenalty = 'OK';
let spaceHoldStart = 0; let holdInterval; let dummyOfflineSolves = [];
let alerted8 = false; let alerted12 = false;

// Splits Mode Data
let currentSplits = [];
let splitDebounceTime = 0;
let solveStartedClean = false;
const splitLabels = ['Cross', 'F2L', 'OLL', 'PLL'];

// Sensor States
let simLeft = false; let simRight = false; let wasBothDown = false;

// OLED Studio
let oledCanvasInitialized = false; let oledCanvas, oledCtx;
let isDrawingOled = false; let drawModeOled = 1;
let lastDrawX = 0, lastDrawY = 0;

// PB Global Trackers
let globalPbSingle = Infinity; let globalPbAo5 = Infinity; let globalPbAo12 = Infinity; let globalPbAo100 = Infinity;

// --- 1. INITIALIZATION, THEMES & UI ENGINE ---
document.addEventListener('DOMContentLoaded', () => {
    currentDevice = localStorage.getItem('stackmatDevice');
    if (!currentDevice) document.getElementById('setupModal').style.display = 'flex';
    else loadMainApp(currentDevice);
    loadSettings(); loadDatabase();
});

function showToast(msg) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div'); toast.className = 'toast'; toast.innerText = msg;
    container.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 3500);
}

function speakText(text) {
    if ('speechSynthesis' in window && appSettings.voiceAlerts) {
        let msg = new SpeechSynthesisUtterance(text); msg.rate = 1.2; window.speechSynthesis.speak(msg);
    }
}

function isLightColor(colorStr) {
    if (!colorStr) return false; let hex = colorStr.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(c => c+c).join('');
    const r = parseInt(hex.substring(0,2), 16) || 0; const g = parseInt(hex.substring(2,4), 16) || 0; const b = parseInt(hex.substring(4,6), 16) || 0;
    return (((r*299)+(g*587)+(b*114))/1000) >= 128;
}

function updateThemeCSS() {
    const r = document.documentElement;
    r.style.setProperty('--bg-color', appSettings.bgColor); r.style.setProperty('--text-color', appSettings.textColor);
    r.style.setProperty('--accent-color', appSettings.accentColor); r.style.setProperty('--timer-color', appSettings.timerColor);
    r.style.setProperty('--timer-glow', appSettings.timerGlow || 'transparent'); r.style.setProperty('--bg-image', appSettings.bgImage ? `url(${appSettings.bgImage})` : 'none');
    r.style.setProperty('--timer-font', appSettings.timerFont); r.style.setProperty('--timer-scale', appSettings.timerScale);
    r.style.setProperty('--focus-fade', appSettings.focusFadeTime + 's'); r.style.setProperty('--ui-opacity', appSettings.uiOpacity);
    r.style.setProperty('--ui-blur', (appSettings.uiBlur !== undefined ? appSettings.uiBlur : 10) + 'px');
    r.style.setProperty('--ui-radius', (appSettings.uiRadius !== undefined ? appSettings.uiRadius : 8) + 'px');

    let isLight = isLightColor(appSettings.bgColor); if(appSettings.bgImage) isLight = false; if(appSettings.themeName === 'bliss') isLight = true;
    if (isLight) {
        r.style.setProperty('--ui-panel-bg', `rgba(240, 240, 240, ${appSettings.uiOpacity})`); r.style.setProperty('--ui-card-bg', `rgba(255, 255, 255, ${appSettings.uiOpacity})`);
        r.style.setProperty('--ui-dark-bg', `rgba(220, 220, 220, ${appSettings.uiOpacity})`); r.style.setProperty('--ui-border', `rgba(0, 0, 0, 0.1)`); r.style.setProperty('--text-muted', `#666666`);
    } else {
        r.style.setProperty('--ui-panel-bg', `rgba(30, 30, 30, ${appSettings.uiOpacity})`); r.style.setProperty('--ui-card-bg', `rgba(45, 45, 45, ${appSettings.uiOpacity})`);
        r.style.setProperty('--ui-dark-bg', `rgba(20, 20, 20, ${appSettings.uiOpacity})`); r.style.setProperty('--ui-border', `rgba(255, 255, 255, 0.1)`); r.style.setProperty('--text-muted', `#aaaaaa`);
    }
}

function applyPresetTheme() {
    const val = document.getElementById('selTheme').value; if (val === 'custom') return;
    const t = presetThemes[val]; document.getElementById('valBgColor').value = t.bg; document.getElementById('valTextColor').value = t.text;
    document.getElementById('valAccentColor').value = t.acc; document.getElementById('valTimerColor').value = t.tColor;
    appSettings.themeName = val; appSettings.timerGlow = t.glow; saveSettings();
}

function setCustomTheme() { document.getElementById('selTheme').value = 'custom'; appSettings.themeName = 'custom'; }

function toggleQuickSetting(id, label, type, starElem) {
    if(!appSettings.quickSettings) appSettings.quickSettings = [];
    let idx = appSettings.quickSettings.findIndex(x => x.id === id);
    if(idx > -1) {
        appSettings.quickSettings.splice(idx, 1);
        starElem.classList.remove('active'); starElem.innerText = '☆';
    } else {
        if(appSettings.quickSettings.length >= 3) { showToast('Maximum 3 Quick Settings allowed.'); return; }
        appSettings.quickSettings.push({id, label, type}); starElem.classList.add('active'); starElem.innerText = '★';
    }
    saveSettings(); renderQuickPanel();
}

function toggleQuickPanel() {
    let p = document.getElementById('quickPanel'); p.style.display = p.style.display === 'none' ? 'block' : 'none';
}

function renderQuickPanel() {
    let c = document.getElementById('quickPanelContent'); c.innerHTML = '';
    if(!appSettings.quickSettings || appSettings.quickSettings.length === 0) {
        c.innerHTML = '<p style="color:var(--text-muted); font-size:0.9rem;">No quick settings added. Star them in the Settings tab!</p>'; return;
    }
    appSettings.quickSettings.forEach(qs => {
        let row = document.createElement('div'); row.style.marginBottom = '12px';
        if(qs.type === 'checkbox') {
            let val = document.getElementById(qs.id).checked;
            row.innerHTML = `<label style="display:flex; align-items:center; cursor:pointer; font-size:0.95rem; color:var(--text-color);"><input type="checkbox" class="setting-checkbox" style="transform:scale(1.2); margin-right:10px;" ${val?'checked':''} onchange="document.getElementById('${qs.id}').checked = this.checked; saveSettings();"> ${qs.label}</label>`;
        } else if(qs.type === 'range') {
            let val = document.getElementById(qs.id).value;
            row.innerHTML = `<div style="font-size:0.95rem; margin-bottom:5px; color:var(--text-color);">${qs.label}</div><input type="range" class="theme-range" style="width:100%;" min="${document.getElementById(qs.id).min}" max="${document.getElementById(qs.id).max}" step="${document.getElementById(qs.id).step || 1}" value="${val}" onchange="document.getElementById('${qs.id}').value = this.value; debouncedSave();" oninput="if(document.getElementById('${qs.id}').oninput) document.getElementById('${qs.id}').oninput({target: this});">`;
        } else if(qs.type === 'number') {
            let val = document.getElementById(qs.id).value;
            row.innerHTML = `<div style="display:flex; justify-content:space-between; align-items:center; font-size:0.95rem; color:var(--text-color);"><span>${qs.label}</span><input type="number" class="theme-select" style="width:60px; padding:2px;" value="${val}" onchange="document.getElementById('${qs.id}').value = this.value; debouncedSave();"></div>`;
        }
        c.appendChild(row);
    });
}

function loadSettings() {
    const saved = localStorage.getItem('archSenseSettings'); if (saved) { appSettings = { ...appSettings, ...JSON.parse(saved) }; }

    document.getElementById('chkInspection').checked = appSettings.inspectionEnabled; document.getElementById('valInspectionTime').value = appSettings.inspectionTime;
    document.getElementById('valInspGrace').value = appSettings.inspGrace; document.getElementById('valHoldDelay').value = appSettings.holdDelay;
    document.getElementById('valTrimPct').value = appSettings.trimPct; document.getElementById('valPlusPenalty').value = appSettings.plusPenalty;
    document.getElementById('valScrambleLen').value = appSettings.scrambleLen; document.getElementById('valTimerDecimals').value = appSettings.timerDecimals;
    document.getElementById('valTimerUpdateRate').value = appSettings.timerUpdateRate; document.getElementById('chkBatterySaver').checked = appSettings.batterySaver;
    document.getElementById('chkVoice').checked = appSettings.voiceAlerts;
    document.getElementById('valSleepTimeout').value = appSettings.sleepTimeout;
    document.getElementById('valThreshold').value = appSettings.sensorThreshold; document.getElementById('lblThreshold').innerText = appSettings.sensorThreshold;
    document.getElementById('valDebounce').value = appSettings.sensorDebounce; document.getElementById('lblDebounce').innerText = appSettings.sensorDebounce + 'ms';

    if(appSettings.scrambleMoves) { document.querySelectorAll('#scrambleMovesCheckboxes input').forEach(cb => { cb.checked = appSettings.scrambleMoves.includes(cb.value); }); }

    document.getElementById('selTheme').value = appSettings.themeName || 'oled'; document.getElementById('selFont').value = appSettings.timerFont || "'Roboto Mono', monospace";
    document.getElementById('valTimerScale').value = appSettings.timerScale || 1.0; document.getElementById('lblTimerScale').innerText = (appSettings.timerScale || 1.0) + 'x';
    document.getElementById('valBgColor').value = appSettings.bgColor || '#121212'; document.getElementById('valTextColor').value = appSettings.textColor || '#ffffff';
    document.getElementById('valAccentColor').value = appSettings.accentColor || '#4CAF50'; document.getElementById('valTimerColor').value = appSettings.timerColor || '#ffffff';
    document.getElementById('valBgImage').value = appSettings.bgImage || '';

    document.getElementById('valUiOpacity').value = appSettings.uiOpacity !== undefined ? appSettings.uiOpacity : 1.0;
    document.getElementById('lblUiOpacity').innerText = appSettings.uiOpacity !== undefined ? appSettings.uiOpacity : 1.0;
    document.getElementById('valRadius').value = appSettings.uiRadius !== undefined ? appSettings.uiRadius : 8;
    document.getElementById('lblRadius').innerText = (appSettings.uiRadius !== undefined ? appSettings.uiRadius : 8) + 'px';
    document.getElementById('valBlur').value = appSettings.uiBlur !== undefined ? appSettings.uiBlur : 10;
    document.getElementById('lblBlur').innerText = (appSettings.uiBlur !== undefined ? appSettings.uiBlur : 10) + 'px';

    document.getElementById('selCubeTop').value = appSettings.cubeTop || 'white';
    document.getElementById('selCubeFront').value = appSettings.cubeFront || 'green';

    document.getElementById('selFocusStyle').value = appSettings.focusStyle || 'fade'; document.getElementById('valFocusFade').value = appSettings.focusFadeTime !== undefined ? appSettings.focusFadeTime : 0.5;
    document.getElementById('lblFocusFade').innerText = (appSettings.focusFadeTime !== undefined ? appSettings.focusFadeTime : 0.5) + 's';

    document.getElementById('btnPenaltyPlus').innerText = `+${appSettings.plusPenalty / 1000}`;
    document.getElementById('selOledLine2').value = appSettings.oledLine2 || 'ao5';
    updateOledPreview();

    document.querySelectorAll('.star-btn').forEach(btn => {
        let id = btn.getAttribute('data-id');
        if(appSettings.quickSettings && appSettings.quickSettings.find(x => x.id === id)) { btn.classList.add('active'); btn.innerText = '★'; }
        else { btn.classList.remove('active'); btn.innerText = '☆'; }
    });
    renderQuickPanel();

    updateThemeCSS(); if(currentDevice) loadMainApp(currentDevice);
}

function debouncedSave() { clearTimeout(saveTimeout); saveTimeout = setTimeout(() => { saveSettings(); }, 500); }

async function saveSettings() {
    let selectedMoves = Array.from(document.querySelectorAll('#scrambleMovesCheckboxes input:checked')).map(cb => cb.value);
    if (selectedMoves.length < 2) { alert("You must select at least 2 moves for the scramble generator to work."); loadSettings(); return; }

    appSettings.inspectionEnabled = document.getElementById('chkInspection').checked; appSettings.inspectionTime = parseInt(document.getElementById('valInspectionTime').value) || 15;
    appSettings.inspGrace = parseInt(document.getElementById('valInspGrace').value) || 2; appSettings.holdDelay = parseFloat(document.getElementById('valHoldDelay').value) || 0.6;
    appSettings.trimPct = parseInt(document.getElementById('valTrimPct').value) || 5; appSettings.plusPenalty = parseInt(document.getElementById('valPlusPenalty').value) || 2000;
    appSettings.scrambleLen = parseInt(document.getElementById('valScrambleLen').value) || 20; appSettings.timerDecimals = parseInt(document.getElementById('valTimerDecimals').value) || 3;
    appSettings.timerUpdateRate = parseInt(document.getElementById('valTimerUpdateRate').value) || 10; appSettings.scrambleMoves = selectedMoves;
    appSettings.batterySaver = document.getElementById('chkBatterySaver').checked; appSettings.sleepTimeout = parseInt(document.getElementById('valSleepTimeout').value) || 30;
    appSettings.voiceAlerts = document.getElementById('chkVoice').checked;
    appSettings.sensorThreshold = parseInt(document.getElementById('valThreshold').value) || 40; appSettings.sensorDebounce = parseInt(document.getElementById('valDebounce').value) || 15;

    appSettings.timerFont = document.getElementById('selFont').value; appSettings.timerScale = parseFloat(document.getElementById('valTimerScale').value);
    appSettings.bgColor = document.getElementById('valBgColor').value; appSettings.textColor = document.getElementById('valTextColor').value;
    appSettings.accentColor = document.getElementById('valAccentColor').value; appSettings.timerColor = document.getElementById('valTimerColor').value;
    appSettings.bgImage = document.getElementById('valBgImage').value;
    appSettings.uiOpacity = parseFloat(document.getElementById('valUiOpacity').value);
    appSettings.uiRadius = parseInt(document.getElementById('valRadius').value) || 0;
    appSettings.uiBlur = parseInt(document.getElementById('valBlur').value) || 0;
    appSettings.focusStyle = document.getElementById('selFocusStyle').value; appSettings.focusFadeTime = parseFloat(document.getElementById('valFocusFade').value);
    appSettings.cubeTop = document.getElementById('selCubeTop').value; appSettings.cubeFront = document.getElementById('selCubeFront').value;
    appSettings.oledLine2 = document.getElementById('selOledLine2').value;

    updateThemeCSS(); localStorage.setItem('archSenseSettings', JSON.stringify(appSettings)); document.getElementById('btnPenaltyPlus').innerText = `+${appSettings.plusPenalty / 1000}`;
    if(timerState === 'idle' || timerState === 'stopped') setMainTimer(formatTime(finalTimeMs));
    updateStatsUI(); updateScrambleDisplay(); syncBoardConfig();
}

async function syncBoardConfig() {
    const session = getActiveSession(); const profile = session.hwProfile || 'performance';
    let isStealth = (profile === 'stealth'); let sleepFlag = appSettings.batterySaver ? 1 : 0; if (isStealth) sleepFlag = 1;
    const inspFlag = appSettings.inspectionEnabled ? 1 : 0;

    const configCmd = `CFG:SLEEP:${sleepFlag}:${appSettings.sleepTimeout}|INSP:${inspFlag}:${appSettings.inspectionTime}:${appSettings.inspGrace}|SENS:${appSettings.sensorThreshold}:${appSettings.sensorDebounce}|PROF:${profile.toUpperCase()}\n`;

    console.log("Syncing Config to Board:", configCmd);
    if(currentDevice !== 'keyboard') showToast("⚙️ Board Sync: " + profile.toUpperCase() + " Profile");

    document.getElementById('statusIcon').innerText = '🟢'; document.getElementById('battIcon').innerText = '🔋 87%';

    if (serialPort && serialPort.writable) {
        try {
            const writer = serialPort.writable.getWriter();
            await writer.write(new TextEncoder().encode(configCmd));
            writer.releaseLock();
        } catch (e) { document.getElementById('statusIcon').innerText = '🔴'; }
    }
}

// --- 2. DATA & SESSION MANAGEMENT ---
function loadDatabase() {
    const savedSessions = localStorage.getItem('archSenseSessions'); const savedActiveId = localStorage.getItem('archSenseActiveSessionId');
    if (savedSessions) { sessions = JSON.parse(savedSessions); activeSessionId = savedActiveId ? parseInt(savedActiveId) : sessions[0].id; }
    else {
        const legacyData = localStorage.getItem('stackmatSessionData');
        if (legacyData) sessions = [{ id: Date.now(), name: "Session 1", solves: JSON.parse(legacyData), hwProfile: 'performance' }];
        else sessions = [{ id: Date.now(), name: "Session 1", solves: [], hwProfile: 'performance' }];
        activeSessionId = sessions[0].id; persistDatabase();
    }
    ensureProfiles(); updateSessionUI(); updateStatsUI(); generateScramble();
}

function ensureProfiles() { sessions.forEach(s => { if(!s.hwProfile) s.hwProfile = 'performance'; }); }
function persistDatabase() { localStorage.setItem('archSenseSettings', JSON.stringify(appSettings)); localStorage.setItem('archSenseSessions', JSON.stringify(sessions)); localStorage.setItem('archSenseActiveSessionId', activeSessionId.toString()); }
function getActiveSession() { return sessions.find(s => s.id === activeSessionId) || sessions[0]; }
function getFilteredSolves() {
    let session = getActiveSession();
    if(!session) return [];
    if (currentTrainingMode === 'alg-trainer') return session.solves.filter(s => s.mode === 'alg-trainer' && s.algCase === document.getElementById('algCaseSelect').value);
    return session.solves.filter(s => (s.mode || 'standard') === currentTrainingMode);
}

function updateSessionUI() {
    const dropdown = document.getElementById('sessionDropdown'); dropdown.innerHTML = '';
    sessions.forEach(s => { let opt = document.createElement('option'); opt.value = s.id; opt.innerText = `${s.name} (${s.solves.length})`; if (s.id === activeSessionId) opt.selected = true; dropdown.appendChild(opt); });
    const activeName = getActiveSession().name; document.getElementById('sessionTitle').innerText = activeName; document.getElementById('dangerZoneSessionName').innerText = activeName;
}

function switchSession(id) { activeSessionId = parseInt(id); persistDatabase(); updateSessionUI(); updateStatsUI(); scrambleViewIndex = getFilteredSolves().length; updateScrambleDisplay(); syncBoardConfig(); }
function createNewSession() { const newId = Date.now(); sessions.push({ id: newId, name: `Session ${sessions.length + 1}`, solves: [], hwProfile: 'performance' }); activeSessionId = newId; persistDatabase(); updateSessionUI(); updateStatsUI(); renderSessionManagerList(); generateScramble(); syncBoardConfig(); }
function clearCurrentSession() { if(confirm(`Are you sure you want to delete all solves in "${getActiveSession().name}"?`)) { getActiveSession().solves = []; persistDatabase(); updateSessionUI(); updateStatsUI(); scrambleViewIndex = 0; updateScrambleDisplay(); openPage('page-timer', 'Main Timer', document.querySelector('.nav-btn')); } }
function openSessionManager() { renderSessionManagerList(); document.getElementById('sessionModal').style.display = 'flex'; }
function closeSessionManager() { document.getElementById('sessionModal').style.display = 'none'; }

function renderSessionManagerList() {
    const container = document.getElementById('sessionListContainer'); container.innerHTML = '';
    sessions.forEach((s, index) => {
        let row = document.createElement('div'); row.className = 'session-row';
        let upBtn = document.createElement('button'); upBtn.className = 'session-row-btn'; upBtn.innerText = '↑';
        if (index === 0) { upBtn.disabled = true; upBtn.style.opacity = '0.3'; } else upBtn.onclick = () => moveSession(index, -1); row.appendChild(upBtn);
        let dnBtn = document.createElement('button'); dnBtn.className = 'session-row-btn'; dnBtn.innerText = '↓';
        if (index === sessions.length - 1) { dnBtn.disabled = true; dnBtn.style.opacity = '0.3'; } else dnBtn.onclick = () => moveSession(index, 1); row.appendChild(dnBtn);
        let input = document.createElement('input'); input.type = 'text'; input.value = s.name; input.oninput = (e) => renameSession(s.id, e.target.value); row.appendChild(input);

        let profileSel = document.createElement('select'); profileSel.className = 'theme-select'; profileSel.style.width = '120px'; profileSel.style.fontSize = '0.9rem';
        profileSel.innerHTML = `<option value="performance" ${s.hwProfile==='performance'?'selected':''}>Performance</option><option value="stealth" ${s.hwProfile==='stealth'?'selected':''}>Stealth (BLD)</option>`;
        profileSel.onchange = (e) => { s.hwProfile = e.target.value; persistDatabase(); if(activeSessionId === s.id) syncBoardConfig(); };
        row.appendChild(profileSel);

        let span = document.createElement('span'); span.style.color = 'var(--text-muted)'; span.style.fontSize = '0.9rem'; span.style.minWidth = '60px'; span.style.textAlign = 'right'; span.innerText = `${s.solves.length} solves`; row.appendChild(span);
        let delBtn = document.createElement('button'); delBtn.className = 'session-row-btn del'; delBtn.innerText = '🗑️';
        if (sessions.length === 1) delBtn.disabled = true; else delBtn.onclick = () => deleteSession(s.id); row.appendChild(delBtn);
        container.appendChild(row);
    });
}

function renameSession(id, newName) { let s = sessions.find(x => x.id === id); if (s) { s.name = newName; persistDatabase(); updateSessionUI(); } }
function moveSession(index, direction) { if (index + direction >= 0 && index + direction < sessions.length) { let temp = sessions[index]; sessions[index] = sessions[index + direction]; sessions[index + direction] = temp; persistDatabase(); updateSessionUI(); renderSessionManagerList(); } }
function deleteSession(id) { if (sessions.length <= 1) return; if (confirm("Delete this session forever? This cannot be undone.")) { sessions = sessions.filter(s => s.id !== id); if (activeSessionId === id) activeSessionId = sessions[0].id; persistDatabase(); updateSessionUI(); updateStatsUI(); scrambleViewIndex = getFilteredSolves().length; updateScrambleDisplay(); renderSessionManagerList(); } }

// --- 3. UI NAVIGATION & HARDWARE RENDER ---
function selectDevice(deviceType) { localStorage.setItem('stackmatDevice', deviceType); document.getElementById('setupModal').style.display = 'none'; loadMainApp(deviceType); }

function loadMainApp(deviceType) {
    currentDevice = deviceType; document.getElementById('mainApp').style.display = 'block';
    let deviceName = deviceType === 'ghost' ? 'Arduino UNO (USB Serial)' : (deviceType === 'esp' ? 'ESP32-C3 (Bluetooth BLE)' : 'Keyboard Debug Mode');
    document.getElementById('activeDeviceDisplay').innerText = deviceName;
    const usbBtn = document.getElementById('btnConnectSerial'); const hwBlock = document.getElementById('hardwareSettingsBlock'); const lblSaver = document.getElementById('lblBatterySaver'); const offlineBtn = document.getElementById('btnImportOffline');
    const dynamicSettings = document.getElementById('dynamicBoardSettings'); const softwareAnchor = document.getElementById('softwareSettingsAnchor'); const hardwareAnchor = document.getElementById('hardwareSettingsAnchor');
    usbBtn.style.display = 'none'; hwBlock.style.display = 'none'; offlineBtn.style.display = 'none';

    if (currentDevice === 'ghost') {
        if (!serialPort) usbBtn.style.display = 'inline-block'; hwBlock.style.display = 'block'; lblSaver.innerText = 'Turn off Arduino LEDs (Battery Saver)';
        if (dynamicSettings && softwareAnchor) softwareAnchor.appendChild(dynamicSettings);
        document.getElementById('proOledSettings').style.display = 'none';
    } else if (currentDevice === 'esp') {
        hwBlock.style.display = 'block'; lblSaver.innerText = 'Turn off OLED Screen (Battery Saver)'; offlineBtn.style.display = 'inline-block';
        if (dynamicSettings && hardwareAnchor) hardwareAnchor.appendChild(dynamicSettings);
        document.getElementById('proOledSettings').style.display = 'block';
        initOledCanvas();
        if(!appSettings.batterySaver) setMainTimer("Board Active"); else setMainTimer(formatTime(finalTimeMs));
    } else {
        if (dynamicSettings && softwareAnchor) softwareAnchor.appendChild(dynamicSettings);
        document.getElementById('proOledSettings').style.display = 'none';
        setMainTimer(formatTime(finalTimeMs));
    }
}

function resetSetup() { localStorage.removeItem('stackmatDevice'); location.reload(); }
function togglePanel() { const panel = document.getElementById('sidePanel'); const mainContent = document.getElementById('mainContent'); const toggleBtn = document.getElementById('mainToggleBtn'); panel.classList.toggle('open'); mainContent.classList.toggle('shifted'); toggleBtn.innerText = panel.classList.contains('open') ? '✖ Close' : '☰ Menu'; }

function openPage(pageId, pageTitleText, btnElement) {
    if (btnElement.classList.contains('active')) return;
    document.querySelectorAll('.page-view').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(pageId).classList.add('active'); btnElement.classList.add('active'); document.getElementById('pageTitle').innerText = pageTitleText;
    if (pageId === 'page-analytics') updateAnalyticsUI();
}

function setMainTimer(text, colorStr) {
    const el = document.getElementById('mainTimerText');
    el.innerText = text;
    if (colorStr) el.style.color = colorStr;
    else colorStr = el.style.color;

    obsChannel.postMessage({ text: text, color: colorStr });
}

function openOBSMode() {
    const obsWin = window.open("", "OBSTimer", "width=800,height=300");
    const obsHtml = `
    <!DOCTYPE html>
    <html>
    <head>
    <title>OBS Timer Window</title>
    <link href="https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@700&display=swap" rel="stylesheet">
    <style>
    body { background-color: #00FF00; margin: 0; display: flex; justify-content: center; align-items: center; height: 100vh; overflow: hidden; }
    #timer { font-family: 'Roboto Mono', monospace; font-size: 25vw; font-weight: bold; color: white; text-shadow: 2px 2px 5px rgba(0,0,0,0.5); font-variant-numeric: tabular-nums; }
    </style>
    </head>
    <body>
    <div id="timer">0.000</div>
    <script>
    const channel = new BroadcastChannel('archsense_obs_sync');
    const timerEl = document.getElementById('timer');
    channel.onmessage = (e) => {
        if (e.data.text) timerEl.innerText = e.data.text;
        if (e.data.color) {
            let c = e.data.color;
            if (c.includes('var(')) c = 'white';
                timerEl.style.color = c;
        }
    };
    <\/script>
    </body>
    </html>
    `;
    obsWin.document.open();
    obsWin.document.write(obsHtml);
    obsWin.document.close();
}

// --- 4. TRAINING MODES & CUBE VISUALIZER ---
function setTrainingMode(mode, btnElement) {
    currentTrainingMode = mode; document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active')); btnElement.classList.add('active');

    let algControls = document.getElementById('algTrainerControls');
    if (mode === 'alg-trainer') {
        algControls.style.display = 'flex';
        updateAlgCases();
    } else {
        algControls.style.display = 'none';
        scrambleViewIndex = getFilteredSolves().length; updateScrambleDisplay();
    }

    updateStatsUI();
    document.getElementById('bldSubText').style.display = 'none'; setMainTimer(formatTime(0));
}

// Alg Trainer Methods
function updateAlgCases() {
    let set = document.getElementById('algSetSelect').value;
    let caseSel = document.getElementById('algCaseSelect');
    caseSel.innerHTML = '';
    for(let c in trainerAlgorithms[set]) {
        let opt = document.createElement('option');
        opt.value = c; opt.innerText = c;
        caseSel.appendChild(opt);
    }
    generateTrainerScramble();
}

function invertAlg(alg) {
    let moves = alg.trim().split(/\s+/).reverse();
    return moves.map(m => {
        if(m.includes("'")) return m[0];
        if(m.includes("2")) return m;
        return m + "'";
    }).join(' ');
}

function generateTrainerScramble() {
    let set = document.getElementById('algSetSelect').value;
    let algName = document.getElementById('algCaseSelect').value;
    let alg = trainerAlgorithms[set][algName];

    let aufs = ["", "U ", "U' ", "U2 "];
    let preAuf = aufs[Math.floor(Math.random()*4)];
    let postAuf = aufs[Math.floor(Math.random()*4)];

    pendingScramble = (preAuf + invertAlg(alg) + " " + postAuf).trim().replace(/\s+/g, ' ');
    document.getElementById('algPreview').innerText = `Solution: ${alg}`;

    scrambleViewIndex = getFilteredSolves().length;
    updateScrambleDisplay();
    updateStatsUI(); // refresh stats for this specific case
}

function createCubeState() {
    let state = new Array(54);
    for(let i=0; i<9; i++) state[i] = 0; for(let i=9; i<18; i++) state[i] = 1; for(let i=18; i<27; i++) state[i] = 2;
                for(let i=27; i<36; i++) state[i] = 3; for(let i=36; i<45; i++) state[i] = 4; for(let i=45; i<54; i++) state[i] = 5; return state;
}

function cycle(s, arr) { let temp = s[arr[3]]; s[arr[3]] = s[arr[2]]; s[arr[2]] = s[arr[1]]; s[arr[1]] = s[arr[0]]; s[arr[0]] = temp; }

function turnFace(s, face, dir) {
    for(let i=0; i<dir; i++) {
        let base = face * 9; cycle(s, [base+0, base+2, base+8, base+6]); cycle(s, [base+1, base+5, base+7, base+3]);
        if(face === 0) { cycle(s, [47, 11, 20, 38]); cycle(s, [46, 10, 19, 37]); cycle(s, [45, 9, 18, 36]); }
        else if(face === 1) { cycle(s, [8, 45, 35, 26]); cycle(s, [5, 48, 32, 23]); cycle(s, [2, 51, 29, 20]); }
        else if(face === 2) { cycle(s, [6, 9, 29, 44]); cycle(s, [7, 12, 28, 41]); cycle(s, [8, 15, 27, 38]); }
        else if(face === 3) { cycle(s, [24, 15, 51, 42]); cycle(s, [25, 16, 52, 43]); cycle(s, [26, 17, 53, 44]); }
        else if(face === 4) { cycle(s, [0, 18, 27, 53]); cycle(s, [3, 21, 30, 50]); cycle(s, [6, 24, 33, 47]); }
        else if(face === 5) { cycle(s, [2, 36, 35, 17]); cycle(s, [1, 39, 34, 14]); cycle(s, [0, 42, 33, 11]); }
    }
}

function applyScrambleToState(scrambleStr) {
    let s = createCubeState(); if(!scrambleStr) return s;
    let moves = scrambleStr.trim().split(/\s+/); let faces = {'U':0, 'R':1, 'F':2, 'D':3, 'L':4, 'B':5};
    moves.forEach(m => { if(!m) return; let f = faces[m[0]]; let d = 1; if(m.includes("'")) d = 3; if(m.includes("2")) d = 2; if(f !== undefined) turnFace(s, f, d); }); return s;
}

function getCubeColors() {
    const top = appSettings.cubeTop || 'white'; const front = appSettings.cubeFront || 'green';
    const colorMap = { 'white': '#ffffff', 'yellow': '#ffeb3b', 'green': '#4CAF50', 'blue': '#2196f3', 'red': '#f44336', 'orange': '#ff9800' };
    const axes = ['green', 'red', 'blue', 'orange'];

    let U = colorMap[top]; let D = colorMap[top === 'white' ? 'yellow' : 'white'];
    let F = colorMap[front]; let B = colorMap[front === 'green' ? 'blue' : (front === 'blue' ? 'green' : (front === 'red' ? 'orange' : 'red'))];

    let fIdx = axes.indexOf(front); let R, L;
    if (top === 'white') { R = colorMap[axes[(fIdx + 1) % 4]]; L = colorMap[axes[(fIdx + 3) % 4]]; }
    else { R = colorMap[axes[(fIdx + 3) % 4]]; L = colorMap[axes[(fIdx + 1) % 4]]; }
    return [U, R, F, D, L, B];
}

function renderCube(state) {
    let container = document.getElementById('cubeVisualizer'); container.innerHTML = '';
    let isCross = (currentTrainingMode === 'cross'); let crossIndices = [4, 1, 3, 5, 7, 46, 37, 10, 19];
    const cubeColors = getCubeColors();

    for(let i=0; i<54; i++) {
        let div = document.createElement('div'); div.className = 'cube-piece'; div.style.backgroundColor = cubeColors[state[i]];
        if(isCross && !crossIndices.includes(i)) { div.style.filter = 'brightness(0.3) grayscale(0.8)'; div.style.borderColor = 'transparent'; }
        let face = Math.floor(i/9); let idx = i%9; let row = Math.floor(idx/3); let col = idx%3; let gRow = 0, gCol = 0;
        if(face===0) { gRow=row; gCol=col+3; } else if(face===4) { gRow=row+3; gCol=col; } else if(face===2) { gRow=row+3; gCol=col+3; } else if(face===1) { gRow=row+3; gCol=col+6; } else if(face===5) { gRow=row+3; gCol=col+9; } else if(face===3) { gRow=row+6; gCol=col+3; }
        div.style.gridRow = gRow + 1; div.style.gridColumn = gCol + 1; container.appendChild(div);
    }
}

function setFocusMode(active) {
    if (active) {
        if(document.getElementById('sidePanel').classList.contains('open')) togglePanel();
                document.getElementById('quickPanel').style.display = 'none';
        document.body.classList.add('focus-mode'); document.body.classList.add('focus-style-' + appSettings.focusStyle);
    }
    else { document.body.classList.remove('focus-mode', 'focus-style-fade', 'focus-style-vignette', 'focus-style-black'); }
}

// --- 5. HARDWARE LOGIC (WEB SERIAL, DIAGNOSTICS, SPLITS) ---

function updateDiagnosticsUI(l, r) {
    let diagL = document.getElementById('diagLeft'); let diagR = document.getElementById('diagRight');
    if(diagL) l ? diagL.classList.add('active') : diagL.classList.remove('active');
                if(diagR) r ? diagR.classList.add('active') : diagR.classList.remove('active');
}

function updateSplitsDisplay(forceEnd = false) {
    let bldEl = document.getElementById('bldSubText');
    bldEl.style.display = 'block';
    let htmlStr = "";
    for(let i=0; i<currentSplits.length; i++) {
        let seg = i === 0 ? currentSplits[0] : currentSplits[i] - currentSplits[i-1];
        htmlStr += `<span style="color:var(--accent-color); font-weight:bold;">${splitLabels[i]}:</span> ${formatTime(seg)} &nbsp;&nbsp;`;
    }
    if (forceEnd && currentSplits.length < 4) {
        let prevTime = currentSplits.length > 0 ? currentSplits[currentSplits.length-1] : 0;
        let finalSeg = finalTimeMs - prevTime;
        let label = splitLabels[currentSplits.length] || 'End';
        htmlStr += `<span style="color:var(--accent-color); font-weight:bold;">${label}:</span> ${formatTime(finalSeg)}`;
    }
    bldEl.innerHTML = htmlStr;
}

function handleSinglePadHit() {
    if (!document.getElementById('page-timer').classList.contains('active')) return;
                if (!solveStartedClean) return;

                if (timerState === 'running' && currentTrainingMode === 'splits') {
                    let now = Date.now();
                    if (now - splitDebounceTime > 500) {
                        splitDebounceTime = now;
                        let splitTimeMs = now - startTime;
                        if (currentSplits.length < 3) {
                            currentSplits.push(splitTimeMs);
                            updateSplitsDisplay(false);
                        }
                    }
                }
}

async function connectWebSerial() {
    try {
        if (!("serial" in navigator)) { alert("Your browser does not support Web Serial."); return; }
        serialPort = await navigator.serial.requestPort(); await serialPort.open({ baudRate: 115200 });
        document.getElementById('btnConnectSerial').style.display = 'none'; syncBoardConfig();

        const textDecoder = new TextDecoderStream(); const readableStreamClosed = serialPort.readable.pipeTo(textDecoder.writable); serialReader = textDecoder.readable.getReader();
        let buffer = "";

        while (true) {
            const { value, done } = await serialReader.read(); if (done) break;
            buffer += value; let lines = buffer.split('\n'); buffer = lines.pop();

            for (let line of lines) {
                line = line.trim();
                if (line.startsWith("RAW:L")) {
                    let lVal = line.charAt(5) === '1'; let rVal = line.charAt(8) === '1';

                    updateDiagnosticsUI(lVal, rVal);
                    let bothNow = lVal && rVal; let oneNow = lVal || rVal;

                    if (!oneNow) solveStartedClean = true;

                if (bothNow && !wasBothDown) { handlePadDown(); wasBothDown = true; }
                else if (!bothNow && wasBothDown) { handlePadUp(); wasBothDown = false; }

                if (!bothNow && oneNow && timerState === 'running') { handleSinglePadHit(); }
                }
                else if (line === "DOWN") handlePadDown(); else if (line === "UP") handlePadUp();
            }
        }
    } catch (error) { serialPort = null; document.getElementById('btnConnectSerial').style.display = 'inline-block'; }
}

// --- KEYBOARD SIMULATION & HOOKS ---
document.addEventListener('keydown', (e) => {
    if (currentDevice === 'esp' && !appSettings.batterySaver) {
        if ((e.key >= '0' && e.key <= '9') || e.key === '.' || e.key === ':') espInputBuffer += e.key; else if (e.key === 'Enter') { if (espInputBuffer.length > 0) { processESPTime(espInputBuffer); espInputBuffer = ""; } } else if (e.key === 'Backspace' || e.key === 'Escape') espInputBuffer = ""; return;
    }

    if (currentDevice === 'keyboard') {
        if (e.code === 'ArrowLeft') simLeft = true; if (e.code === 'ArrowRight') simRight = true; if (e.code === 'Space') { simLeft = true; simRight = true; }
        updateDiagnosticsUI(simLeft, simRight);
        let bothNow = simLeft && simRight; let oneNow = simLeft || simRight;

        if (bothNow && !wasBothDown) { handlePadDown(); wasBothDown = true; }
        if (!bothNow && oneNow && timerState === 'running') { handleSinglePadHit(); }
    } else {
        if (e.code === 'Space' && !e.repeat) handlePadDown();
    }
});

document.addEventListener('keyup', (e) => {
    if (currentDevice === 'esp' && !appSettings.batterySaver) return;

    if (currentDevice === 'keyboard') {
        if (e.code === 'ArrowLeft') simLeft = false; if (e.code === 'ArrowRight') simRight = false; if (e.code === 'Space') { simLeft = false; simRight = false; }
        updateDiagnosticsUI(simLeft, simRight);
        let bothNow = simLeft && simRight; let oneNow = simLeft || simRight;

        if (!oneNow) solveStartedClean = true;

        if (!bothNow && wasBothDown) { handlePadUp(); wasBothDown = false; }
    } else {
        if (e.code === 'Space') handlePadUp();
    }
});

function processESPTime(timeStr) {
    let ms = 0; let parts = timeStr.split(':');
    if (parts.length === 2) { ms += parseInt(parts[0]) * 60000; ms += parseFloat(parts[1]) * 1000; } else ms += parseFloat(timeStr) * 1000;
                finalTimeMs = Math.round(ms); setMainTimer(formatTime(finalTimeMs)); saveSolve('OK');
                setTimeout(() => { if (currentDevice === 'esp' && !appSettings.batterySaver && timerState === 'idle') setMainTimer("Board Active"); }, 2000);
}

function handlePadDown() {
    if (!document.getElementById('page-timer').classList.contains('active')) return;

                if(currentTrainingMode === 'bld') {
                    if(timerState === 'idle' || timerState === 'stopped') {
                        document.getElementById('penalty-controls').style.display = 'none'; timerState = 'starting_hold'; spaceHoldStart = Date.now();
                        setMainTimer(formatTime(0), '#d32f2f');
                        holdInterval = setInterval(() => { if (Date.now() - spaceHoldStart > (appSettings.holdDelay * 1000)) { timerState = 'ready'; setMainTimer(formatTime(0), 'var(--accent-color)'); setFocusMode(true); clearInterval(holdInterval); } }, 50);
                    } else if(timerState === 'bld_memo') { bldMemoTime = Date.now() - startTime; timerState = 'bld_exec_pressed'; } else if(timerState === 'bld_exec') { stopTimer(); } return;
                }
                if (timerState === 'idle' || timerState === 'stopped') {
                    document.getElementById('penalty-controls').style.display = 'none';
                    if (appSettings.inspectionEnabled) {
                        timerState = 'inspecting_starting'; setFocusMode(true);
                        setMainTimer(appSettings.inspectionTime.toString(), '#ff9800');
                    }
                    else {
                        timerState = 'starting_hold'; activeInspectionPenalty = 'OK'; spaceHoldStart = Date.now();
                        setMainTimer(formatTime(0), '#d32f2f');
                        holdInterval = setInterval(() => { if (Date.now() - spaceHoldStart > (appSettings.holdDelay * 1000)) { timerState = 'ready'; setMainTimer(formatTime(0), 'var(--accent-color)'); setFocusMode(true); clearInterval(holdInterval); } }, 50);
                    }
                } else if (timerState === 'inspecting') {
                    timerState = 'inspecting_holding'; spaceHoldStart = Date.now();
                    setMainTimer(document.getElementById('mainTimerText').innerText, '#d32f2f');
                    holdInterval = setInterval(() => { if (Date.now() - spaceHoldStart > (appSettings.holdDelay * 1000)) { timerState = 'ready'; setMainTimer(formatTime(0), 'var(--accent-color)'); setFocusMode(true); clearInterval(holdInterval); } }, 50);
                } else if (timerState === 'running') { stopTimer(); }
}

function handlePadUp() {
    if (!document.getElementById('page-timer').classList.contains('active')) return;

                if(currentTrainingMode === 'bld') {
                    if(timerState === 'starting_hold') { clearInterval(holdInterval); timerState = 'idle'; setFocusMode(false); setMainTimer(formatTime(0), 'var(--timer-color)'); } else if(timerState === 'ready') { clearInterval(holdInterval); startTimer(); } else if(timerState === 'bld_exec_pressed') { timerState = 'bld_exec'; } return;
                }
                if (timerState === 'inspecting_starting') { timerState = 'inspecting'; startInspection(); }
                else if (timerState === 'inspecting_holding') { clearInterval(holdInterval); timerState = 'inspecting'; setMainTimer(document.getElementById('mainTimerText').innerText, '#ff9800'); }
                else if (timerState === 'starting_hold') { clearInterval(holdInterval); timerState = 'idle'; setFocusMode(false); setMainTimer(formatTime(0), 'var(--timer-color)'); }
                else if (timerState === 'ready') { clearInterval(holdInterval); clearInterval(inspectionInterval); startTimer(); }
}

function startInspection() {
    inspectStartTime = Date.now(); activeInspectionPenalty = 'OK';
    setMainTimer(appSettings.inspectionTime.toString(), '#ff9800');
    alerted8 = false; alerted12 = false;

    inspectionInterval = setInterval(() => {
        let elapsedMs = Date.now() - inspectStartTime; let elapsedSec = Math.floor(elapsedMs / 1000); let remaining = appSettings.inspectionTime - elapsedSec;

        if (appSettings.voiceAlerts) {
            if (elapsedSec === 8 && !alerted8) { speakText("Eight seconds"); alerted8 = true; }
            if (elapsedSec === 12 && !alerted12) { speakText("Twelve seconds"); alerted12 = true; }
        }

        if (remaining <= 0 && remaining > -appSettings.inspGrace) activeInspectionPenalty = '+2'; else if (remaining <= -appSettings.inspGrace) activeInspectionPenalty = 'DNF';
        if (timerState !== 'ready') {
            let displayStr = "DNF"; if (remaining > 0) displayStr = remaining; else if (remaining <= 0 && remaining > -appSettings.inspGrace) displayStr = "+2";
            setMainTimer(displayStr.toString(), remaining > 0 ? '#ff9800' : '#d32f2f');
        }
    }, 100);
}

function startTimer() {
    if(currentTrainingMode === 'bld') { timerState = 'bld_memo'; setMainTimer(formatTime(0), '#2196f3'); }
    else { timerState = 'running'; setMainTimer(formatTime(0), 'var(--timer-color)'); }
    document.getElementById('bldSubText').style.display = 'none';

    currentSplits = [];
    splitDebounceTime = Date.now();
    solveStartedClean = false;
    startTime = Date.now();

    timerInterval = setInterval(() => {
        let c = 'var(--timer-color)';
        if(timerState === 'bld_exec' || timerState === 'bld_exec_pressed') c = '#f44336';
        setMainTimer(formatTime(Date.now() - startTime), c);
    }, appSettings.timerUpdateRate);
}

function stopTimer() {
    timerState = 'stopped'; clearInterval(timerInterval); finalTimeMs = Date.now() - startTime; setFocusMode(false);

    if (currentTrainingMode === 'splits' && currentSplits.length > 0) {
        if (finalTimeMs - currentSplits[currentSplits.length - 1] < 300) { currentSplits.pop(); }
    }

    saveSolve(activeInspectionPenalty);
}

function formatTime(ms) { return (ms / 1000).toFixed(appSettings.timerDecimals); }

// --- 6. STATS & PB TRACKING ---
function saveSolve(autoPenalty = 'OK') {
    let activeScramble = document.getElementById('scrambleText').innerText; if (activeScramble === "Board Active") activeScramble = pendingScramble;
    let oldPbSingle = globalPbSingle; let oldPbAo5 = globalPbAo5;

    getActiveSession().solves.push({
        timeMs: finalTimeMs, penalty: autoPenalty, scramble: activeScramble, mode: currentTrainingMode,
        algCase: (currentTrainingMode === 'alg-trainer' ? document.getElementById('algCaseSelect').value : undefined),
                                   memoMs: (currentTrainingMode === 'bld' ? bldMemoTime : undefined),
                                   splits: (currentTrainingMode === 'splits' ? [...currentSplits] : undefined)
    });

    document.getElementById('penalty-controls').style.display = 'flex'; persistDatabase(); applyVisualPenalty(autoPenalty, finalTimeMs);
    updateSessionUI(); updateStatsUI(); generateScramble();

    if (currentTrainingMode === 'bld') {
        let bldEl = document.getElementById('bldSubText'); bldEl.style.display = 'block';
        bldEl.innerHTML = `Memo: ${formatTime(bldMemoTime)} | Exec: ${formatTime(finalTimeMs - bldMemoTime)}`;
    } else if (currentTrainingMode === 'splits') {
        updateSplitsDisplay(true);
    } else if (currentTrainingMode === 'alg-trainer') {
        generateTrainerScramble();
    }

    if (globalPbSingle < oldPbSingle && globalPbSingle !== Infinity && currentTrainingMode !== 'alg-trainer') showToast("🏆 New Personal Best Single! " + formatTime(globalPbSingle * 1000));
                if (globalPbAo5 < oldPbAo5 && globalPbAo5 !== Infinity && currentTrainingMode !== 'alg-trainer') showToast("🔥 New PB Ao5! " + formatTime(globalPbAo5 * 1000));
}

function applyPenalty(type) {
    let fSolves = getFilteredSolves(); if(fSolves.length === 0) return;
    let lastSolve = fSolves[fSolves.length - 1]; lastSolve.penalty = type;
    persistDatabase(); applyVisualPenalty(type, lastSolve.timeMs); updateStatsUI();
}

function applyVisualPenalty(type, rawTimeMs) {
    let displayStr = formatTime(rawTimeMs); let color = 'var(--timer-color)';
    if (type === 'DNF') { displayStr = 'DNF'; color = '#d32f2f'; }
    else if (type === '+2') { displayStr = formatTime(rawTimeMs + appSettings.plusPenalty) + '+'; color = '#ffeb3b'; }
    setMainTimer(displayStr, color);
}

function deleteLastSolve() {
    let fSolves = getFilteredSolves(); if(fSolves.length === 0) return;
    let lastSolve = fSolves[fSolves.length - 1];
    let session = getActiveSession(); let realIndex = session.solves.lastIndexOf(lastSolve);
    if (realIndex > -1) session.solves.splice(realIndex, 1);
                persistDatabase();

    let newFSolves = getFilteredSolves();
    if (newFSolves.length > 0) {
        let newLast = newFSolves[newFSolves.length - 1];
        finalTimeMs = newLast.timeMs; activeInspectionPenalty = newLast.penalty;
        applyVisualPenalty(newLast.penalty, newLast.timeMs);
        document.getElementById('penalty-controls').style.display = 'flex'; timerState = 'stopped';
    } else {
        document.getElementById('penalty-controls').style.display = 'none';
        setMainTimer(formatTime(0), 'var(--timer-color)'); finalTimeMs = 0; timerState = 'idle';
    }

    document.getElementById('bldSubText').style.display = 'none'; setFocusMode(false);
    updateSessionUI(); updateStatsUI(); scrambleViewIndex = getFilteredSolves().length; updateScrambleDisplay();
}

function calcAverageOfSlice(slice) {
    if (slice.length === 0) return null; let times = slice.map(s => { if (s.penalty === 'DNF') return Infinity; if (s.penalty === '+2') return s.timeMs + appSettings.plusPenalty; return s.timeMs; });
                times.sort((a, b) => a - b); let trimCount = Math.ceil(slice.length * (appSettings.trimPct / 100)); let countedTimes = times.slice(trimCount, slice.length - trimCount);
                if (countedTimes.includes(Infinity)) return Infinity; return countedTimes.reduce((a, b) => a + b, 0) / countedTimes.length;
}

function setUIStat(idStr, valStr, makeVisible) {
    let s1 = document.getElementById('stat' + idStr); let b1 = document.getElementById('box' + idStr); if(s1) s1.innerText = valStr; if(b1) makeVisible ? b1.classList.add('visible') : b1.classList.remove('visible');
    let s2 = document.getElementById('stat' + idStr + '_full'); let b2 = document.getElementById('box' + idStr + '_full'); if(s2) s2.innerText = valStr; if(b2) makeVisible ? b2.classList.add('visible') : b2.classList.remove('visible');
}

function updateStatsUI() {
    let fSolves = getFilteredSolves(); let tbody = document.getElementById('solveTableBody'); tbody.innerHTML = '';
    if(fSolves.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="color: var(--text-muted); text-align:center; padding-top:20px;">No solves yet</td></tr>';
        setUIStat('Solves', '0/0', true); setUIStat('Mean', '--', true); setUIStat('Best', '--', false); setUIStat('Ao5', '--', false); setUIStat('BestAo5', '--', false); setUIStat('Ao12', '--', false); setUIStat('BestAo12', '--', false); setUIStat('Ao100', '--', false); setUIStat('BestAo100', '--', false);
        updateAnalyticsUI();
        return;
    }

    let runningStats = []; let pbSingle = Infinity, pbAo5 = Infinity, pbAo12 = Infinity, pbAo100 = Infinity;

    for (let i = 0; i < fSolves.length; i++) {
        let s = fSolves[i]; let actualMs = s.penalty === 'DNF' ? Infinity : (s.penalty === '+2' ? s.timeMs + appSettings.plusPenalty : s.timeMs);
        let isPbSingle = false; if (actualMs !== Infinity && actualMs <= pbSingle) { pbSingle = actualMs; isPbSingle = true; }
        let ao5 = i >= 4 ? calcAverageOfSlice(fSolves.slice(i - 4, i + 1)) : null; let isPbAo5 = false; if (ao5 !== null && ao5 !== Infinity && ao5 <= pbAo5) { pbAo5 = ao5; isPbAo5 = true; }
        let ao12 = i >= 11 ? calcAverageOfSlice(fSolves.slice(i - 11, i + 1)) : null; let isPbAo12 = false; if (ao12 !== null && ao12 !== Infinity && ao12 <= pbAo12) { pbAo12 = ao12; isPbAo12 = true; }
        let ao100 = i >= 99 ? calcAverageOfSlice(fSolves.slice(i - 99, i + 1)) : null; let isPbAo100 = false; if (ao100 !== null && ao100 !== Infinity && ao100 <= pbAo100) { pbAo100 = ao100; isPbAo100 = true; }
        runningStats.push({ single: actualMs, ao5, ao12, ao100, isPbSingle, isPbAo5, isPbAo12, isPbAo100 });
    }

    let validTimes = [];
    for(let i = fSolves.length - 1; i >= 0; i--) {
        let s = fSolves[i]; let stats = runningStats[i];
        let displaySingle = s.penalty === 'DNF' ? 'DNF' : formatTime(s.penalty === '+2' ? s.timeMs + appSettings.plusPenalty : s.timeMs);
        if (s.penalty === '+2') displaySingle += '+'; if (s.penalty !== 'DNF') validTimes.push(stats.single);
                let colorSingle = stats.isPbSingle ? 'val-pb' : ((s.penalty === 'DNF' || s.penalty === '+2') ? (s.penalty==='DNF' ? 'val-dnf' : 'val-plus2') : '');
        let displayAo5 = stats.ao5 === null ? '-' : (stats.ao5 === Infinity ? 'DNF' : formatTime(stats.ao5)); let colorAo5 = stats.isPbAo5 ? 'val-pb' : (stats.ao5 === null ? 'val-dim' : '');
        let displayAo12 = stats.ao12 === null ? '-' : (stats.ao12 === Infinity ? 'DNF' : formatTime(stats.ao12)); let colorAo12 = stats.isPbAo12 ? 'val-pb' : (stats.ao12 === null ? 'val-dim' : '');
        let displayAo100 = stats.ao100 === null ? '-' : (stats.ao100 === Infinity ? 'DNF' : formatTime(stats.ao100)); let colorAo100 = stats.isPbAo100 ? 'val-pb' : (stats.ao100 === null ? 'val-dim' : '');
        let tr = document.createElement('tr'); tr.title = `Scramble: ${s.scramble}`; tr.innerHTML = `<td style="color:var(--text-muted);">${i + 1}</td><td class="${colorSingle}">${displaySingle}</td><td class="${colorAo5}">${displayAo5}</td><td class="${colorAo12}">${displayAo12}</td><td class="${colorAo100}">${displayAo100}</td>`; tbody.appendChild(tr);
    }

    setUIStat('Solves', `${validTimes.length}/${fSolves.length}`, true);
    if(validTimes.length > 0) setUIStat('Mean', formatTime(validTimes.reduce((a, b) => a + b, 0) / validTimes.length), true); else setUIStat('Mean', 'DNF', true);
                let latestStats = runningStats[runningStats.length - 1];
    setUIStat('Best', pbSingle === Infinity ? '--' : formatTime(pbSingle), pbSingle !== Infinity);
    setUIStat('Ao5', latestStats.ao5 === null ? '--' : (latestStats.ao5 === Infinity ? 'DNF' : formatTime(latestStats.ao5)), pbAo5 !== Infinity); setUIStat('BestAo5', pbAo5 === Infinity ? '--' : formatTime(pbAo5), pbAo5 !== Infinity);
    setUIStat('Ao12', latestStats.ao12 === null ? '--' : (latestStats.ao12 === Infinity ? 'DNF' : formatTime(latestStats.ao12)), pbAo12 !== Infinity); setUIStat('BestAo12', pbAo12 === Infinity ? '--' : formatTime(pbAo12), pbAo12 !== Infinity);
    setUIStat('Ao100', latestStats.ao100 === null ? '--' : (latestStats.ao100 === Infinity ? 'DNF' : formatTime(latestStats.ao100)), pbAo100 !== Infinity); setUIStat('BestAo100', pbAo100 === Infinity ? '--' : formatTime(pbAo100), pbAo100 !== Infinity);

    globalPbSingle = pbSingle / 1000; globalPbAo5 = pbAo5 / 1000; globalPbAo12 = pbAo12 / 1000; globalPbAo100 = pbAo100 / 1000;
    updateAnalyticsUI();
}

// --- 7. DEEP STATISTICAL INSIGHTS (ANALYTICS ENGINE) ---
function calculatePolynomialTrend(data) {
    let n = data.length; if (n < 3) return data;
    let sumX=0, sumX2=0, sumX3=0, sumX4=0, sumY=0, sumXY=0, sumX2Y=0;
    for(let i=0; i<n; i++) {
        let x = i+1; let y = data[i]; let x2 = x*x;
        sumX += x; sumX2 += x2; sumX3 += x2*x; sumX4 += x2*x2; sumY += y; sumXY += x*y; sumX2Y += x2*y;
    }
    let det = sumX4*(sumX2*n - sumX*sumX) - sumX3*(sumX3*n - sumX*sumX2) + sumX2*(sumX3*sumX - sumX2*sumX2); if (det === 0) return data;
    let detA = sumX2Y*(sumX2*n - sumX*sumX) - sumX3*(sumXY*n - sumY*sumX) + sumX2*(sumXY*sumX - sumY*sumX2);
    let detB = sumX4*(sumXY*n - sumY*sumX) - sumX2Y*(sumX3*n - sumX*sumX2) + sumX2*(sumX3*sumY - sumXY*sumX2);
    let detC = sumX4*(sumX2*sumY - sumX*sumXY) - sumX3*(sumX3*sumY - sumXY*sumX2) + sumX2Y*(sumX3*sumX - sumX2*sumX2);
    let a = detA/det; let b = detB/det; let c = detC/det;
    return data.map((_, i) => { let x = i+1; return a*x*x + b*x + c; });
}

function updateAnalyticsUI() {
    let allSolvesCount = 0; let totalTimeCubingMs = 0;
    sessions.forEach(s => { allSolvesCount += s.solves.length; s.solves.forEach(solve => totalTimeCubingMs += solve.timeMs); });
    document.getElementById('anaTotalSolves').innerText = allSolvesCount;

    let hours = Math.floor(totalTimeCubingMs / 3600000); let mins = Math.floor((totalTimeCubingMs % 3600000) / 60000); let secs = Math.floor((totalTimeCubingMs % 60000) / 1000);
    document.getElementById('anaTotalTime').innerText = `${hours}h ${mins}m ${secs}s`;

    let fSolves = getFilteredSolves();
    let validTimes = fSolves.filter(s => s.penalty !== 'DNF').map(s => (s.penalty === '+2' ? s.timeMs + appSettings.plusPenalty : s.timeMs) / 1000);

    if (validTimes.length > 0) {
        let sorted = [...validTimes].sort((a, b) => a - b); let mid = Math.floor(sorted.length / 2);
        let median = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
        document.getElementById('anaMedian').innerText = median.toFixed(appSettings.timerDecimals) + 's';

        let mean = validTimes.reduce((a,b)=>a+b, 0) / validTimes.length;
        let variance = validTimes.reduce((a,b)=>a + Math.pow(b - mean, 2), 0) / validTimes.length;
        let stdDev = Math.sqrt(variance);
        document.getElementById('anaStdDev').innerText = stdDev.toFixed(appSettings.timerDecimals) + 's';
    } else {
        document.getElementById('anaMedian').innerText = '--'; document.getElementById('anaStdDev').innerText = '--';
    }

    if(typeof Chart === 'undefined') return;

                // Chart 1: Polynomial Trendline
                let labels = validTimes.map((_, i) => i + 1); let trendData = calculatePolynomialTrend(validTimes);
    let ctxTrend = document.getElementById('trendChart').getContext('2d');
    if(window.trendChartInstance) window.trendChartInstance.destroy();
                window.trendChartInstance = new Chart(ctxTrend, {
                    type: 'line',
                    data: { labels: labels, datasets: [
                        { label: 'Solve Time (s)', data: validTimes, borderColor: appSettings.accentColor, tension: 0.3, pointRadius: 3 },
                                                      { label: 'Poly Trendline', data: trendData, borderColor: '#ff9800', borderDash: [5, 5], pointRadius: 0, borderWidth: 2 }
                    ]},
                    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#aaa' } } }, scales: { x: { ticks:{color: '#888'} }, y: { ticks:{color: '#888'} } } }
                });

    // Chart 2: Distribution Histogram
    let buckets = {}; validTimes.forEach(t => { let b = Math.floor(t); buckets[b] = (buckets[b] || 0) + 1; });
    let bLabels = Object.keys(buckets).map(Number).sort((a,b)=>a-b); let bData = bLabels.map(b => buckets[b]);

    let ctxDist = document.getElementById('distChart').getContext('2d');
    if(window.distChartInstance) window.distChartInstance.destroy();
                window.distChartInstance = new Chart(ctxDist, {
                    type: 'bar',
                    data: { labels: bLabels.map(l => l + 's'), datasets: [{ label: 'Frequency', data: bData, backgroundColor: appSettings.accentColor, borderRadius: 4 }] },
                                                     options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks:{color: '#888'} }, y: { ticks:{color: '#888'}, beginAtZero: true } } }
                });

    // Chart 3: NEW Splits Stacked Bar & Elite Ratio Analyzer
    let ctxSplits = document.getElementById('splitsChart');
    if (ctxSplits) {
        let splitSolves = fSolves.filter(s => s.mode === 'splits' && s.splits && s.splits.length === 3 && s.penalty !== 'DNF');
        let splitsContainer = document.getElementById('splitsChartContainer');
        let ratioContainer = document.getElementById('eliteRatioContainer');

        if (window.splitsChartInstance) window.splitsChartInstance.destroy();

                if (splitSolves.length > 0) {
                    splitsContainer.style.display = 'block';
                    let sLabels = splitSolves.map((_, i) => `Solve ${i+1}`);
                    let cross = splitSolves.map(s => s.splits[0] / 1000);
                    let f2l = splitSolves.map(s => (s.splits[1] - s.splits[0]) / 1000);
                    let oll = splitSolves.map(s => (s.splits[2] - s.splits[1]) / 1000);
                    let pll = splitSolves.map(s => ((s.penalty === '+2' ? s.timeMs + appSettings.plusPenalty : s.timeMs) - s.splits[2]) / 1000);

                    window.splitsChartInstance = new Chart(ctxSplits.getContext('2d'), {
                        type: 'bar',
                        data: {
                            labels: sLabels,
                            datasets: [
                                { label: 'Cross', data: cross, backgroundColor: '#4CAF50' },
                                { label: 'F2L', data: f2l, backgroundColor: '#2196F3' },
                                { label: 'OLL', data: oll, backgroundColor: '#FFC107' },
                                { label: 'PLL', data: pll, backgroundColor: '#F44336' }
                            ]
                        },
                        options: {
                            responsive: true, maintainAspectRatio: false,
                            plugins: { tooltip: { mode: 'index', intersect: false }, legend: { labels: { color: '#aaa' } } },
                            scales: { x: { stacked: true, ticks:{color:'#888'} }, y: { stacked: true, ticks:{color:'#888'} } }
                        }
                    });

                    // --- Elite Ratio Analysis Engine ---
                    let totalCross = 0, totalF2L = 0, totalOLL = 0, totalPLL = 0, totalTime = 0;

                    splitSolves.forEach(s => {
                        let c = s.splits[0]; let f = s.splits[1] - s.splits[0]; let o = s.splits[2] - s.splits[1];
                        let p = (s.penalty === '+2' ? s.timeMs + appSettings.plusPenalty : s.timeMs) - s.splits[2];
                        totalCross += c; totalF2L += f; totalOLL += o; totalPLL += p; totalTime += (c + f + o + p);
                    });

                    let diffs = [
                        { name: 'Cross', actual: (totalCross / totalTime) * 100, ideal: 12.0 },
                { name: 'F2L', actual: (totalF2L / totalTime) * 100, ideal: 50.0 },
                { name: 'OLL', actual: (totalOLL / totalTime) * 100, ideal: 16.5 },
                { name: 'PLL', actual: (totalPLL / totalTime) * 100, ideal: 21.5 }
                    ];

                    diffs.forEach(d => d.diff = d.actual - d.ideal);
                    let worstPhase = diffs.reduce((max, curr) => curr.diff > max.diff ? curr : max, diffs[0]);

                    let rGrid = document.getElementById('ratioGrid'); rGrid.innerHTML = '';
                    diffs.forEach(d => {
                        let isWorst = d.name === worstPhase.name;
                        let bg = isWorst ? 'rgba(244, 67, 54, 0.15)' : 'var(--ui-dark-bg)'; let border = isWorst ? '1px solid #f44336' : '1px solid var(--ui-border)'; let titleColor = isWorst ? '#f44336' : 'var(--text-muted)';
                        rGrid.innerHTML += `<div style="flex: 1; background: ${bg}; border: ${border}; padding: 12px 5px; border-radius: 6px; text-align: center; min-width: 80px;"><div style="font-size: 0.85rem; color: ${titleColor}; font-weight: bold; text-transform: uppercase;">${d.name}</div><div style="font-size: 1.4rem; font-weight: bold; color: var(--text-color); margin: 5px 0;">${d.actual.toFixed(1)}%</div><div style="font-size: 0.75rem; color: var(--text-muted);">Ideal: ${d.ideal}%</div></div>`;
                    });

                    document.getElementById('ratioAdvice').innerHTML = `💡 <strong>Coach Analysis:</strong> You are losing the most time in your <strong style="color: #ff5252; text-decoration: underline;">${worstPhase.name}</strong> phase. Focus your drills here!`;
                    ratioContainer.style.display = 'block';

                } else {
                    splitsContainer.style.display = 'none';
                    if (ratioContainer) ratioContainer.style.display = 'none';
                }
    }


    // Projections Logic
    let projAo5Str = "--";
    if (globalPbAo5 !== Infinity && fSolves.length >= 4) {
        let last4 = fSolves.slice(-4).map(s => s.penalty === 'DNF' ? Infinity : (s.penalty === '+2' ? s.timeMs + appSettings.plusPenalty : s.timeMs) / 1000);
        last4.sort((a,b) => a-b); let targetSec = globalPbAo5; let reqSec = (3 * targetSec) - last4[1] - last4[2];
        if (reqSec <= 0) projAo5Str = "Impossible in current slot"; else if (last4[1] + last4[2] + last4[3] <= 3 * targetSec) projAo5Str = "Any valid time secures PB!"; else projAo5Str = `Sub ${reqSec.toFixed(appSettings.timerDecimals)}`;
    }
    document.getElementById('projAo5').innerHTML = `<strong style="color:var(--accent-color)">${projAo5Str}</strong>`;

    let projAo12Str = "--";
    if (globalPbAo12 !== Infinity && fSolves.length >= 11) {
        let last11 = fSolves.slice(-11).map(s => s.penalty === 'DNF' ? Infinity : (s.penalty === '+2' ? s.timeMs + appSettings.plusPenalty : s.timeMs) / 1000);
        last11.sort((a,b) => a-b); let sumMiddle9 = 0; for(let i=1; i<=9; i++) sumMiddle9 += last11[i];
        let targetSec = globalPbAo12; let reqSec = (10 * targetSec) - sumMiddle9;
        if (reqSec <= 0) projAo12Str = "Impossible in current slot";
                else { let sumWorstCase = 0; for(let i=1; i<=10; i++) sumWorstCase += last11[i]; if (sumWorstCase <= 10 * targetSec) projAo12Str = "Any valid time secures PB!"; else projAo12Str = `Sub ${reqSec.toFixed(appSettings.timerDecimals)}`; }
    }
    document.getElementById('projAo12').innerHTML = `<strong style="color:var(--accent-color)">${projAo12Str}</strong>`;
}

// --- 8. EXPORT / IMPORT CSV & CSTIMER ---
function exportCSV(scope) {
    let dataToExport = []; let filename = '';
    if (scope === 'current') {
        dataToExport = getFilteredSolves(); if (dataToExport.length === 0) { alert("Current session has no solves!"); return; }
        filename = `ArchSense_${getActiveSession().name.replace(/\s+/g, '_')}.csv`;
    } else {
        sessions.forEach(s => { s.solves.forEach(solve => { dataToExport.push({ sessionName: s.name, ...solve }); }); });
        if (dataToExport.length === 0) { alert("No solves exist in any session!"); return; }
        filename = `ArchSense_All_Sessions Backup.csv`;
    }
    let csvContent = scope === 'all' ? "Session,Solve Number,Time (ms),Penalty,Scramble\n" : "Solve Number,Time (ms),Penalty,Scramble\n";
    let currentSessionTracker = ""; let solveCounter = 1;
    dataToExport.forEach((solve) => {
        if (scope === 'all') {
            if (solve.sessionName !== currentSessionTracker) { currentSessionTracker = solve.sessionName; solveCounter = 1; }
            csvContent += `"${solve.sessionName}",${solveCounter},${solve.timeMs},${solve.penalty},"${solve.scramble}"\n`;
        } else { csvContent += `${solveCounter},${solve.timeMs},${solve.penalty},"${solve.scramble}"\n`; }
        solveCounter++;
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }); const url = URL.createObjectURL(blob);
    const link = document.createElement("a"); link.setAttribute("href", url); link.setAttribute("download", filename);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
}

function exportCSTimer() {
    if (sessions.length === 0 || (sessions.length === 1 && sessions[0].solves.length === 0)) { alert("No data to export!"); return; }
    let cstExport = { properties: { sessionData: {} } }; let sIndex = 1;
    sessions.forEach(s => {
        if (s.solves.length === 0) return;
        let sKey = "session" + sIndex; cstExport.properties.sessionData[sIndex.toString()] = { name: s.name, opt: {} };
        cstExport[sKey] = s.solves.map(solve => { let pen = 0; if (solve.penalty === '+2') pen = appSettings.plusPenalty; else if (solve.penalty === 'DNF') pen = -1; return [[pen, solve.timeMs], solve.scramble, "", Math.floor(Date.now() / 1000)]; });
        sIndex++;
    });
    cstExport.properties.sessionData = JSON.stringify(cstExport.properties.sessionData);
    const blob = new Blob([JSON.stringify(cstExport)], { type: 'text/plain;charset=utf-8;' }); const url = URL.createObjectURL(blob);
    const link = document.createElement("a"); link.setAttribute("href", url); link.setAttribute("download", `csTimer_Export_${new Date().toISOString().slice(0,10)}.txt`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
}

function importData(event) {
    const file = event.target.files[0]; if (!file) return; const fileName = file.name.toLowerCase(); const reader = new FileReader();
    let importedCount = 0; let ignoredCount = 0;
    reader.onload = function(e) {
        const text = e.target.result;
        if (fileName.endsWith('.txt')) {
            try {
                const cstData = JSON.parse(text); let newSessions = []; let sessionNames = {};
                if (cstData.properties && cstData.properties.sessionData) { try { const parsedNames = JSON.parse(cstData.properties.sessionData); for (let key in parsedNames) { sessionNames[`session${key}`] = parsedNames[key].name; } } catch(e) {} }
                let idCounter = Date.now();
                for (let key in cstData) {
                    if (key.startsWith('session') && Array.isArray(cstData[key])) {
                        if (cstData[key].length === 0) continue;
                let sName = sessionNames[key] || `csTimer ${key}`;
                        let existingSession = sessions.find(s => s.name === sName);
                        if (!existingSession) { existingSession = { id: idCounter++, name: sName, solves: [], hwProfile: 'performance' }; sessions.push(existingSession); }

                        cstData[key].forEach(solve => {
                            let penState = 'OK'; if (solve[0][0] === -1) penState = 'DNF'; else if (solve[0][0] > 0) penState = '+2';
                            let isDup = existingSession.solves.some(s => s.timeMs === solve[0][1] && s.scramble === (solve[1] || ""));
                            if(!isDup) { existingSession.solves.push({ timeMs: solve[0][1], penalty: penState, scramble: solve[1] || "", mode: 'standard' }); importedCount++; } else { ignoredCount++; }
                        });
                    }
                }
                persistDatabase(); updateSessionUI(); updateStatsUI(); alert(`Smart Sync Complete! Imported: ${importedCount} | Ignored Duplicates: ${ignoredCount}`);
            } catch(err) { alert("Invalid csTimer .txt format."); }
        } else if (fileName.endsWith('.csv')) {
            const rows = text.split('\n'); const headerCols = rows[0].split(','); const isAllSessionsFormat = headerCols[0].trim() === "Session";
            if (isAllSessionsFormat) {
                for (let i = 1; i < rows.length; i++) {
                    const row = rows[i].trim(); if (!row) continue; const cols = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
                    if (cols.length >= 5) {
                        let sName = cols[0].replace(/(^"|"$)/g, ''); let existingSession = sessions.find(s => s.name === sName);
                        if (!existingSession) { existingSession = { id: Date.now() + i, name: sName, solves: [], hwProfile: 'performance' }; sessions.push(existingSession); }
                        let sTime = parseInt(cols[2]); let sScramble = cols[4].replace(/(^"|"$)/g, '');
                        let isDup = existingSession.solves.some(s => s.timeMs === sTime && s.scramble === sScramble);
                        if(!isDup) { existingSession.solves.push({ timeMs: sTime, penalty: cols[3], scramble: sScramble, mode:'standard' }); importedCount++; } else { ignoredCount++; }
                    }
                }
            } else {
                let existingSession = getActiveSession();
                for (let i = 1; i < rows.length; i++) {
                    const row = rows[i].trim(); if (!row) continue; const cols = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
                    if (cols.length >= 4) {
                        let sTime = parseInt(cols[1]); let sScramble = cols[3].replace(/(^"|"$)/g, '');
                        let isDup = existingSession.solves.some(s => s.timeMs === sTime && s.scramble === sScramble);
                        if(!isDup) { existingSession.solves.push({ timeMs: sTime, penalty: cols[2], scramble: sScramble, mode:'standard' }); importedCount++; } else { ignoredCount++; }
                    }
                }
            }
            persistDatabase(); updateSessionUI(); updateStatsUI(); alert(`Smart Sync Complete! Imported: ${importedCount} | Ignored Duplicates: ${ignoredCount}`);
        }
        document.getElementById('importFileInput').value = ''; scrambleViewIndex = getFilteredSolves().length;
        updateScrambleDisplay(); openPage('page-timer', 'Main Timer', document.querySelector('.nav-btn'));
    }; reader.readAsText(file);
}

// --- 9. PRO OFFLINE SYNC MODAL ---
function openOfflineImportModal() {
    dummyOfflineSolves = [];
    for(let i=0; i<8; i++) { dummyOfflineSolves.push({ timeMs: Math.floor(Math.random() * 8000) + 10000, penalty: Math.random() > 0.8 ? '+2' : 'OK', scramble: "U R F D L B U' R' F' D' L' B'", mode: 'standard' }); }
    const container = document.getElementById('offlineListContainer'); container.innerHTML = '';
    dummyOfflineSolves.forEach((solve, idx) => {
        let dStr = formatTime(solve.timeMs); if (solve.penalty === '+2') dStr = formatTime(solve.timeMs + appSettings.plusPenalty) + '+'; else if (solve.penalty === 'DNF') dStr = 'DNF';
        let row = document.createElement('div'); row.className = 'offline-item';
        row.onclick = function() { let cb = this.querySelector('input[type="checkbox"]'); cb.checked = !cb.checked; };
        row.innerHTML = `<input type="checkbox" value="${idx}" checked onclick="event.stopPropagation()"><span class="offline-time">${dStr}</span><span style="color:var(--text-muted); font-size: 0.9rem;">Board Solve #${idx+1}</span>`;
        container.appendChild(row);
    });
    document.getElementById('offlineSyncModal').style.display = 'flex';
}
function closeOfflineModal() { document.getElementById('offlineSyncModal').style.display = 'none'; }
function toggleAllOffline(state) { document.querySelectorAll('#offlineListContainer input[type="checkbox"]').forEach(cb => cb.checked = state); }
function importOfflineSolves() {
    let session = getActiveSession(); let checkboxes = document.querySelectorAll('#offlineListContainer input[type="checkbox"]:checked');
    if (checkboxes.length === 0) { alert("No solves selected."); return; }
    checkboxes.forEach(cb => { session.solves.push(dummyOfflineSolves[parseInt(cb.value)]); });
    persistDatabase(); updateSessionUI(); updateStatsUI(); scrambleViewIndex = getFilteredSolves().length; updateScrambleDisplay();
    closeOfflineModal(); alert(`Successfully synced ${checkboxes.length} offline solves into ${session.name}!`);
}

// --- 10. SMART SCRAMBLE ENGINE ---
function updateScrambleDisplay() {
    let fSolves = getFilteredSolves(); let maxIndex = fSolves.length; let displayStr = ""; let hintStr = "";
    if (scrambleViewIndex < maxIndex) { displayStr = fSolves[scrambleViewIndex].scramble; hintStr = `Viewing Solve #${scrambleViewIndex + 1}`; }
    else { displayStr = pendingScramble; hintStr = "Click to generate new scramble"; }

    document.getElementById('scrambleText').innerText = displayStr;
    let hintEl = document.getElementById('scrambleHint'); if(hintEl) hintEl.innerText = hintStr;
    renderCube(applyScrambleToState(displayStr));
}

function generateScramble(e = null) {
    if(e) e.stopPropagation();
                if (currentTrainingMode === 'alg-trainer') return; // Handled directly by Alg Engine

                const faces = ['U', 'D', 'R', 'L', 'F', 'B'];
    const modifiers = ['', "'", '2'];
    let scramble = [];
    let lastFace = -1, secondLastFace = -1;

    let allowedIdx = appSettings.scrambleMoves.map(m => faces.indexOf(m)).filter(i => i > -1);
    if(allowedIdx.length < 2) allowedIdx = [0,1,2,3,4,5]; // Failsafe

                for (let i = 0; i < appSettings.scrambleLen; i++) {
                    let f;
                    do {
                        f = allowedIdx[Math.floor(Math.random() * allowedIdx.length)];
                    } while (f === lastFace || (Math.floor(f / 2) === Math.floor(lastFace / 2) && f === secondLastFace));

                    secondLastFace = lastFace;
                    lastFace = f;
                    scramble.push(faces[f] + modifiers[Math.floor(Math.random() * modifiers.length)]);
                }
                pendingScramble = scramble.join('  ');
                scrambleViewIndex = getFilteredSolves().length;
                updateScrambleDisplay();
}

function prevScramble(e) { if(e) e.stopPropagation(); if (scrambleViewIndex > 0) { scrambleViewIndex--; updateScrambleDisplay(); } }
function nextScramble(e) { if(e) e.stopPropagation(); let maxIndex = getFilteredSolves().length; if (scrambleViewIndex < maxIndex) { scrambleViewIndex++; updateScrambleDisplay(); } else { if(currentTrainingMode==='alg-trainer') generateTrainerScramble(); else generateScramble(); } }

// --- 11. OLED DESIGNER LOGIC ---
function switchOledTab(tab) {
    document.getElementById('oledTabLayout').style.display = tab === 'layout' ? 'block' : 'none';
    document.getElementById('oledTabLogo').style.display = tab === 'logo' ? 'block' : 'none';
    document.getElementById('btnOledLayout').classList.toggle('active', tab === 'layout');
    document.getElementById('btnOledLogo').classList.toggle('active', tab === 'logo');
}

function updateOledPreview() {
    let val = document.getElementById('selOledLine2').value; let text = "";
    if (val === 'ao5') text = "Ao5: 14.502"; else if (val === 'best') text = "Best:  9.841"; else if (val === 'scramble') text = "R U R' U' ..."; else text = "";
                document.getElementById('oledPreviewLine2').innerText = text;
}

function getOledCoords(e) {
    let rect = oledCanvas.getBoundingClientRect(); let scaleX = oledCanvas.width / rect.width; let scaleY = oledCanvas.height / rect.height;
    let clientX = e.touches ? e.touches[0].clientX : e.clientX; let clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
}

function drawLine(e, isStart) {
    let {x, y} = getOledCoords(e);
    oledCtx.strokeStyle = drawModeOled === 1 ? '#FFFFFF' : '#000000'; oledCtx.fillStyle = drawModeOled === 1 ? '#FFFFFF' : '#000000';
    oledCtx.lineWidth = 2; oledCtx.lineCap = 'round'; oledCtx.lineJoin = 'round';

    if (isStart) { oledCtx.beginPath(); oledCtx.arc(x, y, oledCtx.lineWidth / 2, 0, Math.PI * 2); oledCtx.fill(); }
    else { oledCtx.beginPath(); oledCtx.moveTo(lastDrawX, lastDrawY); oledCtx.lineTo(x, y); oledCtx.stroke(); }
    lastDrawX = x; lastDrawY = y;
}

function initOledCanvas() {
    if(oledCanvasInitialized) return; oledCanvas = document.getElementById('bootLogoCanvas'); oledCtx = oledCanvas.getContext('2d', {willReadFrequently: true});
                oledCtx.fillStyle = '#000000'; oledCtx.fillRect(0, 0, 128, 32);

                if (appSettings.oledBootLogoData) { let img = new Image(); img.onload = () => { oledCtx.drawImage(img, 0, 0); }; img.src = appSettings.oledBootLogoData; }

                oledCanvas.addEventListener('mousedown', (e) => { isDrawingOled = true; drawModeOled = e.button === 2 ? 0 : 1; drawLine(e, true); });
                oledCanvas.addEventListener('mousemove', (e) => { if(isDrawingOled) drawLine(e, false); });
                window.addEventListener('mouseup', () => { if(isDrawingOled) { isDrawingOled = false; appSettings.oledBootLogoData = oledCanvas.toDataURL(); debouncedSave(); } });

                oledCanvas.addEventListener('touchstart', (e) => { isDrawingOled = true; drawModeOled = 1; drawLine(e, true); }, {passive: false});
                oledCanvas.addEventListener('touchmove', (e) => { if(isDrawingOled) { e.preventDefault(); drawLine(e, false); } }, {passive: false});
                window.addEventListener('touchend', () => { if(isDrawingOled) { isDrawingOled = false; appSettings.oledBootLogoData = oledCanvas.toDataURL(); debouncedSave(); } });

                oledCanvasInitialized = true;
}

function clearOledCanvas() { oledCtx.fillStyle = '#000000'; oledCtx.fillRect(0, 0, 128, 32); appSettings.oledBootLogoData = oledCanvas.toDataURL(); debouncedSave(); }

function getOLEDHex() {
    let imgData = oledCtx.getImageData(0, 0, 128, 32).data; let hexStr = "";
    for(let page=0; page<4; page++) {
        for(let x=0; x<128; x++) {
            let byte = 0;
            for(let b=0; b<8; b++) { let y = page*8 + b; let idx = (y*128 + x) * 4; if(imgData[idx] > 128) byte |= (1 << b); }
            let h = byte.toString(16).toUpperCase(); if(h.length < 2) h = "0" + h; hexStr += h;
        }
    }
    return hexStr;
}

async function syncOledToBoard() {
    if (!serialPort || !serialPort.writable) { showToast("🔴 Not connected to board!"); return; }
    let configCmd = `CFG:OLED:LINE2:${document.getElementById('selOledLine2').value.toUpperCase()}\n`;
    let logoCmd = `CFG:LOGO:${getOLEDHex()}\n`;

    try {
        const writer = serialPort.writable.getWriter();
        await writer.write(new TextEncoder().encode(configCmd)); await writer.write(new TextEncoder().encode(logoCmd)); writer.releaseLock();
        showToast("⚙️ Display & Boot Logo Synced!");
    } catch (e) { showToast("🔴 Sync Failed!"); }
}
