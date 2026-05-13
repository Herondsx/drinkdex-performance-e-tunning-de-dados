// script pra popular o banco com alguns drinks de exemplo
// roda com: docker compose exec drink-service npm run seed
//
// apaga tudo que tinha antes e insere os drinks abaixo
// util pra demo e apresentacao

const mongoose = require('mongoose');

const drinkSchema = new mongoose.Schema({
  name:         String,
  category:     String,
  description:  String,
  ingredients:  [{ name: String, amount: String }],
  instructions: String,
  image:        String,
  tags:         [String],
  createdAt:    { type: Date, default: Date.now }
});

const Drink = mongoose.model('Drink', drinkSchema);

// os 10 drinks que vao aparecer no sistema
const drinks = [
  {
    name: 'Mojito',
    category: 'Clássico',
    description: 'O clássico coquetel cubano de rum com hortelã e limão, refrescante e aromático.',
    ingredients: [
      { amount: '50ml',              name: 'Rum branco' },
      { amount: '30ml',              name: 'Suco de limão fresco' },
      { amount: '2 colheres de chá', name: 'Açúcar' },
      { amount: '10 folhas',         name: 'Hortelã fresca' },
      { amount: 'q.s.',              name: 'Água com gás' }
    ],
    instructions: 'Macere a hortelã com o açúcar e o suco de limão no fundo do copo. Adicione gelo picado, o rum e complete com água com gás. Mexa suavemente e decore com um ramo de hortelã.',
    image: 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=600',
    tags: ['refrescante', 'verão', 'rum', 'cubano', 'hortelã']
  },
  {
    name: 'Caipirinha',
    category: 'Clássico',
    description: 'O drinque nacional brasileiro: cachaça, limão e açúcar. Simples e irresistível.',
    ingredients: [
      { amount: '60ml',              name: 'Cachaça' },
      { amount: '1 unidade',         name: 'Limão taiti' },
      { amount: '2 colheres de chá', name: 'Açúcar' },
      { amount: 'q.s.',              name: 'Gelo picado' }
    ],
    instructions: 'Corte o limão em 4 partes, remova o miolo branco e coloque no copo. Adicione o açúcar e macere bem. Complete com gelo picado e a cachaça. Mexa vigorosamente.',
    image: 'https://images.unsplash.com/photo-1607446045875-ef9f5bbff469?w=600',
    tags: ['brasileiro', 'cachaça', 'limão', 'clássico', 'tropical']
  },
  {
    name: 'Margarita',
    category: 'Clássico',
    description: 'Coquetel mexicano à base de tequila com lima e sal na borda. Equilibrado e marcante.',
    ingredients: [
      { amount: '50ml', name: 'Tequila prata' },
      { amount: '25ml', name: 'Licor de laranja (Cointreau)' },
      { amount: '25ml', name: 'Suco de lima fresca' },
      { amount: 'q.s.', name: 'Sal grosso (para a borda)' }
    ],
    instructions: 'Passe uma fatia de lima na borda do copo e mergulhe em sal grosso. Em uma coqueteleira com gelo, adicione a tequila, o cointreau e o suco de lima. Agite bem e sirva coado.',
    image: 'https://images.unsplash.com/photo-1556855810-ac404aa91e85?w=600',
    tags: ['mexicano', 'tequila', 'azedo', 'clássico']
  },
  {
    name: 'Old Fashioned',
    category: 'Clássico',
    description: 'Um dos coquetéis mais antigos e respeitados. Bourbon, açúcar e angostura bitters.',
    ingredients: [
      { amount: '60ml',          name: 'Bourbon ou Rye Whiskey' },
      { amount: '1 cubo',        name: 'Açúcar' },
      { amount: '2 dashes',      name: 'Angostura bitters' },
      { amount: 'algumas gotas', name: 'Água' }
    ],
    instructions: 'No copo, dissolva o cubo de açúcar com a angostura e um pouco de água. Adicione gelo grande e o whiskey. Mexa delicadamente por 30 segundos. Decore com twist de casca de laranja.',
    image: 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=600',
    tags: ['whiskey', 'forte', 'clássico', 'sem gás', 'bourbon']
  },
  {
    name: 'Cosmopolitan',
    category: 'Clássico',
    description: 'O elegante coquetel rosé popularizado por Sex and the City. Vodka, cranberry e lima.',
    ingredients: [
      { amount: '45ml', name: 'Vodka cítrica' },
      { amount: '15ml', name: 'Licor de laranja (Cointreau)' },
      { amount: '30ml', name: 'Suco de cranberry' },
      { amount: '15ml', name: 'Suco de lima fresca' }
    ],
    instructions: 'Em uma coqueteleira com gelo, combine todos os ingredientes. Agite vigorosamente até gelar bem. Sirva coado em uma taça de coquetel. Decore com twist de limão.',
    image: 'https://images.unsplash.com/photo-1571950006814-bfe84d4e5b82?w=600',
    tags: ['vodka', 'rosé', 'elegante', 'cranberry']
  },
  {
    name: 'Negroni',
    category: 'Clássico',
    description: 'O amargor equilibrado do Negroni é um clássico italiano com gin, Campari e vermute.',
    ingredients: [
      { amount: '30ml', name: 'Gin' },
      { amount: '30ml', name: 'Campari' },
      { amount: '30ml', name: 'Vermute tinto (Rosso)' }
    ],
    instructions: 'Em um copo baixo com gelo, adicione o gin, o Campari e o vermute em partes iguais. Mexa bem por 20 segundos. Decore com uma rodela ou twist de laranja.',
    image: 'https://images.unsplash.com/photo-1563898105-b5f9b57c0d4d?w=600',
    tags: ['gin', 'amargo', 'italiano', 'clássico', 'sem gás']
  },
  {
    name: 'Piña Colada',
    category: 'Tropical',
    description: 'O sabor do Caribe em cada gole. Rum, creme de coco e abacaxi cremoso.',
    ingredients: [
      { amount: '60ml',     name: 'Rum branco' },
      { amount: '90ml',     name: 'Suco de abacaxi' },
      { amount: '45ml',     name: 'Creme de coco' },
      { amount: '1 xícara', name: 'Gelo' }
    ],
    instructions: 'Bata todos os ingredientes no liquidificador com o gelo até ficar cremoso. Sirva em um copo alto e decore com abacaxi e cereja.',
    image: 'https://images.unsplash.com/photo-1585238342024-78d387f4a707?w=600',
    tags: ['tropical', 'rum', 'coco', 'abacaxi', 'caribenho', 'verão']
  },
  {
    name: 'Gin Tônica',
    category: 'Long Drinks',
    description: 'O clássico refrescante britânico. Gin de qualidade com água tônica e botânicos.',
    ingredients: [
      { amount: '50ml',    name: 'Gin' },
      { amount: '150ml',   name: 'Água tônica gelada' },
      { amount: '1 fatia', name: 'Pepino ou limão (para decorar)' },
      { amount: 'q.s.',    name: 'Gelo' }
    ],
    instructions: 'Coloque gelo em abundância em um copo balão. Despeje o gin e complete com a água tônica gelada. Mexa suavemente para não perder o gás. Decore com pepino, limão ou botânicos.',
    image: 'https://images.unsplash.com/photo-1548396739-5305372e91c1?w=600',
    tags: ['gin', 'refrescante', 'britânico', 'tônica', 'aromático']
  },
  {
    name: 'Aperol Spritz',
    category: 'Long Drinks',
    description: 'O aperitivo italiano da moda. Leve, colorido e perfeitamente refrescante.',
    ingredients: [
      { amount: '90ml',    name: 'Prosecco' },
      { amount: '60ml',    name: 'Aperol' },
      { amount: '30ml',    name: 'Água com gás' },
      { amount: '1 fatia', name: 'Laranja' }
    ],
    instructions: 'Em um copo de vinho com bastante gelo, adicione o prosecco, o Aperol e a água com gás na proporção 3-2-1. Mexa levemente e decore com uma fatia de laranja.',
    image: 'https://images.unsplash.com/photo-1560508180-03f285f67ded?w=600',
    tags: ['italiano', 'aperitivo', 'prosecco', 'laranja', 'refrescante', 'leve']
  },
  {
    name: 'Daiquiri',
    category: 'Clássico',
    description: 'Simplicidade em forma de coquetel. Rum, limão e açúcar em perfeita harmonia.',
    ingredients: [
      { amount: '60ml', name: 'Rum branco' },
      { amount: '30ml', name: 'Suco de limão fresco' },
      { amount: '15ml', name: 'Xarope de açúcar simples' }
    ],
    instructions: 'Em uma coqueteleira com gelo, adicione o rum, o suco de limão e o xarope. Agite vigorosamente por 15 segundos. Sirva coado em uma taça de coquetel gelada.',
    image: 'https://images.unsplash.com/photo-1541614101331-1a5a3a194e92?w=600',
    tags: ['rum', 'limão', 'clássico', 'cubano', 'simples']
  }
];

const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/drinkdex';
const RECOMMENDATION_URL = process.env.RECOMMENDATION_URL || 'http://recommendation-service:3004';

// depois de inserir os drinks no mongo a gente avisa o recommendation-service
// pra ele recriar o grafo de ingredientes no neo4j. assim nao precisa
// rodar dois comandos diferentes pra popular tudo
async function sincronizarRecomendacoes() {
  try {
    const resposta = await fetch(`${RECOMMENDATION_URL}/sync`, { method: 'POST' });
    if (!resposta.ok) throw new Error(`status ${resposta.status}`);
    const dados = await resposta.json();
    console.log(`grafo sincronizado: ${dados.drinks} drinks, ${dados.relacoes} relacoes`);
  } catch (err) {
    // nao trava o seed se o recommendation-service ainda nao estiver pronto.
    // basta o usuario rodar: curl -X POST http://localhost:3004/sync
    console.log('aviso: nao foi possivel sincronizar o grafo agora —', err.message);
    console.log('rode manualmente depois: curl -X POST http://localhost:3004/sync');
  }
}

mongoose.connect(MONGO_URL)
  .then(async () => {
    console.log('conectado. limpando colecao antiga...');
    await Drink.deleteMany({});

    await Drink.insertMany(drinks);
    console.log(`${drinks.length} drinks inseridos com sucesso!`);

    await sincronizarRecomendacoes();

    process.exit(0);
  })
  .catch(err => {
    console.error('deu erro no seed:', err.message);
    process.exit(1);
  });
