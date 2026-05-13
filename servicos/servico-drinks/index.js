// drink-service — gerencia todas as receitas de drinks
// banco: MongoDB
//
// escolhemos mongo aqui pq cada drink é muito diferente do outro,
// um tem 3 ingredientes outro tem 10, alguns tem foto outros nao tem,
// entao um schema fixo do postgres nao faria muito sentido aqui.
// com mongo a gente so define o que quiser e pronto

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// schema do drink — define os campos mas o mongo nao obriga todos
// só o name é required mesmo
const drinkSchema = new mongoose.Schema({
  name:         { type: String, required: true },
  category:     { type: String, default: 'Outros' },
  description:  String,
  ingredients:  [{ name: String, amount: String }], // array de objetos, cada um com nome e quantidade
  instructions: String,
  image:        String,  // url da imagem
  tags:         [String],
  createdAt:    { type: Date, default: Date.now }
});

// indice de texto pra conseguir buscar por nome, descricao e tags
// sem isso nao funciona o ?q= na listagem
drinkSchema.index({ name: 'text', description: 'text', tags: 'text' });

const Drink = mongoose.model('Drink', drinkSchema);

// lista todos os drinks
// aceita query params: ?q=mojito pra busca e ?category=Classico pra filtrar
app.get('/drinks', async (req, res) => {
  try {
    const { q, category } = req.query;
    const filtro = {};

    if (q) filtro.$text = { $search: q };
    if (category) filtro.category = category;

    // ordena do mais novo pro mais antigo
    const drinks = await Drink.find(filtro).sort({ createdAt: -1 });
    res.json(drinks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// busca um drink especifico pelo id do mongo (aquele _id grande)
app.get('/drinks/:id', async (req, res) => {
  try {
    const drink = await Drink.findById(req.params.id);
    if (!drink) return res.status(404).json({ error: 'Drink não encontrado' });
    res.json(drink);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// cria um novo drink
// o body pode ter qualquer campo do schema
app.post('/drinks', async (req, res) => {
  try {
    const drink = new Drink(req.body);
    await drink.save();
    res.status(201).json(drink);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// atualiza um drink existente
// { new: true } faz retornar o documento ja atualizado e nao o antigo
app.put('/drinks/:id', async (req, res) => {
  try {
    const drink = await Drink.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!drink) return res.status(404).json({ error: 'Drink não encontrado' });
    res.json(drink);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// deleta um drink pelo id
app.delete('/drinks/:id', async (req, res) => {
  try {
    const drink = await Drink.findByIdAndDelete(req.params.id);
    if (!drink) return res.status(404).json({ error: 'Drink não encontrado' });
    res.json({ message: 'Drink removido com sucesso' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// conecta no mongo e sobe o servidor
const PORT = process.env.PORT || 3002;
const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/drinkdex';

mongoose.connect(MONGO_URL)
  .then(() => {
    console.log('mongodb conectado');
    app.listen(PORT, () => console.log(`drink-service rodando na porta ${PORT}`));
  })
  .catch(err => {
    console.error('erro ao conectar no mongodb:', err.message);
    process.exit(1);
  });
