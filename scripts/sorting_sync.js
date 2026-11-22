/* Synchronise le registre local historique avec l'API familiale sans perdre les verdicts hors ligne. */
(() => {
  const api = document.querySelector('meta[name="gazette-sync-api"]')?.content.trim().replace(/\/$/, '');
  if (!api || !/^https:\/\//.test(api) || typeof sortingAssignments === 'undefined') return;

  const key = 'abelSortingSyncV1';
  const signature = value => JSON.stringify(value);
  const read = () => { try { return JSON.parse(localStorage.getItem(key) || '{}'); } catch { return {}; } };
  const state = read();
  state.deviceId ||= (crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`).replace(/[^A-Za-z0-9_-]/g, '');
  state.pending ||= {};
  state.syncedSignatures ||= {};
  state.conflictBackups ||= {};
  state.remoteRevisions ||= {};
  const persist = () => { try { localStorage.setItem(key, JSON.stringify(state)); } catch {} };
  const mutationId = () => (crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`).replace(/[^A-Za-z0-9_-]/g, '');
  let previous = Object.fromEntries(Object.entries(sortingAssignments).map(([id, result]) => [id, signature(result)]));

  // A missing marker means every pre-existing local verdict must be offered once.
  if (state.lastSyncedRevision == null) {
    for (const [id, result] of Object.entries(sortingAssignments)) {
      state.pending[id] ||= { result, mutationId: mutationId(), baseRevision: null };
    }
  } else {
    for (const [id, result] of Object.entries(sortingAssignments)) {
      if (!state.pending[id] && state.syncedSignatures[id] !== signature(result)) {
        state.pending[id] = { result, mutationId: mutationId(), baseRevision: state.remoteRevisions[id] ?? null };
      }
    }
  }
  persist();

  const originalSave = saveSorting;
  saveSorting = function () {
    originalSave();
    for (const [id, result] of Object.entries(sortingAssignments)) {
      const next = signature(result);
      if (previous[id] !== next) {
        state.pending[id] = { result, mutationId: mutationId(), baseRevision: state.remoteRevisions[id] ?? null };
      }
    }
    previous = Object.fromEntries(Object.entries(sortingAssignments).map(([id, result]) => [id, signature(result)]));
    persist();
    schedule();
  };

  let running = false;
  let timer = null;
  const request = async (path, options = {}) => {
    const response = await fetch(api + path, { cache: 'no-store', ...options });
    if (!response.ok) throw new Error(`Gazette register HTTP ${response.status}`);
    return response.json();
  };
  const retrying = id => sortingPerson === id && sortingQuestionIds.length > 0 && !sortingAssignments[id];
  function applyShared(snapshot) {
    let changed = false;
    for (const [id, shared] of Object.entries(snapshot.assignments || {})) {
      if (!sortingData.people.some(person => person.id === id) || state.pending[id]) continue;
      state.remoteRevisions[id] = shared.revision;
      state.syncedSignatures[id] = signature(shared.result);
      if (!retrying(id) && signature(sortingAssignments[id]) !== signature(shared.result)) {
        sortingAssignments[id] = shared.result;
        changed = true;
      }
    }
    if (changed) {
      originalSave();
      previous = Object.fromEntries(Object.entries(sortingAssignments).map(([id, result]) => [id, signature(result)]));
      renderSorting();
      document.dispatchEvent(new Event('gazette:sorting-updated'));
    }
    state.lastSyncedRevision = snapshot.revision;
    state.lastSyncedAt = new Date().toISOString();
    persist();
  }
  async function sync() {
    if (running || navigator.onLine === false) return;
    running = true;
    try {
      const before = await request('/v1/assignments');
      for (const [id, pending] of Object.entries(state.pending)) {
        const shared = before.assignments?.[id];
        if (shared && signature(shared.result) === signature(pending.result)) {
          delete state.pending[id];
          continue;
        }
        const response = await request(`/v1/assignments/${encodeURIComponent(id)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...pending, deviceId: state.deviceId }),
        });
        if (response.conflictRecorded) {
          state.conflictBackups[id] = { result: pending.result, savedAt: new Date().toISOString() };
        }
        state.remoteRevisions[id] = response.assignment.revision;
        delete state.pending[id];
        persist();
      }
      applyShared(await request('/v1/assignments'));
    } catch (error) {
      // Keep the local verdict and pending mutations; retry on the next visit/connection.
      console.info('Registre commun indisponible, verdicts conservés sur cet appareil.', error);
    } finally {
      running = false;
    }
  }
  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(sync, 400);
  }
  window.addEventListener('online', sync);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) sync(); });
  setInterval(() => { if (!document.hidden) sync(); }, 45000);
  schedule();
})();
