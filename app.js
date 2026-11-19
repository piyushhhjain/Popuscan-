'use strict';

// Poupscan MVP: image handling and roof markers run locally in the browser.
// This first build deliberately uses human-verified markers, not pretend AI detection.
const $ = (id) => document.getElementById(id);
const state = { image: null, imageUrl: null, marks: [], lastResult: null };
const canvas = $('imageCanvas');
const ctx = canvas.getContext('2d');

function setNotice(message) { $('imageNotice').textContent = message; }
function updateMarkerUI() {
  const count = state.marks.length;
  $('markerCount').textContent = `${count} building${count === 1 ? '' : 's'} marked`;
  $('resultBuildings').textContent = count.toLocaleString();
  $('undoMark').disabled = count === 0;
  $('clearMarks').disabled = count === 0;
  if (state.lastResult) calculate(false);
}
function drawImage() {
  if (!state.image) return;
  const maxWidth = 1400;
  const scale = Math.min(1, maxWidth / state.image.naturalWidth);
  canvas.width = Math.round(state.image.naturalWidth * scale);
  canvas.height = Math.round(state.image.naturalHeight * scale);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(state.image, 0, 0, canvas.width, canvas.height);
  state.marks.forEach((mark, index) => {
    const x = mark.x * canvas.width, y = mark.y * canvas.height;
    ctx.beginPath(); ctx.arc(x, y, Math.max(9, canvas.width * .008), 0, Math.PI * 2);
    ctx.fillStyle = '#c8f36a'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#101b2d'; ctx.stroke();
    ctx.fillStyle = '#101b2d'; ctx.font = `bold ${Math.max(10, canvas.width * .009)}px Manrope, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(index + 1), x, y);
  });
}
function loadFile(file) {
  if (!file || !/^image\/(png|jpeg|webp)$/.test(file.type)) {
    setNotice('Please choose a PNG, JPG or WEBP image.'); return;
  }
  if (state.imageUrl) URL.revokeObjectURL(state.imageUrl);
  state.imageUrl = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    state.image = img; state.marks = []; state.lastResult = null;
    $('uploadPrompt').hidden = true; $('imageStage').hidden = false;
    drawImage(); updateMarkerUI();
    $('exportCsv').disabled = true;
    setNotice(`${file.name} loaded. Click once on each visible building roof to mark it. The image has not been uploaded.`);
  };
  img.onerror = () => setNotice('The image could not be opened. Try another file.');
  img.src = state.imageUrl;
}
$('dropZone').addEventListener('click', (event) => {
  if (event.target.closest('button')) return;
  if (!state.image) $('imageInput').click();
});
$('dropZone').addEventListener('keydown', (event) => {
  if ((event.key === 'Enter' || event.key === ' ') && !state.image) { event.preventDefault(); $('imageInput').click(); }
});
$('imageInput').addEventListener('change', (event) => loadFile(event.target.files[0]));
['dragenter', 'dragover'].forEach(type => $('dropZone').addEventListener(type, event => { event.preventDefault(); $('dropZone').classList.add('dragover'); }));
['dragleave', 'drop'].forEach(type => $('dropZone').addEventListener(type, event => { event.preventDefault(); $('dropZone').classList.remove('dragover'); }));
$('dropZone').addEventListener('drop', event => loadFile(event.dataTransfer.files[0]));
canvas.addEventListener('click', event => {
  if (!state.image) return;
  const rect = canvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) / rect.width;
  const y = (event.clientY - rect.top) / rect.height;
  if (x < 0 || x > 1 || y < 0 || y > 1) return;
  state.marks.push({ x, y }); drawImage(); updateMarkerUI();
  setNotice(`Building ${state.marks.length} marked. Keep one marker per distinct roof/building.`);
});
$('undoMark').addEventListener('click', () => { state.marks.pop(); drawImage(); updateMarkerUI(); });
$('clearMarks').addEventListener('click', () => { state.marks = []; drawImage(); updateMarkerUI(); state.lastResult = null; $('exportCsv').disabled = true; });

function readInputs() {
  const residential = Number($('residentialShare').value) / 100;
  const units = Number($('unitsPerBuilding').value);
  const people = Number($('peoplePerHome').value);
  const occupancy = Number($('occupancy').value) / 100;
  if (![units, people].every(Number.isFinite) || units <= 0 || people <= 0) throw new Error('Homes per building and people per home must be greater than zero.');
  return { residential, units, people, occupancy };
}
function calculate(showNotice = true) {
  try {
    const a = readInputs();
    const marked = state.marks.length;
    const boundary = window.PoupscanMap?.getBoundary?.() || null;
    const expectedHomes = marked * a.residential * a.units * a.occupancy;
    const population = expectedHomes * a.people;
    // A broad ±25% planning band is a provisional uncertainty allowance, not a statistical CI.
    const low = Math.max(0, Math.floor(population * .75));
    const high = Math.ceil(population * 1.25);
    const homes = Math.round(expectedHomes);
    $('resultPopulation').textContent = marked ? Math.round(population).toLocaleString() : '0';
    $('resultRange').textContent = marked ? `${low.toLocaleString()}–${high.toLocaleString()} planning range (±25%)` : 'Mark buildings to calculate';
    $('resultHomes').textContent = marked ? homes.toLocaleString() : '0';
    $('resultBuildings').textContent = marked.toLocaleString();
    $('resultExplanation').textContent = marked
      ? `For “${$('areaName').value.trim() || 'Unnamed study area'}”, this estimate uses ${marked} manually marked buildings${boundary ? ` within a user-selected map boundary of ${boundary.areaSqKm.toFixed(3)} km²` : ''}, ${(a.residential * 100).toFixed(0)}% residential share, ${a.units} homes/building, ${(a.occupancy * 100).toFixed(0)}% occupancy and ${a.people} people/home. The ±25% band is a simple provisional allowance, not a validated confidence interval.`
      : 'No buildings have been marked yet. Upload an image and place one marker on each distinct building.';
    state.lastResult = { marked, a, homes, population: Math.round(population), low, high, area: $('areaName').value.trim() || 'Unnamed study area', boundary };
    $('exportCsv').disabled = marked === 0;
    if (showNotice) setNotice(marked ? 'Estimate calculated. Review the assumptions and validate them against local data before using the result.' : 'Mark at least one building to calculate an estimate.');
  } catch (error) { setNotice(error.message); }
}
$('calculateBtn').addEventListener('click', () => calculate(true));
$('residentialShare').addEventListener('input', () => { $('residentialShareValue').textContent = `${$('residentialShare').value}%`; if (state.lastResult) calculate(false); });
$('occupancy').addEventListener('input', () => { $('occupancyValue').textContent = `${$('occupancy').value}%`; if (state.lastResult) calculate(false); });
['unitsPerBuilding', 'peoplePerHome', 'areaName'].forEach(id => $(id).addEventListener('change', () => { if (state.lastResult) calculate(false); }));
$('exportCsv').addEventListener('click', () => {
  if (!state.lastResult) return;
  const r = state.lastResult;
  const rows = [
    ['Poupscan preliminary population estimate'], ['Study area', r.area], ['Buildings manually marked', r.marked],
    ['Residential building share (%)', (r.a.residential * 100).toFixed(1)], ['Homes per residential building', r.a.units],
    ['Home occupancy (%)', (r.a.occupancy * 100).toFixed(1)], ['People per home', r.a.people],
    ['Estimated residential homes', r.homes], ['Estimated population (rounded)', r.population],
    ['Provisional planning range low', r.low], ['Provisional planning range high', r.high],
    ['Method note', 'Manual roof markers × editable occupancy assumptions; ±25% is a provisional allowance, not a validated confidence interval.'],
    ['Limitation', 'Not an official census count. Validate against local ground data.'],
    ['Google imagery note', 'Google Maps imagery is for map visualisation only and is not used for machine interpretation or building detection.']
  ];
  const csv = rows.map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob); const link = document.createElement('a');
  link.href = url; link.download = 'poupscan-estimate.csv'; link.click(); URL.revokeObjectURL(url);
});
$('resetAll').addEventListener('click', () => {
  state.marks = []; state.image = null; state.lastResult = null;
  if (state.imageUrl) URL.revokeObjectURL(state.imageUrl); state.imageUrl = null;
  $('imageInput').value = ''; $('areaName').value = ''; $('uploadPrompt').hidden = false; $('imageStage').hidden = true;
  $('residentialShare').value = 80; $('residentialShareValue').textContent = '80%';
  $('unitsPerBuilding').value = 2; $('peoplePerHome').value = 4.2; $('occupancy').value = 90; $('occupancyValue').textContent = '90%';
  $('resultBuildings').textContent = '0'; $('resultPopulation').textContent = '—'; $('resultRange').textContent = 'Calculate to view a range'; $('resultHomes').textContent = '—';
  $('resultExplanation').textContent = 'Upload an image, mark buildings, and calculate to generate a transparent estimate.';
  $('exportCsv').disabled = true; updateMarkerUI(); setNotice('Workspace reset. No data has been uploaded or saved.');
});
