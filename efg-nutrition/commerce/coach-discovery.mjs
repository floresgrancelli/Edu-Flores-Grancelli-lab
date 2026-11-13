// Preparation module. Not connected to public profiles, Auth or messaging yet.
const escape = value => String(value ?? '').replace(/[&<>"']/g,
  c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const text = (value, max) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const validId = id => typeof id === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(id);

// Input must come from a server-managed public projection, not Auth profiles.
// Do not serialize source rows: they may contain private contact/health fields.
export function publicCoachCards(rows) {
  if (!Array.isArray(rows)) throw new Error('INVALID_DIRECTORY');
  const seen = new Set();
  return rows.filter(row => row && validId(row.id) && row.published === true &&
    row.recommended === true && row.coachOptIn === true && row.enabled === true &&
    row.acceptingRequests === true && text(row.displayName, 80) && !seen.has(row.id) && seen.add(row.id))
    .map(row => ({ id: row.id, displayName: text(row.displayName, 80),
      specialty: text(row.specialty, 100), location: text(row.location, 80),
      description: text(row.description, 300),
      modality: ['online', 'presencial', 'mixta'].includes(row.modality) ? row.modality : '',
      sponsored: row.sponsored === true }));
}

export function renderCoachDirectory({ rows = [], loading = false, error = '', signedIn = false } = {}) {
  const intro = '<header><p class="eyebrow">NUTRICIÓN CON-CIENCIA</p><h1>Busco coach</h1>' +
    '<p>Conocé a los profesionales que seleccionamos para acompañarte.</p></header>';
  const note = '<p class="pilot-hint">Consultar esta sección y solicitar contacto no requiere pagar la activación. ' +
    'El contacto no asigna un coach ni autoriza a compartir tu ficha o tus registros.</p>';
  if (loading) return intro + '<p role="status">Buscando coaches…</p>' + note;
  if (error) return intro + '<p role="alert">No pudimos consultar los coaches. Intentá nuevamente.</p>' + note;
  const cards = publicCoachCards(rows);
  if (!cards.length) return intro + '<section class="card"><h2>Estamos preparando las recomendaciones</h2>' +
    '<p>Por ahora no hay coaches disponibles para recibir solicitudes. Podés volver más adelante.</p></section>' + note;
  return intro + '<div class="ncc-coach-directory">' + cards.map(c =>
    '<article class="card"><span class="pilot-pill">' + (c.sponsored ? 'Patrocinado' : 'Seleccionado por nuestro equipo') +
    '</span><h2>' + escape(c.displayName) + '</h2>' +
    (c.specialty ? '<p><strong>' + escape(c.specialty) + '</strong></p>' : '') +
    '<p>' + escape([c.modality, c.location].filter(Boolean).join(' · ')) + '</p>' +
    '<p>' + escape(c.description) + '</p><button type="button" class="btn" data-discovery-coach="' + c.id + '">' +
    (signedIn ? 'Quiero contactarme' : 'Ingresar para solicitar contacto') + '</button></article>').join('') + '</div>' + note;
}

/**
 * transport is an authenticated SERVER endpoint, never direct profile access.
 * It must independently validate publication/opt-in, idempotency and recipients,
 * persist a contact-only request and permit a scoped conversation. It must not
 * assign coach/student, grant health-data access, reserve seats or start billing.
 */
export function createContactRequestController({ transport, getSession, createRequestId }) {
  if (![transport, getSession, createRequestId].every(fn => typeof fn === 'function')) {
    throw new Error('CONTACT_ADAPTERS_REQUIRED');
  }
  const requests = new Map();
  return {
    async request({ coachId, contactConsent }) {
      if (!validId(coachId)) throw new Error('INVALID_COACH');
      if (contactConsent !== true) throw new Error('CONTACT_CONSENT_REQUIRED');
      const session = await getSession();
      if (!session?.user?.id) throw new Error('SIGN_IN_REQUIRED');
      const key = session.user.id + ':' + coachId;
      let request = requests.get(key);
      if (!request) {
        const requestId = createRequestId();
        if (!validId(requestId)) throw new Error('INVALID_REQUEST_ID');
        request = { requestId, promise: null, result: null }; requests.set(key, request);
      }
      if (request.result) return request.result;
      if (request.promise) return request.promise;
      request.promise = (async () => {
        // No email, symptoms, goals, diary or health record enters this payload.
        const response = await transport({ coachId, requestId: request.requestId, contactConsent: true });
        if (!response || response.requestId !== request.requestId || response.coachId !== coachId ||
          response.persisted !== true || !['pending', 'accepted', 'declined'].includes(response.status)) {
          throw new Error('CONTACT_NOT_CONFIRMED');
        }
        const current = await getSession();
        if (current?.user?.id !== session.user.id) throw new Error('SESSION_CHANGED');
        const result = { requestId: response.requestId, coachId, status: response.status };
        request.result = result; return result;
      })();
      try { return await request.promise; } finally { request.promise = null; }
    },
    clearSession() { requests.clear(); },
  };
}
