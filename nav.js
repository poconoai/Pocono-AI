// ── RENDER VERDICT (Safeguarded) ──
function renderVerdict(yes, no, cond) {
  let msg, cls;
  if (yes >= 9)          { msg = `Strong consensus: ${yes}/12 vote YES. Panel recommends proceeding.`;            cls = 'v-strong'; }
  else if (yes >= 7)     { msg = `Majority yes: ${yes}/12 yes, ${cond}/12 conditional. Recommended with noted conditions.`; cls = 'v-strong'; }
  else if (yes+cond >= 9){ msg = `Qualified majority: ${yes} yes + ${cond} conditional. Proceed with conditions above.`; cls = 'v-conditional'; }
  else if (no >= 7)      { msg = `Majority concern: ${no}/12 advise against at this time. See positions above.`; cls = 'v-divided'; }
  else                   { msg = `Panel divided: ${yes} yes / ${cond} conditional / ${no} no. No clear consensus — review individual positions.`; cls = 'v-divided'; }
  
  if (vFinal) {
    vFinal.className = 'verdict-final show ' + cls;
    vFinal.innerHTML = '⚖ ' + msg;
  }
}

// ── RUN FULL PANEL (Safeguarded) ──
async function runPanel() {
  state.running = true;
  state.convened = true;
  btnRun.disabled = true;
  btnReset.disabled = true;
  btnAsk.disabled = true;
  document.querySelectorAll('.scenario-btn').forEach(b => b.setAttribute('disabled',''));
  
  if (vFinal) vFinal.className = 'verdict-final';

  // Reset panelists
  state.panelists = PANELISTS.map(p => ({ ...p, vote: null }));
  renderCards();
  updateTally();
  body.innerHTML = '';

  // Opening
  const sc = {
    deploy:       'Solo Practice Deployment',
    invest:       'Pre-Seed Investment Decision',
    legal:        'Boutique Law Firm AI Adoption',
    patient:      'Patient Safety Impact',
    cloud:        'Cloud AI vs. Sentinel Node',
    burnout:      'Physician Burnout Crisis',
    hipaa_breach: 'Post-Breach HIPAA Audit',
    rural:        'Rural Health Access & Deployment',
  }[state.scenario] || state.scenario;
  const intro = document.createElement('div');
  intro.style.cssText = 'text-align:center;padding:14px 0 20px;border-bottom:1px solid rgba(255,255,255,0.06);margin-bottom:18px;color:var(--muted);font-size:0.82em;';
  intro.innerHTML = `⚖ <strong style="color:var(--white)">Panel convened.</strong> &nbsp; Scenario: <em style="color:var(--ai-blue)">${sc}</em>`;
  body.appendChild(intro);
  status.textContent = 'Deliberation in progress…';

  for (let i = 0; i < state.panelists.length; i++) {
    if (!state.running) break;
    await speakOne(state.panelists[i]);
    if (i < state.panelists.length - 1) await delay(Math.round(state.speed * 0.6));
  }

  status.textContent = 'Deliberation complete — select a panelist below to ask a follow-up';
  state.running = false;
  btnReset.disabled = false;
  document.querySelectorAll('.scenario-btn').forEach(b => b.removeAttribute('disabled'));
  btnAsk.disabled = !(state.convened && $('q-panelist').value && $('q-topic').value);
}

// ── RESET (Safeguarded) ──
function resetSim() {
  state.running = false;
  state.convened = false;
  state.panelists = PANELISTS.map(p => ({ ...p, vote: null }));
  Object.keys(ASK_COUNT).forEach(k => delete ASK_COUNT[k]);
  CONVERSATION_THREAD.length = 0;
  const pSel = $('q-panelist');
  const tSel = $('q-topic');
  if (pSel) pSel.value = '';
  if (tSel) tSel.value = '';
  body.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:200px;flex-direction:column;gap:12px;color:var(--muted);text-align:center;padding:20px;"><span style="font-size:2em;">⚖</span><span style="font-size:0.9em;line-height:1.75;">Choose a scenario and click <strong style="color:var(--white)">Convene Panel</strong>.<br>12 experts will deliberate in sequence, then vote.</span></div>`;
  status.textContent = 'Awaiting convening…';
  
  if (vFinal) vFinal.className = 'verdict-final';
  
  btnRun.disabled = false;
  btnReset.disabled = false;
  btnAsk.disabled = true;
  renderCards();
  updateTally();
}