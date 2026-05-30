const pageAnalyticsHTML = `
<h2>Data Analytics & Projections</h2>

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-bottom: 20px;">
<div class="stat-box-large visible" style="padding: 15px;"><p class="stat-title">Total Solves</p><p id="anaTotalSolves" class="stat-value">--</p></div>
<div class="stat-box-large visible" style="padding: 15px;"><p class="stat-title">Time Cubing</p><p id="anaTotalTime" class="stat-value">--</p></div>
<div class="stat-box-large visible" style="padding: 15px;"><p class="stat-title">Overall Median</p><p id="anaMedian" class="stat-value">--</p></div>
<div class="stat-box-large visible" style="padding: 15px;"><p class="stat-title">Std Deviation</p><p id="anaStdDev" class="stat-value">--</p></div>
</div>

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 20px;">
<div style="background: var(--ui-panel-bg); padding: 20px; border-radius: var(--ui-radius); border: 1px solid var(--ui-border);">
<h3 style="margin-top:0; color: var(--accent-color);">Session Trendline</h3>
<p style="color: var(--text-muted); font-size: 0.85rem; margin-top: -10px;">Polynomial Regression over valid solves</p>
<div class="chart-container"><canvas id="trendChart"></canvas></div>
</div>
<div style="background: var(--ui-panel-bg); padding: 20px; border-radius: var(--ui-radius); border: 1px solid var(--ui-border);">
<h3 style="margin-top:0; color: var(--accent-color);">Time Distribution</h3>
<p style="color: var(--text-muted); font-size: 0.85rem; margin-top: -10px;">Frequency of solve times (1-second buckets)</p>
<div class="chart-container"><canvas id="distChart"></canvas></div>
</div>
</div>

<div id="splitsChartContainer" style="background: var(--ui-panel-bg); padding: 20px; border-radius: var(--ui-radius); border: 1px solid var(--ui-border); margin-top: 20px; display: none;">
<h3 style="margin-top:0; color: var(--accent-color);">CFOP Phase Splits Analysis</h3>
<p style="color: var(--text-muted); font-size: 0.85rem; margin-top: -10px;">Breakdown of time spent per phase (Requires "Splits Mode" solves with exactly 3 taps before stopping).</p>
<div class="chart-container"><canvas id="splitsChart"></canvas></div>

<div id="eliteRatioContainer" style="margin-top: 25px; padding-top: 20px; border-top: 1px solid var(--ui-border); display: none;">
<h4 style="margin: 0 0 15px 0; color: var(--text-color);">Elite Ratio Comparison</h4>
<div id="ratioGrid" style="display: flex; gap: 10px; flex-wrap: wrap;"></div>
<p id="ratioAdvice" style="margin-top: 15px; padding: 12px; background: rgba(255, 152, 0, 0.1); border-left: 4px solid #ff9800; border-radius: 4px; font-size: 1.05rem; line-height: 1.5; color: var(--text-color);"></p>
</div>
</div>

<div style="background: var(--ui-panel-bg); padding: 20px; border-radius: var(--ui-radius); border: 1px solid var(--ui-border); margin-top: 20px;">
<h3 style="margin-top:0; color: var(--accent-color);">WCA Simulation & Projected Averages</h3>
<p style="color: var(--text-muted); margin-bottom: 20px;">See exactly what time you need on your very next solve to beat your Personal Bests.</p>
<div style="display: flex; gap: 20px; flex-wrap: wrap;">
<div style="flex: 1; background: var(--ui-dark-bg); padding: 15px; border-radius: 6px; border: 1px solid var(--ui-border);">
<p style="margin: 0 0 10px 0; color: var(--text-muted); text-transform: uppercase; font-size: 0.85rem; letter-spacing: 1px;">Target: PB Ao5</p>
<p id="projAo5" style="margin: 0; font-size: 1.1rem; line-height: 1.5;">Requires: <strong>--</strong></p>
</div>
<div style="flex: 1; background: var(--ui-dark-bg); padding: 15px; border-radius: 6px; border: 1px solid var(--ui-border);">
<p style="margin: 0 0 10px 0; color: var(--text-muted); text-transform: uppercase; font-size: 0.85rem; letter-spacing: 1px;">Target: PB Ao12</p>
<p id="projAo12" style="margin: 0; font-size: 1.1rem; line-height: 1.5;">Requires: <strong>--</strong></p>
</div>
</div>
</div>
`;
