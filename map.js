'use strict';

// Google Maps is used here as an interactive place-finding and map-visualisation
// layer only. Do not download, scrape, store, or send Google's satellite tiles
// to an AI model. Use separately licensed imagery/data for building analysis.
(() => {
  const $ = (id) => document.getElementById(id);
  const state = {
    map: null, geocoder: null, polygon: null, vertices: [], markers: [],
    drawing: true, finished: false, areaSqM: 0, areaName: ''
  };
  const notice = (message) => { $('mapNotice').textContent = message; };
  const updateSummary = () => {
    $('selectedAreaPoints').textContent = String(state.vertices.length);
    $('undoVertex').disabled = state.vertices.length === 0 || state.finished;
    $('clearBoundary').disabled = state.vertices.length === 0;
    $('finishBoundary').disabled = state.vertices.length < 3 || state.finished;
    $('selectedAreaName').textContent = state.finished ? (state.areaName || 'User-selected area') : (state.vertices.length ? 'Boundary in progress' : 'No boundary selected');
    $('selectedAreaSize').textContent = state.areaSqM > 0 ? `${(state.areaSqM / 1e6).toFixed(3)} km²` : '—';
  };
  const clearMarkers = () => { state.markers.forEach(marker => marker.setMap(null)); state.markers = []; };
  const refreshPolygon = () => {
    if (state.polygon) state.polygon.setMap(null);
    if (!state.map || !state.vertices.length) { state.polygon = null; state.areaSqM = 0; updateSummary(); return; }
    state.polygon = new google.maps.Polygon({
      map: state.map,
      paths: state.vertices,
      strokeColor: '#c8f36a', strokeOpacity: 1, strokeWeight: 3,
      fillColor: '#c8f36a', fillOpacity: state.vertices.length >= 3 ? 0.18 : 0
    });
    state.areaSqM = state.vertices.length >= 3 ? google.maps.geometry.spherical.computeArea(state.vertices) : 0;
    updateSummary();
  };
  const resetBoundary = () => {
    state.vertices = []; state.finished = false; state.drawing = true; state.areaSqM = 0;
    clearMarkers();
    if (state.polygon) state.polygon.setMap(null);
    state.polygon = null;
    refreshPolygon();
    notice('Boundary cleared. Click on the map to add points around your study area.');
  };
  const addVertex = (latLng) => {
    if (!state.drawing || state.finished) return;
    state.vertices.push({ lat: latLng.lat(), lng: latLng.lng() });
    const marker = new google.maps.Marker({
      map: state.map, position: latLng, clickable: false,
      icon: { path: google.maps.SymbolPath.CIRCLE, scale: 5, fillColor: '#c8f36a', fillOpacity: 1, strokeColor: '#101b2d', strokeWeight: 2 }
    });
    state.markers.push(marker);
    refreshPolygon();
    notice(`${state.vertices.length} boundary point${state.vertices.length === 1 ? '' : 's'} added. Add at least 3 points, then finish the boundary.`);
  };
  const searchPlace = () => {
    const query = $('mapSearchInput').value.trim();
    if (!query) { notice('Enter a place name to search.'); return; }
    state.geocoder.geocode({ address: query }, (results, status) => {
      if (status === 'OK' && results[0]) {
        state.map.setCenter(results[0].geometry.location);
        state.map.setZoom(16);
        state.areaName = results[0].formatted_address || query;
        if (!$('areaName').value.trim()) $('areaName').value = query;
        notice(`Map centred on ${state.areaName}. Click the map to add study-area boundary points.`);
      } else {
        notice(`Could not find that place (${status}). Try a more specific place name.`);
      }
    });
  };
  const loadMap = () => {
    if (state.map) return;
    const key = $('googleMapsKey').value.trim();
    if (!key) { notice('Paste a Google Maps JavaScript API key first.'); return; }
    if (window.google && window.google.maps) { initPoupscanGoogleMap(); return; }
    if (document.getElementById('google-maps-script')) { notice('Google Maps is already loading. Please wait.'); return; }
    notice('Connecting to Google Maps…');
    window.initPoupscanGoogleMap = initPoupscanGoogleMap;
    window.gm_authFailure = () => notice('Google Maps authentication failed. Check the API key, billing, API enablement and website restrictions.');
    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&callback=initPoupscanGoogleMap&libraries=geometry&v=weekly`;
    script.async = true; script.defer = true;
    script.onerror = () => notice('Google Maps could not load. Check your internet connection and API key.');
    document.head.appendChild(script);
  };
  function initPoupscanGoogleMap() {
    if (state.map || !window.google?.maps) return;
    state.map = new google.maps.Map($('googleMap'), {
      center: { lat: 20, lng: 0 }, zoom: 2,
      mapTypeId: google.maps.MapTypeId.SATELLITE,
      streetViewControl: false, mapTypeControl: true, fullscreenControl: true,
      clickableIcons: false, gestureHandling: 'greedy'
    });
    state.geocoder = new google.maps.Geocoder();
    state.map.addListener('click', event => addVertex(event.latLng));
    $('googleMap').classList.add('map-loaded');
    notice('Satellite map connected. Search for a place, then click to add boundary points. Do not trace individual buildings or use Google imagery for AI analysis.');
    updateSummary();
  }
  window.PoupscanMap = {
    getBoundary() {
      return state.finished ? {
        name: state.areaName || 'User-selected area',
        areaSqKm: state.areaSqM / 1e6,
        points: state.vertices.map(point => ({ lat: point.lat, lng: point.lng }))
      } : null;
    }
  };
  $('loadGoogleMap').addEventListener('click', loadMap);
  $('mapSearchBtn').addEventListener('click', searchPlace);
  $('mapSearchInput').addEventListener('keydown', event => { if (event.key === 'Enter') searchPlace(); });
  $('finishBoundary').addEventListener('click', () => {
    if (state.vertices.length < 3) return;
    state.finished = true; state.drawing = false;
    state.areaSqM = google.maps.geometry.spherical.computeArea(state.vertices);
    updateSummary();
    if (!$('areaName').value.trim()) $('areaName').value = state.areaName || 'User-selected map area';
    notice(`Boundary saved for this browser session (${(state.areaSqM / 1e6).toFixed(3)} km²). This selects an area only; it does not analyse Google satellite imagery.`);
  });
  $('undoVertex').addEventListener('click', () => {
    if (!state.vertices.length || state.finished) return;
    state.vertices.pop(); const marker = state.markers.pop(); if (marker) marker.setMap(null);
    refreshPolygon(); notice('Last boundary point removed.');
  });
  $('clearBoundary').addEventListener('click', resetBoundary);
  const configuredKey = window.POUPSCAN_CONFIG?.googleMapsApiKey;
  if (configuredKey) $('googleMapsKey').value = configuredKey;
})();
