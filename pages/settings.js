const pageSettingsHTML = `
<h2>Application Settings</h2>

<h3 style="color: var(--accent-color); margin-top: 0; margin-bottom: 15px;">Visuals & Theme Engine</h3>
<div style="background: var(--ui-panel-bg); border: 1px solid var(--ui-border); padding: 25px 30px; border-radius: var(--ui-radius); max-width: 600px; margin-bottom: 25px;">
<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; font-size: 1.1rem;">
<span>Preset Theme:</span>
<select id="selTheme" onchange="applyPresetTheme()" class="theme-select">
<option value="custom">-- Custom --</option>
<option value="oled">OLED Black (Pro)</option>
<option value="bliss">Bliss White</option>
<option value="cappuccino">Cappuccino</option>
<option value="mocha">Mocha</option>
<option value="neon">Neon Cyberpunk</option>
</select>
</div>

<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; font-size: 1.1rem;">
<span>Timer Font:</span>
<select id="selFont" onchange="setCustomTheme(); saveSettings()" class="theme-select">
<option value="'Roboto Mono', monospace">Roboto Mono (Modern Digital)</option>
<option value="'Orbitron', sans-serif">Orbitron (Retro Digital)</option>
<option value="'Inter', sans-serif">Inter (Minimalist App)</option>
<option value="'VT323', monospace">VT323 (Arcade)</option>
<option value="monospace">System Monospace</option>
</select>
</div>

<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; font-size: 1.1rem;">
<span>Timer Size Scale: <span id="lblTimerScale" style="color: var(--accent-color); font-weight: bold;">1.0x</span></span>
<input type="range" id="valTimerScale" class="theme-range" min="0.5" max="2.5" step="0.1" value="1.0" oninput="document.getElementById('lblTimerScale').innerText = this.value + 'x';" onchange="debouncedSave();">
</div>

<hr style="border-top: 1px solid var(--ui-border); border-bottom: none; margin: 20px 0;">

<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; font-size: 1.1rem;">
<span>Background Color:</span>
<input type="color" id="valBgColor" class="color-picker" onchange="setCustomTheme(); debouncedSave();">
</div>
<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; font-size: 1.1rem;">
<span>Text Color:</span>
<input type="color" id="valTextColor" class="color-picker" onchange="setCustomTheme(); debouncedSave();">
</div>
<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; font-size: 1.1rem;">
<span>Accent Color (Highlights):</span>
<input type="color" id="valAccentColor" class="color-picker" onchange="setCustomTheme(); debouncedSave();">
</div>
<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; font-size: 1.1rem;">
<span>Timer Display Color:</span>
<input type="color" id="valTimerColor" class="color-picker" onchange="setCustomTheme(); debouncedSave();">
</div>

<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; font-size: 1.1rem; margin-top: 25px;">
<span>Background Image/GIF (URL):</span>
<input type="text" id="valBgImage" placeholder="https://..." style="width: 200px; background: var(--ui-dark-bg); color: var(--text-color); border: 1px solid var(--ui-border); padding: 6px; border-radius: 4px;" oninput="setCustomTheme(); debouncedSave();">
</div>

<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; font-size: 1.1rem;">
<span>Interface Panel Opacity: <span id="lblUiOpacity" style="color: var(--accent-color);">1.0</span></span>
<input type="range" id="valUiOpacity" class="theme-range" min="0.0" max="1.0" step="0.05" value="1.0" oninput="document.getElementById('lblUiOpacity').innerText = this.value; setCustomTheme();" onchange="debouncedSave();">
</div>
<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; font-size: 1.1rem;">
<span>UI Border Radius: <span id="lblRadius" style="color: var(--accent-color);">8px</span></span>
<input type="range" id="valRadius" class="theme-range" min="0" max="24" step="1" value="8" oninput="document.getElementById('lblRadius').innerText = this.value + 'px'; setCustomTheme();" onchange="debouncedSave();">
</div>
<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; font-size: 1.1rem;">
<span>Panel Blur Intensity: <span id="lblBlur" style="color: var(--accent-color);">10px</span></span>
<input type="range" id="valBlur" class="theme-range" min="0" max="30" step="1" value="10" oninput="document.getElementById('lblBlur').innerText = this.value + 'px'; setCustomTheme();" onchange="debouncedSave();">
</div>

<hr style="border-top: 1px solid var(--ui-border); border-bottom: none; margin: 20px 0;">

<h4 style="margin: 0 0 15px 0; color: var(--text-color);">Cube Scramble Orientation</h4>
<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; font-size: 1.1rem;">
<span>Top Face Color:</span>
<select id="selCubeTop" onchange="debouncedSave();" class="theme-select">
<option value="white">White</option>
<option value="yellow">Yellow</option>
</select>
</div>
<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; font-size: 1.1rem;">
<span>Front Face Color:</span>
<select id="selCubeFront" onchange="debouncedSave();" class="theme-select">
<option value="green">Green</option>
<option value="red">Red</option>
<option value="blue">Blue</option>
<option value="orange">Orange</option>
</select>
</div>

<hr style="border-top: 1px solid var(--ui-border); border-bottom: none; margin: 20px 0;">
<h4 style="margin: 0 0 15px 0; color: var(--text-color);">Cinematic Focus Mode</h4>
<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; font-size: 1.1rem;">
<span>Transition Style:</span>
<select id="selFocusStyle" onchange="debouncedSave()" class="theme-select">
<option value="fade">Fade to Background Style</option>
<option value="vignette">Breathing Vignette (Calm)</option>
<option value="black">Fade to Pure Black</option>
</select>
</div>
<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; font-size: 1.1rem;">
<span>Fade Duration: <span id="lblFocusFade" style="color: var(--accent-color);">0.5s</span></span>
<input type="range" id="valFocusFade" class="theme-range" min="0" max="3.0" step="0.1" value="0.5" oninput="document.getElementById('lblFocusFade').innerText = this.value + 's';" onchange="debouncedSave();">
</div>
</div>

<div style="background: var(--ui-panel-bg); border: 1px solid var(--ui-border); padding: 25px 30px; border-radius: var(--ui-radius); max-width: 600px;">
<h3 style="color: var(--accent-color); margin-top: 0; margin-bottom: 15px;">Software Engine</h3>
<div id="softwareSettingsAnchor">
<div id="dynamicBoardSettings">
<label style="display:flex; align-items:center; margin-bottom:20px; font-size: 1.1rem; cursor:pointer;">
<input type="checkbox" id="chkInspection" class="setting-checkbox" onchange="saveSettings()"> Enable WCA Inspection Phase
<span class="star-btn" data-id="chkInspection" onclick="toggleQuickSetting('chkInspection', 'WCA Inspection', 'checkbox', this)">☆</span>
</label>

<label style="display:flex; align-items:center; margin-bottom:20px; font-size: 1.1rem; cursor:pointer;">
<input type="checkbox" id="chkVoice" class="setting-checkbox" onchange="saveSettings()"> Enable Voice Alerts (8s / 12s)
<span class="star-btn" data-id="chkVoice" onclick="toggleQuickSetting('chkVoice', 'Voice Alerts', 'checkbox', this)">☆</span>
</label>

<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; font-size: 1.1rem;">
<span>Inspection Duration (seconds): <span class="star-btn" data-id="valInspectionTime" onclick="toggleQuickSetting('valInspectionTime', 'Insp. Time', 'number', this)">☆</span></span>
<input type="number" id="valInspectionTime" min="1" max="60" class="theme-select" style="width: 80px; text-align: center;" oninput="debouncedSave()">
</div>
<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; font-size: 1.1rem;">
<span>Inspection DNF Grace Period (sec):</span>
<input type="number" id="valInspGrace" min="0" max="15" class="theme-select" style="width: 80px; text-align: center;" oninput="debouncedSave()">
</div>
<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; font-size: 1.1rem;">
<span>Timer Hold Delay (seconds):</span>
<input type="number" id="valHoldDelay" step="0.1" min="0" max="3" class="theme-select" style="width: 80px; text-align: center;" oninput="debouncedSave()">
</div>
<hr style="border-top: 1px solid var(--ui-border); border-bottom: none; margin: 20px 0;">
</div>
</div>

<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; font-size: 1.1rem;">
<span>Average Trim Percentage (%):</span>
<input type="number" id="valTrimPct" min="0" max="50" class="theme-select" style="width: 80px; text-align: center;" oninput="debouncedSave()">
</div>
<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; font-size: 1.1rem;">
<span>Penalty Time Addition (ms):</span>
<input type="number" id="valPlusPenalty" step="100" min="0" class="theme-select" style="width: 80px; text-align: center;" oninput="debouncedSave()">
</div>
<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; font-size: 1.1rem;">
<span>Timer Decimals (e.g. 0.00 vs 0.000):</span>
<input type="number" id="valTimerDecimals" min="1" max="4" class="theme-select" style="width: 80px; text-align: center;" oninput="debouncedSave()">
</div>
<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; font-size: 1.1rem;">
<span>Timer Screen Refresh Rate (ms):</span>
<input type="number" id="valTimerUpdateRate" min="1" max="100" class="theme-select" style="width: 80px; text-align: center;" oninput="debouncedSave()">
</div>

<hr style="border-top: 1px solid var(--ui-border); border-bottom: none; margin: 20px 0;">

<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; font-size: 1.1rem;">
<span>Scramble Length (moves):</span>
<input type="number" id="valScrambleLen" min="1" max="50" class="theme-select" style="width: 80px; text-align: center;" oninput="debouncedSave()">
</div>

<div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:15px; font-size: 1.1rem; flex-direction: column;">
<span style="margin-bottom: 12px;">Allowed Scramble Moves (Min 2):</span>
<div id="scrambleMovesCheckboxes" class="scramble-checkboxes">
<label><input type="checkbox" value="U" onchange="debouncedSave()"> U</label>
<label><input type="checkbox" value="D" onchange="debouncedSave()"> D</label>
<label><input type="checkbox" value="R" onchange="debouncedSave()"> R</label>
<label><input type="checkbox" value="L" onchange="debouncedSave()"> L</label>
<label><input type="checkbox" value="F" onchange="debouncedSave()"> F</label>
<label><input type="checkbox" value="B" onchange="debouncedSave()"> B</label>
</div>
</div>

<div id="hardwareSettingsBlock">
<hr style="border-top: 1px solid var(--ui-border); border-bottom: none; margin: 20px 0;">
<h3 style="color: var(--accent-color); margin-bottom: 15px;">Hardware & Board Settings</h3>

<div id="hardwareSettingsAnchor"></div>

<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; font-size: 1.1rem;">
<span>Sensor Threshold (Sensitivity): <span class="star-btn" data-id="valThreshold" onclick="toggleQuickSetting('valThreshold', 'Sensor Threshold', 'range', this)">☆</span> <span id="lblThreshold" style="color: var(--accent-color); margin-left:10px;">40</span></span>
<input type="range" id="valThreshold" class="theme-range" min="10" max="100" value="40" oninput="document.getElementById('lblThreshold').innerText = this.value;" onchange="debouncedSave();">
</div>
<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; font-size: 1.1rem;">
<span>Sensor Debounce: <span class="star-btn" data-id="valDebounce" onclick="toggleQuickSetting('valDebounce', 'Sensor Debounce', 'range', this)">☆</span> <span id="lblDebounce" style="color: var(--accent-color); margin-left:10px;">15ms</span></span>
<input type="range" id="valDebounce" class="theme-range" min="0" max="50" value="15" oninput="document.getElementById('lblDebounce').innerText = this.value + 'ms';" onchange="debouncedSave();">
</div>

<label style="display:flex; align-items:center; margin-bottom:15px; font-size: 1.1rem; cursor:pointer;">
<input type="checkbox" id="chkBatterySaver" class="setting-checkbox" onchange="saveSettings()">
<span id="lblBatterySaver">Enable Battery Saver Mode</span>
<span class="star-btn" data-id="chkBatterySaver" onclick="toggleQuickSetting('chkBatterySaver', 'Battery Saver', 'checkbox', this)">☆</span>
</label>
<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; font-size: 1.1rem;">
<span>Sleep Timeout (seconds):</span>
<input type="number" id="valSleepTimeout" min="5" max="300" class="theme-select" style="width: 80px; text-align: center;" oninput="debouncedSave()">
</div>

<div id="proOledSettings" style="display:none;">
<hr style="border-top: 1px solid var(--ui-border); margin: 25px 0;">
<h3 style="color: var(--accent-color); margin-bottom: 10px;">PRO: OLED Display Designer</h3>
<p style="color: var(--text-muted); font-size: 0.9rem; margin-top: 0; margin-bottom: 20px;">Customize what your ESP32 shows on the physical 0.91" screen.</p>

<div style="display:flex; justify-content:center; gap: 10px; margin-bottom: 20px;">
<button class="mode-btn active" id="btnOledLayout" onclick="switchOledTab('layout')">Solve Layout</button>
<button class="mode-btn" id="btnOledLogo" onclick="switchOledTab('logo')">Boot Logo</button>
</div>

<div id="oledTabLayout">
<div class="oled-preview-box">
<div class="oled-text-large">12.345</div>
<div class="oled-text-small" id="oledPreviewLine2">Ao5: 14.502</div>
</div>
<div style="display:flex; justify-content:space-between; align-items:center; margin-top:20px; font-size: 1.1rem;">
<span>Secondary Line Display:</span>
<select id="selOledLine2" class="theme-select" onchange="updateOledPreview(); debouncedSave();">
<option value="ao5">Current Ao5</option>
<option value="best">Session Best</option>
<option value="scramble">Last Scramble</option>
<option value="blank">Blank (Clean)</option>
</select>
</div>
</div>

<div id="oledTabLogo" style="display:none; text-align: center;">
<p style="color: var(--text-muted); font-size: 0.85rem; margin-top: 0;">Draw your custom boot logo (128x32). Click/Drag to draw, Right-Click to erase.</p>
<canvas id="bootLogoCanvas" class="oled-canvas" width="128" height="32" oncontextmenu="return false;"></canvas>
<div style="margin-top: 15px; display: flex; justify-content: center; gap: 15px;">
<button class="action-btn" onclick="clearOledCanvas()">🗑️ Clear</button>
<button class="action-btn action-btn-green" onclick="syncOledToBoard()">📥 Sync Layout & Logo to Board</button>
</div>
</div>
</div>
</div>
</div>

<p style="text-align: center; color: var(--text-muted); margin-top: 30px; font-size: 0.9rem;">ArchSense Timer App — Version: 0.58 (Smart Dedup, WCA Scrambler, Alg Trainer)</p>
`;
