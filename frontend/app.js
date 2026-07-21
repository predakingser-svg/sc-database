/* ═══════════════════════════════════════════
   Star Citizen Database — App Logic  v2.2
   ═══════════════════════════════════════════
   Changelog:
   - v2.2: Lazy loading por sección. Eliminado dbCache y loadDatabase().
           Cada sección carga su JSON desde /data/ bajo demanda.
   - Unified modal system (single showDetailModal)
   - Wikelo migrated to data-table with pagination
   - Items: pagination + detail modal + null → "—"
   - Components page: full data-table with modal
   - CSS cleaned up, wk-card removed
   - All Escape/backdrop handlers unified
   - navigateTo duplication removed
   - filterMissionScope setTimeout removed
   ═══════════════════════════════════════════ */

// Auto-detect API base
const _isDev = window.location.hostname.includes('serveo') || window.location.port === '8080';
const IS_STATIC = !_isDev;
const API = _isDev
    ? ''
    : '';

// ─── Theme system ───
const DEFAULT_THEME = 'dark';
let currentTheme = localStorage.getItem('sc_theme') || DEFAULT_THEME;
// Si el tema Pyro estaba activo pero no es supporter, revertir a oscuro
if (currentTheme === 'pyro' && localStorage.getItem('sc_supporter') !== 'true') {
    currentTheme = 'dark';
    localStorage.setItem('sc_theme', 'dark');
}
document.documentElement.setAttribute('data-theme', currentTheme);

function assignGlitchDelays() {
    const selectors = ['.card', '.stat-card', '.modal-detail', '.catalog-card', '.badge'];
    selectors.forEach(sel => {
        document.querySelectorAll(sel).forEach(el => {
            if (!el.style.getPropertyValue('--glitch-delay') || Math.random() < 0.3) {
                const delay = Math.random() * 7;
                el.style.setProperty('--glitch-delay', delay.toString());
            }
        });
    });
    // Inject corner decoration in sidebar header
    const sh = document.querySelector('.sidebar-header');
    if (sh && !sh.querySelector('.corner-tl')) {
        const corner = document.createElement('span');
        corner.className = 'corner-tl';
        sh.appendChild(corner);
    }
}

function toggleTheme() {
    const isSupporter = localStorage.getItem('sc_supporter') === 'true';
    if (currentTheme === 'dark' && !isSupporter) {
        const status = document.getElementById('supporter-status');
        if (status) {
            status.innerHTML = '<span class="supporter-msg supporter-msg-locked">🔒 Solo para supporters — <a href="https://ko-fi.com/tubsdep" target="_blank" rel="noopener noreferrer" style="color:var(--accent);text-decoration:underline">dona en Ko-fi</a> para acceder al tema Pyro</span>';
            status.style.display = 'block';
            setTimeout(() => { status.style.display = 'none'; }, 5000);
        }
        return;
    }
    currentTheme = currentTheme === 'dark' ? 'pyro' : 'dark';
    document.documentElement.setAttribute('data-theme', currentTheme);
    localStorage.setItem('sc_theme', currentTheme);
    const btn = document.getElementById('theme-toggle');
    if (btn) {
        btn.textContent = currentTheme === 'pyro' ? '💠' : '🔥';
        btn.title = currentTheme === 'pyro' ? 'Tema Stanton' : 'Tema Pyro';
        btn.className = 'tb-btn' + (currentTheme === 'pyro' ? ' cyber-btn' : '');
    }
    // Apply cyber-btn class to all topbar buttons when pyro
    document.querySelectorAll('.topbar-info .tb-btn').forEach(b => {
        if (currentTheme === 'pyro') b.classList.add('cyber-btn');
        else b.classList.remove('cyber-btn');
    });
    if (currentTheme === 'pyro') {
        assignGlitchDelays();
    }
}

// ─── Global state ───
let currentLang = localStorage.getItem('sc_lang') || 'es';
let fullTranslations = {};
let contractorTranslations = {};
let missionDescriptionsES = null;
let missionDescClean = null;
let missionTitlesES = null;

const SCOPE_ES = {
    'Assassination': 'Asesinato',
    'Bounty Hunter': 'Caza de recompensas',
    'Hauling': 'Transporte',
    'Investigation': 'Investigación',
    'Mining': 'Minería',
    'Other': 'Otro',
    'Recovery': 'Recuperación',
    'Salvage': 'Chatarrería',
    'Security': 'Seguridad',
    'Delivery': 'Entrega',
    'Combat': 'Combate',
    'Medical': 'Médico',
    'Passenger': 'Pasajeros',
    'Racing': 'Carreras',
    'Smuggling': 'Contrabando'
};

// ─── Translation map ───
const _stringMap = {
    'Misiones con blueprints': 'Missions with blueprints',
    'Misiones ilegales': 'Illegal missions',
    'Componentes de nave': 'Ship Components',
    'Invítame un café': 'Buy me a coffee',
    '¿Te gusta SC Database?': 'Like SC Database?',
    'Apoya el proyecto invitándome un café': 'Support the project — buy me a coffee',
    'Ver todos los blueprints': 'View all blueprints',
    'Armas Size 6': 'Weapons Size 6',
    'Naves Wikelo': 'Wikelo Ships',
    'Planta de poder': 'Power Plant',
    'Motor cuántico': 'Quantum Drive',
    'Armas': 'Weapons',
    'Facciones': 'Factions',
    'Componentes': 'Components',
    'Misiones': 'Missions',
    'Planos': 'Blueprints',
    'Dashboard': 'Dashboard',
    'Items': 'Items',
    'Título': 'Title',
    'Facción': 'Faction',
    'Recompensa': 'Reward',
    'Sistema': 'System',
    'Categoría': 'Category',
    'Nombre': 'Name',
    'Tipo': 'Type',
    'Tamaño': 'Size',
    'Precio': 'Price',
    'Producción': 'Output',
    'Ingredientes': 'Ingredients',
    'Tiempo': 'Time',
    'Alcance': 'Range',
    'Grado': 'Grade',
    'Filtrar': 'Filter',
    'Buscar': 'Search',
    'Todas': 'All',
    'Legales': 'Legal',
    'Ilegales': 'Illegal',
    'Cargando...': 'Loading...',
    'Error': 'Error',
    'Sin datos': 'No data',
    'Sin resultados': 'No results',
    'Conectando...': 'Connecting...',
    'Legal': 'Legal',
    'Ilegal': 'Illegal',
    'Común': 'Common',
    'Raro': 'Rare',
    'Épico': 'Epic',
    'Legendario': 'Legendary',
    'Escudo': 'Shield',
    'Enfriador': 'Cooler',
    'Radar': 'Radar',
    'Wikelo': 'Wikelo',
    'Naves': 'Ships',
    'Consultando...': 'Checking...',
    'Última actualización': 'Last Update',
    'Misiones por categoría': 'Missions by Category',
    'Misiones por sistema': 'Missions by System',
    'Distribución de Blueprints': 'Blueprint Distribution',
    'Acceso rápido': 'Quick Access',
    'Solo desbloqueables': 'Unlockable only',
    'Cualquier # ingredientes': 'Any # ingredients',
    'Cualquier size': 'Any size',
    'Cualquier tipo': 'Any type',
    'Todas las categorías': 'All categories',
    'Todas las facciones': 'All factions',
    'Todos los sistemas': 'All systems',
    'Con blueprints': 'With blueprints',
    'Catálogo de Wikelo': 'Wikelo Catalog',
    'Armas de nave': 'Ship Weapons',
    'Buscar en misiones...': 'Search missions...',
    'Buscar blueprint...': 'Search blueprint...',
    'Buscar arma...': 'Search weapon...',
    'Buscar contrato...': 'Search contract...',
    'Buscar item...': 'Search item...',
    'Buscar componente...': 'Search component...',
    'Catálogo de armas con stats': 'Weapon catalog with stats',
    'Catálogo de planos de fabricación': 'Crafting plans catalog',
    'Catálogo completo de todos los items del juego': 'Complete catalog of all game items',
    'Contratos de trueque': 'Trade contracts',
    'Misiones que lo dan': 'Missions that give it',
    'Cargando misiones...': 'Loading missions...',
    'Error al cargar': 'Load error',
    'Fecha no disponible': 'Date not available',
    'Datos actualizados': 'Data updated',
    'No se pudo conectar con la API': 'Could not connect to the API',
    'Ejecuta primero la API Flask en localhost:5000': 'Run the Flask API on localhost:5000 first',
    'Requisitos': 'Requirements',
    'Reputación': 'Reputation',
    'Disponible': 'Available',
    'Requisito': 'Requirement',
    'Size': 'Size',
    'Catálogo de componentes': 'Component catalog',
    'Armamento de naves': 'Ship Armament',
    'Todos los tipos': 'All types',
    'Armas FPS': 'FPS Weapons',
    'Accesorios': 'Attachments',
    'Herramientas de minería': 'Mining Tools',
    'Herramientas de recuperación': 'Salvage Tools',
    'Herramientas': 'Tools',
    'Piezas de nave': 'Ship Parts',
    'Ropa': 'Clothing',
    'Otros': 'Others',
    'Casco': 'Helmet',
    'Peto': 'Core',
    'Brazos': 'Arms',
    'Piernas': 'Legs',
    'Mochila': 'Backpack',
    'Traje interior': 'Undersuit',
    'Arma FPS': 'FPS Weapon',
    'Munición': 'Ammo',
    'Herramienta': 'Tool',
    'Comida/Bebida': 'Food/Drink',
    'Objeto de misión': 'Mission Item',
    'Componente de nave': 'Ship Component',
    'Livery': 'Livery',
    'Vehículo': 'Vehicle',
    'Peluche': 'Plushie',
    'Mineral': 'Mineral/Ore',
    'Mineral/Ore': 'Mineral',
    'Minerales': 'Minerals',
    'Rareza': 'Rarity',
    'Firma Mín': 'Min Signature',
    'Firma Máx': 'Max Signature',
    'Valor/SCU': 'Value/SCU',
    'Sistemas': 'Systems',
    'Buscar mineral...': 'Search mineral...',
    'Todas las rarezas': 'All rarities',
    'Todos los sistemas': 'All systems',
    'Catálogo completo de minerales y menas': 'Complete catalog of ores and minerals',
    'Ver minerales': 'View minerals',
    'Hurston': 'Hurston',
    'Crusader': 'Crusader',
    'ArcCorp': 'ArcCorp',
    'microTech': 'microTech',
    'Pyro': 'Pyro',
    'Común': 'Common',
    'Raro': 'Rare',
    'Épico': 'Epic',
    'Legendario': 'Legendary',
    'Otro': 'Other',
    // ─── Buzón de sugerencias ───
    'Sugerencia': 'Suggestion',
    '¿Tienes una idea para mejorar SC Database?': 'Got an idea to improve SC Database?',
    'Describe tu sugerencia...': 'Describe your suggestion...',
    'tu@email.com (opcional)': 'your@email.com (optional)',
    'Enviar sugerencia': 'Send suggestion',
    'Cerrar': 'Close',
    '¡Gracias! Tu sugerencia ha sido recibida': 'Thanks! Your suggestion has been received',
    'La sugerencia debe tener al menos 10 caracteres': 'The suggestion must be at least 10 characters long',
    'Error al enviar sugerencia': 'Error sending suggestion',
};

// Reverse map for O(1) __() lookup (ES→EN and EN→ES)
const _reverseMap = new Map();
for (const [es, en] of Object.entries(_stringMap)) {
  _reverseMap.set(es, en);
  _reverseMap.set(en, es);
}

function toggleLang() {
    currentLang = currentLang === 'es' ? 'en' : 'es';
    localStorage.setItem('sc_lang', currentLang);
    location.reload();
}

async function openChangelog() {
    let data = await loadJSON('/data/changelog.json');
    if (!data) {
        try {
            const res = await fetch('/changelog');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            data = await res.json();
        } catch (e) {
            navigateTo('changelog');
            return;
        }
    }
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    const htmlParts = [];
    htmlParts.push('<div class="modal-detail" style="max-width:600px;max-height:80vh;overflow-y:auto"><div class="modal-header"><h3>🆕 Novedades / Releases</h3>');
    htmlParts.push('<button class="modal-close" onclick="this.closest(\'.modal-overlay\').remove()">✕</button></div><div class="modal-body">');
    let html = htmlParts.join('');
    if (data.releases) for (const r of data.releases) {
        html += '<div class="release-card" style="margin-bottom:16px;padding:12px;background:var(--bg-card);border-radius:8px;border:1px solid var(--border)">';
        html += '<div style="font-weight:700;font-size:15px;color:var(--accent)">v' + r.version + '</div>';
        html += '<div style="font-size:12px;color:var(--text-secondary);margin:4px 0 8px">' + r.date + '</div>';
        html += '<div style="margin-bottom:6px;font-size:14px">' + (currentLang === 'es' ? (r.title_es || r.title) : (r.title_en || r.title)) + '</div>';
        html += '<ul style="margin:0;padding-left:18px;font-size:13px">';
        const changes = currentLang === 'es' ? (r.changes_es || r.changes) : (r.changes_en || r.changes);
        for (const c of changes) html += '<li style="margin-bottom:3px">' + c + '</li>';
        html += '</ul></div>';
    }
    if (data.feedback) {
        html += '<div style="margin-top:16px;padding:12px;background:var(--bg-card);border-radius:8px;border:1px solid var(--border)">';
        html += '<h4 style="margin-bottom:8px">💬 Feedback</h4>';
        html += '<div style="text-align:center;margin-bottom:12px;padding:8px 0">' +
            '<div style="background:linear-gradient(to bottom,#cc0000,#000);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;font-weight:900;font-size:28px;font-family:\'Arial Black\',sans-serif;letter-spacing:2px">Yokays</div>' +
            '<div style="background:linear-gradient(to bottom,#00cc00,#000);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;font-weight:800;font-size:14px;font-family:\'Arial Black\',sans-serif;letter-spacing:3px;margin-top:2px">— DIVISIÓN KOPION</div>' +
        '</div>';
        html += '<p style="margin-bottom:8px;font-size:13px">Reporta bugs o sugiere mejoras:</p>';
        html += '<a href="' + data.feedback.github + '" target="_blank" class="btn" style="display:inline-block;text-align:center;margin-bottom:6px;width:100%;padding:8px;background:var(--accent-dim);color:var(--accent);border-radius:6px;text-decoration:none">🐛 GitHub Issues</a>';
        html += '<a href="mailto:' + data.feedback.email + '" class="btn" style="display:inline-block;text-align:center;width:100%;padding:8px;background:var(--accent-dim);color:var(--accent);border-radius:6px;text-decoration:none">📧 Email</a>';
        html += '</div>';
    }
    html += '</div></div>';
    overlay.innerHTML = html;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
}

function openFeedback() { openChangelog(); }

// ─── Buzón de sugerencias ───
function openSuggestionsModal() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    const t = (es, en) => currentLang === 'es' ? es : en;

    const html = `
    <div class="modal-detail suggestions-modal">
        <div class="modal-header">
            <h3>💬 ${t('Sugerencia', 'Suggestion')}</h3>
            <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
        </div>
        <div class="modal-body">
            <p style="margin-bottom:16px;color:var(--text-secondary);font-size:14px">
                ${t('¿Tienes una idea para mejorar SC Database?', 'Got an idea to improve SC Database?')}
            </p>
            <textarea id="suggestion-text" class="filter-input suggestion-textarea"
                placeholder="${t('Describe tu sugerencia...', 'Describe your suggestion...')}"
                rows="5"></textarea>
            <input type="email" id="suggestion-email" class="filter-input suggestion-email"
                placeholder="${t('tu@email.com (opcional)', 'your@email.com (optional)')}">
            <div id="suggestion-feedback" class="suggestion-feedback"></div>
            <div class="suggestion-actions">
                <button class="kofi-btn suggestion-submit" id="suggestion-submit-btn">
                    ${t('Enviar sugerencia', 'Send suggestion')}
                </button>
                <button class="tb-btn" onclick="this.closest('.modal-overlay').remove()">
                    ${t('Cerrar', 'Close')}
                </button>
            </div>
        </div>
    </div>`;

    overlay.innerHTML = html;
    document.body.appendChild(overlay);

    overlay.addEventListener('click', e => {
        if (e.target === overlay) {
            const cb = overlay.querySelector('.modal-detail');
            if (cb) cb.style.animation = 'fadeOut 0.2s ease forwards';
            setTimeout(() => overlay.remove(), 200);
        }
    });

    // Botón de enviar
    const submitBtn = overlay.querySelector('#suggestion-submit-btn');
    const textarea = overlay.querySelector('#suggestion-text');
    const emailInput = overlay.querySelector('#suggestion-email');
    const feedback = overlay.querySelector('#suggestion-feedback');

    submitBtn.addEventListener('click', async () => {
        const suggestion = textarea.value.trim();
        const email = emailInput.value.trim();

        if (suggestion.length < 10) {
            feedback.innerHTML = '<span class="suggestion-msg suggestion-msg-error">⚠️ ' +
                t('La sugerencia debe tener al menos 10 caracteres', 'The suggestion must be at least 10 characters long') +
                '</span>';
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = '⏳...';
        feedback.innerHTML = '';

        try {
            const body = { suggestion };
            if (email) body.email = email;

            const res = await fetch('/api/suggestions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const result = await res.json();

            feedback.innerHTML = '<span class="suggestion-msg suggestion-msg-success">✅ ' +
                t('¡Gracias! Tu sugerencia ha sido recibida', 'Thanks! Your suggestion has been received') +
                '</span>';

            textarea.value = '';
            emailInput.value = '';

            setTimeout(() => {
                const cb = overlay.querySelector('.modal-detail');
                if (cb) cb.style.animation = 'fadeOut 0.2s ease forwards';
                setTimeout(() => overlay.remove(), 200);
            }, 2500);

        } catch (e) {
            console.error('Suggestion error:', e);
            feedback.innerHTML = '<span class="suggestion-msg suggestion-msg-error">❌ ' +
                t('Error al enviar sugerencia', 'Error sending suggestion') +
                '</span>';
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = t('Enviar sugerencia', 'Send suggestion');
        }
    });

    // Permitir Ctrl+Enter para enviar
    textarea.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            submitBtn.click();
        }
    });

    // Enfocar el textarea al abrir
    setTimeout(() => textarea.focus(), 150);
}

function applyLang() {
    if (currentLang === 'es') return;
    const entries = Object.entries(_stringMap).sort((a, b) => b[0].length - a[0].length);
    const walker = document.createTreeWalker(document.body, 4, null, false);
    let node;
    while (node = walker.nextNode()) {
        let text = node.textContent;
        let changed = false;
        for (const [es, en] of entries) {
            if (text.includes(es)) {
                text = text.replace(new RegExp(es.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), en);
                changed = true;
            }
        }
        if (changed) node.textContent = text;
    }
    document.querySelectorAll('[placeholder]').forEach(el => {
        let p = el.getAttribute('placeholder');
        for (const [es, en] of entries) {
            if (p.includes(es)) p = p.replace(new RegExp(es.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), en);
        }
        el.setAttribute('placeholder', p);
    });
    document.querySelectorAll('[title]').forEach(el => {
        let t = el.getAttribute('title');
        for (const [es, en] of entries) {
            if (t.includes(es)) t = t.replace(new RegExp(es.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), en);
        }
        el.setAttribute('title', t);
    });
}

// ═══════════════════════════════════════════
// ─── Reusable UI Components ───
// ═══════════════════════════════════════════

// createOverlay(): returns a modal-overlay div with click-outside-to-close
// Includes fadeOut animation on close
function closeModal(overlay) {
    overlay.style.animation = 'fadeOut 0.2s ease forwards';
    setTimeout(() => overlay.remove(), 200);
}

function closeBpModal() {
    document.querySelectorAll('.modal-overlay').forEach(closeModal);
}

function closeMissionModal() {
    document.querySelectorAll('.modal-overlay').forEach(closeModal);
}

function createOverlay(html) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = html;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', e => {
        if (e.target === overlay) closeModal(overlay);
    });
    return overlay;
}

// detailGrid(items): renders a detail-grid from [{label, value, fullWidth, rawHtml}]
//   - items: array of {label: string, value: string, fullWidth?: boolean, rawHtml?: boolean}
//   - rawHtml: if true, renders value directly (unsafe HTML) instead of safeVal
//   - Returns HTML string
function detailGrid(items) {
    return items.map(it => {
        const style = it.fullWidth ? ' style="grid-column:1/-1"' : '';
        const v = it.rawHtml ? (it.value || '&mdash;') : safeVal(it.value);
        return `<div class="detail-item"${style}>
            <div class="di-label">${it.label}</div>
            <div class="di-value">${v}</div>
        </div>`;
    }).join('');
}

// safeVal(val): returns "—" for null/undefined/empty
function safeVal(val) {
    if (val === null || val === undefined || val === '') return '—';
    return String(val);
}

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// catalogCard(title, metaLines, onClick): renders a consistent clickable card
function catalogCard(title, metaLines, onClick) {
    const meta = metaLines.join('<br>');
    return `<div class="catalog-card" onclick="${onClick}">
        <div class="cc-title">${title}</div>
        <div class="cc-meta">${meta}</div>
    </div>`;
}

// showDetailModal(config): opens a unified detail modal
//   config = {
//     title: string,
//     icon: string (emoji, optional),
//     fields: array of {label, value, fullWidth},
//     sections: array of {title, items: [{label, value}]},  // optional
//     footer: string  // optional
//   }
function showDetailModal(config) {
    const icon = config.icon || '';
    const titleHtml = `<h3 style="font-size:18px;margin-bottom:0">${icon} ${config.title}</h3>`;
    const gridHtml = config.fields && config.fields.length
        ? `<div class="detail-grid">${detailGrid(config.fields)}</div>`
        : '';

    let sectionsHtml = '';
    if (config.sections) {
        config.sections.forEach(s => {
            if (!s.items || !s.items.length) return;
            const rows = s.items.map(it =>
                `<div class="item-row"><span>${it.label}</span><span>${safeVal(it.value)}</span></div>`
            ).join('');
            sectionsHtml += `<div class="detail-section"><h4>${s.title}</h4>${rows}</div>`;
        });
    }

    const footerHtml = config.footer
        ? `<div class="modal-footer">${config.footer}</div>`
        : '';

    const html = `<div class="modal-detail">
        <div class="modal-header">
            ${titleHtml}
            <button class="modal-close">✕</button>
        </div>
        <div class="modal-body">
            ${gridHtml}
            ${sectionsHtml}
            ${footerHtml}
        </div>
    </div>`;

    const overlay = createOverlay(html);
    // Close button
    overlay.querySelector('.modal-close').addEventListener('click', () => closeModal(overlay));

    // Remove loading feedback from table rows
    document.querySelectorAll('.data-table tbody tr.loading').forEach(tr => tr.classList.remove('loading'));

    return overlay;
}

// renderPagination(elId, current, total, callback): unified pagination
function renderPagination(elId, current, total, callback) {
    const el = document.getElementById(elId);
    if (!el) return;
    if (!total || total <= 1) { el.innerHTML = ''; return; }
    const fnName = callback.name || 'callback';
    let html = `<button class="page-btn" onclick="${fnName}(1)" ${current === 1 ? 'disabled' : ''}>«</button>`;
    html += `<button class="page-btn" onclick="${fnName}(${current - 1})" ${current === 1 ? 'disabled' : ''}>‹</button>`;
    const range = 3;
    const start = Math.max(1, current - range);
    const end = Math.min(total, current + range);
    if (start > 1) html += `<button class="page-btn" onclick="${fnName}(1)">1</button>`;
    if (start > 2) html += '<span class="page-btn" style="cursor:default">…</span>';
    for (let i = start; i <= end; i++) {
        html += `<button class="page-btn ${i === current ? 'active' : ''}" onclick="${fnName}(${i})">${i}</button>`;
    }
    if (end < total - 1) html += '<span class="page-btn" style="cursor:default">…</span>';
    if (end < total) html += `<button class="page-btn" onclick="${fnName}(${total})">${total}</button>`;
    html += `<button class="page-btn" onclick="${fnName}(${current + 1})" ${current === total ? 'disabled' : ''}>›</button>`;
    html += `<button class="page-btn" onclick="${fnName}(${total})" ${current === total ? 'disabled' : ''}>»</button>`;
    el.innerHTML = html;
}

// updateSortIndicators(tableId, sortKey, sortAsc): highlights sort arrows
function updateSortIndicators(tableId, sortKey, sortAsc) {
    document.querySelectorAll(`#${tableId} th`).forEach(th => {
        th.classList.remove('sorted', 'asc', 'desc');
        if (th.dataset.sort === sortKey) {
            th.classList.add('sorted', sortAsc ? 'asc' : 'desc');
        }
    });
}

function formatSeconds(sec) {
    if (!sec) return '—';
    if (sec < 60) return sec + 's';
    if (sec < 3600) return Math.round(sec/60) + ' min';
    return (sec/3600).toFixed(1) + ' h';
}

// ═══════════════════════════════════════════
// ─── Translation helpers ───
function __(text) {
    if (currentLang === 'es') return text;
    if (_reverseMap.has(text)) return _reverseMap.get(text);
    if (fullTranslations && fullTranslations[text]) return fullTranslations[text];
    return text;
}

// Translation cache for O(1) tr() lookups
const _trCache = new Map();

// Manual translations for game items not covered by translations_full.json
const _manualTr = {
    'Wikelo Favor': 'Favor de Wikelo',
    'Irradiated Valakkar Pearl (Grade AAA)': 'Perla de Valakkar Irradiada (Grado AAA)',
    'Irradiated Valakkar Pearl (Grade AA)': 'Perla de Valakkar Irradiada (Grado AA)',
    'Irradiated Valakkar Pearl (Grade A)': 'Perla de Valakkar Irradiada (Grado A)',
    'Irradiated Valakkar Pearl (Grade B)': 'Perla de Valakkar Irradiada (Grado B)',
    'Irradiated Valakkar Pearl (Grade C)': 'Perla de Valakkar Irradiada (Grado C)',
};

function tr(text) {
    if (text && text.length > 120) return text;
    if (currentLang !== 'es' || !text || !fullTranslations) return text;
    if (_trCache.has(text)) return _trCache.get(text);
    if (fullTranslations[text]) {
        _trCache.set(text, fullTranslations[text]);
        return fullTranslations[text];
    }
    const lower = text.toLowerCase();
    const words = lower.split(/[ _-]+/).filter(w => w.length > 2);
    for (const [key, val] of Object.entries(fullTranslations)) {
        const kl = key.toLowerCase();
        const matches = words.every(w => kl.includes(w));
        if (matches && val && val.length > 0 && val.length < 200 && !val.includes('~')) {
            _trCache.set(text, val);
            return val;
        }
    }
    if (_manualTr[text]) {
        _trCache.set(text, _manualTr[text]);
        return _manualTr[text];
    }
    _trCache.set(text, text);
    return text;
}

function getMissionTranslation(mission) {
    if (currentLang !== 'es') return null;
    const dn = mission.debug_name || '';
    if (!dn) return null;
    const dnLower = dn.toLowerCase();
    const parts = dn.split('_');
    let contractor = parts[0] || '';
    if (['PU','PU-','Sandbox'].includes(contractor) && parts.length > 1) contractor = parts[1];
    let ct = contractorTranslations[contractor.toLowerCase()];
    if (ct && ct.titles && ct.titles.length > 0) {
        const type = dnLower;
        for (const t of ct.titles) {
            if (type.includes('bounty') && t.key.includes('bounty_')) return t.value;
            if (type.includes('delivery') && t.key.includes('delivery_')) return t.value;
            if (type.includes('assassin') && (t.key.includes('assassin_') || t.key.includes('kill'))) return t.value;
            if (type.includes('repair') && t.key.includes('repair')) return t.value;
            if (type.includes('salvage') && t.key.includes('salvage')) return t.value;
            if (type.includes('collect') && (t.key.includes('collect') || t.key.includes('bounty'))) return t.value;
        }
        return ct.titles[0].value;
    }
    const words = dnLower.replace(/[0-9]/g, ' ').split(/[_ ]+/).filter(w => w.length > 2);
    let bestMatch = null;
    let bestScore = 0;
    for (const [ckey, contractorObj] of Object.entries(contractorTranslations)) {
        if (!contractorObj || !contractorObj.titles) continue;
        for (const t of contractorObj.titles) {
            const tk = t.key.toLowerCase();
            let score = 0;
            for (const word of words) { if (tk.includes(word)) score++; }
            if (score > bestScore) { bestScore = score; bestMatch = t; }
        }
    }
    return bestMatch ? bestMatch.value : null;
}

// ─── Lazy translation loader ───
// Carga translations_full.json bajo demanda, extrae las traducciones
// de contratos en el formato que necesita getMissionTranslation()
let _translationsLoading = false;
let _translationsLoaded = false;

async function loadTranslations() {
    if (_translationsLoaded) return;
    if (_translationsLoading) {
        // Esperar a que termine otra carga en progreso
        while (_translationsLoading) await new Promise(r => setTimeout(r, 100));
        return;
    }
    _translationsLoading = true;
    try {
        const res = await fetch('/data/translations_full.json');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        // translations_full.json puede ser un mapa plano o tener estructura
        if (data && typeof data === 'object') {
            if (data.data && typeof data.data === 'object') {
                fullTranslations = data.data;
            } else {
                fullTranslations = data;
            }
            // Extraer contractorTranslations del mapa de traducciones
            // Buscar entradas que comiencen con contractor_ o que sean objetos con .titles
            for (const [key, val] of Object.entries(fullTranslations)) {
                if (typeof val === 'object' && val !== null && val.titles) {
                    contractorTranslations[key.toLowerCase()] = val;
                } else if (key.startsWith('contractor_')) {
                    const name = key.replace('contractor_', '').replace(/_/g, ' ');
                    try {
                        const parsed = typeof val === 'string' ? JSON.parse(val) : val;
                        if (parsed && parsed.titles) {
                            contractorTranslations[name.toLowerCase()] = parsed;
                        }
                    } catch(e) {}
                }
            }
        }
        _translationsLoaded = true;
        console.log(`🌐 Translaciones cargadas: ${Object.keys(fullTranslations).length}`);
    } catch (e) {
        console.warn('⚠️ Error cargando traducciones:', e);
    } finally {
        _translationsLoading = false;
    }
}

// ─── State ───
let state = {
    stats: null,
    currentPage: 'dashboard'
};

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

document.addEventListener('DOMContentLoaded', async () => {
    const btn = document.getElementById('langBtn');
    if (btn) btn.textContent = currentLang === 'es' ? '🇪🇸 ES' : '🇬🇧 EN';

    // ─── Estado inicial del botón de tema ───
    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) {
        themeBtn.textContent = currentTheme === 'pyro' ? '💠' : '🔥';
        themeBtn.title = currentTheme === 'pyro' ? 'Tema Stanton' : 'Tema Pyro';
        themeBtn.className = 'tb-btn' + (currentTheme === 'pyro' ? ' cyber-btn' : '');
    }
    // Apply cyber-btn to all topbar buttons on initial load
    document.querySelectorAll('.topbar-info .tb-btn').forEach(b => {
        if (currentTheme === 'pyro') b.classList.add('cyber-btn');
    });

    // Fase 1: carga crítica — dashboard con stats instantáneos
    await loadStats();

    // Fase 2: precargar en background las secciones más usadas
    prefetchData();

    setupNavigation();
    setupSearch();
    setupMenuToggle();
    setupQuickLinks();
    updateBadges();
    if (currentLang === 'en') setTimeout(applyLang, 100);

    // ─── Scroll-to-top button ───
    const scrollBtn = document.createElement('button');
    scrollBtn.id = 'scroll-top-btn';
    scrollBtn.textContent = '↑';
    scrollBtn.setAttribute('aria-label', __('Volver arriba'));
    scrollBtn.addEventListener('click', () => {
        document.getElementById('content').scrollTo({ top: 0, behavior: 'smooth' });
    });
    document.getElementById('content').appendChild(scrollBtn);

    document.getElementById('content').addEventListener('scroll', () => {
        const btn = document.getElementById('scroll-top-btn');
        if (!btn) return;
        btn.classList.toggle('visible', document.getElementById('content').scrollTop > 300);
    });

    // ─── Loading feedback on table row clicks (capture phase) ───
    document.addEventListener('click', (e) => {
        const tr = e.target.closest('.data-table tbody tr');
        if (tr) tr.classList.add('loading');
    }, true);

    // ─── Inicializar glitch delays si el tema es Pyro ───
    if (currentTheme === 'pyro') assignGlitchDelays();

    // ─── MutationObserver para asignar delays a contenido dinámico ───
    const glitchObserver = new MutationObserver(() => {
        if (currentTheme === 'pyro') assignGlitchDelays();
    });
    glitchObserver.observe(document.getElementById('content'), { childList: true, subtree: true });

    // ─── Inicializar UI de supporter para desbloquear tema Pyro ───
    setupSupporterUI();
});

// ═══════════════════════════════════════════
// API / DATA LOADING — Sin backend
// Carga desde JSON cacheado en memoria.
// ═══════════════════════════════════════════

let CACHED_DB = null;
let DB_LOADING = null;

async function apiFetch(path) {
    if (!CACHED_DB) {
        if (!DB_LOADING) {
            DB_LOADING = (async () => {
                try {
                    const res = await fetch('/data/sc_database_es.json');
                    if (res.ok) return await res.json();
                } catch(e) { /* fallback */ }
                try {
                    const res = await fetch('https://raw.githubusercontent.com/predakingser-svg/sc-database/master/sc_database_es.json');
                    if (res.ok) return await res.json();
                } catch(e) { console.error('Cannot load DB'); }
                return null;
            })();
        }
        CACHED_DB = await DB_LOADING;
    }
    if (!CACHED_DB) return null;

    const url = new URL(path, window.location.origin);
    const route = url.pathname;
    const perPage = parseInt(url.searchParams.get('per_page')) || 5000;
    const page = parseInt(url.searchParams.get('page')) || 1;

    const toStats = (list) => (list || []).length;

    if (route === '/stats') {
        return {
            total_missions: toStats(CACHED_DB.missions),
            total_blueprints: toStats(CACHED_DB.blueprints),
            total_weapons: toStats(CACHED_DB.weapons),
            total_components: toStats(CACHED_DB.components),
            total_items: toStats(CACHED_DB.items),
            total_minerals: toStats(CACHED_DB.minerals),
            total_wikelo: toStats(CACHED_DB.wikelo),
            total_ships: toStats(CACHED_DB.ships),
            total_factions: toStats(CACHED_DB.factions),
            version: CACHED_DB.version || '4.9.0',
        };
    }
    if (route === '/missions') {
        const data = CACHED_DB.missions || [];
        const totalPages = Math.ceil(data.length / perPage);
        const start = (page - 1) * perPage;
        return { data: data.slice(start, start + perPage), total: data.length, total_pages: totalPages };
    }
    if (route === '/blueprints') {
        const data = CACHED_DB.blueprints || [];
        const totalPages = Math.ceil(data.length / perPage);
        const start = (page - 1) * perPage;
        return { data: data.slice(start, start + perPage), total: data.length, total_pages: totalPages };
    }
    if (route === '/weapons') return CACHED_DB.weapons || [];
    if (route === '/items') return CACHED_DB.items || [];
    if (route === '/wikelo') return CACHED_DB.wikelo || [];
    if (route === '/factions') return CACHED_DB.factions || [];
    if (route === '/components') return CACHED_DB.components || [];
    if (route === '/minerals') return CACHED_DB.minerals || [];
    if (route === '/ships') return CACHED_DB.ships || [];

    const parts = route.split('/').filter(Boolean);
    if (parts.length === 2) {
        const [section, id] = parts;
        const list = CACHED_DB[section];
        if (Array.isArray(list)) {
            return list.find(i => i.uuid === id || i.id === id || i.name === id) || null;
        }
    }

    if (route === '/search') {
        const q = (url.searchParams.get('q') || '').toLowerCase();
        if (!q) return [];
        const results = [];
        for (const key of ['missions','blueprints','weapons','items','components','minerals','wikelo','ships']) {
            for (const item of (CACHED_DB[key] || [])) {
                if ((item.name || item.title || '').toLowerCase().includes(q)) {
                    results.push({ section: key, ...item });
                    if (results.length >= 50) break;
                }
            }
            if (results.length >= 50) break;
        }
        return results;
    }

    return null;
}

// ─── Static JSON loader (fallback) ───
async function loadJSON(path) {
    try {
        const res = await fetch(path);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (e) {
        console.warn(`Static load failed: ${path}`, e);
        return null;
    }
}

function setStatus(stateVal, text) {
    const dot = document.getElementById('status-indicator');
    const txt = document.getElementById('status-text');
    if (!dot || !txt) return;
    dot.className = 'status-dot';
    if (stateVal === 'online') dot.classList.add('online');
    if (stateVal === 'offline') dot.style.background = 'var(--danger)';
    txt.textContent = text;
}

// ═══════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════

async function loadStats() {
    setStatus('checking', 'Consultando...');

    // Show skeleton for stats grid
    const grid = document.getElementById('stats-grid');
    if (grid) {
        grid.innerHTML = '';
        for (let i = 0; i < 4; i++) {
            grid.innerHTML += '<div class="stat-card loading"><div class="skeleton-stat" style="width:60%;height:28px;margin:0 auto 8px;border-radius:6px;background:var(--bg-hover);animation:pulse 1.5s infinite"></div><div class="skeleton-stat" style="width:40%;height:12px;margin:0 auto;border-radius:4px;background:var(--bg-hover);animation:pulse 1.5s infinite"></div></div>';
        }
    }

    // Cargar stats desde la DB cacheada
    let statsData = await apiFetch('/stats');

    if (!statsData) {
        // Fallback: archivo estático
        statsData = await loadJSON('/data/stats.json');
    }

    if (!statsData) {
        setStatus('offline', 'Sin datos');
        document.getElementById('stats-grid').innerHTML = '<div class="stat-card" style="grid-column:1/-1;color:var(--danger);padding:40px">❌ No se pudieron cargar los datos.</div>';
        return;
    }

    state.stats = statsData;
    setStatus('online', 'Conectado');

    const cards = [
        { val: statsData.total_missions || 0, label: 'Misiones' },
        { val: statsData.total_blueprints || 0, label: 'Planos' },
        { val: statsData.total_weapons || 0, label: 'Armas' },
        { val: statsData.total_items || 0, label: 'Ítems' },
        { val: statsData.missions_with_blueprints || 0, label: 'Misiones c/BP' },
    ];
    grid.innerHTML = cards.map(c => `
        <div class="stat-card">
            <div class="stat-value">${c.val.toLocaleString()}</div>
            <div class="stat-label">${c.label}</div>
        </div>
    `).join('');

    // Indicador sutil de carga de datos completos
    const existingIndicator = document.getElementById('data-loading-indicator');
    if (!existingIndicator) {
        const indicator = document.createElement('div');
        indicator.id = 'data-loading-indicator';
        indicator.className = 'loading-indicator';
        indicator.innerHTML = '<span class="spinner"></span> Cargando datos completos…';
        grid.parentNode.insertBefore(indicator, grid.nextSibling);
    }

    // Badges para secciones precargadas (missions, blueprints, weapons)
    ['missions','blueprints','weapons'].forEach(k => {
        const el = document.getElementById('badge-' + k);
        if (el) el.textContent = statsData['total_' + k] || 0;
    });
    // Badge para minerales (datos conocidos desde stats)
    const badgeMinerals = document.getElementById('badge-minerals');
    if (badgeMinerals) badgeMinerals.textContent = statsData.total_minerals || 0;
    // Badges para secciones lazy (se cargan bajo demanda)
    ['items','components','wikelo'].forEach(k => {
        const el = document.getElementById('badge-' + k);
        if (el) el.textContent = '…';  // Pendiente de carga
    });

    renderSystemChart(statsData.missions_by_system);
    renderBlueprintChart();
    renderUpdateInfo(statsData.data_version);
}

function renderCategoryChart(categories) {
    const container = document.getElementById('chart-categories');
    if (!categories) { container.innerHTML = '<div class="loading-sm">Sin datos</div>'; return; }
    const sorted = Object.entries(categories).sort((a,b) => b[1] - a[1]);
    const max = sorted[0][1];
    container.innerHTML = sorted.map(([name, count]) => {
        const pct = (count / max * 100).toFixed(0);
        const cls = 'cat-' + name.replace(/[^a-zA-Z0-9]/g, '_');
        return `<div class="chart-bar-group ${cls}">
            <div class="chart-bar-label"><span class="cbl-name">${name}</span><span class="cbl-val">${count.toLocaleString()}</span></div>
            <div class="chart-bar-track"><div class="chart-bar-fill" style="width:${pct}%"></div></div>
        </div>`;
    }).join('');
}

function renderSystemChart(systems) {
    const container = document.getElementById('chart-systems');
    if (!systems) { container.innerHTML = '<div class="loading-sm">Sin datos</div>'; return; }
    const sorted = Object.entries(systems).sort((a,b) => b[1] - a[1]);
    const max = sorted[0][1];
    container.innerHTML = sorted.map(([name, count]) => {
        const pct = (count / max * 100).toFixed(0);
        const cls = 'system-' + name.replace(/[^a-zA-Z0-9]/g, '_');
        return `<div class="chart-bar-group ${cls}">
            <div class="chart-bar-label"><span class="cbl-name">${name}</span><span class="cbl-val">${count.toLocaleString()}</span></div>
            <div class="chart-bar-track"><div class="chart-bar-fill" style="width:${pct}%"></div></div>
        </div>`;
    }).join('');
}

function renderBlueprintChart() {
    const container = document.getElementById('chart-blueprints');
    container.innerHTML = `
        <div class="chart-bar-group"><div class="chart-bar-label"><span class="cbl-name">Componentes de nave</span><span class="cbl-val">Power plant, Shield, Cooler, QD, Radar</span></div></div>
        <div class="chart-bar-group"><div class="chart-bar-label"><span class="cbl-name">Armas de nave</span><span class="cbl-val">Deadbolt, C-788, Tarantula, Singe, NN</span></div></div>
        <div class="chart-bar-group"><div class="chart-bar-label"><span class="cbl-name">Armas FPS</span><span class="cbl-val">Crossbow, Boomtube, Parallax, Killshot</span></div></div>
        <div class="chart-bar-group"><div class="chart-bar-label"><span class="cbl-name">Armaduras</span><span class="cbl-val">Testudo, Strata, Geist, Bokto, Monde</span></div></div>
        <div class="chart-bar-group"><div class="chart-bar-label"><span class="cbl-name">Naves / Vehículos</span><span class="cbl-val">22 naves Wikelo + eventos</span></div></div>
        <p style="color:var(--text-muted);font-size:12px;margin-top:15px">Total: ${state.stats?.total_blueprints?.toLocaleString() || '?'} blueprints en la base</p>
    `;
}

function renderUpdateInfo(dateStr) {
    const el = document.getElementById('last-update');
    if (dateStr) {
        const d = new Date(dateStr);
        el.textContent = `Datos actualizados: ${d.toLocaleDateString('es-MX', { year:'numeric', month:'long', day:'numeric', hour:'2-digit', minute:'2-digit' })} (versión ${state.stats?.data_version?.substring(0,10) || '?'})`;
    } else {
        el.textContent = 'Fecha no disponible';
    }
}

// ═══════════════════════════════════════════
// BACKGROUND PREFETCH (P4-T1)
// ═══════════════════════════════════════════

async function prefetchData() {
    // Precarga en background: missions, blueprints, weapons
    // Estas secciones se renderizarán instantáneamente cuando el usuario navegue a ellas
    const promises = [];

    if (!missionsCache) {
        promises.push((async () => {
            try {
                const res = await fetch('/data/missions.json');
                if (res.ok) missionsCache = await res.json();
            } catch(e) { /* silently fail — fallback load on navigation */ }
        })());
    }

    if (!bpCache) {
        promises.push((async () => {
            try {
                const res = await fetch('/data/blueprints.json');
                if (res.ok) bpCache = await res.json();
            } catch(e) { /* silently fail */ }
        })());
    }

    if (!wpCache) {
        promises.push((async () => {
            try {
                const res = await fetch('/data/weapons.json');
                if (res.ok) wpCache = await res.json();
            } catch(e) { /* silently fail */ }
        })());
    }

    if (!mineralsCache) {
        promises.push((async () => {
            try {
                const res = await fetch('/data/minerals.json');
                if (res.ok) {
                    const data = await res.json();
                    mineralsCache = data.data || data;
                }
            } catch(e) { /* silently fail */ }
        })());
    }

    await Promise.allSettled(promises);

    // Ocultar indicador de carga
    const indicator = document.getElementById('data-loading-indicator');
    if (indicator) {
        indicator.classList.add('fade-out');
        setTimeout(() => indicator.remove(), 400);
    }

    // Actualizar badges de secciones precargadas si stats ya tenía valores
    // (mantener el contador real en lugar del placeholder)
    if (state.stats) {
        ['missions','blueprints','weapons'].forEach(k => {
            const el = document.getElementById('badge-' + k);
            if (el && state.stats['total_' + k]) el.textContent = state.stats['total_' + k];
        });
    }

    // Actualizar badge de minerales
    if (mineralsCache && mineralsCache.length) {
        const badge = document.getElementById('badge-minerals');
        if (badge) badge.textContent = mineralsCache.length;
    }

    console.log('⚡ Precarga completada: missions, blueprints, weapons, minerals');
}

// ═══════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════

function setupNavigation() {
    $$('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const page = item.dataset.page;
            navigateTo(page);
        });
    });
}

function navigateTo(page, filter) {
    state.currentPage = page;
    $$('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.page === page));

    const currentActive = document.querySelector('.page.active');
    const targetPage = document.getElementById('page-' + page);

    if (currentActive && targetPage && currentActive !== targetPage) {
        // Fade out current page
        currentActive.classList.remove('active');

        // After brief delay, show new page with fade-in animation
        setTimeout(() => {
            targetPage.classList.add('active');
            targetPage.classList.add('page-transition');
        }, 80);
    } else {
        // Direct switch (no transition needed)
        $$('.page').forEach(p => p.classList.toggle('active', p.id === 'page-' + page));
    }

    if (page === 'missions') loadMissions(filter);
    else if (page === 'blueprints') loadBlueprints(filter);
    else if (page === 'weapons') loadWeapons(filter);
    else if (page === 'wikelo') loadWikelo(filter);
    else if (page === 'components') loadComponents();
    else if (page === 'minerals') loadMinerals();
    else if (page === 'items') loadItems();
    else if (page === 'factions') loadFactions();

    document.getElementById('sidebar').classList.remove('open');
}

function setupQuickLinks() {
    $$('.quick-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo(link.dataset.page, link.dataset.filter);
        });
    });
}

function setupMenuToggle() {
    document.getElementById('menu-toggle').addEventListener('click', (e) => {
        e.stopPropagation();
        document.getElementById('sidebar').classList.toggle('open');
    });
}

// ═══════════════════════════════════════════
// SEARCH (caches per sección)
// ═══════════════════════════════════════════

function setupSearch() {
    const input = document.getElementById('search-input');
    const dropdown = document.getElementById('search-results');
    let timeout;
    let selectedIndex = -1;

    function localSearch(q) {
        const lq = q.toLowerCase();
        const results = { missions: [], blueprints: [], weapons: [], items: [], minerals: [] };
        if (missionsCache) results.missions = missionsCache.filter(m => (m.title || '').toLowerCase().includes(lq)).slice(0, 4);
        if (bpCache) results.blueprints = bpCache.filter(b => (b.output_name || b.output || '').toLowerCase().includes(lq)).slice(0, 4);
        if (wpCache) results.weapons = wpCache.filter(w => (w.name || '').toLowerCase().includes(lq)).slice(0, 4);
        if (itemsCache) results.items = itemsCache.filter(i => (i.name || '').toLowerCase().includes(lq)).slice(0, 4);
        if (mineralsCache) results.minerals = mineralsCache.filter(m => m.name.toLowerCase().includes(lq)).slice(0, 4);
        return results;
    }

    input.addEventListener('input', () => {
        clearTimeout(timeout);
        selectedIndex = -1;
        const q = input.value.trim();
        if (q.length < 2) { dropdown.classList.remove('visible'); return; }
        timeout = setTimeout(async () => {
            let results = localSearch(q);
            if (!IS_STATIC && (!results || Object.values(results).every(a => a.length === 0))) {
                results = await apiFetch(`/search?q=${encodeURIComponent(q)}`);
            }
            if (!results) return;
            renderSearchResults(results, dropdown);
        }, 400);
    });

    input.addEventListener('keydown', (e) => {
        const items = dropdown.querySelectorAll('.search-result-item');
        if (!items.length) return;
        if (e.key === 'ArrowDown') { e.preventDefault(); selectedIndex = Math.min(selectedIndex + 1, items.length - 1); updateSearchHighlight(items); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); selectedIndex = Math.max(selectedIndex - 1, 0); updateSearchHighlight(items); }
        else if (e.key === 'Enter' && selectedIndex >= 0) { e.preventDefault(); items[selectedIndex]?.click(); dropdown.classList.remove('visible'); selectedIndex = -1; }
        else if (e.key === 'Escape') dropdown.classList.remove('visible');
    });

    document.addEventListener('click', (e) => { if (!e.target.closest('.search-container')) dropdown.classList.remove('visible'); });
}

function updateSearchHighlight(items) {
    items.forEach((item, i) => {
        item.style.background = i === selectedIndex ? 'var(--accent-dim)' : '';
        if (i === selectedIndex) item.scrollIntoView({ block: 'nearest' });
    });
}

function renderSearchResults(results, dropdown) {
    let html = '';
    let count = 0;
    if (results.missions?.length) {
        html += `<div style="padding:8px 14px;font-size:11px;color:var(--accent);text-transform:uppercase;letter-spacing:1px">Misiones</div>`;
        results.missions.slice(0, 4).forEach(m => {
            html += `<div class="search-result-item" onclick="navigateTo('missions')">
                <div class="sr-title">🎯 ${escapeHtml(getMissionTranslation(m) || m.title)}</div>
                <div class="sr-meta">${escapeHtml(m.faction || '?')} · ${escapeHtml(m.reward?.toLocaleString() || '?')} aUEC</div>
            </div>`; count++;
        });
    }
    if (results.blueprints?.length) {
        html += `<div style="padding:8px 14px;font-size:11px;color:var(--accent);text-transform:uppercase;letter-spacing:1px">Blueprints</div>`;
        results.blueprints.slice(0, 4).forEach(b => {
            html += `<div class="search-result-item" onclick="navigateTo('blueprints')">
                <div class="sr-title">🔧 ${escapeHtml(b.output)}</div>
                <div class="sr-meta">${escapeHtml(b.ingredients)} ingredientes · ${escapeHtml(b.time)}</div>
            </div>`; count++;
        });
    }
    if (results.weapons?.length) {
        html += `<div style="padding:8px 14px;font-size:11px;color:var(--accent);text-transform:uppercase;letter-spacing:1px">Armas</div>`;
        results.weapons.slice(0, 4).forEach(w => {
            html += `<div class="search-result-item" onclick="navigateTo('weapons')">
                <div class="sr-title">🔫 ${escapeHtml(w.name)}</div>
                <div class="sr-meta">Size ${escapeHtml(w.size || '?')} · ${escapeHtml(w.type || '?')}</div>
            </div>`; count++;
        });
    }
    if (results.items?.length) {
        html += `<div style="padding:8px 14px;font-size:11px;color:var(--accent);text-transform:uppercase;letter-spacing:1px">Items</div>`;
        results.items.slice(0, 4).forEach(i => {
            html += `<div class="search-result-item">
                <div class="sr-title">📦 ${escapeHtml(i.name)}</div>
            </div>`; count++;
        });
    }
    if (results.minerals?.length) {
        html += `<div style="padding:8px 14px;font-size:11px;color:var(--accent);text-transform:uppercase;letter-spacing:1px">Minerales</div>`;
        results.minerals.slice(0, 4).forEach(m => {
            html += `<div class="search-result-item" onclick="navigateTo('minerals')">
                <div class="sr-title">💎 ${escapeHtml(m.name)}</div>
                <div class="sr-meta">${getRarityLabel(m.rarity)} · ${m.value_per_scu.toFixed(2)}/SCU</div>
            </div>`; count++;
        });
    }
    if (count === 0) html = '<div class="search-result-item" style="color:var(--text-muted)">Sin resultados</div>';
    dropdown.innerHTML = html;
    dropdown.classList.add('visible');
}

async function updateBadges() { /* badges already updated in loadStats */ }

// ═══════════════════════════════════════════
// MISSIONS PAGE
// ═══════════════════════════════════════════

let missionsCache = null;
let missionsFiltered = [];
let missionsPage = 1;
let missionsSort = { key: null, asc: true };
const M_PER_PAGE = 25;

async function loadMissions(filter) {
    const tbody = document.getElementById('missions-tbody');
    if (!missionsCache) {
        showSkeleton('missions-tbody', 5, 8);
        try {
            const res = await fetch('/data/missions.json');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            missionsCache = await res.json();
        } catch(e) {
            console.warn('Static load failed for missions, trying API:', e);
            const data = await apiFetch('/missions?per_page=500');
            if (!data) { tbody.innerHTML = '<tr><td colspan="8" class="loading-row" style="color:var(--danger)">Error al cargar</td></tr>'; return; }
            let allMissions = [...data.data];
            for (let p = 2; p <= data.total_pages; p++) {
                const more = await apiFetch(`/missions?per_page=500&page=${p}`);
                if (more) allMissions = allMissions.concat(more.data);
            }
            missionsCache = allMissions;
        }
    }
    // Cargar descripciones traducidas al español
    if (!missionDescriptionsES) {
        try {
            const res = await fetch('/data/mission_descriptions_es.json');
            if (res.ok) missionDescriptionsES = await res.json();
        } catch(e) {
            // Silently fail, fallback to English descriptions
        }
    }
    // Cargar descripciones limpias en español
    if (!missionDescClean) {
        try {
            const r = await fetch('/data/mission_descriptions_clean.json');
            if (r.ok) missionDescClean = await r.json();
        } catch(e) {}
    }
    // Cargar títulos traducidos al español
    if (!missionTitlesES) {
        try {
            const r = await fetch('/data/mission_titles_es.json');
            if (r.ok) missionTitlesES = await r.json();
        } catch(e) {}
    }
    const subtitlespan = document.getElementById('missions-subtitle-count');
    if (subtitlespan) subtitlespan.textContent = missionsCache.length;
    missionsFiltered = [...missionsCache];
    if (filter === 'has_blueprints') document.getElementById('filter-bp').checked = true;
    else if (filter === 'illegal') document.getElementById('filter-illegal').checked = true;
    populateMissionFilters();
    applyMissionFilters();
    applyMissionSort();
    renderMissionPage(1);
    // Auto-abrir misión específica desde blueprint si se solicitó
    if (window._openMissionUuid && missionsCache) {
        const uuid = window._openMissionUuid;
        window._openMissionUuid = null;
        setTimeout(function(){ openMissionDetail(uuid); }, 300);
    }
    setupMissionFilters();
    // Cargar traducciones bajo demanda para las misiones
    loadTranslations();
}

function populateMissionFilters() {
    if (!missionsCache) return;
    const factions = [...new Set(missionsCache.map(m => {
        const f = m.faction; return typeof f === 'object' ? f?.name : f || 'Unknown';
    }))].sort();
    const sel = document.getElementById('filter-faction');
    if (sel.options.length <= 1) factions.forEach(f => { const o = document.createElement('option'); o.value = f; o.textContent = f; sel.appendChild(o); });
    const scopes = [...new Set(missionsCache.map(m => m.reward_scope || 'Unknown'))].sort();
    const scopeSel = document.getElementById('filter-scope');
    if (scopeSel.options.length <= 1) scopes.forEach(s => { const o = document.createElement('option'); o.value = s; o.textContent = s; scopeSel.appendChild(o); });
}

function getSystem(m) {
    const sys = m.star_systems;
    if (sys && sys.length > 0) {
        const s = sys[0]; return typeof s === 'object' ? s.name || '?' : String(s);
    }
    return '?';
}

function getFactionName(m) {
    const f = m.faction;
    if (typeof f === 'object') return f?.name || '—';
    if (!f && m.mission_giver) return m.mission_giver;
    return f || m.mission_giver || '—';
}

function applyMissionFilters() {
    const search = document.getElementById('missions-search').value.toLowerCase();
    const faction = document.getElementById('filter-faction').value;
    const system = document.getElementById('filter-system').value;
    const scope = document.getElementById('filter-scope').value;
    const onlyBP = document.getElementById('filter-bp').checked;
    const onlyIllegal = document.getElementById('filter-illegal').checked;
    missionsFiltered = (missionsCache || []).filter(m => {
        if (search && !m.title?.toLowerCase().includes(search)) return false;
        if (faction && getFactionName(m) !== faction) return false;
        if (system && getSystem(m) !== system) return false;
        if (scope && m.reward_scope !== scope) return false;
        if (onlyBP && !m.has_blueprints) return false;
        if (onlyIllegal && !m.illegal) return false;
        return true;
    });
    document.getElementById('missions-count').textContent = missionsFiltered.length;
}

function applyMissionSort() {
    const { key, asc } = missionsSort;
    if (!key) return;
    missionsFiltered.sort((a, b) => {
        let va, vb;
        switch (key) {
            case 'title': va = a.title || ''; vb = b.title || ''; break;
            case 'faction': va = getFactionName(a); vb = getFactionName(b); break;
            case 'scope': va = a.reward_scope || ''; vb = b.reward_scope || ''; break;
            case 'reward': va = a.reward_min || 0; vb = b.reward_min || 0; break;
            case 'system': va = getSystem(a); vb = getSystem(b); break;
            case 'illegal': va = a.illegal ? 1 : 0; vb = b.illegal ? 1 : 0; break;
            case 'bp': va = a.has_blueprints ? 1 : 0; vb = b.has_blueprints ? 1 : 0; break;
            case 'reputation': va = a.reputation_amount || 0; vb = b.reputation_amount || 0; break;
            default: return 0;
        }
        if (typeof va === 'string') return asc ? va.localeCompare(vb) : vb.localeCompare(va);
        return asc ? va - vb : vb - va;
    });
}

function renderMissionPage(page) {
    missionsPage = page;
    const tbody = document.getElementById('missions-tbody');
    const total = missionsFiltered.length;
    const pages = Math.ceil(total / M_PER_PAGE) || 1;
    const start = (page - 1) * M_PER_PAGE;
    const pageItems = missionsFiltered.slice(start, start + M_PER_PAGE);
    if (total === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="loading-row">Sin resultados</td></tr>';
        document.getElementById('missions-pagination').innerHTML = '';
        return;
    }
    tbody.innerHTML = pageItems.map(m => {
        const fname = getFactionName(m);
        const sys = getSystem(m);
        const rowReward = m.reward_min > 0 ? m.reward_min.toLocaleString() + ' ' + (m.reward_currency || 'UEC') : '—';
        const illegalBadge = m.illegal ? '<span class="badge-illegal">Ilegal</span>' : '<span class="badge-legal">Legal</span>';
        const bpBadge = m.has_blueprints ? '<span class="badge-bp">BP</span>' : '—';
        return `<tr onclick="openMissionDetail('${m.uuid}')">
            <td>${getMissionTranslation(m) || m.title || '?'}</td>
            <td style="color:var(--text-secondary)">${fname || '—'}</td>
            <td>${SCOPE_ES[m.reward_scope] || m.reward_scope || '—'}</td>
            <td>${rowReward}</td>
            <td>${sys || '—'}</td>
            <td>${illegalBadge}</td>
            <td>${bpBadge}</td>
            <td>${m.reputation_amount ? m.reputation_amount + ' XP' : '—'}</td>
        </tr>`;
    }).join('');
    renderPagination('missions-pagination', page, pages, renderMissionPage);
    updateSortIndicators('missions-table', missionsSort.key, missionsSort.asc);
}

function setupMissionFilters() {
    if (window._missionFiltersReady) return;
    window._missionFiltersReady = true;
    ['missions-search', 'filter-faction', 'filter-system', 'filter-scope', 'filter-bp', 'filter-illegal'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('input', () => { applyMissionFilters(); applyMissionSort(); renderMissionPage(1); });
        el.addEventListener('change', () => { applyMissionFilters(); applyMissionSort(); renderMissionPage(1); });
    });
    document.getElementById('missions-reset').addEventListener('click', () => {
        document.getElementById('missions-search').value = '';
        document.getElementById('filter-faction').value = '';
        document.getElementById('filter-system').value = '';
        document.getElementById('filter-scope').value = '';
        document.getElementById('filter-bp').checked = false;
        document.getElementById('filter-illegal').checked = false;
        applyMissionFilters(); applyMissionSort(); renderMissionPage(1);
    });
    document.querySelectorAll('#missions-table th.sortable').forEach(th => {
        th.addEventListener('click', () => {
            const key = th.dataset.sort;
            if (missionsSort.key === key) missionsSort.asc = !missionsSort.asc;
            else { missionsSort.key = key; missionsSort.asc = true; }
            applyMissionSort(); renderMissionPage(1);
        });
    });
}

// ─── MISSION DETAIL (uses unified modal) ───

async function openMissionDetail(uuid) {
    // Try cache first
    let m = null;
    if (missionsCache) {
        m = missionsCache.find(x => x.uuid === uuid);
    }
    if (!m) {
        m = await apiFetch(`/missions/${uuid}`);
    }
    if (!m) return;
    // Asegurar que el unlock map esté cargado
    if (!window._bpUnlockMap) {
        try {
            const res = await fetch('/data/blueprint_unlock_map.json');
            if (res.ok) window._bpUnlockMap = await res.json();
        } catch(e) {}
    }
    // Construir mapa inverso si hace falta
    if (!window._missionBpMap) {
        window._missionBpMap = {};
        if (window._bpUnlockMap) {
            for (const [bpUuid, bpData] of Object.entries(window._bpUnlockMap)) {
                for (const mm of bpData.unlocking_missions || []) {
                    if (!window._missionBpMap[mm.mission_uuid]) window._missionBpMap[mm.mission_uuid] = [];
                    window._missionBpMap[mm.mission_uuid].push({uuid: bpUuid, name: bpData.blueprint_name});
                }
            }
        }
    }
    const fname = getFactionName(m);
    const sys = getSystem(m);

    // Buscar blueprints que da esta misión desde el mapa inverso
    const missionBps = window._missionBpMap ? window._missionBpMap[m.uuid] : null;

    // Si la misión da blueprints, agregar sección al modal
    let bpSection = null;
    if (missionBps && missionBps.length > 0) {
        const bpCards = missionBps.map(bp => 
            '<span class="mini-card" onclick="window._openBpUuid=\'' + bp.uuid + '\';closeMissionModal();navigateTo(\'blueprints\');return false">' + bp.name + '</span>'
        ).join('');
        bpSection = { title: 'Blueprints que desbloquea', items: [{label: '', value: '<div class="mini-card-group">' + bpCards + '</div>'}] };
    }

    const fields = [
        { label: __('Facción'), value: tr(fname) },
        { label: 'Categoría', value: SCOPE_ES[m.reward_scope] || m.reward_scope || '?' },
        { label: 'Sistema', value: sys },
        { label: 'Recompensa', value: m.reward_min > 0 ? m.reward_min.toLocaleString() + ' ' + (m.reward_currency || 'UEC') : '—' },
        { label: 'Legalidad', value: m.illegal ? '<span class="badge-illegal">Ilegal</span>' : '<span class="badge-legal">Legal</span>' },
        { label: 'Combate', value: m.has_combat ? 'Sí' : 'No' },
        { label: 'Jugadores', value: (m.max_players_per_instance || 1) + ' max' },
        { label: 'Cooldown', value: m.cooldown_label || '—' },
        { label: 'Rank', value: m.rank_index !== null && m.rank_index !== undefined ? 'Nivel ' + m.rank_index : '—', fullWidth: true },
    ];

    const footer = `UUID: ${m.uuid} · v${m.game_version || '?'}`;

    const title = (currentLang === 'es' && missionTitlesES && m.debug_name && missionTitlesES[m.debug_name])
        ? missionTitlesES[m.debug_name]
        : (getMissionTranslation(m) || tr(m.title) || m.title || '?');
    let desc = m.description;
    if (currentLang === 'es' && m.debug_name) {
        if (missionDescClean && missionDescClean[m.debug_name]) {
            desc = missionDescClean[m.debug_name];
        } else if (missionDescriptionsES && missionDescriptionsES[m.debug_name]) {
            desc = missionDescriptionsES[m.debug_name];
        }
    }

    const descSection = desc ? { title: 'Descripción', items: [{ label: '', value: desc }] } : null;
    const sections = [];
    if (descSection) sections.push(descSection);
    if (bpSection) sections.push(bpSection);

    showDetailModal({
        icon: '📋',
        title: title,
        fields: fields,
        sections: sections,
        footer: footer
    });
}

let bpCache = null;
let bpFiltered = [];
let bpPage = 1;
let bpSort = { key: null, asc: true };
const BP_PER_PAGE = 25;

async function loadBlueprints(filter) {
    const tbody = document.getElementById('blueprints-tbody');
    if (!bpCache) {
        showSkeleton('blueprints-tbody', 5, 4);
        try {
            const res = await fetch('/data/blueprints.json');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            bpCache = await res.json();
        } catch(e) {
            console.warn('Static load failed for blueprints, trying API:', e);
            const data = await apiFetch('/blueprints?per_page=500');
            if (!data) { tbody.innerHTML = '<tr><td colspan="4" class="loading-row" style="color:var(--danger)">Error al cargar</td></tr>'; return; }
            let allBp = [...data.data];
            for (let p = 2; p <= data.total_pages; p++) {
                const more = await apiFetch(`/blueprints?per_page=500&page=${p}`);
                if (more) allBp = allBp.concat(more.data);
            }
            bpCache = allBp;
        }
    }
    // Ensure blueprint unlock map is loaded (shared between missions & blueprints)
    if (!window._bpUnlockMap) {
        try {
            const res = await fetch('/data/blueprint_unlock_map.json');
            if (res.ok) {
                window._bpUnlockMap = await res.json();
                // Build reverse map: mission_uuid → [{uuid, name}]
                window._missionBpMap = {};
                for (const [bpUuid, bpData] of Object.entries(window._bpUnlockMap)) {
                    for (const m of bpData.unlocking_missions || []) {
                        if (!window._missionBpMap[m.mission_uuid]) window._missionBpMap[m.mission_uuid] = [];
                        window._missionBpMap[m.mission_uuid].push({uuid: bpUuid, name: bpData.blueprint_name});
                    }
                }
            }
        } catch(e) {
            console.warn('Failed to load blueprint_unlock_map.json:', e);
        }
    }
    bpFiltered = [...bpCache];
    applyBpFilters();
    applyBpSort();
    renderBpPage(1);
    setupBpFilters();
    // Auto-open specific blueprint from mission modal
    if (window._openBpUuid && bpCache) {
        const uuid = window._openBpUuid;
        window._openBpUuid = null;
        setTimeout(() => openBpDetail(uuid), 300);
    }
}

function applyBpFilters() {
    const search = document.getElementById('bp-search').value.toLowerCase();
    const minIng = parseInt(document.getElementById('filter-ingredients').value) || 0;
    const onlyUnlockable = document.getElementById('filter-default').checked;
    bpFiltered = (bpCache || []).filter(b => {
        if (search && !b.output_name?.toLowerCase().includes(search)) return false;
        if (minIng > 0 && (b.ingredient_count || 0) !== minIng) return false;
        if (onlyUnlockable && b.is_available_by_default) return false;
        return true;
    });
    document.getElementById('blueprints-count').textContent = bpFiltered.length;
}

function applyBpSort() {
    const { key, asc } = bpSort;
    if (!key) return;
    bpFiltered.sort((a, b) => {
        let va, vb;
        switch (key) {
            case 'output': va = a.output_name || ''; vb = b.output_name || ''; break;
            case 'ingredients': va = a.ingredient_count || 0; vb = b.ingredient_count || 0; break;
            case 'time': va = a.craft_time_seconds || 0; vb = b.craft_time_seconds || 0; break;
            case 'missions': va = a.unlocking_missions_count || 0; vb = b.unlocking_missions_count || 0; break;
            default: return 0;
        }
        if (typeof va === 'string') return asc ? va.localeCompare(vb) : vb.localeCompare(va);
        return asc ? va - vb : vb - va;
    });
}

function renderBpPage(page) {
    bpPage = page;
    const tbody = document.getElementById('blueprints-tbody');
    const total = bpFiltered.length;
    const pages = Math.ceil(total / BP_PER_PAGE) || 1;
    const start = (page - 1) * BP_PER_PAGE;
    const pageItems = bpFiltered.slice(start, start + BP_PER_PAGE);
    if (total === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="loading-row">Sin resultados</td></tr>';
        document.getElementById('blueprints-pagination').innerHTML = '';
        return;
    }
    tbody.innerHTML = pageItems.map(b => {
        const timeStr = b.craft_time_label || formatSeconds(b.craft_time_seconds);
        const missionsCount = b.unlocking_missions_count || 0;
        const missionsBadge = missionsCount > 0 ? `<span class="badge-bp">${missionsCount} mis.</span>` : '<span style="color:var(--text-muted)">—</span>';
        return `<tr onclick="openBpDetail('${b.uuid}')">
            <td>${b.output_name || '?'}</td>
            <td>${getBpCategoryLabel(b.category || '')}</td>
            <td>${b.ingredient_count || 0}</td>
            <td>${timeStr}</td>
            <td>${missionsBadge}</td>
        </tr>`;
    }).join('');
    renderPagination('blueprints-pagination', page, pages, renderBpPage);
    updateSortIndicators('blueprints-table', bpSort.key, bpSort.asc);
}

function setupBpFilters() {
    if (window._bpFiltersReady) return;
    window._bpFiltersReady = true;
    ['bp-search', 'filter-ingredients', 'filter-default'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('input', () => { applyBpFilters(); applyBpSort(); renderBpPage(1); });
        el.addEventListener('change', () => { applyBpFilters(); applyBpSort(); renderBpPage(1); });
    });
    document.getElementById('bp-reset').addEventListener('click', () => {
        document.getElementById('bp-search').value = '';
        document.getElementById('filter-ingredients').value = '0';
        document.getElementById('filter-default').checked = false;
        applyBpFilters(); applyBpSort(); renderBpPage(1);
    });
    document.querySelectorAll('#blueprints-table th.sortable').forEach(th => {
        th.addEventListener('click', () => {
            const key = th.dataset.sort;
            if (bpSort.key === key) bpSort.asc = !bpSort.asc;
            else { bpSort.key = key; bpSort.asc = true; }
            applyBpSort(); renderBpPage(1);
        });
    });
}

// ─── BP category labels ───
function getBpCategoryLabel(cat) {
    const labels = {
        'component': 'Componente',
        'ship_weapon': 'Arma de nave',
        'fps_weapon': 'Arma FPS',
        'armor': 'Armadura',
        'weapon_attachment': 'Accesorio',
        'mining_tool': 'Herramienta de minería',
        'salvage_tool': 'Herramienta de recuperación',
        'tool': 'Herramienta',
        'ship_part': 'Pieza de nave',
        'clothing': 'Ropa',
        'other': 'Otros',
    };
    // Try EN labels for when in English mode
    const labelsEn = {
        'component': 'Component',
        'ship_weapon': 'Ship Weapon',
        'fps_weapon': 'FPS Weapon',
        'armor': 'Armor',
        'weapon_attachment': 'Attachment',
        'mining_tool': 'Mining Tool',
        'salvage_tool': 'Salvage Tool',
        'tool': 'Tool',
        'ship_part': 'Ship Part',
        'clothing': 'Clothing',
        'other': 'Other',
    };
    const lang = (typeof currentLang !== 'undefined' ? currentLang : 'es');
    const map = lang === 'en' ? labelsEn : labels;
    return map[cat] || cat || '—';
}

// ─── BP DETAIL (uses unified modal) ───

async function openBpDetail(uuid) {
    let b = null;
    if (bpCache) {
        b = bpCache.find(x => x.uuid === uuid);
    }
    if (!b) b = await apiFetch(`/blueprints/${uuid}`);
    if (!b) return;
    const timeStr = b.craft_time_label || formatSeconds(b.craft_time_seconds);

    const unlockData = window._bpUnlockMap ? window._bpUnlockMap[b.uuid] : null;
    let seConsigueValue, seConsigueRawHtml;
    if (b.is_available_by_default) {
        seConsigueValue = 'Sí';
        seConsigueRawHtml = false;
    } else if (unlockData && unlockData.unlocking_missions && unlockData.unlocking_missions.length > 0) {
        const primaryMissions = unlockData.unlocking_missions.filter(m => m.chance === 1);
        const targetMissions = primaryMissions.length > 0 ? primaryMissions : unlockData.unlocking_missions;
        const missionTitle = escapeHtml(targetMissions[0].mission_title);
        const missionUuid = targetMissions[0].mission_uuid;
        seConsigueValue = '<span class="mini-card" onclick="window._openMissionUuid=\'' + missionUuid + '\';closeBpModal();navigateTo(\'missions\');return false">' + missionTitle + '</span>';
        seConsigueRawHtml = true;
    } else {
        seConsigueValue = 'No disponible';
        seConsigueRawHtml = false;
    }

    const catLabel = getBpCategoryLabel(b.category || '');
    let subtypeInfo = '';
    if (b.category === 'component' && b.component_subtype) {
        const subtypeLabels = {
            'power_plant': 'Planta de poder',
            'cooler': 'Enfriador',
            'shield': 'Escudo',
            'quantum_drive': 'Motor cuántico',
            'radar': 'Radar'
        };
        subtypeInfo = '(' + (subtypeLabels[b.component_subtype] || b.component_subtype) + ')';
    }
    const fields = [
        { label: 'Tipo', value: catLabel + (subtypeInfo ? ' ' + subtypeInfo : '') },
        { label: 'Tiempo de fabricación', value: timeStr },
        { label: 'Ingredientes', value: b.ingredient_count || 0 },
        { label: 'Se consigue en', value: seConsigueValue, rawHtml: seConsigueRawHtml },
        { label: 'Misiones para desbloquear', value: b.unlocking_missions_count || 0 },
    ];

    const sections = [];
    if (b.ingredients && b.ingredients.length) {
        sections.push({
            title: 'Ingredientes',
            items: b.ingredients.map(ing => ({
                label: ing.name || '?',
                value: ing.quantity_scu ? ing.quantity_scu + ' SCU' : (ing.quantity || '')
            }))
        });
    }

    const footer = `<span style="display:none">Key: ${b.key || '?'}</span> · v${b.game_version || '?'}`;

    showDetailModal({
        icon: '🔧',
        title: b.output_name || '?',
        fields: fields,
        sections: sections,
        footer: footer
    });
}

// ═══════════════════════════════════════════
// WEAPONS PAGE
// ═══════════════════════════════════════════

let wpCache = null;
let wpFiltered = [];
let wpPage = 1;
let wpSort = { key: null, asc: true };
const WP_PER_PAGE = 25;

async function loadWeapons(filter) {
    const tbody = document.getElementById('weapons-tbody');
    if (!wpCache) {
        showSkeleton('weapons-tbody', 5, 7);
        try {
            const res = await fetch('/data/weapons.json');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            wpCache = await res.json();
        } catch(e) {
            console.warn('Static load failed for weapons, trying API:', e);
            const data = await apiFetch('/weapons');
            if (!data) { tbody.innerHTML = '<tr><td colspan="7" class="loading-row" style="color:var(--danger)">Error</td></tr>'; return; }
            wpCache = data.data || [];
        }
    }
    wpFiltered = [...wpCache];
    if (filter === 'size6') document.getElementById('filter-size').value = '6';
    populateWpTypes();
    applyWpFilters();
    applyWpSort();
    renderWpPage(1);
    setupWpFilters();
}

function populateWpTypes() {
    const sel = document.getElementById('filter-wp-type');
    if (sel.options.length > 1) return;
    const types = [...new Set(wpCache.map(w => w.stats?.TYPE || 'Unknown'))].sort();
    types.forEach(t => { const o = document.createElement('option'); o.value = t; o.textContent = t; sel.appendChild(o); });
}

function applyWpFilters() {
    const s = document.getElementById('wp-search').value.toLowerCase();
    const size = document.getElementById('filter-size').value;
    const type = document.getElementById('filter-wp-type').value;
    wpFiltered = (wpCache || []).filter(w => {
        if (s && !w.name?.toLowerCase().includes(s)) return false;
        if (size && w.stats?.SIZE !== size) return false;
        if (type && w.stats?.TYPE !== type) return false;
        return true;
    });
    document.getElementById('weapons-count').textContent = wpFiltered.length;
}

function applyWpSort() {
    if (!wpSort.key) return;
    wpFiltered.sort((a, b) => {
        let va, vb;
        const sa = a.stats || {}, sb = b.stats || {};
        switch (wpSort.key) {
            case 'name': va = a.name || ''; vb = b.name || ''; break;
            case 'size': va = parseInt(sa.SIZE) || 0; vb = parseInt(sb.SIZE) || 0; break;
            case 'type': va = sa.TYPE || ''; vb = sb.TYPE || ''; break;
            case 'dps': va = parseFloat(sa['BASE DPS']) || 0; vb = parseFloat(sb['BASE DPS']) || 0; break;
            case 'alpha': va = parseFloat(sa.ALPHA) || 0; vb = parseFloat(sb.ALPHA) || 0; break;
            case 'range': va = parseFloat(sa.FIRERANGE) || 0; vb = parseFloat(sb.FIRERANGE) || 0; break;
            case 'price': va = Math.min(...(a.locations || []).map(l => parseInt(l.price) || Number.MAX_SAFE_INTEGER)); vb = Math.min(...(b.locations || []).map(l => parseInt(l.price) || Number.MAX_SAFE_INTEGER)); break;
            default: return 0;
        }
        if (typeof va === 'string') return wpSort.asc ? va.localeCompare(vb) : vb.localeCompare(va);
        return wpSort.asc ? va - vb : vb - va;
    });
}

function renderWpPage(page) {
    wpPage = page;
    const tbody = document.getElementById('weapons-tbody');
    const total = wpFiltered.length;
    const pages = Math.ceil(total / WP_PER_PAGE) || 1;
    const items = wpFiltered.slice((page-1)*WP_PER_PAGE, page*WP_PER_PAGE);
    if (!total) { tbody.innerHTML = '<tr><td colspan="7" class="loading-row">Sin resultados</td></tr>'; return; }
    tbody.innerHTML = items.map(w => {
        const s = w.stats || {};
        const minPrice = Math.min(...(w.locations || []).map(l => parseInt(l.price) || Number.MAX_SAFE_INTEGER));
        return `<tr onclick="openWpDetail('${w.id}')">
            <td>${w.name || '?'}</td>
            <td>S${safeVal(s.SIZE)}</td>
            <td style="color:var(--text-secondary)">${s.TYPE || '—'}</td>
            <td style="color:var(--accent)">${s['BASE DPS'] || '—'}</td>
            <td>${s.ALPHA || '—'}</td>
            <td>${s.FIRERANGE || '—'}</td>
            <td>${minPrice < Number.MAX_SAFE_INTEGER ? minPrice.toLocaleString() : '—'}</td>
        </tr>`;
    }).join('');
    renderPagination('weapons-pagination', page, pages, renderWpPage);
    updateSortIndicators('weapons-table', wpSort.key, wpSort.asc);
}

function setupWpFilters() {
    if (window._wpFReady) return; window._wpFReady = true;
    ['wp-search','filter-size','filter-wp-type'].forEach(id => {
        const el = document.getElementById(id); if (!el) return;
        el.addEventListener('change', () => { applyWpFilters(); applyWpSort(); renderWpPage(1); });
        el.addEventListener('input', () => { applyWpFilters(); applyWpSort(); renderWpPage(1); });
    });
    document.getElementById('wp-reset').addEventListener('click', () => {
        ['wp-search','filter-size','filter-wp-type'].forEach(id => document.getElementById(id).value='');
        applyWpFilters(); applyWpSort(); renderWpPage(1);
    });
    document.querySelectorAll('#weapons-table th.sortable').forEach(th => {
        th.addEventListener('click', () => {
            const k = th.dataset.sort;
            if (wpSort.key === k) wpSort.asc = !wpSort.asc; else { wpSort.key = k; wpSort.asc = true; }
            applyWpSort(); renderWpPage(1);
        });
    });
}

// ─── WEAPON DETAIL (uses unified modal) ───

async function openWpDetail(id) {
    let w = null;
    if (wpCache) {
        w = wpCache.find(x => x.id === id);
    }
    if (!w) w = await apiFetch(`/weapons/${id}`);
    if (!w) return;
    const s = w.stats || {};

    const fields = [
        { label: 'Fabricante', value: s.MANUFACTURER || '—' },
        { label: 'Tipo', value: s.TYPE || '—' },
        { label: 'Tamaño', value: s.SIZE || '—' },
        { label: 'DPS', value: s['BASE DPS'] || '—' },
        { label: 'Daño Alpha', value: s.ALPHA || '—' },
        { label: 'Cadencia', value: s.FIRERATE || '—' },
        { label: 'Alcance', value: s.FIRERANGE || '—' },
        { label: 'Consumo', value: s['POWER DRAW'] || '—' },
        { label: 'Velocidad', value: s['BULLET SPEED'] || '—' },
        { label: 'Munición máx.', value: s['MAX AMMO'] || '—' },
    ];

    const sections = [];
    if (w.locations && w.locations.length) {
        sections.push({
            title: '📍 Dónde comprarlo',
            items: w.locations.slice(0, 10).map(l => ({
                label: l.name,
                value: (parseInt(l.price)?.toLocaleString() || '?') + ' aUEC'
            }))
        });
    }

    showDetailModal({
        icon: '🔫',
        title: w.name || '?',
        fields: fields,
        sections: sections
    });
}

// ═══════════════════════════════════════════
// WIKELO PAGE (migrated to data-table)
// ═══════════════════════════════════════════

let wkCache = null; // raw items array
let wkFiltered = [];
let wkPage = 1;
let wkSort = { key: null, asc: true };
const WK_PER_PAGE = 25;
let wkTrans = null; // wikelo_translations_integrated.json cache

const wkCatNames = {
    favor_trades: '🤝 Favors',
    polaris_bit_recipes: '💎 Recetas Polaris',
    weapon_contracts: '🔫 Armas',
    armor_contracts: '🛡️ Armaduras',
    vehicle_contracts: '🚗 Vehículos',
    ship_contracts: '🚀 Naves'
};

// Mapa de categorías de items → categorías Wikelo
const wkCategoryMap = {
    weapon: 'weapon_contracts',
    armor: 'armor_contracts',
    ship: 'ship_contracts',
    vehicle: 'vehicle_contracts'
};

async function loadWikelo(filter) {
    const tbody = document.getElementById('wikelo-tbody');
    if (!wkCache) {
        showSkeleton('wikelo-tbody', 5, 5);
        try {
            const res = await fetch('/data/wikelo.json');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            // Normalize into flat array with category
            wkCache = [];
            if (Array.isArray(data)) {
                data.forEach(item => wkCache.push({ ...item, _category: wkCategoryMap[item.category] || item.category || 'favor_trades' }));
            } else if (data.data && Array.isArray(data.data)) {
                data.data.forEach(item => wkCache.push({ ...item, _category: wkCategoryMap[item.category] || item.category || 'favor_trades' }));
            } else if (typeof data === 'object') {
                Object.keys(data).forEach(k => {
                    if (k !== 'total' && Array.isArray(data[k])) {
                        data[k].forEach(item => wkCache.push({ ...item, _category: k }));
                    }
                });
            }
        } catch(e) {
            console.warn('Static load failed for wikelo, trying API:', e);
            const data = await apiFetch('/wikelo');
            if (!data) { tbody.innerHTML = '<tr><td colspan="5" class="loading-row" style="color:var(--danger)">Error al cargar</td></tr>'; return; }
            // Normalize
            wkCache = [];
            if (Array.isArray(data)) {
                data.forEach(item => wkCache.push({ ...item, _category: wkCategoryMap[item.category] || item.category || 'favor_trades' }));
            } else if (data.data && Array.isArray(data.data)) {
                data.data.forEach(item => wkCache.push({ ...item, _category: wkCategoryMap[item.category] || item.category || 'favor_trades' }));
            } else if (typeof data === 'object') {
                Object.keys(data).forEach(k => {
                    if (k !== 'total' && Array.isArray(data[k])) {
                        data[k].forEach(item => wkCache.push({ ...item, _category: k }));
                    }
                });
            }
        }
        // Badge de lazyload → número real
        const badgeWk = document.getElementById('badge-wikelo');
        if (badgeWk) badgeWk.textContent = wkCache.length;
    }
    wkFiltered = [...wkCache];
    if (filter === 'ships') document.getElementById('filter-wk-cat').value = 'ship_contracts';
    applyWikeloFilters();
    applyWikeloSort();
    renderWikeloPage(1);
    setupWikeloFilters();
}

function applyWikeloFilters() {
    const q = (document.getElementById('wikelo-search')?.value || '').toLowerCase();
    const cat = document.getElementById('filter-wk-cat')?.value || '';
    wkFiltered = (wkCache || []).filter(i => {
        if (q && !i.name?.toLowerCase().includes(q) && !tr(i.name)?.toLowerCase().includes(q)) return false;
        if (cat && i._category !== cat) return false;
        return true;
    });
    document.getElementById('wikelo-count').textContent = wkFiltered.length;
}

function applyWikeloSort() {
    const { key, asc } = wkSort;
    if (!key) return;
    wkFiltered.sort((a, b) => {
        let va, vb;
        switch (key) {
            case 'name': va = (tr(a.name) || a.name || '').toLowerCase(); vb = (tr(b.name) || b.name || '').toLowerCase(); break;
            case 'category': va = a._category || ''; vb = b._category || ''; break;
            case 'inputs': va = (a.inputs || []).length; vb = (b.inputs || []).length; break;
            case 'rewards': va = (a.rewards || []).length; vb = (b.rewards || []).length; break;
            case 'reputation': va = a.reputation_min || 0; vb = b.reputation_min || 0; break;
            default: return 0;
        }
        if (typeof va === 'string') return asc ? va.localeCompare(vb) : vb.localeCompare(va);
        return asc ? va - vb : vb - va;
    });
}

async function renderWikeloPage(page) {
    wkPage = page;
    const tbody = document.getElementById('wikelo-tbody');
    // Cargar traducciones de Wikelo bajo demanda
    if (!wkTrans) {
        try {
            const wRes = await fetch('/data/wikelo_translations_integrated.json');
            if (wRes.ok) wkTrans = await wRes.json();
        } catch(e) { console.warn('⚠️ Error cargando wkTrans:', e); }
    }
    const total = wkFiltered.length;
    const pages = Math.ceil(total / WK_PER_PAGE) || 1;
    const start = (page - 1) * WK_PER_PAGE;
    const pageItems = wkFiltered.slice(start, start + WK_PER_PAGE);
    if (total === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="loading-row">Sin resultados</td></tr>';
        document.getElementById('wikelo-pagination').innerHTML = '';
        return;
    }
    tbody.innerHTML = pageItems.map(i => {
        const translatedName = tr(i.name) || i.name || '?';
        const catName = wkCatNames[i._category] || i._category || '—';
        const inputs = (i.inputs || []).map(x => {
            const itemName = x.item || '';
            const translated = wkTrans && wkTrans.items && wkTrans.items[itemName] ? wkTrans.items[itemName] : (tr(itemName) || itemName);
            return `${x.quantity || ''}x ${translated}`;
        }).join(', ') || '—';
        const rewards = (i.rewards || []).map(r => {
            const itemName = r.item || '';
            const translated = wkTrans && wkTrans.items && wkTrans.items[itemName] ? wkTrans.items[itemName] : (tr(itemName) || itemName);
            return `${r.quantity || ''} ${translated}`.trim();
        }).join(', ') || '—';
        const rep = i.reputation_min ? '⭐ ' + i.reputation_min : '—';
        // Encode data for modal
        const detailData = encodeURIComponent(JSON.stringify({
            name: translatedName,
            inputs: inputs,
            rewards: rewards,
            rep: rep,
            category: catName
        }));
        return `<tr onclick="openWikeloDetail('${detailData}')">
            <td style="color:var(--accent);font-weight:500">${translatedName}</td>
            <td>${catName}</td>
            <td style="color:var(--text-secondary);max-width:250px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${inputs}">${inputs}</td>
            <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${rewards}">${rewards}</td>
            <td>${rep}</td>
        </tr>`;
    }).join('');
    renderPagination('wikelo-pagination', page, pages, renderWikeloPage);
    updateSortIndicators('wikelo-table', wkSort.key, wkSort.asc);
}

function setupWikeloFilters() {
    if (window._wkFiltersReady) return;
    window._wkFiltersReady = true;
    ['wikelo-search', 'filter-wk-cat'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('input', () => { applyWikeloFilters(); applyWikeloSort(); renderWikeloPage(1); });
        el.addEventListener('change', () => { applyWikeloFilters(); applyWikeloSort(); renderWikeloPage(1); });
    });
    document.getElementById('wikelo-reset').addEventListener('click', () => {
        document.getElementById('wikelo-search').value = '';
        document.getElementById('filter-wk-cat').value = '';
        applyWikeloFilters(); applyWikeloSort(); renderWikeloPage(1);
    });
    document.querySelectorAll('#wikelo-table th.sortable').forEach(th => {
        th.addEventListener('click', () => {
            const key = th.dataset.sort;
            if (wkSort.key === key) wkSort.asc = !wkSort.asc;
            else { wkSort.key = key; wkSort.asc = true; }
            applyWikeloSort(); renderWikeloPage(1);
        });
    });
}

// ─── WIKELO DETAIL (uses unified modal) ───

function openWikeloDetail(encoded) {
    try {
        const d = JSON.parse(decodeURIComponent(encoded));
        showDetailModal({
            icon: '🛸',
            title: d.name,
            fields: [
                { label: '📥 Entrega', value: d.inputs, fullWidth: true },
                { label: '🎁 Recompensa', value: d.rewards, fullWidth: true },
                { label: 'Reputación min.', value: d.rep },
            ],
            footer: d.name + ' · Contrato Wikelo'
        });
    } catch(e) {}
}

// ═══════════════════════════════════════════
// ITEMS PAGE (enhanced with pagination + modal)
// ═══════════════════════════════════════════

const ITEM_TYPE_LABELS = {
    armor_helmet: 'Casco',
    armor_core: 'Peto',
    armor_arms: 'Brazos',
    armor_legs: 'Piernas',
    armor_backpack: 'Mochila',
    undersuit: 'Traje interior',
    fps_weapon: 'Arma FPS',
    ammo: 'Munición',
    tool: 'Herramienta',
    clothing: 'Ropa',
    food_drink: 'Comida/Bebida',
    mission_item: 'Objeto de misión',
    ship_component: 'Componente de nave',
    livery: 'Livery',
    vehicle: 'Vehículo',
    plushie: 'Peluche',
    mineral_ore: 'Mineral',
    other: 'Otro'
};

const ITEM_TYPE_LABELS_EN = {
    armor_helmet: 'Helmet',
    armor_core: 'Core',
    armor_arms: 'Arms',
    armor_legs: 'Legs',
    armor_backpack: 'Backpack',
    undersuit: 'Undersuit',
    fps_weapon: 'FPS Weapon',
    ammo: 'Ammo',
    tool: 'Tool',
    clothing: 'Clothing',
    food_drink: 'Food/Drink',
    mission_item: 'Mission Item',
    ship_component: 'Ship Component',
    livery: 'Livery',
    vehicle: 'Vehicle',
    plushie: 'Plushie',
    mineral_ore: 'Mineral/Ore',
    other: 'Other'
};

function getItemTypeLabel(type) {
    if (!type) return '—';
    const map = currentLang === 'es' ? ITEM_TYPE_LABELS : ITEM_TYPE_LABELS_EN;
    return map[type] || type;
}

function populateItemTypeFilter() {
    const sel = document.getElementById('filter-item-type');
    if (!sel || sel.options.length > 1) return;
    const entries = currentLang === 'es'
        ? Object.entries(ITEM_TYPE_LABELS)
        : Object.entries(ITEM_TYPE_LABELS_EN);
    entries.forEach(([value, label]) => {
        const o = document.createElement('option');
        o.value = value;
        o.textContent = label;
        sel.appendChild(o);
    });
}

let itemsCache = null;
let itemsFiltered = [];
let itemsPage = 1;
let itemsSort = { key: null, asc: true };
const ITEMS_PER_PAGE = 50;

async function loadItems() {
    const tbody = document.getElementById('items-tbody');
    if (!itemsCache) {
        showSkeleton('items-tbody', 5, 3);
        try {
            const res = await fetch('/data/items.json');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            itemsCache = await res.json();
        } catch(e) {
            console.warn('Static load failed for items, trying API:', e);
            const firstPage = await apiFetch('/items?per_page=500');
            if (!firstPage) { tbody.innerHTML = '<tr><td colspan="3" class="loading-row" style="color:var(--danger)">Error</td></tr>'; return; }
            let allItems = [...(firstPage.data || [])];
            for (let p = 2; p <= (firstPage.total_pages || 1); p++) {
                const more = await apiFetch(`/items?per_page=500&page=${p}`);
                if (more && more.data) allItems = allItems.concat(more.data);
            }
            itemsCache = allItems;
        }
    }
    itemsFiltered = [...itemsCache];
    document.getElementById('items-count').textContent = itemsCache.length;
    // Badge de lazyload → número real
    const badgeItems = document.getElementById('badge-items');
    if (badgeItems) badgeItems.textContent = itemsCache.length;
    populateItemTypeFilter();
    applyItemsFilters();
    applyItemsSort();
    renderItemsPage(1);
    setupItemsFilters();
}

function applyItemsFilters() {
    const q = document.getElementById('items-search').value.toLowerCase();
    const typeFilter = document.getElementById('filter-item-type')?.value || '';
    itemsFiltered = (itemsCache || []).filter(i => {
        if (q && !i.name?.toLowerCase().includes(q)) return false;
        if (typeFilter) {
            const itemType = (i.item_type || i.type || i.Type || '').toLowerCase();
            if (itemType !== typeFilter) return false;
        }
        return true;
    });
    document.getElementById('items-count').textContent = itemsFiltered.length;
}

function applyItemsSort() {
    const { key, asc } = itemsSort;
    if (!key) return;
    itemsFiltered.sort((a, b) => {
        let va, vb;
        switch (key) {
            case 'name': va = a.name || ''; vb = b.name || ''; break;
            case 'type': va = a.item_type || a.type || ''; vb = b.item_type || b.type || ''; break;
            case 'available': va = Boolean(a.Sold) ? 1 : 0; vb = Boolean(b.Sold) ? 1 : 0; break;
            default: return 0;
        }
        if (typeof va === 'string') return asc ? va.localeCompare(vb) : vb.localeCompare(va);
        return asc ? va - vb : vb - va;
    });
}

function renderItemsPage(page) {
    itemsPage = page;
    const tbody = document.getElementById('items-tbody');
    const total = itemsFiltered.length;
    const pages = Math.ceil(total / ITEMS_PER_PAGE) || 1;
    const start = (page - 1) * ITEMS_PER_PAGE;
    const pageItems = itemsFiltered.slice(start, start + ITEMS_PER_PAGE);
    if (total === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="loading-row">Sin resultados</td></tr>';
        document.getElementById('items-pagination').innerHTML = '';
        return;
    }
    tbody.innerHTML = pageItems.map(i => {
        const soldBadge = i.Sold ? '<span class="badge-bp">Sí</span>' : '<span style="color:var(--text-muted)">No</span>';

        const rawType = i.item_type || i.type || i.Type || '';
        const itemType = getItemTypeLabel(rawType);
        return `<tr onclick="openItemDetail('${encodeURIComponent(JSON.stringify(i))}')">
            <td>${i.name || '?'}</td>
            <td style="color:var(--text-secondary)">${itemType}</td>
            <td>${soldBadge}</td>
        </tr>`;
    }).join('');
    renderPagination('items-pagination', page, pages, renderItemsPage);
    updateSortIndicators('items-table', itemsSort.key, itemsSort.asc);
}

function setupItemsFilters() {
    if (window._itemsFiltersReady) return;
    window._itemsFiltersReady = true;
    ['items-search', 'filter-item-type'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('input', () => { applyItemsFilters(); applyItemsSort(); renderItemsPage(1); });
        el.addEventListener('change', () => { applyItemsFilters(); applyItemsSort(); renderItemsPage(1); });
    });
    document.getElementById('items-reset').addEventListener('click', () => {
        document.getElementById('items-search').value = '';
        document.getElementById('filter-item-type').value = '';
        applyItemsFilters(); applyItemsSort(); renderItemsPage(1);
    });
    document.querySelectorAll('#items-table th.sortable').forEach(th => {
        th.addEventListener('click', () => {
            const key = th.dataset.sort;
            if (itemsSort.key === key) itemsSort.asc = !itemsSort.asc;
            else { itemsSort.key = key; itemsSort.asc = true; }
            applyItemsSort(); renderItemsPage(1);
        });
    });
}

// ─── ITEM DETAIL (uses unified modal) ───

function openItemDetail(encoded) {
    try {
        const i = JSON.parse(decodeURIComponent(encoded));
        const fields = [
            { label: 'Nombre', value: i.name || '—' },
            { label: 'Tipo', value: getItemTypeLabel(i.item_type || i.type || i.Type) || '—' },
            { label: 'Disponible en tiendas', value: i.Sold ? '<span class="badge-bp">Sí</span>' : '<span style="color:var(--text-muted)">No</span>' },
            { label: 'Descripción', value: i.description || '—', fullWidth: true },
        ];
        showDetailModal({
            icon: '📦',
            title: i.name || 'Item',
            fields: fields
        });
    } catch(e) {}
}

// ═══════════════════════════════════════════
// COMPONENTS PAGE (new)
// ═══════════════════════════════════════════

let compsCache = null;
let compsFiltered = [];
let compsPage = 1;
let compsSort = { key: null, asc: true };
const COMPS_PER_PAGE = 25;

async function loadComponents() {
    const tbody = document.getElementById('comps-tbody');
    if (!compsCache) {
        showSkeleton('comps-tbody', 5, 4);
        try {
            const res = await fetch('/data/components.json');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            compsCache = await res.json();
        } catch(e) {
            console.warn('Static load failed for components, trying API:', e);
            const d = await apiFetch('/components');
            compsCache = d.data || [];
        }
        document.getElementById('components-count').textContent = compsCache.length;
        // Badge de lazyload → número real
        const badgeComps = document.getElementById('badge-components');
        if (badgeComps) badgeComps.textContent = compsCache.length;
    }
    compsFiltered = [...compsCache];
    populateCompTypes();
    applyCompsFilters();
    applyCompsSort();
    renderCompsPage(1);
    setupCompsFilters();
}

function populateCompTypes() {
    const sel = document.getElementById('filter-comp-type');
    if (sel.options.length > 1) return;
    const types = [...new Set(compsCache.map(c => c.type || 'Unknown'))].sort();
    types.forEach(t => {
        const o = document.createElement('option');
        o.value = t; o.textContent = t;
        sel.appendChild(o);
    });
}

function applyCompsFilters() {
    const q = document.getElementById('comps-search').value.toLowerCase();
    const type = document.getElementById('filter-comp-type').value;
    compsFiltered = (compsCache || []).filter(c => {
        if (q && !c.name?.toLowerCase().includes(q)) return false;
        if (type && c.type !== type) return false;
        return true;
    });
    document.getElementById('components-count').textContent = compsFiltered.length;
}

function applyCompsSort() {
    const { key, asc } = compsSort;
    if (!key) return;
    compsFiltered.sort((a, b) => {
        let va, vb;
        switch (key) {
            case 'name': va = a.name || ''; vb = b.name || ''; break;
            case 'type': va = a.type || ''; vb = b.type || ''; break;
            case 'size': va = parseInt(a.size) || 0; vb = parseInt(b.size) || 0; break;
            case 'grade': va = parseInt(a.grade) || 0; vb = parseInt(b.grade) || 0; break;
            default: return 0;
        }
        if (typeof va === 'string') return asc ? va.localeCompare(vb) : vb.localeCompare(va);
        return asc ? va - vb : vb - va;
    });
}

function renderCompsPage(page) {
    compsPage = page;
    const tbody = document.getElementById('comps-tbody');
    const total = compsFiltered.length;
    const pages = Math.ceil(total / COMPS_PER_PAGE) || 1;
    const start = (page - 1) * COMPS_PER_PAGE;
    const pageItems = compsFiltered.slice(start, start + COMPS_PER_PAGE);
    if (total === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="loading-row">Sin resultados</td></tr>';
        document.getElementById('comps-pagination').innerHTML = '';
        return;
    }
    tbody.innerHTML = pageItems.map(c => {
        const typeClass = 'ct-' + (c.type || '').replace(/ /g,'');
        const typeBadge = `<span class="comp-badge ${typeClass}">${c.type || '—'}</span>`;
        return `<tr onclick="openCompDetail('${encodeURIComponent(JSON.stringify(c))}')">
            <td>${c.name || '?'}</td>
            <td>${typeBadge}</td>
            <td>${safeVal(c.size)}</td>
            <td>${safeVal(c.grade)}</td>
        </tr>`;
    }).join('');
    renderPagination('comps-pagination', page, pages, renderCompsPage);
    updateSortIndicators('comps-table', compsSort.key, compsSort.asc);
}

function setupCompsFilters() {
    if (window._compsFiltersReady) return;
    window._compsFiltersReady = true;
    ['comps-search', 'filter-comp-type'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('input', () => { applyCompsFilters(); applyCompsSort(); renderCompsPage(1); });
        el.addEventListener('change', () => { applyCompsFilters(); applyCompsSort(); renderCompsPage(1); });
    });
    document.getElementById('comps-reset').addEventListener('click', () => {
        document.getElementById('comps-search').value = '';
        document.getElementById('filter-comp-type').value = '';
        applyCompsFilters(); applyCompsSort(); renderCompsPage(1);
    });
    document.querySelectorAll('#comps-table th.sortable').forEach(th => {
        th.addEventListener('click', () => {
            const key = th.dataset.sort;
            if (compsSort.key === key) compsSort.asc = !compsSort.asc;
            else { compsSort.key = key; compsSort.asc = true; }
            applyCompsSort(); renderCompsPage(1);
        });
    });
}

// ─── COMPONENT DETAIL (uses unified modal) ───

function openCompDetail(encoded) {
    try {
        const c = JSON.parse(decodeURIComponent(encoded));
        const fields = [
            { label: 'Nombre', value: c.name || '—' },
            { label: 'Tipo', value: c.type || '—' },
            { label: 'Size', value: safeVal(c.size) },
            { label: 'Grade', value: safeVal(c.grade) },
        ];
        // Add any extra stats if available
        if (c.stats) {
            Object.entries(c.stats).forEach(([k, v]) => {
                fields.push({ label: k, value: v || '—' });
            });
        }
        showDetailModal({
            icon: '⚙️',
            title: c.name || 'Componente',
            fields: fields,
            footer: c.type ? `Tipo: ${c.type}` : ''
        });
    } catch(e) {}
}

// ═══════════════════════════════════════════
// FACTIONS PAGE (static, unchanged)
// ═══════════════════════════════════════════

function loadFactions() {
    const groups = {
        '🔫 Seguridad / Cazarrecompensas': [
            {n:'Crusader Security',s:'Stanton',d:'Bounty hunting, Emergency, Security'},
            {n:'Hurston Security',s:'Stanton',d:'Bounty hunting, Security'},
            {n:'MT Protection Services',s:'Stanton',d:'Bounty hunting, Security'},
            {n:'Northrock Service Group',s:'Stanton',d:'Bounty hunting, Courier, Security'},
            {n:'BlacJac Security',s:'Stanton',d:'Bounty hunting, Security'},
            {n:'Bounty Hunters Guild',s:'Stanton',d:'Gremio general de cazarecompensas'}
        ],
        '📦 Transporte / Courier': [
            {n:'Covalex Shipping',s:'Stanton',d:'Courier / delivery'},
            {n:'Ling Family Hauling',s:'Stanton',d:'Courier / hauling'},
            {n:'Red Wind Linehaul',s:'Stanton',d:'Courier / hauling'},
            {n:'Unified Distribution Management',s:'Stanton',d:'Courier / hauling'}
        ],
        '🔥 Pyro': [
            {n:'Headhunters',s:'Pyro',d:'Bounty hunting, Combat'},
            {n:'Citizens for Pyro (CFP)',s:'Pyro',d:'Defensa civil, misiones'},
            {n:'Frontier Fighters',s:'Pyro',d:'Defensa fronteriza'},
            {n:'XenoThreat',s:'Pyro',d:'Eventos, blueprints'},
            {n:'MAL',s:'Pyro',d:'Misiones de combate'},
            {n:'Eart',s:'Pyro',d:'Transporte'}
        ],
        '👤 Misioneros': [
            {n:'Miles Eckhart',s:'Stanton',d:'Cazarecompensas alto nivel'},
            {n:'Vaughn',s:'Stanton',d:'Asesinato'},
            {n:'Wallace Klim',s:'Stanton',d:'Refinación'},
            {n:'Tecia Pacheco',s:'Stanton',d:'Misiones varias'},
            {n:'Ruto',s:'Stanton',d:'Ilegales'},
            {n:'Wikelo ⭐',s:'Stanton',d:'Trueques Banu'}
        ]
    };
    let html = '';
    Object.entries(groups).forEach(([g, items]) => {
        html += `<div class="card"><h3>${g} <span class="page-count">${items.length}</span></h3>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:8px">`;
        items.forEach(f => {
            html += `<div style="padding:12px;background:var(--bg-primary);border-radius:8px;border:1px solid var(--border)">
                <div style="font-weight:600;color:var(--accent);font-size:13px">${f.n}</div>
                <div style="font-size:11px;color:var(--text-secondary);margin-top:3px">${f.d}</div>
                <div style="font-size:10px;color:var(--text-muted);margin-top:2px">📍 ${f.s}</div>
            </div>`;
        });
        html += '</div></div>';
    });
    document.getElementById('factions-content').innerHTML = html;
    // Count total unique factions
    let totalFactions = 0;
    Object.values(groups).forEach(items => totalFactions += items.length);
    const factionsBadge = document.getElementById('badge-factions');
    if (factionsBadge) factionsBadge.textContent = totalFactions;
    const factionsCount = document.getElementById('factions-page-count');
    if (factionsCount) factionsCount.textContent = totalFactions;
}

// ═══════════════════════════════════════════
// MINERALS PAGE
// ═══════════════════════════════════════════

// Static fallback minerals data (26 minerals)
const MINERALS_STATIC_DATA = [
  {"name":"Quantanium","type":"ore","rarity":"legendario","signatures":{"20%":3170,"40%":6340,"60%":9510,"80%":12680,"100%":15850,"max":19020},"signature_min":3170,"signature_max":19020,"locations":["Aberdeen (Hurston)","Magda (Crusader)","Cellin (Crusader)","Daymar (Crusader)","Lyria (ArcCorp)","Wala (microTech)"],"value_per_scu":24.69},
  {"name":"Savrilium","type":"ore","rarity":"épico","signatures":{"20%":3200,"40%":6400,"60%":9600,"80%":12800,"100%":16000,"max":19200},"signature_min":3200,"signature_max":19200,"locations":["Arial (Hurston)","Magda (Crusader)","Wala (microTech)"],"value_per_scu":15.25},
  {"name":"Riccite","type":"ore","rarity":"épico","signatures":{"20%":3385,"40%":6770,"60%":10155,"80%":13540,"100%":16925,"max":20310},"signature_min":3385,"signature_max":20310,"locations":["Magda (Crusader)","Calliope (microTech)","Pyro III"],"value_per_scu":19.85},
  {"name":"Lindinium","type":"ore","rarity":"épico","signatures":{"20%":3400,"40%":6800,"60%":10200,"80%":13600,"100%":17000,"max":20400},"signature_min":3400,"signature_max":20400,"locations":["Lyria (ArcCorp)","Calliope (microTech)"],"value_per_scu":22.15},
  {"name":"Aslarite","type":"ore","rarity":"épico","signatures":{"20%":3840,"40%":7680,"60%":11520,"80%":15360,"100%":19200,"max":23040},"signature_min":3840,"signature_max":23040,"locations":["Arial (Hurston)"],"value_per_scu":18.9},
  {"name":"Stileron","type":"ore","rarity":"raro","signatures":{"20%":3185,"40%":6370,"60%":9555,"80%":12740,"100%":15925,"max":19110},"signature_min":3185,"signature_max":19110,"locations":["Cellin (Crusader)","Daymar (Crusader)","Lyria (ArcCorp)","Pyro I","Pyro II (Monox)","Pyro III","Pyro IV"],"value_per_scu":20.5},
  {"name":"Ouratite","type":"ore","rarity":"raro","signatures":{"20%":3370,"40%":6740,"60%":10110,"80%":13480,"100%":16850,"max":20220},"signature_min":3370,"signature_max":20220,"locations":["Cellin (Crusader)","Wala (microTech)"],"value_per_scu":14.2},
  {"name":"Beryl","type":"ore","rarity":"raro","signatures":{"20%":3540,"40%":7080,"60%":10620,"80%":14160,"100%":17700,"max":21240},"signature_min":3540,"signature_max":21240,"locations":["Cellin (Crusader)","Daymar (Crusader)","Wala (microTech)"],"value_per_scu":6.78},
  {"name":"Gold","type":"ore","rarity":"raro","signatures":{"20%":3585,"40%":7170,"60%":10755,"80%":14340,"100%":17925,"max":21510},"signature_min":3585,"signature_max":21510,"locations":["Arial (Hurston)","Euterpe (microTech)","Daymar (Crusader)","Lyria (ArcCorp)","Wala (microTech)"],"value_per_scu":11.37},
  {"name":"Bexalite","type":"ore","rarity":"raro","signatures":{"20%":3600,"40%":7200,"60%":10800,"80%":14400,"100%":18000,"max":21600},"signature_min":3600,"signature_max":21600,"locations":["Arial (Hurston)","Magda (Crusader)","Lyria (ArcCorp)","Calliope (microTech)"],"value_per_scu":12.33},
  {"name":"Torite","type":"ore","rarity":"raro","signatures":{"20%":3900,"40%":7800,"60%":11700,"80%":15600,"100%":19500,"max":23400},"signature_min":3900,"signature_max":23400,"locations":["Ita (Hurston)","Cellin (Crusader)","Magda (Crusader)"],"value_per_scu":7.42},
  {"name":"Taranite","type":"ore","rarity":"común","signatures":{"20%":3555,"40%":7110,"60%":10665,"80%":14220,"100%":17775,"max":21330},"signature_min":3555,"signature_max":21330,"locations":["Aberdeen (Hurston)","Arial (Hurston)","Euterpe (microTech)","Cellin (Crusader)","Daymar (Crusader)","Magda (Crusader)","Lyria (ArcCorp)","Calliope (microTech)","Wala (microTech)"],"value_per_scu":8.28},
  {"name":"Borase","type":"ore","rarity":"común","signatures":{"20%":3570,"40%":7140,"60%":10710,"80%":14280,"100%":17850,"max":21420},"signature_min":3570,"signature_max":21420,"locations":["Aberdeen (Hurston)","Arial (Hurston)","Euterpe (microTech)","Cellin (Crusader)","Daymar (Crusader)","Wala (microTech)","Pyro III","Pyro IV"],"value_per_scu":8.53},
  {"name":"Laranite","type":"ore","rarity":"común","signatures":{"20%":3825,"40%":7650,"60%":11475,"80%":15300,"100%":19125,"max":22950},"signature_min":3825,"signature_max":22950,"locations":["Aberdeen (Hurston)","Arial (Hurston)","Euterpe (microTech)","Cellin (Crusader)","Daymar (Crusader)","Magda (Crusader)","Lyria (ArcCorp)","Wala (microTech)","Calliope (microTech)","Pyro IV"],"value_per_scu":18.59},
  {"name":"Titanium","type":"ore","rarity":"común","signatures":{"20%":3855,"40%":7710,"60%":11565,"80%":15420,"100%":19275,"max":23130},"signature_min":3855,"signature_max":23130,"locations":["Aberdeen (Hurston)","Ita (Hurston)","Arial (Hurston)","Cellin (Crusader)","Daymar (Crusader)","Magda (Crusader)","Lyria (ArcCorp)","Calliope (microTech)","Wala (microTech)"],"value_per_scu":5.31},
  {"name":"Tungsten","type":"ore","rarity":"común","signatures":{"20%":3870,"40%":7740,"60%":11610,"80%":15480,"100%":19350,"max":23220},"signature_min":3870,"signature_max":23220,"locations":["Aberdeen (Hurston)","Ita (Hurston)","Arial (Hurston)","Euterpe (microTech)","Cellin (Crusader)","Daymar (Crusader)","Magda (Crusader)","Lyria (ArcCorp)","Calliope (microTech)","Wala (microTech)"],"value_per_scu":4.71},
  {"name":"Agricium","type":"ore","rarity":"común","signatures":{"20%":3885,"40%":7770,"60%":11655,"80%":15540,"100%":19425,"max":23310},"signature_min":3885,"signature_max":23310,"locations":["Ita (Hurston)","Arial (Hurston)","Cellin (Crusader)","Daymar (Crusader)","Lyria (ArcCorp)","Wala (microTech)"],"value_per_scu":20.07},
  {"name":"Hephaestanite","type":"ore","rarity":"común","signatures":{"20%":4180,"40%":8360,"60%":12540,"80%":16720,"100%":20900,"max":25080},"signature_min":4180,"signature_max":25080,"locations":["Aberdeen (Hurston)","Ita (Hurston)","Arial (Hurston)","Cellin (Crusader)","Daymar (Crusader)","Magda (Crusader)","Lyria (ArcCorp)","Pyro II (Monox)"],"value_per_scu":3.89},
  {"name":"Tin","type":"ore","rarity":"común","signatures":{"20%":4195,"40%":8390,"60%":12585,"80%":16780,"100%":20975,"max":25170},"signature_min":4195,"signature_max":25170,"locations":["Aberdeen (Hurston)","Ita (Hurston)","Arial (Hurston)","Euterpe (microTech)","Cellin (Crusader)","Daymar (Crusader)","Magda (Crusader)","Lyria (ArcCorp)","Calliope (microTech)","Wala (microTech)","Pyro I","Pyro II (Monox)"],"value_per_scu":4.23},
  {"name":"Quartz","type":"ore","rarity":"común","signatures":{"20%":4210,"40%":8420,"60%":12630,"80%":16840,"100%":21050,"max":25260},"signature_min":4210,"signature_max":25260,"locations":["Aberdeen (Hurston)","Ita (Hurston)","Arial (Hurston)","Euterpe (microTech)","Cellin (Crusader)","Daymar (Crusader)","Magda (Crusader)","Lyria (ArcCorp)","Calliope (microTech)","Wala (microTech)","Pyro III"],"value_per_scu":4.17},
  {"name":"Corundum","type":"ore","rarity":"común","signatures":{"20%":4225,"40%":8450,"60%":12675,"80%":16900,"100%":21125,"max":25350},"signature_min":4225,"signature_max":25350,"locations":["Aberdeen (Hurston)","Ita (Hurston)","Arial (Hurston)","Euterpe (microTech)","Cellin (Crusader)","Daymar (Crusader)","Magda (Crusader)","Lyria (ArcCorp)","Calliope (microTech)","Wala (microTech)"],"value_per_scu":4.62},
  {"name":"Copper","type":"ore","rarity":"común","signatures":{"20%":4240,"40%":8480,"60%":12720,"80%":16960,"100%":21200,"max":25440},"signature_min":4240,"signature_max":25440,"locations":["Aberdeen (Hurston)","Ita (Hurston)","Arial (Hurston)","Euterpe (microTech)","Cellin (Crusader)","Daymar (Crusader)","Magda (Crusader)","Lyria (ArcCorp)","Calliope (microTech)","Wala (microTech)","Pyro I","Pyro IV"],"value_per_scu":4.27},
  {"name":"Silicon","type":"ore","rarity":"común","signatures":{"20%":4255,"40%":8510,"60%":12765,"80%":17020,"100%":21275,"max":25530},"signature_min":4255,"signature_max":25530,"locations":["Aberdeen (Hurston)","Ita (Hurston)","Arial (Hurston)","Euterpe (microTech)","Cellin (Crusader)","Daymar (Crusader)","Magda (Crusader)","Lyria (ArcCorp)"],"value_per_scu":4.09},
  {"name":"Iron","type":"ore","rarity":"común","signatures":{"20%":4270,"40%":8540,"60%":12810,"80%":17080,"100%":21350,"max":25620},"signature_min":4270,"signature_max":25620,"locations":["Aberdeen (Hurston)","Ita (Hurston)","Arial (Hurston)","Euterpe (microTech)","Cellin (Crusader)","Daymar (Crusader)","Magda (Crusader)","Lyria (ArcCorp)","Calliope (microTech)","Wala (microTech)","Pyro I","Pyro II (Monox)"],"value_per_scu":4.05},
  {"name":"Aluminum","type":"ore","rarity":"común","signatures":{"20%":4285,"40%":8570,"60%":12855,"80%":17140,"100%":21425,"max":25710},"signature_min":4285,"signature_max":25710,"locations":["Aberdeen (Hurston)","Ita (Hurston)","Arial (Hurston)","Euterpe (microTech)","Cellin (Crusader)","Daymar (Crusader)","Magda (Crusader)","Lyria (ArcCorp)","Calliope (microTech)","Wala (microTech)"],"value_per_scu":4.30},
  {"name":"Ice","type":"ore","rarity":"común","signatures":{"20%":4300,"40%":8600,"60%":12900,"80%":17200,"100%":21500,"max":25800},"signature_min":4300,"signature_max":25800,"locations":["Aberdeen (Hurston)","Ita (Hurston)","Arial (Hurston)","Euterpe (microTech)","Cellin (Crusader)","Daymar (Crusader)","Magda (Crusader)","Lyria (ArcCorp)","Calliope (microTech)","Wala (microTech)"],"value_per_scu":3.29}
];

// Extract unique systems from locations
function getMineralSystems(minerals) {
    const systemsSet = new Set();
    minerals.forEach(m => {
        m.locations.forEach(loc => {
            const match = loc.match(/\(([^)]+)\)/);
            if (match) systemsSet.add(match[1]);
        });
    });
    return [...systemsSet].sort();
}

// Get display systems for a mineral (unique, comma-separated)
function getMineralSystemList(mineral) {
    const systems = new Set();
    mineral.locations.forEach(loc => {
        const match = loc.match(/\(([^)]+)\)/);
        if (match) systems.add(match[1]);
    });
    return [...systems].sort().join(', ');
}

// Get rarity display label and badge HTML
function getRarityLabel(rarity) {
    const labels = {
        'común': currentLang === 'es' ? 'Común' : 'Common',
        'raro': currentLang === 'es' ? 'Raro' : 'Rare',
        'épico': currentLang === 'es' ? 'Épico' : 'Epic',
        'legendario': currentLang === 'es' ? 'Legendario' : 'Legendary'
    };
    return labels[rarity] || rarity;
}

function getRarityBadge(rarity) {
    const label = getRarityLabel(rarity);
    const cls = rarity === 'legendario' ? 'legendario' : rarity === 'épico' ? 'épico' : rarity === 'raro' ? 'raro' : 'común';
    return `<span class="badge-rarity ${cls}">${label}</span>`;
}

let mineralsCache = null;
let mineralsFiltered = [];
let mineralsPage = 1;
let mineralsSort = { key: 'name', asc: true };
const MINERALS_PER_PAGE = 25;

async function loadMinerals() {
    const tbody = document.getElementById('minerals-tbody');
    if (!mineralsCache) {
        showSkeleton('minerals-tbody', 5, 6);
        try {
            const res = await fetch('/data/minerals.json');
            if (res.ok) {
                const data = await res.json();
                mineralsCache = data.data || data;
            } else {
                throw new Error('HTTP ' + res.status);
            }
        } catch(e) {
            console.warn('Static load failed for minerals, trying API:', e);
            const data = await apiFetch('/minerals');
            if (data && data.data) {
                mineralsCache = data.data;
            } else if (Array.isArray(data)) {
                mineralsCache = data;
            } else {
                // Ultimate fallback: static data
                console.warn('Using static minerals fallback');
                mineralsCache = [...MINERALS_STATIC_DATA];
            }
        }
        // Update badge
        const badge = document.getElementById('badge-minerals');
        if (badge) badge.textContent = mineralsCache.length;
    }
    mineralsFiltered = [...mineralsCache];
    populateMineralsFilters();
    applyMineralsFilters();
    applyMineralsSort();
    renderMineralsPage(1);
    setupMineralsFilters();
}

function populateMineralsFilters() {
    const raritySel = document.getElementById('filter-rarity');
    if (raritySel && raritySel.options.length <= 1) {
        const rarities = ['común', 'raro', 'épico', 'legendario'];
        rarities.forEach(r => {
            const o = document.createElement('option');
            o.value = r;
            o.textContent = getRarityLabel(r);
            raritySel.appendChild(o);
        });
    }
    const systemSel = document.getElementById('filter-system');
    if (systemSel && systemSel.options.length <= 1) {
        const systems = getMineralSystems(mineralsCache);
        systems.forEach(s => {
            const o = document.createElement('option');
            o.value = s;
            o.textContent = s;
            systemSel.appendChild(o);
        });
    }
}

function applyMineralsFilters() {
    const search = (document.getElementById('minerals-search').value || '').toLowerCase();
    const rarity = document.getElementById('filter-rarity').value;
    const system = document.getElementById('filter-system').value;

    mineralsFiltered = (mineralsCache || []).filter(m => {
        if (search && !m.name.toLowerCase().includes(search)) return false;
        if (rarity && m.rarity !== rarity) return false;
        if (system) {
            const hasSystem = m.locations.some(loc => {
                const match = loc.match(/\(([^)]+)\)/);
                return match && match[1] === system;
            });
            if (!hasSystem) return false;
        }
        return true;
    });
    document.getElementById('minerals-count').textContent = mineralsFiltered.length;
}

function applyMineralsSort() {
    const { key, asc } = mineralsSort;
    if (!key) return;
    mineralsFiltered.sort((a, b) => {
        let va, vb;
        switch (key) {
            case 'name': va = a.name || ''; vb = b.name || ''; break;
            case 'rarity': {
                const order = { 'común': 0, 'raro': 1, 'épico': 2, 'legendario': 3 };
                va = order[a.rarity] || 0;
                vb = order[b.rarity] || 0;
                break;
            }
            case 'sig_min': va = a.signature_min || 0; vb = b.signature_min || 0; break;
            case 'sig_max': va = a.signature_max || 0; vb = b.signature_max || 0; break;
            case 'value': va = a.value_per_scu || 0; vb = b.value_per_scu || 0; break;
            case 'locations': {
                const systemsA = new Set();
                a.locations.forEach(l => { const m = l.match(/\(([^)]+)\)/); if (m) systemsA.add(m[1]); });
                const systemsB = new Set();
                b.locations.forEach(l => { const m = l.match(/\(([^)]+)\)/); if (m) systemsB.add(m[1]); });
                va = [...systemsA].sort().join(', ');
                vb = [...systemsB].sort().join(', ');
                break;
            }
            default: return 0;
        }
        if (typeof va === 'string') return asc ? va.localeCompare(vb) : vb.localeCompare(va);
        return asc ? va - vb : vb - va;
    });
}

function renderMineralsPage(page) {
    mineralsPage = page;
    const tbody = document.getElementById('minerals-tbody');
    const total = mineralsFiltered.length;
    const pages = Math.ceil(total / MINERALS_PER_PAGE) || 1;
    const start = (page - 1) * MINERALS_PER_PAGE;
    const pageItems = mineralsFiltered.slice(start, start + MINERALS_PER_PAGE);
    if (total === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="loading-row">Sin resultados</td></tr>';
        document.getElementById('minerals-pagination').innerHTML = '';
        return;
    }
    tbody.innerHTML = pageItems.map(m => {
        const sigMin = m.signature_min.toLocaleString();
        const sigMax = m.signature_max.toLocaleString();
        const systems = getMineralSystemList(m);
        const valueStr = m.value_per_scu.toFixed(2);
        return `<tr onclick="openMineralDetail('${m.name.replace(/'/g, "\\'")}')">
            <td style="font-weight:600">${m.name}</td>
            <td>${getRarityBadge(m.rarity)}</td>
            <td style="color:var(--text-secondary)">${sigMin}</td>
            <td style="color:var(--text-secondary)">${sigMax}</td>
            <td style="color:var(--accent);font-weight:500">${valueStr}</td>
            <td style="font-size:12px;color:var(--text-secondary)">${systems}</td>
        </tr>`;
    }).join('');
    renderPagination('minerals-pagination', page, pages, renderMineralsPage);
    updateSortIndicators('minerals-table', mineralsSort.key, mineralsSort.asc);
}

function setupMineralsFilters() {
    if (window._mineralsFiltersReady) return;
    window._mineralsFiltersReady = true;
    ['minerals-search', 'filter-rarity', 'filter-system'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('input', function() { applyMineralsFilters(); applyMineralsSort(); renderMineralsPage(1); });
        el.addEventListener('change', function() { applyMineralsFilters(); applyMineralsSort(); renderMineralsPage(1); });
    });
    document.getElementById('minerals-reset').addEventListener('click', function() {
        document.getElementById('minerals-search').value = '';
        document.getElementById('filter-rarity').value = '';
        document.getElementById('filter-system').value = '';
        applyMineralsFilters(); applyMineralsSort(); renderMineralsPage(1);
    });
    document.querySelectorAll('#minerals-table th.sortable').forEach(th => {
        th.addEventListener('click', function() {
            const key = this.dataset.sort;
            if (mineralsSort.key === key) mineralsSort.asc = !mineralsSort.asc;
            else { mineralsSort.key = key; mineralsSort.asc = true; }
            applyMineralsSort(); renderMineralsPage(1);
        });
    });
}

// ─── MINERAL DETAIL (uses unified modal) ───

function openMineralDetail(name) {
    const m = (mineralsCache || MINERALS_STATIC_DATA).find(x => x.name === name);
    if (!m) return;

    const systems = getMineralSystemList(m);
    const sigFields = Object.entries(m.signatures).map(([pct, val]) => ({
        label: pct,
        value: val.toLocaleString()
    }));

    const fields = [
        { label: 'Tipo', value: m.type === 'ore' ? (currentLang === 'es' ? 'Mena' : 'Ore') : m.type },
        { label: 'Rareza', value: getRarityLabel(m.rarity) },
        { label: 'Firma Mín', value: m.signature_min.toLocaleString() },
        { label: 'Firma Máx', value: m.signature_max.toLocaleString() },
        { label: 'Valor/SCU', value: m.value_per_scu.toFixed(2) + ' aUEC' },
        { label: 'Sistemas', value: systems, fullWidth: true },
    ];

    const sections = [
        {
            title: '📍 Locaciones',
            items: m.locations.map(loc => ({ label: '', value: loc }))
        },
        {
            title: '📊 Firmas por porcentaje',
            items: sigFields
        }
    ];

    const colorHex = m.rarity === 'legendario' ? '#ffa726' : m.rarity === 'épico' ? '#ab47bc' : m.rarity === 'raro' ? '#64b5f6' : '#bdbdbd';
    const footer = `<span style="color:${colorHex};font-weight:700">◆ ${getRarityLabel(m.rarity)}</span> · ${m.name}`;

    showDetailModal({
        icon: '💎',
        title: m.name,
        fields: fields,
        sections: sections,
        footer: footer
    });
}

// ═══════════════════════════════════════════
// POLISH — cross-links, tooltips, keyboard nav, responsive, skeletons, badges
// ═══════════════════════════════════════════

// ─── Cross-links ───
// We enhance the mission detail modal with faction/scope links via showDetailModal overrides
const _origShowDetail = showDetailModal;
showDetailModal = function(config) {
    const overlay = _origShowDetail(config);
    // Add faction link if this is a mission modal
    if (config.icon === '📋') {
        const body = overlay.querySelector('.modal-body');
        if (body) {
            const fname = body.querySelector('.detail-item:first-child .di-value')?.textContent?.trim();
            if (fname && fname !== '—') {
                const factionDiv = body.querySelector('.detail-item:first-child .di-value');
                if (factionDiv) {
                    factionDiv.innerHTML = `<span class="mini-card" onclick="navigateTo('factions');closeModal(overlay);return false">${fname}</span>`;
                }
            }
        }
    }
    // ═══ PYRO CYBER: Inject modal glitch overlay ═══
    if (currentTheme === 'pyro') {
        const bodyEl = overlay.querySelector('.modal-body');
        if (bodyEl) {
            const glitchDiv = document.createElement('div');
            glitchDiv.className = 'modal__glitch';
            glitchDiv.setAttribute('aria-hidden', 'true');
            const titleEl = overlay.querySelector('h3');
            if (titleEl) {
                const h2Clone = document.createElement('h2');
                h2Clone.innerHTML = titleEl.innerHTML;
                glitchDiv.appendChild(h2Clone);
            }
            const textEl = overlay.querySelector('.body__text');
            if (textEl) {
                const textClone = document.createElement('div');
                textClone.className = 'body__text';
                textClone.innerHTML = textEl.innerHTML;
                glitchDiv.appendChild(textClone);
            }
            bodyEl.appendChild(glitchDiv);
        }
        const glitchId = initModalGlitch(overlay);
        if (glitchId) {
            overlay.dataset.glitchId = glitchId;
        }
        const closeBtn = overlay.querySelector('.modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', function() {
                stopModalGlitch(overlay.dataset.glitchId);
            });
        }
    }
    return overlay;
};

// ─── Tooltips on table rows ───
document.addEventListener('mouseover', (e) => {
    const tr = e.target.closest('.data-table tbody tr');
    if (tr && tr.cells.length > 1) {
        const firstCell = tr.cells[0]?.textContent?.trim();
        if (firstCell && !tr.hasAttribute('data-tip')) {
            tr.setAttribute('data-tip', firstCell);
            tr.style.position = 'relative';
        }
    }
});
const tooltipStyle = document.createElement('style');
tooltipStyle.textContent = `
    .data-table tbody tr { cursor: pointer; position: relative; }
    .data-table tbody tr:hover::after {
        content: attr(data-tip);
        position: absolute;
        left: 100%;
        top: 50%;
        transform: translateY(-50%);
        background: var(--accent-dim);
        color: var(--accent);
        padding: 4px 10px;
        border-radius: 6px;
        font-size: 11px;
        white-space: nowrap;
        z-index: 10;
        margin-left: 8px;
        border: 1px solid var(--accent);
        pointer-events: none;
    }
    @media (max-width: 768px) {
        .data-table tbody tr:hover::after { display: none; }
    }
`;
document.head.appendChild(tooltipStyle);

// ─── Responsive sidebar close ───
(function enhanceMobile() {
    const sidebar = document.getElementById('sidebar');
    const main = document.getElementById('main');
    main.addEventListener('click', (e) => {
        if (e.target.closest && e.target.closest('#menu-toggle')) return;
        if (window.innerWidth <= 768 && sidebar.classList.contains('open')) sidebar.classList.remove('open');
    });
    const tables = document.querySelectorAll('.table-container');
    tables.forEach(t => {
        t.style.overflowX = 'auto';
        t.style.WebkitOverflowScrolling = 'touch';
    });
})();

// ─── Loading skeletons (P4-T2) ───
function showSkeleton(containerId, rows = 5, cols = 4) {
    const container = document.getElementById(containerId);
    if (!container) return;
    // Fade out existing content
    container.style.transition = 'opacity 0.15s ease';
    container.style.opacity = '1';
    let html = '';
    for (let r = 0; r < rows; r++) {
        html += '<tr class="skeleton-row">';
        for (let c = 0; c < cols; c++) {
            const w = 25 + Math.random() * 50;
            // Alternate widths for more natural look
            const width = c === 0 ? Math.max(w, 50) : w;
            html += `<td><div class="skeleton-cell" style="width:${width}%"></div></td>`;
        }
        html += '</tr>';
    }
    container.innerHTML = html;
}

// Skeleton CSS is injected via the stylesheet (see style.css for main definitions)
const skeletonStyle = document.createElement('style');
skeletonStyle.textContent = `
@keyframes shimmer {
    0% { background-position: -200px 0; }
    100% { background-position: calc(200px + 100%) 0; }
}
@keyframes pulse { 0%,100% { opacity: 0.25; } 50% { opacity: 0.55; } }
.skeleton-cell {
    height: 14px;
    border-radius: 4px;
    background: linear-gradient(90deg, var(--bg-hover) 25%, var(--border) 50%, var(--bg-hover) 75%);
    background-size: 200px 100%;
    animation: shimmer 2s infinite ease-in-out, pulse 2s infinite ease-in-out;
}
.skeleton-row {
    pointer-events: none;
}
.skeleton-row td {
    border-bottom-color: transparent !important;
}
`;
document.head.appendChild(skeletonStyle);

// ─── Connection status ───
setInterval(() => {
    const statusEl = document.getElementById('status-text');
    if (!statusEl) return;
    if (state.stats) {
        statusEl.textContent = 'Conectado';
        document.getElementById('status-indicator').className = 'status-dot online';
    } else {
        statusEl.textContent = 'Reconectando...';
        document.getElementById('status-indicator').className = 'status-dot';
    }
}, 10000);

// ─── Badge auto-update ───
setInterval(async () => {
    if (state.currentPage === 'dashboard') {
        let stats = await loadJSON('/data/stats.json');
        if (!stats) stats = await apiFetch('/stats');
        if (stats) {
            state.stats = stats;
            // Solo actualizar badges de secciones precargadas
            ['missions','blueprints','weapons'].forEach(k => {
                const el = document.getElementById('badge-' + k);
                if (el) el.textContent = stats['total_' + k] || 0;
            });
            // Badges lazy se mantienen como '…' hasta que se cargue la sección
        }
    }
}, 60000);


// ═══════════════════════════════════════════
// ═══ PYRO CYBER: Modal Glitch Animation System ═══
// ═══════════════════════════════════════════

let _glitchTimers = new Map();

function initModalGlitch(modalEl) {
    if (!modalEl || currentTheme !== 'pyro') return;
    const glitchEl = modalEl.querySelector('.modal__glitch');
    if (!glitchEl) return;
    const id = 'modal_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    let glitched = false;

    function kickOff() {
        const delay = !glitched ? 1500 : Math.random() * 10000 + 2000;
        const timer = setTimeout(() => {
            glitchEl.classList.add('animating');
            requestAnimationFrame(async () => {
                const anims = glitchEl.getAnimations();
                if (anims.length) {
                    await Promise.allSettled(anims.map(a => a.finished));
                }
                glitched = true;
                glitchEl.classList.remove('animating');
                kickOff();
            });
        }, delay);
        _glitchTimers.set(id, timer);
    }

    kickOff();
    return id;
}

function stopModalGlitch(id) {
    if (id && _glitchTimers.has(id)) {
        clearTimeout(_glitchTimers.get(id));
        _glitchTimers.delete(id);
    }
}



// Apply cyber-btn class to theme-toggle on load if coming from pyro
if (currentTheme === 'pyro') {
    const btn = document.getElementById('theme-toggle');
    if (btn) btn.classList.add('cyber-btn');
}

// ═══════════════════════════════════════════
// ═══ SUPPORTER SYSTEM (Ko-fi desbloqueo Pyro) ═══
// ═══════════════════════════════════════════

async function checkSupporter(email) {
    try {
        const res = await fetch(`/api/check-supporter?email=${encodeURIComponent(email)}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (e) {
        console.error('Error checking supporter:', e);
        return { supporter: false, error: 'Error de conexión' };
    }
}

function setupSupporterUI() {
    const verifyBtn = document.getElementById('supporter-verify-btn');
    const emailInput = document.getElementById('supporter-email');
    const statusEl = document.getElementById('supporter-status');

    if (!verifyBtn || !emailInput) return;

    // Si ya es supporter, ocultar la sección de input
    if (localStorage.getItem('sc_supporter') === 'true') {
        document.getElementById('supporter-section').classList.add('supporter-unlocked');
        if (statusEl) {
            statusEl.innerHTML = '<span class="supporter-msg supporter-msg-success">✅ ¡Eres supporter! Tema Pyro desbloqueado 🔥</span>';
            statusEl.style.display = 'block';
        }
        return;
    }

    verifyBtn.addEventListener('click', async () => {
        const email = emailInput.value.trim();
        if (!email || !email.includes('@')) {
            if (statusEl) {
                statusEl.innerHTML = '<span class="supporter-msg supporter-msg-error">⚠️ Ingresa un email válido</span>';
                statusEl.style.display = 'block';
            }
            return;
        }

        verifyBtn.disabled = true;
        verifyBtn.textContent = 'Verificando...';

        if (statusEl) {
            statusEl.innerHTML = '<span class="supporter-msg">⏳ Verificando...</span>';
            statusEl.style.display = 'block';
        }

        const result = await checkSupporter(email);

        if (result.supporter) {
            localStorage.setItem('sc_supporter', 'true');
            document.getElementById('supporter-section').classList.add('supporter-unlocked');
            if (statusEl) {
                statusEl.innerHTML = '<span class="supporter-msg supporter-msg-success">🎉 ¡Email verificado! Tema Pyro desbloqueado 🔥</span>';
            }
            // Cambiar a tema Pyro automáticamente
            if (currentTheme !== 'pyro') {
                toggleTheme();
            }
        } else {
            if (statusEl) {
                const msg = result.error
                    ? `<span class="supporter-msg supporter-msg-error">❌ Error: ${result.error}</span>`
                    : '<span class="supporter-msg supporter-msg-error">❌ Email no registrado como supporter. ¿Donaste en <a href="https://ko-fi.com/tubsdep" target="_blank" rel="noopener noreferrer" style="color:var(--accent);text-decoration:underline">Ko-fi</a>?</span>';
                statusEl.innerHTML = msg;
            }
        }

        verifyBtn.disabled = false;
        verifyBtn.textContent = 'Verificar';
    });

    // Permitir verificar con Enter
    emailInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') verifyBtn.click();
    });
}

console.log('✅ SC Database v2.2 — Lazy loading por sección');
