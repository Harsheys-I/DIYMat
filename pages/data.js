const pageDataHTML = `
<h2>Data & Export</h2>
<div style="background: var(--ui-panel-bg); border: 1px solid var(--ui-border); padding: 20px; border-radius: var(--ui-radius); max-width: 800px;">
<p style="color: var(--text-muted); margin-bottom: 20px;">Manage backups or import solves stored on your hardware board. Our Smart Deduplication engine ensures you never import the same solve twice.</p>

<div style="display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 30px;">
<input type="file" id="importFileInput" accept=".csv, .txt" style="display: none;" onchange="importData(event)">
<button class="action-btn" onclick="document.getElementById('importFileInput').click()">📥 Smart Import (ArchSense/csTimer)</button>

<button id="btnImportOffline" class="action-btn" onclick="openOfflineImportModal()" style="display:none; background-color:#9C27B0; font-weight: bold; border-color:transparent;">📥 Fetch Offline Board Solves</button>

<button class="action-btn" onclick="exportCSV('current')">📤 CSV (Current)</button>
<button class="action-btn" onclick="exportCSV('all')">📤 CSV (All)</button>
<button class="action-btn" onclick="exportCSTimer()" style="background-color: #2196F3; color: #000; border-color:transparent; font-weight:bold;">📤 Export as csTimer (.txt)</button>
</div>

<hr style="border-top: 1px solid var(--ui-border); border-bottom: none; margin: 30px 0;">

<h3 style="margin-top: 0;">Active Session Overview</h3>
<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 15px; margin-bottom: 30px;">
<div id="boxSolves_full" class="stat-box-large visible" style="grid-column: 1 / -1;"><p class="stat-title">Solves</p><p id="statSolves_full" class="stat-value">0/0</p></div>
<div id="boxMean_full" class="stat-box-large visible"><p class="stat-title">Session Mean</p><p id="statMean_full" class="stat-value">--</p></div>
<div id="boxBest_full" class="stat-box-large visible"><p class="stat-title">Best Single</p><p id="statBest_full" class="stat-value val-pb">--</p></div>
<div id="boxAo5_full" class="stat-box-large"><p class="stat-title">Current Ao5</p><p id="statAo5_full" class="stat-value">--</p></div>
<div id="boxBestAo5_full" class="stat-box-large"><p class="stat-title">Best Ao5</p><p id="statBestAo5_full" class="stat-value val-pb">--</p></div>
<div id="boxAo12_full" class="stat-box-large"><p class="stat-title">Current Ao12</p><p id="statAo12_full" class="stat-value">--</p></div>
<div id="boxBestAo12_full" class="stat-box-large"><p class="stat-title">Best Ao12</p><p id="statBestAo12_full" class="stat-value val-pb">--</p></div>
<div id="boxAo100_full" class="stat-box-large"><p class="stat-title">Current Ao100</p><p id="statAo100_full" class="stat-value">--</p></div>
<div id="boxBestAo100_full" class="stat-box-large"><p class="stat-title">Best Ao100</p><p id="statBestAo100_full" class="stat-value val-pb">--</p></div>
</div>

<hr style="border-top: 1px solid var(--ui-border); border-bottom: none; margin: 30px 0;">
<h3 style="color: #d32f2f; margin-top: 0;">Danger Zone</h3>
<p style="color: var(--text-muted); margin-bottom: 20px;">Wipe all solves from the <strong id="dangerZoneSessionName" style="color: var(--text-color);">current</strong> session only.</p>
<button class="reset-btn" onclick="clearCurrentSession()">🗑️ Clear Current Session</button>
</div>
`;
