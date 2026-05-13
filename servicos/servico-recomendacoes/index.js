// recommendation-service — sugere drinks similares baseado em ingredientes compartilhados
// banco: Neo4j (banco de grafos)
//
// a ideia aqui é: cada drink vira um no, cada ingrediente vira um no,
// e a gente cria uma relacao (Drink)-[:CONTEM]->(Ingrediente).
// pra recomendar drinks similares basta percorrer o grafo:
// "quais drinks compartilham mais ingredientes com esse aqui?"
//
// esse tipo de consulta seria horrivel no postgres (varios joins)
// e nem o mongo nem o redis modelam isso direito. grafo é o lugar certo.
//
// dica pra apresentacao: abra http://localhost:7474 no navegador,
// logue com neo4j / drinkdex123 e rode no console:
//   MATCH (d:Drink)-[:CONTEM]->(i:Ingrediente) RETURN d, i
// pra ver o grafo inteiro renderizado visualmente

const express = require('express');
const cors = require('cors');
const neo4j = require('neo4j-driver');

const app = express();
app.use(cors());
app.use(express.json());

const NEO4J_URL      = process.env.NEO4J_URL      || 'bolt://localhost:7687';
const NEO4J_USER     = process.env.NEO4J_USER     || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'drinkdex123';
const DRINK_SERVICE_URL = process.env.DRINK_SERVICE_URL || 'http://localhost:3002';

const driver = neo4j.driver(NEO4J_URL, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD));

// sincroniza os drinks do mongodb pro grafo do neo4j
// busca a lista de drinks no drink-service, limpa o grafo e recria
// os nos de Drink, Ingrediente e as relacoes CONTEM
async function sincronizarGrafo() {
  const resposta = await fetch(`${DRINK_SERVICE_URL}/drinks`);
  if (!resposta.ok) throw new Error(`drink-service retornou ${resposta.status}`);
  const drinks = await resposta.json();

  const session = driver.session();
  try {
    // limpa o grafo inteiro antes de recriar (idempotente)
    await session.run('MATCH (n) DETACH DELETE n');

    let totalIngredientes = 0;

    for (const drink of drinks) {
      // cria o no do drink (MERGE = cria se nao existir)
      await session.run(
        `MERGE (d:Drink {id: $id})
         SET d.name = $name, d.category = $category`,
        {
          id: String(drink._id),
          name: drink.name,
          category: drink.category || 'Outros'
        }
      );

      // cria os nos de ingrediente e as relacoes CONTEM
      const ingredientes = drink.ingredients || [];
      for (const ing of ingredientes) {
        if (!ing || !ing.name) continue;
        // normaliza o nome do ingrediente em minusculas pra agrupar
        // "Rum branco" e "rum branco" caem no mesmo no
        const nomeIngrediente = ing.name.trim().toLowerCase();

        await session.run(
          `MERGE (i:Ingrediente {name: $name})
           WITH i
           MATCH (d:Drink {id: $drinkId})
           MERGE (d)-[:CONTEM]->(i)`,
          { name: nomeIngrediente, drinkId: String(drink._id) }
        );
        totalIngredientes++;
      }
    }

    return { drinks: drinks.length, relacoes: totalIngredientes };
  } finally {
    await session.close();
  }
}

// endpoint pra forcar uma sincronizacao manual
// é chamado automaticamente pelo seed.js do drink-service
app.post('/sync', async (req, res) => {
  try {
    const resultado = await sincronizarGrafo();
    res.json({ ok: true, ...resultado });
  } catch (err) {
    console.error('erro no sync:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// retorna ate 5 drinks que mais compartilham ingredientes com o drink informado
// a consulta percorre o grafo: drink -> ingrediente <- outro drink
// e conta quantos ingredientes cada um compartilha
app.get('/similares/:drinkId', async (req, res) => {
  const { drinkId } = req.params;
  const session = driver.session();
  try {
    const resultado = await session.run(
      `MATCH (origem:Drink {id: $drinkId})-[:CONTEM]->(i:Ingrediente)<-[:CONTEM]-(outro:Drink)
       WHERE origem <> outro
       WITH outro, count(DISTINCT i) AS qtdComum, collect(DISTINCT i.name) AS comuns
       RETURN outro.id AS id, outro.name AS name, outro.category AS category,
              qtdComum, comuns
       ORDER BY qtdComum DESC
       LIMIT 5`,
      { drinkId }
    );

    const similares = resultado.records.map(r => ({
      drinkId: r.get('id'),
      name: r.get('name'),
      category: r.get('category'),
      ingredientesEmComum: r.get('qtdComum').toNumber(),
      ingredientes: r.get('comuns')
    }));

    res.json(similares);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await session.close();
  }
});

// ============================================================
// CRUD direto no grafo do neo4j
// alem do /sync em lote, esses 4 endpoints permitem manipular
// o grafo individualmente: criar, ler, atualizar e remover
// ingredientes e suas relacoes com drinks
// ============================================================

// CREATE — adiciona um ingrediente a um drink no grafo
// se o ingrediente nao existir como no, cria. se ja existir, so liga
// ex: POST /ingredientes/abc123/gelo
app.post('/ingredientes/:drinkId/:ingrediente', async (req, res) => {
  const { drinkId } = req.params;
  const ingrediente = req.params.ingrediente.trim().toLowerCase();
  const session = driver.session();
  try {
    const resultado = await session.run(
      `MATCH (d:Drink {id: $drinkId})
       MERGE (i:Ingrediente {name: $ingrediente})
       MERGE (d)-[:CONTEM]->(i)
       RETURN d.name AS drink, i.name AS ingrediente`,
      { drinkId, ingrediente }
    );
    if (resultado.records.length === 0) {
      return res.status(404).json({ error: 'Drink nao encontrado no grafo' });
    }
    const r = resultado.records[0];
    res.status(201).json({
      ok: true,
      drink: r.get('drink'),
      ingrediente: r.get('ingrediente')
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await session.close();
  }
});

// READ — lista os ingredientes que um drink contem no grafo
// ex: GET /drinks/abc123/ingredientes
app.get('/drinks/:drinkId/ingredientes', async (req, res) => {
  const { drinkId } = req.params;
  const session = driver.session();
  try {
    const resultado = await session.run(
      `MATCH (d:Drink {id: $drinkId})
       OPTIONAL MATCH (d)-[:CONTEM]->(i:Ingrediente)
       RETURN d.name AS drink, collect(i.name) AS ingredientes`,
      { drinkId }
    );
    if (resultado.records.length === 0) {
      return res.status(404).json({ error: 'Drink nao encontrado no grafo' });
    }
    const r = resultado.records[0];
    const ingredientes = r.get('ingredientes').filter(x => x !== null);
    res.json({
      drink: r.get('drink'),
      ingredientes
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await session.close();
  }
});

// UPDATE — renomeia um ingrediente em TODO o grafo
// como o ingrediente é um unico no compartilhado por varios drinks,
// renomeia-lo afeta todos os drinks de uma vez (poder do grafo!)
// ex: PUT /ingredientes/rum%20branco/rum%20premium
app.put('/ingredientes/:antigo/:novo', async (req, res) => {
  const antigo = req.params.antigo.trim().toLowerCase();
  const novo = req.params.novo.trim().toLowerCase();
  const session = driver.session();
  try {
    // checa se ja existe um no com o nome novo pra nao criar duplicata
    const conflito = await session.run(
      `MATCH (i:Ingrediente {name: $novo}) RETURN i`,
      { novo }
    );
    if (conflito.records.length > 0 && antigo !== novo) {
      return res.status(409).json({ error: `Ja existe um ingrediente chamado "${novo}"` });
    }

    const resultado = await session.run(
      `MATCH (i:Ingrediente {name: $antigo})
       SET i.name = $novo
       WITH i
       OPTIONAL MATCH (i)<-[:CONTEM]-(d:Drink)
       RETURN i.name AS ingrediente, count(d) AS drinksAfetados`,
      { antigo, novo }
    );
    if (resultado.records.length === 0) {
      return res.status(404).json({ error: `Ingrediente "${antigo}" nao encontrado` });
    }
    const r = resultado.records[0];
    res.json({
      ok: true,
      ingrediente: r.get('ingrediente'),
      drinksAfetados: r.get('drinksAfetados').toNumber()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await session.close();
  }
});

// DELETE — remove a relacao entre um drink e um ingrediente
// se o ingrediente ficar sem nenhum drink ligado, apaga o no tambem
// (mantem o grafo limpo, sem ingredientes orfaos)
// ex: DELETE /ingredientes/abc123/gelo
app.delete('/ingredientes/:drinkId/:ingrediente', async (req, res) => {
  const { drinkId } = req.params;
  const ingrediente = req.params.ingrediente.trim().toLowerCase();
  const session = driver.session();
  try {
    const resultado = await session.run(
      `MATCH (d:Drink {id: $drinkId})-[r:CONTEM]->(i:Ingrediente {name: $ingrediente})
       DELETE r
       WITH i
       CALL {
         WITH i
         MATCH (i)<-[:CONTEM]-()
         RETURN count(*) AS aindaUsado
       }
       FOREACH (_ IN CASE WHEN aindaUsado = 0 THEN [1] ELSE [] END | DELETE i)
       RETURN aindaUsado`,
      { drinkId, ingrediente }
    );
    if (resultado.records.length === 0) {
      return res.status(404).json({ error: 'Relacao drink-ingrediente nao encontrada' });
    }
    const aindaUsado = resultado.records[0].get('aindaUsado').toNumber();
    res.json({
      ok: true,
      relacaoRemovida: true,
      ingredienteRemovidoDoGrafo: aindaUsado === 0
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await session.close();
  }
});

// ============================================================

// retorna o top 10 ingredientes mais usados em todos os drinks
// util pra estatisticas e pra mostrar a "centralidade" no grafo
app.get('/ingredientes/populares', async (req, res) => {
  const session = driver.session();
  try {
    const resultado = await session.run(
      `MATCH (i:Ingrediente)<-[:CONTEM]-(d:Drink)
       RETURN i.name AS ingrediente, count(d) AS qtdDrinks
       ORDER BY qtdDrinks DESC
       LIMIT 10`
    );
    const populares = resultado.records.map(r => ({
      ingrediente: r.get('ingrediente'),
      qtdDrinks: r.get('qtdDrinks').toNumber()
    }));
    res.json(populares);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await session.close();
  }
});

// healthcheck simples
app.get('/health', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3004;

// aguarda o neo4j ficar realmente disponivel antes de subir o servidor
// o healthcheck do compose ajuda mas o bolt as vezes demora um pouco mais
async function aguardarNeo4j() {
  for (let i = 0; i < 30; i++) {
    try {
      await driver.verifyConnectivity();
      console.log('neo4j conectado');
      return;
    } catch (err) {
      console.log(`aguardando neo4j... (${i + 1}/30)`);
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  throw new Error('nao conseguiu conectar no neo4j apos 30 tentativas');
}

aguardarNeo4j()
  .then(() => {
    app.listen(PORT, () => console.log(`recommendation-service rodando na porta ${PORT}`));
  })
  .catch(err => {
    console.error('erro fatal:', err.message);
    process.exit(1);
  });
