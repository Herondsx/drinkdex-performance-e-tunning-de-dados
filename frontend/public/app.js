// ---- Configuração das APIs ----
const API = {
  user: 'http://localhost:3001',
  drink: 'http://localhost:3002',
  activity: 'http://localhost:3003'
};

// ---- Estado de autenticação ----
let currentUser = JSON.parse(localStorage.getItem('dd_user') || 'null');
let currentToken = localStorage.getItem('dd_token') || null;

function saveAuth(user, token) {
  currentUser = user;
  currentToken = token;
  localStorage.setItem('dd_user', JSON.stringify(user));
  localStorage.setItem('dd_token', token);
}

function clearAuth() {
  currentUser = null;
  currentToken = null;
  localStorage.removeItem('dd_user');
  localStorage.removeItem('dd_token');
}

// ---- HTTP helper ----
async function request(url, options = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (currentToken) headers['Authorization'] = `Bearer ${currentToken}`;
  const res = await fetch(url, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Erro ${res.status}`);
  return data;
}

// ---- API calls ----
const api = {
  register: (d) => request(`${API.user}/register`, { method: 'POST', body: JSON.stringify(d) }),
  login: (d) => request(`${API.user}/login`, { method: 'POST', body: JSON.stringify(d) }),

  getDrinks: (params = {}) => {
    const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v))).toString();
    return request(`${API.drink}/drinks${qs ? '?' + qs : ''}`);
  },
  getDrink: (id) => request(`${API.drink}/drinks/${id}`),
  createDrink: (d) => request(`${API.drink}/drinks`, { method: 'POST', body: JSON.stringify(d) }),
  updateDrink: (id, d) => request(`${API.drink}/drinks/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
  deleteDrink: (id) => request(`${API.drink}/drinks/${id}`, { method: 'DELETE' }),

  registerView: (drinkId, userId) => request(`${API.activity}/view/${drinkId}`, { method: 'POST', body: JSON.stringify({ userId }) }),
  getRanking: () => request(`${API.activity}/ranking`),
  getFavorites: (userId) => request(`${API.activity}/favorites/${userId}`),
  addFavorite: (userId, drinkId) => request(`${API.activity}/favorites/${userId}/${drinkId}`, { method: 'POST' }),
  removeFavorite: (userId, drinkId) => request(`${API.activity}/favorites/${userId}/${drinkId}`, { method: 'DELETE' }),
  getHistory: (userId) => request(`${API.activity}/history/${userId}`),
};

// ---- Router ----
const appEl = document.getElementById('app');

function navigate(hash) {
  window.location.hash = '#' + hash;
}

function getRoute() {
  const hash = window.location.hash.replace('#', '') || '/';
  const [path, qs] = hash.split('?');
  return { path, params: new URLSearchParams(qs || '') };
}

async function route() {
  renderNav();
  const { path, params } = getRoute();

  if (path === '/' || path === '') return renderHome();
  if (path === '/drinks') return renderDrinkList(params);
  if (path === '/drinks/new') return renderDrinkForm(null);
  if (path === '/favorites') return renderFavorites();
  if (path === '/history') return renderHistory();
  if (path === '/login') return renderLogin();
  if (path === '/register') return renderRegister();

  const editMatch = path.match(/^\/drinks\/(.+)\/edit$/);
  if (editMatch) return renderDrinkForm(editMatch[1]);

  const detailMatch = path.match(/^\/drinks\/([^/]+)$/);
  if (detailMatch) return renderDrinkDetail(detailMatch[1]);

  appEl.innerHTML = '<p class="empty-msg">Página não encontrada.</p>';
}

window.addEventListener('hashchange', route);
window.addEventListener('load', route);

// ---- Nav ----
function renderNav() {
  const authArea = document.getElementById('auth-area');
  const navNew = document.getElementById('nav-new');
  const navFav = document.getElementById('nav-favorites');
  const navHist = document.getElementById('nav-history');
  const show = (el) => el && (el.style.display = '');
  const hide = (el) => el && (el.style.display = 'none');

  if (currentUser) {
    authArea.innerHTML = `
      <span class="user-name">Olá, <strong>${currentUser.name.split(' ')[0]}</strong></span>
      <button class="btn btn-sm btn-outline" onclick="logout()">Sair</button>
    `;
    show(navNew); show(navFav); show(navHist);
  } else {
    authArea.innerHTML = `
      <a href="#/login" class="btn btn-sm btn-outline">Entrar</a>
      <a href="#/register" class="btn btn-sm btn-primary">Cadastrar</a>
    `;
    hide(navNew); hide(navFav); hide(navHist);
  }
}

function logout() {
  clearAuth();
  navigate('/');
}

// ---- Helpers visuais ----
function loading() {
  appEl.innerHTML = '<div class="loading"><div class="spinner"></div><p>Carregando...</p></div>';
}

function showError(msg) {
  appEl.innerHTML = `
    <div class="error-container">
      <p class="error-msg">${msg}</p>
      <a href="#/" class="btn btn-primary">Voltar ao Início</a>
    </div>`;
}

function drinkCard(drink) {
  const img = drink.image
    ? `<img src="${drink.image}" alt="${drink.name}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
    : '';
  const ph = `<div class="card-img-placeholder" ${drink.image ? 'style="display:none"' : ''}>🍹</div>`;
  return `
    <div class="drink-card" onclick="navigate('/drinks/${drink._id}')">
      <div class="card-img-wrap">${img}${ph}</div>
      <div class="card-body">
        <span class="category-tag">${drink.category || 'Outros'}</span>
        <h3>${drink.name}</h3>
        ${drink.description ? `<p class="card-desc">${drink.description}</p>` : ''}
      </div>
    </div>`;
}

// ---- HOME ----
async function renderHome() {
  loading();
  try {
    const ranking = await api.getRanking();
    let rankHtml = '';

    if (ranking.length === 0) {
      rankHtml = `<p class="empty-msg">Nenhum drink acessado ainda. <a href="#/drinks">Explore os drinks!</a></p>`;
    } else {
      const details = await Promise.all(ranking.map(r => api.getDrink(r.drinkId).catch(() => null)));
      rankHtml = ranking.map((r, i) => {
        const d = details[i];
        if (!d) return '';
        const numClass = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';
        const thumb = d.image
          ? `<img class="rank-thumb" src="${d.image}" alt="${d.name}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><div class="rank-thumb-placeholder" style="display:none">🍹</div>`
          : `<div class="rank-thumb-placeholder">🍹</div>`;
        return `
          <div class="ranking-item" onclick="navigate('/drinks/${d._id}')">
            <div class="rank-num ${numClass}">${i + 1}</div>
            ${thumb}
            <div class="rank-info">
              <h3>${d.name}</h3>
              <span class="category-tag">${d.category || 'Outros'}</span>
            </div>
            <span class="views-badge">👁 ${r.views} view${r.views !== 1 ? 's' : ''}</span>
          </div>`;
      }).join('');
    }

    appEl.innerHTML = `
      <section class="hero">
        <h2>Bem-vindo ao <strong>DrinkDex</strong> 🍹</h2>
        <p>Descubra, explore e favorite os melhores drinks e coquetéis</p>
        <a href="#/drinks" class="btn btn-primary btn-lg">Explorar todos os drinks</a>
      </section>
      <section class="section">
        <h2 class="section-title">🏆 Top Drinks Mais Acessados</h2>
        <div class="ranking-list">${rankHtml}</div>
      </section>`;
  } catch (err) {
    showError('Erro ao carregar página: ' + err.message);
  }
}

// ---- DRINK LIST ----
async function renderDrinkList(params = new URLSearchParams()) {
  loading();
  const q = params.get('q') || '';
  const category = params.get('category') || '';
  const categories = ['Todos', 'Clássico', 'Tropical', 'Sem Álcool', 'Shots', 'Long Drinks', 'Outros'];

  try {
    const drinks = await api.getDrinks({ q, category });

    appEl.innerHTML = `
      <section class="section">
        <div class="list-header">
          <h2 class="section-title">🍸 Drinks</h2>
          ${currentUser ? `<a href="#/drinks/new" class="btn btn-primary">+ Novo Drink</a>` : ''}
        </div>
        <div class="search-bar">
          <input type="text" id="search-input" placeholder="Buscar por nome, ingrediente..." value="${q}">
          <button class="btn btn-primary" onclick="doSearch()">Buscar</button>
        </div>
        <div class="category-filters">
          ${categories.map(c => {
            const val = c === 'Todos' ? '' : c;
            return `<button class="filter-btn ${category === val ? 'active' : ''}" onclick="filterCat('${val}')">${c}</button>`;
          }).join('')}
        </div>
        ${drinks.length === 0
          ? '<p class="empty-msg">Nenhum drink encontrado.</p>'
          : `<div class="drinks-grid">${drinks.map(drinkCard).join('')}</div>`}
      </section>`;

    document.getElementById('search-input').addEventListener('keydown', e => {
      if (e.key === 'Enter') doSearch();
    });
  } catch (err) {
    showError('Erro ao carregar drinks: ' + err.message);
  }
}

function doSearch() {
  const q = document.getElementById('search-input').value.trim();
  const { params } = getRoute();
  params.set('q', q);
  window.location.hash = '#/drinks?' + params.toString();
}

function filterCat(cat) {
  const { params } = getRoute();
  if (cat) params.set('category', cat);
  else params.delete('category');
  params.delete('q');
  window.location.hash = '#/drinks?' + params.toString();
}

// ---- DRINK DETAIL ----
async function renderDrinkDetail(id) {
  loading();
  try {
    const drink = await api.getDrink(id);
    api.registerView(id, currentUser ? currentUser.id : null).catch(() => {});

    let isFav = false;
    if (currentUser) {
      const favs = await api.getFavorites(currentUser.id).catch(() => []);
      isFav = favs.includes(id);
    }

    const ingHtml = drink.ingredients && drink.ingredients.length
      ? `<ul class="ingredients-list">
          ${drink.ingredients.map(i => `<li><span class="ing-amount">${i.amount}</span>${i.name}</li>`).join('')}
         </ul>`
      : '<p style="color:var(--text-muted)">Não informado.</p>';

    const tagsHtml = drink.tags && drink.tags.length
      ? `<div class="tags">${drink.tags.map(t => `<span class="tag">${t}</span>`).join('')}</div>`
      : '';

    const imgEl = drink.image
      ? `<img class="detail-img" src="${drink.image}" alt="${drink.name}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><div class="detail-img-placeholder" style="display:none">🍹</div>`
      : `<div class="detail-img-placeholder">🍹</div>`;

    const authActions = currentUser ? `
      <div class="btn-group">
        <button class="btn ${isFav ? 'btn-danger' : 'btn-outline'}" id="fav-btn" onclick="toggleFav('${id}', ${isFav})">
          ${isFav ? '♥ Favoritado' : '♡ Favoritar'}
        </button>
        <a href="#/drinks/${id}/edit" class="btn btn-outline">✏️ Editar</a>
        <button class="btn btn-danger" onclick="confirmDel('${id}')">🗑️ Excluir</button>
      </div>` : '';

    appEl.innerHTML = `
      <section class="detail-section">
        <div class="detail-actions-top">
          <a href="#/drinks" class="btn btn-outline">← Voltar</a>
          ${authActions}
        </div>
        <div class="detail-hero">
          <div>${imgEl}</div>
          <div class="detail-info">
            <span class="category-tag">${drink.category || 'Outros'}</span>
            <h2>${drink.name}</h2>
            ${drink.description ? `<p class="detail-desc">${drink.description}</p>` : ''}
            ${tagsHtml}
          </div>
        </div>
        <div class="detail-body">
          <div class="detail-ingredients">
            <h3>🧪 Ingredientes</h3>
            ${ingHtml}
          </div>
          ${drink.instructions ? `
          <div class="detail-instructions">
            <h3>📋 Modo de Preparo</h3>
            <p>${drink.instructions}</p>
          </div>` : ''}
        </div>
      </section>`;
  } catch (err) {
    showError('Drink não encontrado.');
  }
}

async function toggleFav(drinkId, isFav) {
  if (!currentUser) return navigate('/login');
  const btn = document.getElementById('fav-btn');
  try {
    if (isFav) {
      await api.removeFavorite(currentUser.id, drinkId);
      btn.textContent = '♡ Favoritar';
      btn.className = 'btn btn-outline';
      btn.setAttribute('onclick', `toggleFav('${drinkId}', false)`);
    } else {
      await api.addFavorite(currentUser.id, drinkId);
      btn.textContent = '♥ Favoritado';
      btn.className = 'btn btn-danger';
      btn.setAttribute('onclick', `toggleFav('${drinkId}', true)`);
    }
  } catch (err) {
    alert('Erro: ' + err.message);
  }
}

async function confirmDel(drinkId) {
  if (!confirm('Deseja excluir este drink permanentemente?')) return;
  try {
    await api.deleteDrink(drinkId);
    navigate('/drinks');
  } catch (err) {
    alert('Erro ao excluir: ' + err.message);
  }
}

// ---- DRINK FORM (criar / editar) ----
let ingIdx = 0;

async function renderDrinkForm(id) {
  if (!currentUser) return navigate('/login');
  ingIdx = 0;

  let drink = { name: '', category: 'Clássico', description: '', image: '', ingredients: [], instructions: '', tags: [] };
  if (id) {
    loading();
    try { drink = await api.getDrink(id); } catch { return showError('Drink não encontrado.'); }
  }

  const cats = ['Clássico', 'Tropical', 'Sem Álcool', 'Shots', 'Long Drinks', 'Outros'];

  appEl.innerHTML = `
    <section class="form-section">
      <h2>${id ? '✏️ Editar Drink' : '🍹 Novo Drink'}</h2>
      <form id="drink-form">
        <div class="form-group">
          <label>Nome *</label>
          <input type="text" id="f-name" value="${drink.name}" required placeholder="Ex: Mojito Clássico">
        </div>
        <div class="form-group">
          <label>Categoria</label>
          <select id="f-category">
            ${cats.map(c => `<option value="${c}" ${drink.category === c ? 'selected' : ''}>${c}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Descrição</label>
          <textarea id="f-description" rows="3" placeholder="Breve descrição do drink...">${drink.description || ''}</textarea>
        </div>
        <div class="form-group">
          <label>URL da Imagem</label>
          <input type="url" id="f-image" value="${drink.image || ''}" placeholder="https://...">
        </div>
        <div class="form-group">
          <label>Ingredientes</label>
          <div id="ingredients-list"></div>
          <button type="button" class="btn btn-outline btn-sm" style="margin-top:0.5rem" onclick="addIng()">+ Adicionar Ingrediente</button>
        </div>
        <div class="form-group">
          <label>Modo de Preparo</label>
          <textarea id="f-instructions" rows="5" placeholder="Passo a passo do preparo...">${drink.instructions || ''}</textarea>
        </div>
        <div class="form-group">
          <label>Tags (separadas por vírgula)</label>
          <input type="text" id="f-tags" value="${(drink.tags || []).join(', ')}" placeholder="ex: refrescante, verão, tropical">
        </div>
        <div class="form-actions">
          <a href="${id ? '#/drinks/' + id : '#/drinks'}" class="btn btn-outline">Cancelar</a>
          <button type="submit" class="btn btn-primary">${id ? 'Salvar Alterações' : 'Criar Drink'}</button>
        </div>
      </form>
    </section>`;

  (drink.ingredients && drink.ingredients.length ? drink.ingredients : [{}]).forEach(ing => addIng(ing));

  document.getElementById('drink-form').addEventListener('submit', e => {
    e.preventDefault();
    submitForm(id);
  });
}

function addIng(ing = {}) {
  const idx = ingIdx++;
  const row = document.createElement('div');
  row.className = 'ingredient-row';
  row.id = `ing-${idx}`;
  row.innerHTML = `
    <input type="text" class="ing-amount" placeholder="Quantidade" value="${ing.amount || ''}">
    <input type="text" class="ing-name" placeholder="Ingrediente" value="${ing.name || ''}">
    <button type="button" class="btn btn-danger btn-sm" onclick="document.getElementById('ing-${idx}').remove()">✕</button>`;
  document.getElementById('ingredients-list').appendChild(row);
}

async function submitForm(id) {
  const ingredients = [...document.querySelectorAll('.ingredient-row')].map(row => ({
    amount: row.querySelector('.ing-amount').value.trim(),
    name: row.querySelector('.ing-name').value.trim()
  })).filter(i => i.name);

  const tagsRaw = document.getElementById('f-tags').value;
  const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];

  const data = {
    name: document.getElementById('f-name').value.trim(),
    category: document.getElementById('f-category').value,
    description: document.getElementById('f-description').value.trim(),
    image: document.getElementById('f-image').value.trim(),
    instructions: document.getElementById('f-instructions').value.trim(),
    ingredients,
    tags
  };

  if (!data.name) return alert('O nome do drink é obrigatório!');

  const btn = document.querySelector('#drink-form button[type="submit"]');
  btn.disabled = true;
  btn.textContent = 'Salvando...';

  try {
    const result = id ? await api.updateDrink(id, data) : await api.createDrink(data);
    navigate(`/drinks/${result._id}`);
  } catch (err) {
    alert('Erro: ' + err.message);
    btn.disabled = false;
    btn.textContent = id ? 'Salvar Alterações' : 'Criar Drink';
  }
}

// ---- FAVORITOS ----
async function renderFavorites() {
  if (!currentUser) return navigate('/login');
  loading();
  try {
    const ids = await api.getFavorites(currentUser.id);
    if (!ids.length) {
      appEl.innerHTML = `
        <section class="section">
          <h2 class="section-title">♥ Meus Favoritos</h2>
          <p class="empty-msg">Você ainda não favoritou nenhum drink. <a href="#/drinks">Explore os drinks!</a></p>
        </section>`;
      return;
    }
    const drinks = (await Promise.all(ids.map(id => api.getDrink(id).catch(() => null)))).filter(Boolean);
    appEl.innerHTML = `
      <section class="section">
        <h2 class="section-title">♥ Meus Favoritos</h2>
        <div class="drinks-grid">${drinks.map(drinkCard).join('')}</div>
      </section>`;
  } catch (err) {
    showError('Erro ao carregar favoritos: ' + err.message);
  }
}

// ---- HISTÓRICO ----
async function renderHistory() {
  if (!currentUser) return navigate('/login');
  loading();
  try {
    const ids = await api.getHistory(currentUser.id);
    if (!ids.length) {
      appEl.innerHTML = `
        <section class="section">
          <h2 class="section-title">🕐 Histórico</h2>
          <p class="empty-msg">Você ainda não visualizou nenhum drink. <a href="#/drinks">Explore os drinks!</a></p>
        </section>`;
      return;
    }
    const unique = [...new Set(ids)];
    const drinks = (await Promise.all(unique.map(id => api.getDrink(id).catch(() => null)))).filter(Boolean);
    appEl.innerHTML = `
      <section class="section">
        <h2 class="section-title">🕐 Histórico de Visualizações</h2>
        <div class="drinks-grid">${drinks.map(drinkCard).join('')}</div>
      </section>`;
  } catch (err) {
    showError('Erro ao carregar histórico: ' + err.message);
  }
}

// ---- LOGIN ----
function renderLogin() {
  if (currentUser) return navigate('/');
  appEl.innerHTML = `
    <section class="auth-section">
      <div class="auth-card">
        <h2>Entrar</h2>
        <form id="login-form">
          <div class="form-group">
            <label>E-mail</label>
            <input type="email" id="l-email" required placeholder="seu@email.com">
          </div>
          <div class="form-group">
            <label>Senha</label>
            <input type="password" id="l-password" required placeholder="••••••">
          </div>
          <div class="form-error" id="login-err"></div>
          <button type="submit" class="btn btn-primary btn-full">Entrar</button>
        </form>
        <p class="auth-link">Não tem conta? <a href="#/register">Cadastrar-se</a></p>
      </div>
    </section>`;

  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl = document.getElementById('login-err');
    const btn = e.target.querySelector('button');
    errEl.textContent = '';
    btn.disabled = true; btn.textContent = 'Entrando...';
    try {
      const { user, token } = await api.login({
        email: document.getElementById('l-email').value,
        password: document.getElementById('l-password').value
      });
      saveAuth(user, token);
      navigate('/');
    } catch (err) {
      errEl.textContent = err.message;
      btn.disabled = false; btn.textContent = 'Entrar';
    }
  });
}

// ---- REGISTER ----
function renderRegister() {
  if (currentUser) return navigate('/');
  appEl.innerHTML = `
    <section class="auth-section">
      <div class="auth-card">
        <h2>Criar Conta</h2>
        <form id="reg-form">
          <div class="form-group">
            <label>Nome</label>
            <input type="text" id="r-name" required placeholder="Seu nome completo">
          </div>
          <div class="form-group">
            <label>E-mail</label>
            <input type="email" id="r-email" required placeholder="seu@email.com">
          </div>
          <div class="form-group">
            <label>Senha</label>
            <input type="password" id="r-password" required placeholder="••••••" minlength="6">
          </div>
          <div class="form-error" id="reg-err"></div>
          <button type="submit" class="btn btn-primary btn-full">Criar Conta</button>
        </form>
        <p class="auth-link">Já tem conta? <a href="#/login">Entrar</a></p>
      </div>
    </section>`;

  document.getElementById('reg-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl = document.getElementById('reg-err');
    const btn = e.target.querySelector('button');
    errEl.textContent = '';
    btn.disabled = true; btn.textContent = 'Criando conta...';
    try {
      const { user, token } = await api.register({
        name: document.getElementById('r-name').value,
        email: document.getElementById('r-email').value,
        password: document.getElementById('r-password').value
      });
      saveAuth(user, token);
      navigate('/');
    } catch (err) {
      errEl.textContent = err.message;
      btn.disabled = false; btn.textContent = 'Criar Conta';
    }
  });
}
