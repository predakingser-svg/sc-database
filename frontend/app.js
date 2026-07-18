/* ═══════════════════════════════════════════
   Star Citizen Database — App Logic
   ═══════════════════════════════════════════ */

// Auto-detect API base: Serveo tunnel = same origin, otherwise use tunnel URL
const API = (window.location.hostname.includes('serveo') || window.location.port === '8080')
    ? ''
    : 'https://sc-database.serveousercontent.com';

// ─── Global state translations ───
let currentLang = localStorage.getItem('sc_lang') || 'es';
let fullTranslations = {};
let contractorTranslations = {};

// ─── Global functions ───
function toggleLang() {
    currentLang = currentLang === 'es' ? 'en' : 'es';
    localStorage.setItem('sc_lang', currentLang);
    const btn = document.getElementById('langBtn');
    if (btn) btn.textContent = currentLang === 'es' ? '🇪🇸' : '🇬🇧';
    if (typeof currentPage !== 'undefined' && currentPage) {
        if (currentLang === 'es') {
            // Reload to restore Spanish
            navigateTo(currentPage);
        } else {
            // Apply English strings to current DOM
            applyLang();
        }
    }
}

function openFeedback() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = '<div class="modal" style="max-width:400px"><div class="modal-header"><h3>💬 Feedback</h3><button class="modal-close" onclick="this.closest(\'.modal-overlay\').remove()">✕</button></div><div class="modal-body"><p style="margin-bottom:16px">Reporta bugs o sugiere mejoras:</p><a href="https://github.com/predakingser-svg/sc-database/issues" target="_blank" class="btn" style="display:block;text-align:center;margin-bottom:10px">🐛 GitHub Issues</a><a href="mailto:predakingser@gmail.com" class="btn" style="display:block;text-align:center">📧 predakingser@gmail.com</a></div></div>';
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
}

// ─── Full string map ES→EN ───
const _stringMap = {
    'Dashboard': 'Dashboard', 'Misiones': 'Missions', 'Planos': 'Blueprints',
    'Armas': 'Weapons', 'Wikelo': 'Wikelo', 'Facciones': 'Factions',
    'Items': 'Items', 'Componentes': 'Components',
    'Misiones con blueprints': 'Missions with blueprints',
    'Misiones ilegales': 'Illegal missions',
    'Ver todos los blueprints': 'View all blueprints',
    'Armas Size 6': 'Weapons Size 6', 'Naves Wikelo': 'Wikelo Ships',
    'Componentes de nave': 'Ship Components',
    'Título': 'Title', 'Facción': 'Faction', 'Recompensa': 'Reward',
    'Sistema': 'System', 'Categoría': 'Category',
    'Nombre': 'Name', 'Tipo': 'Type', 'Tamaño': 'Size', 'Precio': 'Price',
    'Producción': 'Output', 'Ingredientes': 'Ingredients', 'Tiempo': 'Time',
    'DPS': 'DPS', 'Alcance': 'Range', 'Grado': 'Grade',
    'Filtrar': 'Filter', 'Buscar': 'Search', 'Todas': 'All',
    'Legales': 'Legal', 'Ilegales': 'Illegal',
    'Cargando...': 'Loading...', 'Error': 'Error',
    'Sin datos': 'No data', 'Sin resultados': 'No results',
    'Conectando...': 'Connecting...',
    'Legal': 'Legal', 'Ilegal': 'Illegal',
    'Común': 'Common', 'Raro': 'Rare', 'Épico': 'Epic', 'Legendario': 'Legendary',
    'Escudo': 'Shield', 'Planta de poder': 'Power Plant',
    'Motor cuántico': 'Quantum Drive', 'Enfriador': 'Cooler',
    'Radar': 'Radar',
};

function applyLang() {
    if (currentLang === 'es') return;
    const walker = document.createTreeWalker(document.body, 4, null, false);
    let node;
    while (node = walker.nextNode()) {
        for (const [es, en] of Object.entries(_stringMap)) {
            if (node.textContent.includes(es)) {
                node.textContent = node.textContent.replace(new RegExp(es, 'g'), en);
            }
        }
    }
}

// ─── Translation helpers ───
function getMissionTranslation(mission) {
    if (currentLang !== 'es') return null;
    const dn = mission.debug_name || '';
    if (!dn) return null;
    const parts = dn.split('_');
    let contractor = parts[0] || '';
    if (['PU','PU-','Sandbox'].includes(contractor) && parts.length > 1) {
        contractor = parts[1];
    }
    const ct = contractorTranslations[contractor.toLowerCase()];
    if (!ct || !ct.titles || ct.titles.length === 0) return null;
    const type = dn.toLowerCase();
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

// ─── State ───
let state = {
    stats: null,
    missionsData: [],
    blueprintsData: [],
    currentPage: 'dashboard'
};

// ─── DOM refs ───
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

// ─── Init ───
document.addEventListener('DOMContentLoaded', () => {
    loadStats();
    setupNavigation();
    setupSearch();
    setupMenuToggle();
    setupQuickLinks();
    updateBadges();
});

// ─── API helper ───
async function apiFetch(path) {
    try {
        const res = await fetch(`${API}${path}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (e) {
        console.error(`API error: ${path}`, e);
        return null;
    }
}

// ─── Load Dashboard Stats ───
async function loadStats() {
    setStatus('checking', 'Consultando...');
    const stats = await apiFetch('/stats');
    if (!stats) {
        setStatus('offline', 'API no disponible');
        document.getElementById('stats-grid').innerHTML = '<div class="stat-card" style="grid-column:1/-1;color:var(--danger);padding:40px">❌ No se pudo conectar con la API.<br>Ejecuta primero la API Flask en localhost:5000</div>';
        return;
    }

    state.stats = stats;
    setStatus('online', 'Conectado');

    // Stats cards
    const grid = document.getElementById('stats-grid');
    const cards = [
        { val: stats.total_missions, label: 'Misiones' },
        { val: stats.total_blueprints, label: 'Blueprints' },
        { val: stats.total_weapons, label: 'Armas' },
        { val: stats.total_items, label: 'Items' },
        { val: stats.missions_with_blueprints, label: 'Misiones c/BP' },
    ];

    grid.innerHTML = cards.map(c => `
        <div class="stat-card">
            <div class="stat-value">${c.val.toLocaleString()}</div>
            <div class="stat-label">${c.label}</div>
        </div>
    `).join('');

    // Charts
    renderCategoryChart(stats.missions_by_category);
    renderSystemChart(stats.missions_by_system);
    renderBlueprintChart();
    renderUpdateInfo(stats.data_version);

    // Update badges
    document.getElementById('badge-missions').textContent = stats.total_missions;
    document.getElementById('badge-blueprints').textContent = stats.total_blueprints;
    document.getElementById('badge-weapons').textContent = stats.total_weapons;
    document.getElementById('badge-items').textContent = stats.total_items;
}

// ─── Charts ───

function renderCategoryChart(categories) {
    const container = document.getElementById('chart-categories');
    if (!categories) { container.innerHTML = '<div class="loading-sm">Sin datos</div>'; return; }

    const sorted = Object.entries(categories).sort((a,b) => b[1] - a[1]);
    const max = sorted[0][1];

    container.innerHTML = sorted.map(([name, count]) => {
        const pct = (count / max * 100).toFixed(0);
        const cls = 'cat-' + name.replace(/[^a-zA-Z0-9]/g, '_');
        return `
            <div class="chart-bar-group ${cls}">
                <div class="chart-bar-label">
                    <span class="cbl-name">${name}</span>
                    <span class="cbl-val">${count.toLocaleString()}</span>
                </div>
                <div class="chart-bar-track">
                    <div class="chart-bar-fill" style="width:${pct}%"></div>
                </div>
            </div>
        `;
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
        return `
            <div class="chart-bar-group ${cls}">
                <div class="chart-bar-label">
                    <span class="cbl-name">${name}</span>
                    <span class="cbl-val">${count.toLocaleString()}</span>
                </div>
                <div class="chart-bar-track">
                    <div class="chart-bar-fill" style="width:${pct}%"></div>
                </div>
            </div>
        `;
    }).join('');
}

function renderBlueprintChart() {
    const container = document.getElementById('chart-blueprints');
    container.innerHTML = `
        <div class="chart-bar-group">
            <div class="chart-bar-label">
                <span class="cbl-name">Componentes de nave</span>
                <span class="cbl-val">Power plant, Shield, Cooler, QD, Radar</span>
            </div>
        </div>
        <div class="chart-bar-group">
            <div class="chart-bar-label">
                <span class="cbl-name">Armas de nave</span>
                <span class="cbl-val">Deadbolt, C-788, Tarantula, Singe, NN</span>
            </div>
        </div>
        <div class="chart-bar-group">
            <div class="chart-bar-label">
                <span class="cbl-name">Armas FPS</span>
                <span class="cbl-val">Crossbow, Boomtube, Parallax, Killshot</span>
            </div>
        </div>
        <div class="chart-bar-group">
            <div class="chart-bar-label">
                <span class="cbl-name">Armaduras</span>
                <span class="cbl-val">Testudo, Strata, Geist, Bokto, Monde</span>
            </div>
        </div>
        <div class="chart-bar-group">
            <div class="chart-bar-label">
                <span class="cbl-name">Naves / Vehículos</span>
                <span class="cbl-val">22 naves Wikelo + eventos</span>
            </div>
        </div>
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

// ─── Navigation ───

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
    $$('.page').forEach(p => p.classList.toggle('active', p.id === 'page-' + page));

    if (page === 'missions') loadMissions(filter);
    if (page === 'blueprints') loadBlueprints(filter);
    if (page === 'weapons') loadWeapons(filter);
    if (page === 'wikelo') loadWikelo(filter);
    if (page === 'components') loadComponents();
    if (page === 'minerals') renderMinerals();
    if (page === 'translations') renderTranslations();
    if (page === 'changelog') renderChangelog();

    // Close sidebar on mobile
    document.getElementById('sidebar').classList.remove('open');
}

function setupQuickLinks() {
    $$('.quick-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.dataset.page;
            const filter = link.dataset.filter;
            navigateTo(page, filter);
        });
    });
}

function setupMenuToggle() {
    document.getElementById('menu-toggle').addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('open');
    });
}

// ─── Status Indicator ───

function setStatus(state, text) {
    const dot = document.getElementById('status-indicator');
    const txt = document.getElementById('status-text');
    dot.className = 'status-dot';
    if (state === 'online') dot.classList.add('online');
    if (state === 'offline') dot.style.background = 'var(--danger)';
    txt.textContent = text;
}

// ─── Search ───

function setupSearch() {
    const input = document.getElementById('search-input');
    const dropdown = document.getElementById('search-results');
    let timeout;

    input.addEventListener('input', () => {
        clearTimeout(timeout);
        const q = input.value.trim();
        if (q.length < 2) { dropdown.classList.remove('visible'); return; }

        timeout = setTimeout(async () => {
            const results = await apiFetch(`/search?q=${encodeURIComponent(q)}`);
            if (!results) return;
            renderSearchResults(results, dropdown);
        }, 400);
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-container')) {
            dropdown.classList.remove('visible');
        }
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') dropdown.classList.remove('visible');
    });
}

function renderSearchResults(results, dropdown) {
    let html = '';
    let count = 0;

    if (results.missions?.length) {
        html += `<div style="padding:8px 14px;font-size:11px;color:var(--accent);text-transform:uppercase;letter-spacing:1px">Misiones</div>`;
        results.missions.slice(0, 4).forEach(m => {
            html += `<div class="search-result-item" onclick="navigateTo('missions')">
                <div class="sr-title">🎯 ${getMissionTranslation(m) || m.title}</div>
                <div class="sr-meta">${m.faction || '?'} · ${m.reward?.toLocaleString() || '?'} aUEC</div>
            </div>`;
            count++;
        });
    }

    if (results.blueprints?.length) {
        html += `<div style="padding:8px 14px;font-size:11px;color:var(--accent);text-transform:uppercase;letter-spacing:1px">Blueprints</div>`;
        results.blueprints.slice(0, 4).forEach(b => {
            html += `<div class="search-result-item" onclick="navigateTo('blueprints')">
                <div class="sr-title">🔧 ${b.output}</div>
                <div class="sr-meta">${b.ingredients} ingredientes · ${b.time}</div>
            </div>`;
            count++;
        });
    }

    if (results.weapons?.length) {
        html += `<div style="padding:8px 14px;font-size:11px;color:var(--accent);text-transform:uppercase;letter-spacing:1px">Armas</div>`;
        results.weapons.slice(0, 4).forEach(w => {
            html += `<div class="search-result-item" onclick="navigateTo('weapons')">
                <div class="sr-title">🔫 ${w.name}</div>
                <div class="sr-meta">Size ${w.size || '?'} · ${w.type || '?'}</div>
            </div>`;
            count++;
        });
    }

    if (results.items?.length) {
        html += `<div style="padding:8px 14px;font-size:11px;color:var(--accent);text-transform:uppercase;letter-spacing:1px">Items</div>`;
        results.items.slice(0, 4).forEach(i => {
            html += `<div class="search-result-item">
                <div class="sr-title">📦 ${i.name}</div>
            </div>`;
            count++;
        });
    }

    if (count === 0) {
        html = '<div class="search-result-item" style="color:var(--text-muted)">Sin resultados</div>';
    }

    dropdown.innerHTML = html;
    dropdown.classList.add('visible');
}

// ─── Badges ───

async function updateBadges() {
    // Already updated in loadStats
}

// ─── MISSIONS PAGE ───

let missionsCache = null;
let missionsFiltered = [];
let missionsPage = 1;
let missionsSort = { key: null, asc: true };
const M_PER_PAGE = 25;

async function loadMissions(filter) {
    const tbody = document.getElementById('missions-tbody');
    const countEl = document.getElementById('missions-count');
    
    if (!missionsCache) {
        tbody.innerHTML = '<tr><td colspan="7" class="loading-row">Cargando misiones...</td></tr>';
        const data = await apiFetch('/missions?per_page=500');
        if (!data) { tbody.innerHTML = '<tr><td colspan="7" class="loading-row" style="color:var(--danger)">Error al cargar</td></tr>'; return; }
        
        // Fetch all pages
        let allMissions = [...data.data];
        for (let p = 2; p <= data.total_pages; p++) {
            const more = await apiFetch(`/missions?per_page=500&page=${p}`);
            if (more) allMissions = allMissions.concat(more.data);
        }
        missionsCache = allMissions;
    }
    
    missionsFiltered = [...missionsCache];
    
    // Apply filter from quick links
    if (filter === 'has_blueprints') {
        document.getElementById('filter-bp').checked = true;
    } else if (filter === 'illegal') {
        document.getElementById('filter-illegal').checked = true;
    }
    
    // Populate filter dropdowns
    populateMissionFilters();
    applyMissionFilters();
    applyMissionSort();
    renderMissionPage(1);
    setupMissionFilters();
}

function populateMissionFilters() {
    if (!missionsCache) return;
    
    // Factions
    const factions = [...new Set(missionsCache.map(m => {
        const f = m.faction;
        return typeof f === 'object' ? f?.name : f || 'Unknown';
    }))].sort();
    
    const sel = document.getElementById('filter-faction');
    if (sel.options.length <= 1) {
        factions.forEach(f => {
            const opt = document.createElement('option');
            opt.value = f; opt.textContent = f;
            sel.appendChild(opt);
        });
    }
    
    // Scopes
    const scopes = [...new Set(missionsCache.map(m => m.reward_scope || 'Unknown'))].sort();
    const scopeSel = document.getElementById('filter-scope');
    if (scopeSel.options.length <= 1) {
        scopes.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s; opt.textContent = s;
            scopeSel.appendChild(opt);
        });
    }
}

function getSystem(m) {
    const sys = m.star_systems;
    if (sys && sys.length > 0) {
        const s = sys[0];
        return typeof s === 'object' ? s.name || '?' : String(s);
    }
    return '?';
}

function getFactionName(m) {
    const f = m.faction;
    if (typeof f === 'object') return f?.name || 'Unknown';
    return f || 'Unknown';
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
            default: return 0;
        }
        
        if (typeof va === 'string') {
            return asc ? va.localeCompare(vb) : vb.localeCompare(va);
        }
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
        tbody.innerHTML = '<tr><td colspan="7" class="loading-row">Sin resultados</td></tr>';
        document.getElementById('missions-pagination').innerHTML = '';
        return;
    }
    
    tbody.innerHTML = pageItems.map(m => {
        const fname = getFactionName(m);
        const sys = getSystem(m);
        const reward = m.reward_min?.toLocaleString() || '—';
        const illegalBadge = m.illegal ? '<span class="badge-illegal">Ilegal</span>' : '<span class="badge-legal">Legal</span>';
        const bpBadge = m.has_blueprints ? '<span class="badge-bp">BP</span>' : '—';
        
        return `<tr onclick="openMissionModal('${m.uuid}')">
            <td>${getMissionTranslation(m) || m.title || '?'}</td>
            <td style="color:var(--text-secondary)">${fname}</td>
            <td>${m.reward_scope || '?'}</td>
            <td>${reward}</td>
            <td>${sys}</td>
            <td>${illegalBadge}</td>
            <td>${bpBadge}</td>
        </tr>`;
    }).join('');
    
    // Pagination
    renderMissionPagination(page, pages);
    
    // Highlight sort
    document.querySelectorAll('#missions-table th').forEach(th => {
        th.classList.remove('sorted', 'asc', 'desc');
        if (th.dataset.sort === missionsSort.key) {
            th.classList.add('sorted', missionsSort.asc ? 'asc' : 'desc');
        }
    });
}

function renderMissionPagination(current, total) {
    const el = document.getElementById('missions-pagination');
    let html = '';
    
    html += `<button class="page-btn" onclick="renderMissionPage(1)" ${current === 1 ? 'disabled' : ''}>«</button>`;
    html += `<button class="page-btn" onclick="renderMissionPage(${current - 1})" ${current === 1 ? 'disabled' : ''}>‹</button>`;
    
    const range = 3;
    const start = Math.max(1, current - range);
    const end = Math.min(total, current + range);
    
    if (start > 1) html += `<button class="page-btn" onclick="renderMissionPage(1)">1</button>`;
    if (start > 2) html += '<span class="page-btn" style="cursor:default">…</span>';
    
    for (let i = start; i <= end; i++) {
        html += `<button class="page-btn ${i === current ? 'active' : ''}" onclick="renderMissionPage(${i})">${i}</button>`;
    }
    
    if (end < total - 1) html += '<span class="page-btn" style="cursor:default">…</span>';
    if (end < total) html += `<button class="page-btn" onclick="renderMissionPage(${total})">${total}</button>`;
    
    html += `<button class="page-btn" onclick="renderMissionPage(${current + 1})" ${current === total ? 'disabled' : ''}>›</button>`;
    html += `<button class="page-btn" onclick="renderMissionPage(${total})" ${current === total ? 'disabled' : ''}>»</button>`;
    
    el.innerHTML = html;
}

function setupMissionFilters() {
    // Already setup once
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
    
    // Sort on header click
    document.querySelectorAll('#missions-table th.sortable').forEach(th => {
        th.addEventListener('click', () => {
            const key = th.dataset.sort;
            if (missionsSort.key === key) {
                missionsSort.asc = !missionsSort.asc;
            } else {
                missionsSort.key = key;
                missionsSort.asc = true;
            }
            applyMissionSort();
            renderMissionPage(1);
        });
    });
}

// ─── MISSION DETAIL MODAL ───

async function openMissionModal(uuid) {
    const data = await apiFetch(`/missions/${uuid}`);
    if (!data) return;
    
    const m = data;
    const fname = getFactionName(m);
    const sys = getSystem(m);
    
    const html = `
        <button class="modal-close" onclick="closeMissionModal()">✕</button>
        <h2 style="margin-bottom:20px">${getMissionTranslation(m) || m.title || '?'}</h2>
        <div class="detail-grid">
            <div class="detail-item">
                <div class="di-label">Facción</div>
                <div class="di-value">${fname}</div>
            </div>
            <div class="detail-item">
                <div class="di-label">Categoría</div>
                <div class="di-value">${m.reward_scope || '?'}</div>
            </div>
            <div class="detail-item">
                <div class="di-label">Sistema</div>
                <div class="di-value">${sys}</div>
            </div>
            <div class="detail-item">
                <div class="di-label">Recompensa</div>
                <div class="di-value">${m.reward_min?.toLocaleString() || '?'} ${m.reward_currency || 'UEC'}</div>
            </div>
            <div class="detail-item">
                <div class="di-label">Legalidad</div>
                <div class="di-value">${m.illegal ? '<span class="badge-illegal">Ilegal</span>' : '<span class="badge-legal">Legal</span>'}</div>
            </div>
            <div class="detail-item">
                <div class="di-label">Blueprints</div>
                <div class="di-value">${m.has_blueprints ? '<span class="badge-bp">✅ Da blueprints</span>' : '❌ No'}</div>
            </div>
            <div class="detail-item">
                <div class="di-label">Reputación</div>
                <div class="di-value">${m.reputation_amount || 0} XP</div>
            </div>
            <div class="detail-item">
                <div class="di-label">Combate</div>
                <div class="di-value">${m.has_combat ? 'Sí' : 'No'}</div>
            </div>
            <div class="detail-item">
                <div class="di-label">Jugadores</div>
                <div class="di-value">${m.max_players_per_instance || 1} max</div>
            </div>
            <div class="detail-item">
                <div class="di-label">Cooldown</div>
                <div class="di-value">${m.cooldown_label || '—'}</div>
            </div>
            <div class="detail-item" style="grid-column:1/-1">
                <div class="di-label">Rank</div>
                <div class="di-value">${m.rank_index !== null && m.rank_index !== undefined ? 'Nivel ' + m.rank_index : '—'}</div>
            </div>
        </div>
        ${m.description ? `<div style="margin-top:15px;padding:12px;background:var(--bg-primary);border-radius:8px;color:var(--text-secondary);font-size:13px;line-height:1.5">${m.description}</div>` : ''}
        <div style="margin-top:15px;font-size:11px;color:var(--text-muted)">UUID: ${m.uuid} · v${m.game_version || '?'}</div>
    `;
    
    document.getElementById('mission-modal-content').innerHTML = html;
    document.getElementById('mission-modal').classList.remove('hidden');
}

function closeMissionModal() {
    document.getElementById('mission-modal').classList.add('hidden');
}

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMissionModal();
});

// ─── CLOSE MODAL ON CLICK OUTSIDE ───

document.addEventListener('click', (e) => {
    if (e.target.closest('.modal-backdrop')) {
        closeMissionModal();
        closeBpModal();
    }
});


// ═══════════════════════════════════════════
// BLUEPRINTS PAGE
// ═══════════════════════════════════════════

let bpCache = null;
let bpFiltered = [];
let bpPage = 1;
let bpSort = { key: null, asc: true };
const BP_PER_PAGE = 25;

async function loadComponents() {
    setStatus('loading', 'Cargando componentes...');
    try {
        const d = await apiFetch('/components');
        window._compsCache = d.data || [];
        document.getElementById('components-count').textContent = d.total;
        renderComponentsPage();
        setStatus('ready', '');
    } catch(e) {
        setStatus('error', 'Error al cargar componentes');
        document.getElementById('comps-tbody').innerHTML = '<tr><td colspan="4" class="loading-row">Error al cargar</td></tr>';
    }
}

async function loadBlueprints(filter) {
    const tbody = document.getElementById('blueprints-tbody');
    
    if (!bpCache) {
        tbody.innerHTML = '<tr><td colspan="4" class="loading-row">Cargando blueprints...</td></tr>';
        const data = await apiFetch('/blueprints?per_page=500');
        if (!data) { tbody.innerHTML = '<tr><td colspan="4" class="loading-row" style="color:var(--danger)">Error al cargar</td></tr>'; return; }
        
        let allBp = [...data.data];
        for (let p = 2; p <= data.total_pages; p++) {
            const more = await apiFetch(`/blueprints?per_page=500&page=${p}`);
            if (more) allBp = allBp.concat(more.data);
        }
        bpCache = allBp;
    }
    
    bpFiltered = [...bpCache];
    applyBpFilters();
    applyBpSort();
    renderBpPage(1);
    setupBpFilters();
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
        tbody.innerHTML = '<tr><td colspan="4" class="loading-row">Sin resultados</td></tr>';
        document.getElementById('blueprints-pagination').innerHTML = '';
        return;
    }
    
    tbody.innerHTML = pageItems.map(b => {
        const timeStr = b.craft_time_label || formatSeconds(b.craft_time_seconds);
        const missionsCount = b.unlocking_missions_count || 0;
        const missionsBadge = missionsCount > 0 ? `<span class="badge-bp">${missionsCount} mis.</span>` : '<span style="color:var(--text-muted)">—</span>';
        
        return `<tr onclick="openBpModal('${b.uuid}')">
            <td>${b.output_name || '?'}</td>
            <td>${b.ingredient_count || 0}</td>
            <td>${timeStr}</td>
            <td>${missionsBadge}</td>
        </tr>`;
    }).join('');
    
    // Pagination
    renderBpPagination(page, pages);
    
    // Sort indicators
    document.querySelectorAll('#blueprints-table th').forEach(th => {
        th.classList.remove('sorted', 'asc', 'desc');
        if (th.dataset.sort === bpSort.key) {
            th.classList.add('sorted', bpSort.asc ? 'asc' : 'desc');
        }
    });
}

function formatSeconds(sec) {
    if (!sec) return '—';
    if (sec < 60) return sec + 's';
    if (sec < 3600) return Math.round(sec/60) + ' min';
    return (sec/3600).toFixed(1) + ' h';
}

function renderBpPagination(current, total) {
    const el = document.getElementById('blueprints-pagination');
    let html = '';
    html += `<button class="page-btn" onclick="renderBpPage(1)" ${current === 1 ? 'disabled' : ''}>«</button>`;
    html += `<button class="page-btn" onclick="renderBpPage(${current - 1})" ${current === 1 ? 'disabled' : ''}>‹</button>`;
    
    const range = 3;
    const start = Math.max(1, current - range);
    const end = Math.min(total, current + range);
    if (start > 1) html += `<button class="page-btn" onclick="renderBpPage(1)">1</button>`;
    if (start > 2) html += '<span class="page-btn" style="cursor:default">…</span>';
    for (let i = start; i <= end; i++) {
        html += `<button class="page-btn ${i === current ? 'active' : ''}" onclick="renderBpPage(${i})">${i}</button>`;
    }
    if (end < total - 1) html += '<span class="page-btn" style="cursor:default">…</span>';
    if (end < total) html += `<button class="page-btn" onclick="renderBpPage(${total})">${total}</button>`;
    html += `<button class="page-btn" onclick="renderBpPage(${current + 1})" ${current === total ? 'disabled' : ''}>›</button>`;
    html += `<button class="page-btn" onclick="renderBpPage(${total})" ${current === total ? 'disabled' : ''}>»</button>`;
    el.innerHTML = html;
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
            applyBpSort();
            renderBpPage(1);
        });
    });
}

// ─── BP DETAIL MODAL ───

async function openBpModal(uuid) {
    const b = await apiFetch(`/blueprints/${uuid}`);
    if (!b) return;
    
    const timeStr = b.craft_time_label || formatSeconds(b.craft_time_seconds);
    
    let ingredientsHtml = '';
    if (b.ingredients && b.ingredients.length) {
        ingredientsHtml = '<div style="margin:15px 0"><h4 style="color:var(--text-secondary);margin-bottom:8px">Ingredientes</h4>';
        b.ingredients.forEach(ing => {
            const qty = ing.quantity_scu ? ing.quantity_scu + ' SCU' : (ing.quantity || '');
            ingredientsHtml += `<div style="display:flex;justify-content:space-between;padding:6px 10px;background:var(--bg-primary);border-radius:6px;margin-bottom:4px;font-size:13px">
                <span style="color:var(--text-primary)">${ing.name || '?'}</span>
                <span style="color:var(--accent)">${qty}</span>
            </div>`;
        });
        ingredientsHtml += '</div>';
    }
    
    let missionsHtml = '';
    if (b.unlocking_missions_count > 0) {
        missionsHtml = `<div style="margin:10px 0;padding:10px;background:var(--bg-primary);border-radius:8px;font-size:13px">
            <span style="color:var(--accent)">${b.unlocking_missions_count} misiones</span> pueden desbloquear este blueprint
        </div>`;
    }
    
    const html = `
        <button class="modal-close" onclick="closeBpModal()">✕</button>
        <h2 style="margin-bottom:20px">🔧 ${b.output_name || '?'}</h2>
        <div class="detail-grid">
            <div class="detail-item">
                <div class="di-label">Tiempo de fabricación</div>
                <div class="di-value">${timeStr}</div>
            </div>
            <div class="detail-item">
                <div class="di-label">Ingredientes</div>
                <div class="di-value">${b.ingredient_count || 0}</div>
            </div>
            <div class="detail-item">
                <div class="di-label">Disponible por defecto</div>
                <div class="di-value">${b.is_available_by_default ? 'Sí' : 'No, hay que desbloquearlo'}</div>
            </div>
            <div class="detail-item">
                <div class="di-label">Misiones para desbloquear</div>
                <div class="di-value">${b.unlocking_missions_count || 0}</div>
            </div>
        </div>
        ${ingredientsHtml}
        ${missionsHtml}
        <div style="margin-top:15px;font-size:11px;color:var(--text-muted)">Key: ${b.key || '?'} · v${b.game_version || '?'}</div>
    `;
    
    document.getElementById('bp-modal-content').innerHTML = html;
    document.getElementById('bp-modal').classList.remove('hidden');
}

function closeBpModal() {
    document.getElementById('bp-modal').classList.add('hidden');
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
        const data = await apiFetch('/weapons');
        if (!data) { tbody.innerHTML = '<tr><td colspan="7" class="loading-row" style="color:var(--danger)">Error</td></tr>'; return; }
        wpCache = data.data || [];
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
            case 'price': va = Math.min(...(a.locations || []).map(l => parseInt(l.price) || 999999)); vb = Math.min(...(b.locations || []).map(l => parseInt(l.price) || 999999)); break;
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
        const minPrice = Math.min(...(w.locations || []).map(l => parseInt(l.price) || 999999));
        return `<tr onclick="openWpModal('${w.id}')">
            <td>${w.name || '?'}</td>
            <td>S${s.SIZE || '?'}</td>
            <td style="color:var(--text-secondary)">${s.TYPE || '?'}</td>
            <td style="color:var(--accent)">${s['BASE DPS'] || '—'}</td>
            <td>${s.ALPHA || '—'}</td>
            <td>${s.FIRERANGE || '—'}</td>
            <td>${minPrice < 999999 ? minPrice.toLocaleString() : '—'}</td>
        </tr>`;
    }).join('');
    renderSimplePagination('weapons-pagination', page, pages, renderWpPage);
    document.querySelectorAll('#weapons-table th').forEach(th => {
        th.classList.remove('sorted','asc','desc');
        if (th.dataset.sort === wpSort.key) th.classList.add('sorted', wpSort.asc ? 'asc' : 'desc');
    });
}

function renderSimplePagination(elId, c, t, fn) {
    const el = document.getElementById(elId); if (!el) return;
    const name = fn.name;
    let h = `<button class="page-btn" onclick="${name}(1)" ${c===1?'disabled':''}>«</button><button class="page-btn" onclick="${name}(${c-1})" ${c===1?'disabled':''}>‹</button>`;
    const s = Math.max(1,c-2), e = Math.min(t,c+2);
    if (s>1) h+=`<button class="page-btn" onclick="${name}(1)">1</button>`;
    if (s>2) h+='<span class="page-btn" style="cursor:default">…</span>';
    for (let i=s;i<=e;i++) h+=`<button class="page-btn ${i===c?'active':''}" onclick="${name}(${i})">${i}</button>`;
    if (e<t-1) h+='<span class="page-btn" style="cursor:default">…</span>';
    if (e<t) h+=`<button class="page-btn" onclick="${name}(${t})">${t}</button>`;
    h+=`<button class="page-btn" onclick="${name}(${c+1})" ${c===t?'disabled':''}>›</button><button class="page-btn" onclick="${name}(${t})" ${c===t?'disabled':''}>»</button>`;
    el.innerHTML = h;
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

async function openWpModal(id) {
    const w = await apiFetch(`/weapons/${id}`);
    if (!w) return;
    const s = w.stats || {};
    let locHtml = '';
    if (w.locations && w.locations.length) {
        locHtml = '<div style="margin:15px 0"><h4 style="color:var(--text-secondary);margin-bottom:8px">📍 Dónde comprarlo</h4>';
        w.locations.slice(0,10).forEach(l => {
            locHtml += `<div style="display:flex;justify-content:space-between;padding:5px 10px;background:var(--bg-primary);border-radius:6px;margin-bottom:3px;font-size:12px">
                <span style="color:var(--text-primary)">${l.name}</span>
                <span style="color:var(--accent)">${parseInt(l.price)?.toLocaleString() || '?'} aUEC</span>
            </div>`;
        });
        locHtml += '</div>';
    }
    document.getElementById('wp-modal-content').innerHTML = `
        <button class="modal-close" onclick="closeWpModal()">✕</button>
        <h2 style="margin-bottom:20px">🔫 ${w.name || '?'}</h2>
        <div class="detail-grid">
            <div class="detail-item"><div class="di-label">Fabricante</div><div class="di-value">${s.MANUFACTURER || '?'}</div></div>
            <div class="detail-item"><div class="di-label">Tipo</div><div class="di-value">${s.TYPE || '?'}</div></div>
            <div class="detail-item"><div class="di-label">Size</div><div class="di-value">${s.SIZE || '?'}</div></div>
            <div class="detail-item"><div class="di-label">DPS</div><div class="di-value" style="color:var(--accent)">${s['BASE DPS'] || '—'}</div></div>
            <div class="detail-item"><div class="di-label">Alpha</div><div class="di-value">${s.ALPHA || '—'}</div></div>
            <div class="detail-item"><div class="di-label">Fire Rate</div><div class="di-value">${s.FIRERATE || '—'}</div></div>
            <div class="detail-item"><div class="di-label">Range</div><div class="di-value">${s.FIRERANGE || '—'}</div></div>
            <div class="detail-item"><div class="di-label">Power Draw</div><div class="di-value">${s['POWER DRAW'] || '—'}</div></div>
            <div class="detail-item"><div class="di-label">Bullet Speed</div><div class="di-value">${s['BULLET SPEED'] || '—'}</div></div>
            <div class="detail-item"><div class="di-label">Max Ammo</div><div class="di-value">${s['MAX AMMO'] || '—'}</div></div>
        </div>${locHtml}`;
    document.getElementById('wp-modal').classList.remove('hidden');
}
function closeWpModal() { document.getElementById('wp-modal').classList.add('hidden'); }

// ═══════════════════════════════════════════
// WIKELO PAGE
// ═══════════════════════════════════════════

async function loadWikelo(filter) {
    const container = document.getElementById('wikelo-contracts');
    container.innerHTML = '<div class="loading-sm">Cargando...</div>';
    const data = await apiFetch('/wikelo');
    if (!data) { container.innerHTML = '<div class="loading-sm" style="color:var(--danger)">Error</div>'; return; }
    window._wikeloData = data;
    if (filter === 'ships') document.getElementById('filter-wk-cat').value = 'ship_contracts';
    renderWikelo();
    document.getElementById('wikelo-search')?.addEventListener('input', renderWikelo);
    document.getElementById('filter-wk-cat')?.addEventListener('change', renderWikelo);
    document.getElementById('wikelo-reset')?.addEventListener('click', () => {
        document.getElementById('wikelo-search').value='';
        document.getElementById('filter-wk-cat').value='';
        renderWikelo();
    });
}

const wkNames = { favor_trades:'🤝 Favor Trades', polaris_bit_recipes:'💎 Polaris Bit', weapon_contracts:'🔫 Armas', armor_contracts:'🛡️ Armaduras', vehicle_contracts:'🚗 Vehículos', ship_contracts:'🚀 Naves' };

function renderComponentsPage() {
    const tbody = document.getElementById('comps-tbody');
    const data = window._compsCache || [];
    if (!data.length) {
        tbody.innerHTML = '<tr><td colspan="4" class="loading-row">Sin componentes cargados</td></tr>';
        return;
    }
    tbody.innerHTML = data.map(c => {
        const typeClass = 'ct-' + (c.type || '').replace(/ /g,'');
        return `<tr>
            <td>${__(c.name)}</td>
            <td><span class="comp-badge ${typeClass}">${__(c.type)}</span></td>
            <td>${c.size || '?'}</td>
            <td>${c.grade || '?'}</td>
        </tr>`;
    }).join('');
}

function renderWikelo() {
    const container = document.getElementById('mainContent');
    if (!container) return;
    const data = window._wikeloData;
    if (!data) return;
    const cat = document.getElementById('filter-wk-cat').value;
    const q = document.getElementById('wikelo-search').value.toLowerCase();
    let html = '', total = 0;
    const cats = cat ? {[cat]: data[cat] || []} : data;
    Object.entries(cats).forEach(([k, items]) => {
        const f = items.filter(i => !q || i.name?.toLowerCase().includes(q));
        if (!f.length) return;
        total += f.length;
        html += `<div class="card"><h3>${wkNames[k] || k} <span class="page-count">${f.length}</span></h3>`;
        f.forEach(i => {
            const ins = (i.inputs||[]).map(x => `${x.quantity}x ${x.item}`).join(', ');
            const rw = (i.rewards||[]).map(r => r.item).join(', ');
            html += `<div class="wikelo-item" style="padding:10px;margin-bottom:6px;background:var(--bg-primary);border-radius:8px;cursor:pointer" onclick="alert('INPUTS: ${ins.replace(/'/g,"\\'")}\\n\\nREWARDS: ${rw}')">
                <div style="font-weight:600;color:var(--accent);font-size:13px">${i.name}</div>
                <div style="font-size:11px;color:var(--text-secondary);margin-top:3px">→ ${rw}</div>
            </div>`;
        });
        html += '</div>';
    });
    container.innerHTML = html || '<div class="card"><div class="loading-sm">Sin resultados</div></div>';
    document.getElementById('wikelo-count').textContent = total;
}

// ═══════════════════════════════════════════
// FACTIONS PAGE
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
}

// ═══════════════════════════════════════════
// ITEMS PAGE
// ═══════════════════════════════════════════

async function loadItems() {
    const tbody = document.getElementById('items-tbody');
    const data = await apiFetch('/items');
    if (!data) { tbody.innerHTML = '<tr><td colspan="2" class="loading-row" style="color:var(--danger)">Error</td></tr>'; return; }
    window._itemsCache = data.data || [];
    document.getElementById('items-count').textContent = window._itemsCache.length;
    filterItems();
    document.getElementById('items-search').addEventListener('input', filterItems);
    document.getElementById('items-reset').addEventListener('click', () => {
        document.getElementById('items-search').value = '';
        filterItems();
    });
}

function filterItems() {
    const q = document.getElementById('items-search').value.toLowerCase();
    const items = (window._itemsCache || []).filter(i => !q || i.name?.toLowerCase().includes(q));
    const tbody = document.getElementById('items-tbody');
    tbody.innerHTML = items.slice(0,200).map(i => {
        const s = i.Sold ? '<span class="badge-bp">Sí</span>' : '<span style="color:var(--text-muted)">No</span>';
        return `<tr><td>${i.name}</td><td>${s}</td></tr>`;
    }).join('') + (items.length > 200 ? `<tr><td colspan="2" class="loading-row">Mostrando 200 de ${items.length}</td></tr>` : '');
}

// ═══════════════════════════════════════════
// SAFE NAVIGATE OVERRIDE
// ═══════════════════════════════════════════

const _origNav = window.navigateTo || function(){};
window.navigateTo = function(page, filter) {
    state.currentPage = page;
    $$('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.page === page));
    $$('.page').forEach(p => p.classList.toggle('active', p.id === 'page-' + page));
    if (page === 'missions') loadMissions(filter);
    else if (page === 'blueprints') loadBlueprints(filter);
    else if (page === 'weapons') loadWeapons(filter);
    else if (page === 'wikelo') loadWikelo(filter);
    else if (page === 'factions') loadFactions();
    else if (page === 'items') loadItems();
    document.getElementById('sidebar').classList.remove('open');
};
window.navigateTo = window.navigateTo;

// Force reconnect if API was called
if (!state.stats) loadStats();


// ═══════════════════════════════════════════
// PASO 6 — PULIDO
// ═══════════════════════════════════════════

// ─── 6.1 CROSS-LINKS: Add faction links to mission modal ───

const _origOpenMission = openMissionModal;
openMissionModal = async function(uuid) {
    await _origOpenMission(uuid);
    // Add faction link
    const content = document.getElementById('mission-modal-content');
    const fname = content.querySelector('.detail-item:nth-child(1) .di-value')?.textContent?.trim();
    if (fname && fname !== '?') {
        const factionDiv = content.querySelector('.detail-item:nth-child(1)');
        if (factionDiv) {
            const oldVal = factionDiv.querySelector('.di-value');
            if (oldVal) {
                oldVal.innerHTML = `<a href="#" onclick="navigateTo('factions');closeMissionModal();return false" style="color:var(--accent);text-decoration:underline">${fname}</a>`;
            }
        }
    }
    // Add "view missions like this" link
    const scope = content.querySelector('.detail-item:nth-child(2) .di-value')?.textContent?.trim();
    if (scope && scope !== '?') {
        const actionsDiv = document.createElement('div');
        actionsDiv.style.marginTop = '15px';
        actionsDiv.innerHTML = `<a href="#" onclick="navigateTo('missions');filterMissionScope('${scope}');closeMissionModal();return false" style="color:var(--text-secondary);font-size:13px">🔍 Ver más misiones de tipo "${scope}"</a>`;
        content.appendChild(actionsDiv);
    }
};

function filterMissionScope(scope) {
    // Set filter and trigger
    setTimeout(() => {
        const sel = document.getElementById('filter-scope');
        if (sel) { sel.value = scope; sel.dispatchEvent(new Event('change')); }
    }, 100);
}


// ─── 6.2 TOOLTIPS ───

// Add tooltip to table rows via title attribute
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

// Inject tooltip styles
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


// ─── 6.3 KEYBOARD NAVIGATION FOR SEARCH ───

(function enhanceSearch() {
    const input = document.getElementById('search-input');
    const dropdown = document.getElementById('search-results');
    let selectedIndex = -1;

    input.addEventListener('keydown', (e) => {
        const items = dropdown.querySelectorAll('.search-result-item');
        if (!items.length) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
            updateSearchHighlight(items);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            selectedIndex = Math.max(selectedIndex - 1, 0);
            updateSearchHighlight(items);
        } else if (e.key === 'Enter' && selectedIndex >= 0) {
            e.preventDefault();
            items[selectedIndex]?.click();
            dropdown.classList.remove('visible');
            selectedIndex = -1;
        }
    });

    function updateSearchHighlight(items) {
        items.forEach((item, i) => {
            item.style.background = i === selectedIndex ? 'var(--accent-dim)' : '';
            if (i === selectedIndex) item.scrollIntoView({ block: 'nearest' });
        });
    }

    // Reset on input
    const _origInput = input.addEventListener;
    input.addEventListener('input', () => { selectedIndex = -1; });
})();


// ─── 6.4 RESPONSIVE: Better mobile sidebar ───

(function enhanceMobile() {
    const sidebar = document.getElementById('sidebar');
    const main = document.getElementById('main');

    // Close sidebar on click outside
    main.addEventListener('click', (e) => {
        if (window.innerWidth <= 768 && sidebar.classList.contains('open')) {
            sidebar.classList.remove('open');
        }
    });

    // Better table scrolling on mobile
    const tables = document.querySelectorAll('.table-container');
    tables.forEach(t => {
        t.style.overflowX = 'auto';
        t.style.WebkitOverflowScrolling = 'touch';
    });
})();


// ─── 6.5 LOADING SKELETONS ───

function showSkeleton(containerId, rows = 5, cols = 4) {
    const container = document.getElementById(containerId);
    if (!container) return;
    let html = '';
    for (let r = 0; r < rows; r++) {
        html += '<tr>';
        for (let c = 0; c < cols; c++) {
            const w = 30 + Math.random() * 60;
            html += `<td><div class="skeleton" style="width:${w}%;height:14px;border-radius:4px;background:var(--bg-hover);animation:pulse 1.5s infinite"></div></td>`;
        }
        html += '</tr>';
    }
    container.innerHTML = html;
}

// Add skeleton animation
const skeletonStyle = document.createElement('style');
skeletonStyle.textContent = `
    @keyframes pulse {
        0%, 100% { opacity: 0.3; }
        50% { opacity: 0.7; }
    }
`;
document.head.appendChild(skeletonStyle);


// ─── 6.5b CACHE STATUS INDICATOR ───

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


// ─── 6.5c BADGE AUTO-UPDATE ───

// Periodically refresh stats to keep badges accurate
setInterval(async () => {
    if (state.currentPage === 'dashboard') {
        const stats = await apiFetch('/stats');
        if (stats) {
            state.stats = stats;
            if (document.getElementById('badge-missions')) {
                document.getElementById('badge-missions').textContent = stats.total_missions;
                document.getElementById('badge-blueprints').textContent = stats.total_blueprints;
                document.getElementById('badge-weapons').textContent = stats.total_weapons;
                document.getElementById('badge-items').textContent = stats.total_items;
            }
        }
    }
}, 60000); // Every minute


console.log('✅ Paso 6 — Pulido aplicado');
