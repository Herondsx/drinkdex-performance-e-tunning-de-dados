// activity-service — ranking, favoritos e historico de navegacao
// banco: Redis
//
// esse servico usa o redis pq os dados aqui sao bem diferentes dos outros,
// a gente nao precisa persistir com tanta seguranca, o que importa é velocidade.
// tipo, saber que o mojito foi visto 47 vezes nao precisa de transacao ACID kkkk
//
// estruturas do redis que a gente usa aqui:
//   Sorted Set  -> ranking de views (zincrby / zrevrange)
//   List        -> historico de visualizacoes por usuario (lpush / lrange)
//   Set         -> favoritos por usuario (sadd / srem / smembers)

const express = require('express');
const Redis = require('ioredis');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

redis.on('connect', () => console.log('redis conectado'));
redis.on('error', (err) => console.error('redis error:', err.message));

// nomes das chaves no redis
const CHAVE_RANKING     = 'drink:ranking';
const PREFIXO_HISTORICO = 'user:history:';
const PREFIXO_FAVORITOS = 'user:favorites:';

// registra que alguem visualizou um drink
// incrementa o placar do drink no sorted set de ranking
// e se tiver userId, adiciona no historico do usuario
app.post('/view/:drinkId', async (req, res) => {
  const { drinkId } = req.params;
  const { userId } = req.body;

  try {
    // zincrby incrementa o score do drinkId no sorted set
    // se ele nao existir ainda, cria com score 1
    await redis.zincrby(CHAVE_RANKING, 1, drinkId);

    if (userId) {
      // lpush adiciona no inicio da lista (mais recente primeiro)
      await redis.lpush(`${PREFIXO_HISTORICO}${userId}`, drinkId);

      // ltrim mantém so os ultimos 50 pra nao deixar a lista crescer infinitamente
      await redis.ltrim(`${PREFIXO_HISTORICO}${userId}`, 0, 49);
    }

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// retorna o top 10 drinks mais visualizados
// zrevrange retorna do maior score pro menor (decrescente)
app.get('/ranking', async (req, res) => {
  try {
    // o WITHSCORES faz vir alternado: [id, score, id, score, ...]
    const resultado = await redis.zrevrange(CHAVE_RANKING, 0, 9, 'WITHSCORES');

    // converte o array plano em array de objetos
    const ranking = [];
    for (let i = 0; i < resultado.length; i += 2) {
      ranking.push({
        drinkId: resultado[i],
        views: parseInt(resultado[i + 1])
      });
    }

    res.json(ranking);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// adiciona um drink nos favoritos do usuario
// sadd nao adiciona duplicata, entao pode chamar varias vezes sem problema
app.post('/favorites/:userId/:drinkId', async (req, res) => {
  const { userId, drinkId } = req.params;
  try {
    await redis.sadd(`${PREFIXO_FAVORITOS}${userId}`, drinkId);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// remove dos favoritos
app.delete('/favorites/:userId/:drinkId', async (req, res) => {
  const { userId, drinkId } = req.params;
  try {
    await redis.srem(`${PREFIXO_FAVORITOS}${userId}`, drinkId);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// lista todos os favoritos do usuario
// smembers retorna todos os elementos do set (sem ordem especifica)
app.get('/favorites/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const favoritos = await redis.smembers(`${PREFIXO_FAVORITOS}${userId}`);
    res.json(favoritos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// retorna os ultimos 20 drinks que o usuario viu
app.get('/history/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    // lrange pega da posicao 0 ate 19 (20 itens)
    const historico = await redis.lrange(`${PREFIXO_HISTORICO}${userId}`, 0, 19);
    res.json(historico);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3003;
app.listen(PORT, () => console.log(`activity-service rodando na porta ${PORT}`));
