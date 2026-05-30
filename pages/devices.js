const pageDevicesHTML = `
<h2>Device Manager</h2>
<div style="background: var(--ui-panel-bg); border: 1px solid var(--ui-border); padding: 20px; border-radius: var(--ui-radius); max-width: 600px;">
<p style="color: var(--text-muted);">Currently configured for:</p>
<h3 id="activeDeviceDisplay" style="color: var(--accent-color); font-size: 1.8rem; margin: 10px 0;">None</h3>

<div id="usb-controls" style="margin-top: 20px; margin-bottom: 20px; display: flex; flex-direction: column; align-items:flex-start;">
<button id="btnConnectSerial" class="action-btn action-btn-green" onclick="connectWebSerial()" style="display: none;">🔌 Connect to Ghost USB</button>
</div>

<button class="reset-btn" onclick="resetSetup()" style="margin-top: 15px;">Reset Hardware Choice</button>

<hr style="border-top: 1px solid var(--ui-border); border-bottom: none; margin: 30px 0;">
<h3 style="margin-top: 0; color: var(--accent-color);">Hardware Diagnostics</h3>
<p style="color: var(--text-muted); margin-bottom: 20px;">Real-time sensor monitor. Tap your pads to test sensitivity, or use Left/Right Arrow keys in Keyboard Mode to test this UI.</p>
<div style="display: flex; justify-content: center; gap: 50px; background: var(--ui-dark-bg); padding: 30px; border-radius: var(--ui-radius); border: 1px solid var(--ui-border);">
<div style="text-align: center;">
<div id="diagLeft" class="sensor-indicator"></div>
<div style="margin-top: 15px; color: var(--text-muted); font-weight: bold; font-family: 'Roboto Mono', monospace;">LEFT PAD</div>
</div>
<div style="text-align: center;">
<div id="diagRight" class="sensor-indicator"></div>
<div style="margin-top: 15px; color: var(--text-muted); font-weight: bold; font-family: 'Roboto Mono', monospace;">RIGHT PAD</div>
</div>
</div>
</div>
`;
