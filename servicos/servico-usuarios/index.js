// user-service — responsavel por tudo relacionado a usuarios
// aqui a gente faz cadastro, login e o CRUD basico
// banco usado: PostgreSQL (escolhemos ele pq os dados de usuario sao bem estruturados
// e precisam de consistencia, tipo nao pode ter dois emails iguais etc)

const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');   // pra fazer hash da senha, nunca salva senha pura
const jwt = require('jsonwebtoken'); // token de autenticacao
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// conecta no banco usando a variavel de ambiente que vem do docker-compose
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const JWT_SECRET = process.env.JWT_SECRET || 'drinkdex_secret';

// cria a tabela se nao existir ainda
// o IF NOT EXISTS garante que nao vai perder dado se reiniciar o container
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id         SERIAL PRIMARY KEY,
      name       VARCHAR(100) NOT NULL,
      email      VARCHAR(150) UNIQUE NOT NULL,
      password   VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log('tabela users ok');
}

// as vezes o postgres demora pra subir entao a gente tenta varias vezes
// sem isso o servico crasha antes do banco estar pronto
async function aguardarBanco(tentativas = 10) {
  for (let i = 0; i < tentativas; i++) {
    try {
      await pool.query('SELECT 1');
      return;
    } catch {
      console.log(`postgres ainda nao ta pronto... tentativa ${i + 1}`);
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  throw new Error('nao conseguiu conectar no postgres');
}

// rota de cadastro
// recebe name, email e password no body
app.post('/register', async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password)
    return res.status(400).json({ error: 'Campos obrigatórios faltando' });

  try {
    // faz o hash da senha com salt 10 (padrao seguro)
    const hashed = await bcrypt.hash(password, 10);

    const result = await pool.query(
      'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email, created_at',
      [name, email, hashed]
    );

    const user = result.rows[0];

    // gera o token jwt valido por 7 dias
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({ user, token });
  } catch (err) {
    // codigo 23505 é violacao de unique constraint = email duplicado
    if (err.code === '23505') return res.status(409).json({ error: 'E-mail já cadastrado' });
    res.status(500).json({ error: err.message });
  }
});

// rota de login
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ error: 'E-mail e senha obrigatórios' });

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    // nao fala se o email nao existe ou a senha ta errada, por seguranca
    if (!user) return res.status(401).json({ error: 'Credenciais inválidas' });

    const senhaCorreta = await bcrypt.compare(password, user.password);
    if (!senhaCorreta) return res.status(401).json({ error: 'Credenciais inválidas' });

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    // retorna sem a senha no objeto
    res.json({
      user: { id: user.id, name: user.name, email: user.email, created_at: user.created_at },
      token
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// lista todos usuarios (sem a senha obviamente)
app.get('/users', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, created_at FROM users ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// busca usuario por id
app.get('/users/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, created_at FROM users WHERE id = $1',
      [req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// atualiza nome e/ou email
// o COALESCE mantem o valor antigo se nao mandar o campo novo
app.put('/users/:id', async (req, res) => {
  const { name, email } = req.body;
  try {
    const result = await pool.query(
      'UPDATE users SET name = COALESCE($1, name), email = COALESCE($2, email) WHERE id = $3 RETURNING id, name, email, created_at',
      [name, email, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// deleta usuario
app.delete('/users/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM users WHERE id = $1 RETURNING id',
      [req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json({ message: 'Usuário removido com sucesso' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// sobe o servidor
const PORT = process.env.PORT || 3001;

aguardarBanco()
  .then(initDB)
  .then(() => {
    app.listen(PORT, () => console.log(`user-service rodando na porta ${PORT}`));
  })
  .catch(err => {
    console.error('erro ao inicializar:', err.message);
    process.exit(1);
  });
