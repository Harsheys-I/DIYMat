const pageTimerHTML = `
<div class="stats-sidebar hide-on-focus">
<div class="session-selector-container">
<select id="sessionDropdown" class="session-dropdown" onchange="switchSession(this.value)"></select>
<button class="session-manage-btn" onclick="openSessionManager()" title="Manage Sessions">⚙️</button>
</div>
<h2 id="sessionTitle" style="display:none;">Session 1</h2>

<div class="mini-stats-grid">
<div id="boxSolves" class="mini-stat-box visible" style="grid-column: 1 / -1;"><span class="stat-label">Solves</span><span id="statSolves" class="stat-value">0/0</span></div>
<div id="boxMean" class="mini-stat-box visible"><span class="stat-label">Session Mean</span><span id="statMean" class="stat-value">--</span></div>
<div id="boxBest" class="mini-stat-box visible"><span class="stat-label">Best Single</span><span id="statBest" class="stat-value val-pb">--</span></div>
<div id="boxAo5" class="mini-stat-box"><span class="stat-label">Current Ao5</span><span id="statAo5" class="stat-value">--</span></div>
<div id="boxBestAo5" class="mini-stat-box"><span class="stat-label">Best Ao5</span><span id="statBestAo5" class="stat-value val-pb">--</span></div>
<div id="boxAo12" class="mini-stat-box"><span class="stat-label">Current Ao12</span><span id="statAo12" class="stat-value">--</span></div>
<div id="boxBestAo12" class="mini-stat-box"><span class="stat-label">Best Ao12</span><span id="statBestAo12" class="stat-value val-pb">--</span></div>
<div id="boxAo100" class="mini-stat-box"><span class="stat-label">Current Ao100</span><span id="statAo100" class="stat-value">--</span></div>
<div id="boxBestAo100" class="mini-stat-box"><span class="stat-label">Best Ao100</span><span id="statBestAo100" class="stat-value val-pb">--</span></div>
</div>

<div class="table-container">
<table>
<thead><tr><th style="width: 10%;">#</th><th style="width: 25%;">Time</th><th style="width: 20%;">Ao5</th><th style="width: 20%;">Ao12</th><th style="width: 25%;">Ao100</th></tr></thead>
<tbody id="solveTableBody"></tbody>
</table>
</div>
</div>

<div class="timer-area">
<div class="mode-selector hide-on-focus">
<button class="mode-btn active" onclick="setTrainingMode('standard', this)">Standard</button>
<button class="mode-btn" onclick="setTrainingMode('cross', this)">Cross Trainer</button>
<button class="mode-btn" onclick="setTrainingMode('bld', this)">BLD Mode</button>
<button class="mode-btn" onclick="setTrainingMode('splits', this)">Splits (CFOP)</button>
<button class="mode-btn" style="border-color:#ff9800; color:#ff9800;" onclick="setTrainingMode('alg-trainer', this)">🧠 Alg Trainer</button>
</div>

<div id="algTrainerControls" class="hide-on-focus" style="display:none; justify-content:center; gap:10px; margin-bottom:15px; width:100%; flex-wrap: wrap;">
<select id="algSetSelect" class="theme-select" onchange="updateAlgCases()">
<option value="PLL">PLL Cases</option>
<option value="OLL">OLL Cases</option>
</select>
<select id="algCaseSelect" class="theme-select" onchange="generateTrainerScramble()">
</select>
<div id="algPreview" style="color:var(--accent-color); font-family:monospace; margin-left:10px; display:flex; align-items:center;"></div>
</div>

<div class="scramble-container hide-on-focus" onclick="generateScramble(event)">
<p id="scrambleText" class="scramble-text">Loading...</p>
<div id="cubeVisualizer" class="cube-visualizer"></div>
<div style="color: var(--text-muted); font-size: 0.85rem; margin-top: 15px; display: flex; justify-content: center; align-items: center; gap: 20px;">
<button onclick="prevScramble(event)" class="scramble-btn" title="Previous Scramble">⟲ Prev</button>
<span id="scrambleHint">Click to generate new scramble</span>
<button onclick="nextScramble(event)" class="scramble-btn" title="Next Scramble">Next ⟳</button>
</div>
</div>

<div class="timer-wrapper">
<div id="mainTimerText" class="timer-display">0.000</div>
<div id="bldSubText" style="display:none; font-size: 1.2rem; color: var(--text-muted); margin-top: 10px; font-family: var(--timer-font);"></div>

<div id="penalty-controls" class="hide-on-focus">
<button class="penalty-btn" onclick="applyPenalty('OK')">OK</button>
<button class="penalty-btn" id="btnPenaltyPlus" onclick="applyPenalty('+2')">+2</button>
<button class="penalty-btn" onclick="applyPenalty('DNF')">DNF</button>
<button class="penalty-btn" onclick="deleteLastSolve()" style="margin-left: 20px; border-color: transparent;">✖ Delete</button>
</div>
</div>
</div>
`;
