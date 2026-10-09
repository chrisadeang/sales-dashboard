import './style.css';
import { loadData, subscribeToChanges } from './data.js';

const THRESHOLD = 90;
const OUTLETS = ['All', 'Tampines', 'Jurong', 'Orchard'];
let DATA = [];
let current = 'All';

const $ = id => document.getElementById(id);
const fmt = n => n.toLocaleString('en-SG');
const money = n => 'S$' + fmt(Math.round(n));
const pct = (a, b) => (b ? (a / b) * 100 : 0);
const dateLabel = w =>
  new Date(w + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

function renderFilter() {
  $('filter').innerHTML = OUTLETS.map(
    o => `<button type="button" data-o="${o}" aria-pressed="${o === current}">${o}</button>`
  ).join('');
}

function render() {
  const rows = current === 'All' ? DATA : DATA.filter(r => r.outlet === current);
  const sum = k => rows.reduce((s, r) => s + r[k], 0);
  const sales = sum('sales'), target = sum('target'), orders = sum('orders'), returns = sum('returns');
  const attain = pct(sales, target), retPct = pct(returns, orders);
  const gap = sales - target;

  const weeks = [...new Set(rows.map(r => r.week))].sort();
  $('range').textContent = weeks.length
    ? `${current === 'All' ? 'All outlets' : current} · weeks of ${dateLabel(weeks[0])} – ${dateLabel(weeks[weeks.length - 1])}`
    : 'No data';

  $('kpis').innerHTML = `
    <div class="card kpi accent"><div class="label">Total sales</div><div class="value">${money(sales)}</div>
      <div class="note">${gap >= 0 ? '+' : '−'}${money(Math.abs(gap))} vs target</div></div>
    <div class="card kpi"><div class="label">% of target</div><div class="value ${attain < THRESHOLD ? 'bad' : ''}">${attain.toFixed(1)}%</div>
      <div class="note">Target ${money(target)}</div></div>
    <div class="card kpi"><div class="label">Orders</div><div class="value">${fmt(orders)}</div>
      <div class="note">Avg ${money(orders ? sales / orders : 0)} per order</div></div>
    <div class="card kpi"><div class="label">Returns</div><div class="value">${retPct.toFixed(1)}%</div>
      <div class="note">${fmt(returns)} of ${fmt(orders)} orders</div></div>`;

  // chart: scale 0–120%
  const MAX = 120;
  const sorted = [...rows].sort(
    (a, b) => OUTLETS.indexOf(a.outlet) - OUTLETS.indexOf(b.outlet) || a.week.localeCompare(b.week)
  );
  const lines = [100, 90, 50, 0]
    .map(
      v => `<div class="gl ${v === 100 ? 't100' : v === 90 ? 't90' : ''}" style="bottom:${(v / MAX) * 100}%"><span>${v}%</span></div>`
    )
    .join('');
  const bars = sorted
    .map(r => {
      const p = pct(r.sales, r.target);
      return `<div class="col" title="${r.outlet}, ${dateLabel(r.week)}: ${money(r.sales)} of ${money(r.target)} (${p.toFixed(1)}%)">
        <div class="bar ${p < THRESHOLD ? 'low' : ''}" style="height:${(Math.min(p, MAX) / MAX) * 100}%"><span class="v">${p.toFixed(0)}%</span></div></div>`;
    })
    .join('');
  $('chart').innerHTML = lines + `<div class="bars">${bars}</div>`;
  $('xlabels').innerHTML = sorted
    .map(r => `<div class="xl"><b>${r.outlet}</b>${dateLabel(r.week)}</div>`)
    .join('');

  // needs attention
  const low = rows
    .map(r => ({ ...r, p: pct(r.sales, r.target) }))
    .filter(r => r.p < THRESHOLD)
    .sort((a, b) => a.p - b.p);
  $('attention').innerHTML = low.length
    ? low
        .map(
          r => `<li><div><div class="li-t">${r.outlet} · ${dateLabel(r.week)}</div>
        <div class="li-s">${money(r.target - r.sales)} short of ${money(r.target)}</div></div>
        <span class="pill">${r.p.toFixed(1)}%</span></li>`
        )
        .join('')
    : '<li class="empty">Nothing under 90% — all outlet-weeks are on track.</li>';
}

function showError(message) {
  $('error-msg').textContent = message;
  $('error').hidden = false;
  $('dashboard').hidden = true;
  $('filter').hidden = true;
  $('range').textContent = 'Data unavailable';
}

async function init() {
  $('error').hidden = true;
  $('dashboard').hidden = false;
  $('filter').hidden = false;
  $('range').textContent = 'Loading…';
  renderFilter();
  try {
    DATA = await loadData();
    render();
    startLive();
  } catch (err) {
    console.error(err);
    showError(err.message || 'Unknown error');
  }
}

$('filter').addEventListener('click', e => {
  const b = e.target.closest('button[data-o]');
  if (!b) return;
  current = b.dataset.o;
  renderFilter();
  render();
});
$('retry').addEventListener('click', init);

/* ---------- live updates (Supabase Realtime) ---------- */
let liveStarted = false;
const stamp = () => new Date().toLocaleTimeString('en-SG', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

function setLive(state, text) {
  let el = $('live');
  if (!el) {
    el = document.createElement('div');
    el.id = 'live';
    $('range').after(el);
  }
  el.className = 'live ' + state;
  el.innerHTML = '<i></i><span></span>';
  el.lastChild.textContent = text;
}

async function refresh() {
  try {
    DATA = await loadData();
    render();
    setLive('on', 'Live · updated ' + stamp());
  } catch (err) {
    setLive('off', 'Reconnecting… ' + (err.message || ''));
  }
}

function startLive() {
  setLive('on', 'Live · updated ' + stamp());
  if (liveStarted) return;
  liveStarted = true;
  subscribeToChanges(refresh, status => {
    if (status === 'SUBSCRIBED') setLive('on', 'Live · updated ' + stamp());
    else if (['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED'].includes(status))
      setLive('off', 'Live updates paused · refreshing every 30s');
  });
  setInterval(refresh, 30000); // safety net if realtime is interrupted
}

init();
