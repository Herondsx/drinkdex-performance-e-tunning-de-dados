// painel.js — dashboard de monitoramento dos 4 bancos
// faz polling nos 4 servicos a cada 3 segundos e atualiza os cards
// tambem permite disparar acoes (criar usuario, criar drink, etc)
// para mostrar os dados aparecendo nos bancos em tempo real

const API = {
  user:           'http://localhost:3001',
  drink:          'http://localhost:3002',
  activity:       'http://localhost:3003',
  recommendation: 'http://localhost:3004'
};

// cache dos drinks pra cruzar com o ranking do redis (que so guarda ids)
let drinksCache = {};
const REFRESH_MS = 3000;

// ============================================================
// LOG DE ACOES
// ============================================================

function log(msg, tipo = 'info') {
  const el = document.getElementById('acao-log');
  const tempo = new Date().toLocaleTimeString('pt-BR');
  const div = document.createElement('div');
  div.className = `log-${tipo}`;
  div.innerHTML = `<span class="log-tempo">[${tempo}]</span> ${msg}`;
  el.insertBefore(div, el.firstChild);

  // mantem so as ultimas 15 linhas pra nao crescer infinito
  while (el.children.length > 15) {
    el.removeChild(el.lastChild);
  }
}

// destaca um card com flash de luz quando os dados mudam
function flash(cardClass) {
  const card = document.querySelector(`.banco-card.${cardClass}`);
  if (!card) return;
  card.classList.add('flash');
  setTimeout(() => card.classList.remove('flash'), 800);
}

// ============================================================
// CARREGADORES DE CADA BANCO
// ============================================================

let ultimoCountPg = -1;
let ultimoCountMongo = -1;
let ultimoCountRedis = -1;
let ultimoCountNeo4j = -1;

async function carregarPostgres() {
  try {
    const r = await fetch(`${API.user}/users`);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const users = await r.json();

    document.getElementById('pg-count').textContent = users.length;
    document.getElementById('status-pg').className = 'banco-status online';
    document.getElementById('status-pg').title = 'Online';

    if (ultimoCountPg !== -1 && users.length !== ultimoCountPg) flash('postgres');
    ultimoCountPg = users.length;

    const ultimos = users.slice(-5).reverse();
    const lista = document.getElementById('pg-list');
    if (ultimos.length === 0) {
      lista.innerHTML = '<p class="vazio">Nenhum usuario cadastrado ainda. Clique em "Criar usuario teste" acima!</p>';
    } else {
      lista.innerHTML = ultimos.map(u => `
        <div class="item-row">
          <span class="item-nome">${escapeHtml(u.name)}</span>
          <span class="item-detail">${escapeHtml(u.email)}</span>
        </div>
      `).join('');
    }
  } catch (e) {
    document.getElementById('status-pg').className = 'banco-status offline';
    document.getElementById('status-pg').title = 'Offline: ' + e.message;
    document.getElementById('pg-count').textContent = '×';
  }
}

async function carregarMongo() {
  try {
    const r = await fetch(`${API.drink}/drinks`);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const drinks = await r.json();

    document.getElementById('mongo-count').textContent = drinks.length;
    document.getElementById('status-mongo').className = 'banco-status online';
    document.getElementById('status-mongo').title = 'Online';

    if (ultimoCountMongo !== -1 && drinks.length !== ultimoCountMongo) flash('mongo');
    ultimoCountMongo = drinks.length;

    // atualiza o cache pra usar no ranking do redis
    drinksCache = {};
    drinks.forEach(d => { drinksCache[d._id] = d; });

    const ultimos = drinks.slice(0, 5);
    const lista = document.getElementById('mongo-list');
    if (ultimos.length === 0) {
      lista.innerHTML = '<p class="vazio">Nenhum drink cadastrado. Rode o seed ou clique em "Criar drink teste"!</p>';
    } else {
      lista.innerHTML = ultimos.map(d => `
        <div class="item-row">
          <span class="item-nome">${escapeHtml(d.name)}</span>
          <span class="item-detail">${escapeHtml(d.category || 'Outros')}</span>
        </div>
      `).join('');
    }
  } catch (e) {
    document.getElementById('status-mongo').className = 'banco-status offline';
    document.getElementById('status-mongo').title = 'Offline: ' + e.message;
    document.getElementById('mongo-count').textContent = '×';
  }
}

async function carregarRedis() {
  try {
    const r = await fetch(`${API.activity}/ranking`);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const ranking = await r.json();

    document.getElementById('redis-count').textContent = ranking.length;
    document.getElementById('status-redis').className = 'banco-status online';
    document.getElementById('status-redis').title = 'Online';

    if (ultimoCountRedis !== -1 && ranking.length !== ultimoCountRedis) flash('redis');
    ultimoCountRedis = ranking.length;

    const lista = document.getElementById('redis-list');
    if (ranking.length === 0) {
      lista.innerHTML = '<p class="vazio">Nenhum drink visualizado ainda. Clique em "Visualizar drink aleatorio"!</p>';
    } else {
      lista.innerHTML = ranking.map((r, i) => {
        const drink = drinksCache[r.drinkId];
        const nome = drink ? drink.name : `drink ${r.drinkId.substring(0, 8)}...`;
        const medalha = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
        return `
          <div class="item-row">
            <span class="item-nome">${medalha} ${escapeHtml(nome)}</span>
            <span class="item-detail">${r.views} view${r.views > 1 ? 's' : ''}</span>
          </div>
        `;
      }).join('');
    }
  } catch (e) {
    document.getElementById('status-redis').className = 'banco-status offline';
    document.getElementById('status-redis').title = 'Offline: ' + e.message;
    document.getElementById('redis-count').textContent = '×';
  }
}

async function carregarNeo4j() {
  try {
    const r = await fetch(`${API.recommendation}/ingredientes/populares`);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const populares = await r.json();

    document.getElementById('neo4j-count').textContent = populares.length;
    document.getElementById('status-neo4j').className = 'banco-status online';
    document.getElementById('status-neo4j').title = 'Online';

    if (ultimoCountNeo4j !== -1 && populares.length !== ultimoCountNeo4j) flash('neo4j');
    ultimoCountNeo4j = populares.length;

    const lista = document.getElementById('neo4j-list');
    if (populares.length === 0) {
      lista.innerHTML = '<p class="vazio">Grafo vazio. Clique em "Re-sincronizar grafo" para popular!</p>';
    } else {
      lista.innerHTML = populares.map((p, i) => `
        <div class="item-row">
          <span class="item-nome">${i + 1}. ${escapeHtml(p.ingrediente)}</span>
          <span class="item-detail">em ${p.qtdDrinks} drink${p.qtdDrinks > 1 ? 's' : ''}</span>
        </div>
      `).join('');
    }
  } catch (e) {
    document.getElementById('status-neo4j').className = 'banco-status offline';
    document.getElementById('status-neo4j').title = 'Offline: ' + e.message;
    document.getElementById('neo4j-count').textContent = '×';
  }
}

// ============================================================
// LOOP DE ATUALIZACAO
// ============================================================

async function atualizar() {
  // mongo primeiro porque o redis precisa do cache de drinks
  await carregarMongo();
  await Promise.all([
    carregarPostgres(),
    carregarRedis(),
    carregarNeo4j()
  ]);
  document.getElementById('status-text').textContent =
    `Ultima atualizacao: ${new Date().toLocaleTimeString('pt-BR')}`;
}

// ============================================================
// ACOES DE DEMONSTRACAO (botoes)
// ============================================================

async function criarUsuarioTeste() {
  const num = Math.floor(Math.random() * 99999);
  const data = {
    name: `Usuario Teste ${num}`,
    email: `teste${num}@drinkdex.local`,
    password: 'senha123'
  };
  log(`→ POST http://localhost:3001/register (criando usuario "${data.name}")`, 'info');
  try {
    const r = await fetch(`${API.user}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!r.ok) {
      const erro = await r.json().catch(() => ({ error: r.status }));
      throw new Error(erro.error || `HTTP ${r.status}`);
    }
    log(`✓ Usuario criado no <strong>PostgreSQL</strong>: ${data.name}`, 'sucesso');
    await carregarPostgres();
  } catch (e) {
    log(`✗ Erro ao criar usuario: ${e.message}`, 'erro');
  }
}

async function criarDrinkTeste() {
  const num = Math.floor(Math.random() * 99999);
  const ingredientesPossiveis = [
    [{ amount: '50ml', name: 'Vodka' }, { amount: '30ml', name: 'Suco de limao' }, { amount: 'q.s.', name: 'Gelo' }],
    [{ amount: '60ml', name: 'Rum branco' }, { amount: '30ml', name: 'Suco de abacaxi' }, { amount: 'q.s.', name: 'Gelo' }],
    [{ amount: '50ml', name: 'Gin' }, { amount: '150ml', name: 'Agua tonica' }, { amount: '1 fatia', name: 'Limao' }],
    [{ amount: '60ml', name: 'Tequila' }, { amount: '30ml', name: 'Suco de lima' }, { amount: 'q.s.', name: 'Sal' }]
  ];
  const ingredientes = ingredientesPossiveis[Math.floor(Math.random() * ingredientesPossiveis.length)];
  const data = {
    name: `Drink Teste ${num}`,
    category: 'Outros',
    description: 'Drink criado ao vivo pelo painel de demonstracao',
    ingredients: ingredientes,
    instructions: 'Misture tudo, sirva gelado.',
    tags: ['teste']
  };
  log(`→ POST http://localhost:3002/drinks (criando "${data.name}")`, 'info');
  try {
    const r = await fetch(`${API.drink}/drinks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    log(`✓ Drink criado no <strong>MongoDB</strong>: ${data.name}`, 'sucesso');
    await carregarMongo();
  } catch (e) {
    log(`✗ Erro ao criar drink: ${e.message}`, 'erro');
  }
}

async function visualizarAleatorio() {
  const ids = Object.keys(drinksCache);
  if (ids.length === 0) {
    log(`✗ Nenhum drink no catalogo. Crie um primeiro ou rode o seed.`, 'erro');
    return;
  }
  const id = ids[Math.floor(Math.random() * ids.length)];
  const drink = drinksCache[id];
  log(`→ POST http://localhost:3003/view/${id.substring(0, 8)}... (incrementando ranking de "${drink.name}")`, 'info');
  try {
    const r = await fetch(`${API.activity}/view/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    log(`✓ View registrada no <strong>Redis</strong>: ${drink.name} (ranking incrementado)`, 'sucesso');
    await carregarRedis();
  } catch (e) {
    log(`✗ Erro ao registrar view: ${e.message}`, 'erro');
  }
}

async function ressincronizarGrafo() {
  log(`→ POST http://localhost:3004/sync (recriando grafo no Neo4j a partir dos drinks do Mongo)`, 'info');
  try {
    const r = await fetch(`${API.recommendation}/sync`, { method: 'POST' });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const data = await r.json();
    log(`✓ Grafo do <strong>Neo4j</strong> recriado: ${data.drinks} drinks, ${data.relacoes} relacoes`, 'sucesso');
    await carregarNeo4j();
  } catch (e) {
    log(`✗ Erro ao sincronizar grafo: ${e.message}`, 'erro');
  }
}

// utilitario pra evitar injecao de HTML nos dados vindos dos bancos
function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// expoe as funcoes pra serem chamadas pelos onclick do HTML
window.criarUsuarioTeste   = criarUsuarioTeste;
window.criarDrinkTeste     = criarDrinkTeste;
window.visualizarAleatorio = visualizarAleatorio;
window.ressincronizarGrafo = ressincronizarGrafo;

// inicia o polling
atualizar();
setInterval(atualizar, REFRESH_MS);
