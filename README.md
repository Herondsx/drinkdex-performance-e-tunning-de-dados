# 🍹 DrinkDex — Catálogo de Drinks e Coquetéis

> Projeto da disciplina **Tuning de Dados** — Polyglot Persistence
> Fundação Educacional Inaciana Padre Sabóia de Medeiros (FEI)

![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-FF4438?style=for-the-badge&logo=redis&logoColor=white)
![Neo4j](https://img.shields.io/badge/Neo4j-4581C3?style=for-the-badge&logo=neo4j&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)

---

## 👥 Integrantes

| Nome | RA |
|------|----|
| Heron de Souza | 22.223.009-6 |
| João Mateus E. B. da Silva | 22.223.013-8 |
| Matheus Concon | 22.124.089-8 |
| Dante Ryuichi Kawazu | 22.125.083.0 |

---

## Sobre o projeto

O DrinkDex é um catalogo de drinks e coquetéis onde o usuario pode se cadastrar, explorar receitas, favoritar bebidas e ver quais drinks estão sendo mais acessados em tempo real.

A ideia principal do projeto é demonstrar o conceito de **Polyglot Persistence**, que basicamente é usar o banco de dados mais adequado pra cada tipo de dado, em vez de enfiar tudo num banco só. Cada banco tem um ponto forte e a gente tentou aproveitar isso:

- Dados de usuario sao bem estruturados e precisam de consistencia → **PostgreSQL** (relacional)
- Receitas de drinks variam muito entre si (ingredientes, modo de preparo, etc) → **MongoDB** (documento)
- Rankings e favoritos precisam ser rapidos e nao precisam de persistencia forte → **Redis** (chave-valor em memoria)
- Recomendações baseadas em ingredientes compartilhados sao naturalmente um grafo → **Neo4j** (grafo)

---

## Arquitetura

```mermaid
flowchart TB
    FE["🖥️ Frontend<br/>porta 3000<br/><i>HTML + CSS + JS puro</i>"]

    subgraph BE["Backend — 4 serviços Node.js"]
        direction LR
        US["👤 user-service<br/>porta 3001"]
        DS["🍹 drink-service<br/>porta 3002"]
        AS["📊 activity-service<br/>porta 3003"]
        RS["🔗 recommendation-service<br/>porta 3004"]
    end

    PG[("🐘 PostgreSQL<br/>porta 5432<br/><i>relacional</i>")]
    MG[("🍃 MongoDB<br/>porta 27017<br/><i>documento</i>")]
    RD[("⚡ Redis<br/>porta 6379<br/><i>chave-valor</i>")]
    N4[("🕸️ Neo4j<br/>portas 7474 / 7687<br/><i>grafo</i>")]

    FE -- "chamadas REST" --> US
    FE -- "chamadas REST" --> DS
    FE -- "chamadas REST" --> AS
    FE -- "chamadas REST" --> RS

    US --- PG
    DS --- MG
    AS --- RD
    RS --- N4

    classDef frontend fill:#f59e0b,stroke:#d97706,color:#0f0f13,stroke-width:2px
    classDef service fill:#1a1a24,stroke:#f59e0b,color:#f0f0eb,stroke-width:2px
    classDef db fill:#24243a,stroke:#9999aa,color:#f0f0eb,stroke-width:2px

    class FE frontend
    class US,DS,AS,RS service
    class PG,MG,RD,N4 db
```

---

## Escolha dos Bancos de Dados

### PostgreSQL — dados de usuario

Usuarios tem nome, email, senha, data de cadastro — tudo muito bem definido e esses dados não mudam. Além disso, a gente precisa garantir que dois usuarios não tenham o mesmo email, o que é exatamente o tipo de coisa que um banco relacional faz bem com constraints. Escolhemos o PostgreSQL pela robustez e suporte completo a ACID.

### MongoDB — receitas de drinks

Cada drink é diferente. Um tem 3 ingredientes, outro tem 10. Um tem foto, outro nao tem. Tentar modelar isso numa tabela relacional seria bem complicado (varias tabelas, varios joins). No MongoDB a gente só cria um documento com o que precisar e pronto. Tambem usamos o indice de texto do mongo pra fazer busca por nome e ingredientes.

### Redis — ranking, favoritos e historico

Pra saber quais drinks estão sendo mais acessados em tempo real, precisamos de algo extremamente rápido. O Redis tem uma estrutura chamada **Sorted Set** que é perfeita pra isso — cada drink tem um "score" que a gente incrementa a cada visualização e daí pede os top 10. Pra favoritos usamos **Set** (sem duplicatas automático) e pra histórico usamos **List** (ordenada por inserção).

### Neo4j — recomendacoes por ingredientes

Recomendar drinks similares ("se voce gostou de Mojito, talvez goste de Daiquiri") é um problema classicamente resolvido com **grafos**. Cada drink vira um no, cada ingrediente vira um no, e a gente cria a relação `(Drink)-[:CONTEM]->(Ingrediente)`. Pra recomendar drinks parecidos basta uma travessia de grafo: "quais outros drinks compartilham mais ingredientes com este?".

Fazer isso no PostgreSQL exigiria varios JOINs em tabelas de drinks, ingredientes e relacionamentos, e a query ficaria pesada. No Mongo, daria pra fazer com `$lookup` mas perderia a expressividade. No Neo4j a consulta é uma linha de **Cypher**:

```cypher
MATCH (origem:Drink {id: $id})-[:CONTEM]->(i)<-[:CONTEM]-(outro:Drink)
RETURN outro, count(i) AS ingredientesEmComum
ORDER BY ingredientesEmComum DESC
```

Outra vantagem é que o Neo4j vem com uma **interface web em http://localhost:7474** onde da pra visualizar o grafo renderizado — otimo pra mostrar como os drinks estao conectados pelos ingredientes durante a apresentacao.

---

## Estrutura de pastas

```
drinkdex/
├── docker-compose.yml
├── servicos/
│   ├── servico-usuarios/        → Node.js + PostgreSQL
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── index.js
│   ├── servico-drinks/          → Node.js + MongoDB
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   ├── index.js
│   │   └── seed.js              → popula o banco com drinks de exemplo
│   ├── servico-atividades/      → Node.js + Redis
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── index.js
│   └── servico-recomendacoes/   → Node.js + Neo4j
│       ├── Dockerfile
│       ├── package.json
│       └── index.js
└── frontend/
    ├── Dockerfile
    └── public/
        ├── index.html              → pagina principal do DrinkDex (catalogo)
        ├── style.css
        ├── app.js
        ├── painel.html             → painel de monitoramento dos 4 bancos
        ├── painel.css
        └── painel.js
```

---

## Como executar

### 1. Habilitar o Hyper-V (Windows 11 Pro)

O Docker usa o Hyper-V pra criar os containers. No Windows 11 Pro ele ja vem disponivel mas precisa ser ativado.

Abra o PowerShell como **Administrador** e rode:

```powershell
dism.exe /online /enable-feature /featurename:Microsoft-Hyper-V /all /norestart
dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart
```

Depois **reinicie o computador**. Isso é obrigatorio, sem reiniciar o Hyper-V nao ativa.

---

### 2. Instalar o Docker Desktop

Baixe o instalador em: **https://www.docker.com/products/docker-desktop**

Durante a instalacao, deixe marcada a opcao **"Use WSL 2 instead of Hyper-V"** desmarcada — no Pro a gente usa Hyper-V mesmo.

Apos instalar, abra o Docker Desktop e aguarde o icone na barra de tarefas ficar verde. Isso significa que o engine ta rodando.

Pra confirmar que funcionou, abra o PowerShell e rode:

```powershell
docker --version
```

Se aparecer algo como `Docker version 27.x.x` ta tudo certo.

---

### 3. Clonar ou baixar o repositorio

Se tiver git instalado:

```bash
git clone https://github.com/Herondsx/drinkdex-performance-e-tunning-de-dados
cd drinkdex
```

Ou baixe o .zip pelo GitHub e extraia a pasta normalmente.

---

### 4. Subir todos os servicos

Com o Docker Desktop aberto e rodando, abra o terminal **dentro da pasta do projeto** (onde esta o `docker-compose.yml`) e rode:

```bash
docker compose up --build
```

Na primeira vez demora mais pq ele baixa as imagens do PostgreSQL, MongoDB, Redis, Neo4j e Node. Das proximas vezes é bem mais rapido.

Quando aparecer no terminal algo como `frontend`, `user-service`, `drink-service`, `activity-service` e `recommendation-service` todos com "rodando na porta...", ta pronto.

> **Atencao com o Neo4j:** ele demora uns ~30 segundos a mais que os outros pra ficar pronto. Se o `recommendation-service` reiniciar algumas vezes nos primeiros segundos, é normal — ele esta esperando o Neo4j subir.

---

### 5. Popular o banco com drinks de exemplo

Abre outro terminal (com os containers ainda rodando) e execute:

```bash
docker compose exec drink-service npm run seed
```

Isso insere 10 drinks classicos (Mojito, Caipirinha, Margarita, Old Fashioned, etc.) pra ja ter conteudo na hora de abrir o sistema. Logo depois de inserir, o seed avisa automaticamente o `recommendation-service` pra **construir o grafo de ingredientes no Neo4j**, entao as recomendacoes ja saem prontas.

> Se quiser refazer o grafo manualmente em algum momento:
> ```bash
> curl -X POST http://localhost:3004/sync
> ```

---

### 6. Acessar a aplicacao

| O que é | Endereço |
|---------|---------|
| **Frontend (interface)** | http://localhost:3000 |
| **Painel de Monitoramento** (dashboard dos 4 bancos) | http://localhost:3000/painel.html |
| API de Usuarios | http://localhost:3001 |
| API de Drinks | http://localhost:3002 |
| API de Atividades | http://localhost:3003 |
| API de Recomendacoes | http://localhost:3004 |
| **Neo4j Browser** (visualiza o grafo) | http://localhost:7474 |

Abra o http://localhost:3000 no navegador e o sistema ja deve estar funcionando.

> **Dica pra apresentacao:** abra tambem o http://localhost:7474 num segunda aba. Logue com usuario `neo4j` e senha `drinkdex123` e rode no console:
> ```cypher
> MATCH (d:Drink)-[:CONTEM]->(i:Ingrediente) RETURN d, i
> ```
> Vai aparecer o grafo inteiro renderizado em forma visual, mostrando como os drinks compartilham ingredientes. Da pra mexer, arrastar e zoom — fica bem demonstrativo.

---

## 📊 Painel de Monitoramento

Alem do frontend do DrinkDex, o projeto inclui um **painel de monitoramento** acessivel em http://localhost:3000/painel.html (ou clicando no botao **"📊 Painel"** no canto superior direito da tela principal).

Esse painel mostra **os 4 bancos operando em tempo real**, ideal para a apresentacao:

- **4 cards lado a lado**, um para cada banco (PostgreSQL, MongoDB, Redis, Neo4j)
- **Contadores em tempo real** com auto-refresh a cada 3 segundos
- **Indicador de status** (verde = online, vermelho = offline) em cada banco
- **Botoes de acao** que disparam operacoes ao vivo:
    - Criar usuario teste (insere no PostgreSQL)
    - Criar drink teste (insere no MongoDB)
    - Visualizar drink aleatorio (incrementa ranking no Redis)
    - Re-sincronizar grafo (recria os nos no Neo4j)
- **Log de atividades** mostrando qual API foi chamada e a resposta
- **Animacao de "flash"** no card quando os dados mudam

Recomendado para a apresentacao: deixar o painel aberto numa aba e clicar nos botoes para o professor ver os bancos populando em tempo real, com a contagem subindo e os cards piscando.

---

### Parar os containers

```bash
docker compose down
```

Os dados ficam salvos nos volumes do Docker, entao na proxima vez que subir com `docker compose up` tudo continua como estava.

---

## Endpoints principais

### User Service (3001)

| Metodo | Rota | O que faz |
|--------|------|-----------|
| POST | `/register` | Cadastra novo usuario |
| POST | `/login` | Faz login e retorna token JWT |
| GET | `/users` | Lista todos os usuarios |
| GET | `/users/:id` | Busca usuario por ID |
| PUT | `/users/:id` | Atualiza nome ou email |
| DELETE | `/users/:id` | Remove usuario |

### Drink Service (3002)

| Metodo | Rota | O que faz |
|--------|------|-----------|
| GET | `/drinks` | Lista drinks (aceita `?q=busca` e `?category=tipo`) |
| GET | `/drinks/:id` | Busca drink pelo ID |
| POST | `/drinks` | Cadastra novo drink |
| PUT | `/drinks/:id` | Atualiza drink |
| DELETE | `/drinks/:id` | Remove drink |

### Activity Service (3003)

| Metodo | Rota | O que faz |
|--------|------|-----------|
| POST | `/view/:drinkId` | Registra que alguem visualizou o drink |
| GET | `/ranking` | Retorna top 10 mais acessados |
| POST | `/favorites/:userId/:drinkId` | Adiciona nos favoritos |
| DELETE | `/favorites/:userId/:drinkId` | Remove dos favoritos |
| GET | `/favorites/:userId` | Lista favoritos do usuario |
| GET | `/history/:userId` | Historico de visualizacoes |

### Recommendation Service (3004)

| Metodo | Rota | O que faz | Operacao CRUD |
|--------|------|-----------|---------------|
| POST | `/ingredientes/:drinkId/:ingrediente` | Adiciona um ingrediente a um drink no grafo | **Create** |
| GET | `/drinks/:drinkId/ingredientes` | Lista os ingredientes de um drink no grafo | **Read** |
| PUT | `/ingredientes/:antigo/:novo` | Renomeia um ingrediente em todos os drinks | **Update** |
| DELETE | `/ingredientes/:drinkId/:ingrediente` | Remove a relacao entre drink e ingrediente | **Delete** |
| POST | `/sync` | Recria o grafo todo a partir dos drinks no MongoDB | (bulk write) |
| GET | `/similares/:drinkId` | Top 5 drinks com mais ingredientes em comum | (consulta de grafo) |
| GET | `/ingredientes/populares` | Top 10 ingredientes mais usados entre todos os drinks | (agregacao) |

---

Depois de cada comando, volte no Neo4j Browser e clique em "Run" de novo na query inicial. Voce vai ver o grafo se transformando em tempo real — adicionando nos, renomeando, removendo conexoes.

