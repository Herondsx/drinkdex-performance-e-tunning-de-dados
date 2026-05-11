# 🍹 DrinkDex — Catálogo de Drinks e Coquetéis

> Projeto da disciplina **Tuning de Dados** — Polyglot Persistence
> Fundação Educacional Inaciana Padre Sabóia de Medeiros (FEI)

![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-FF4438?style=for-the-badge&logo=redis&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)

---

## 👥 Integrantes

| Nome | RA |
|------|----|
| Heron de Souza | 22.223.009-6 |
| João Mateus E. B. da Silva | 22.223.013-8 |
| Matheus Concon | xxxxxxx |
| Dante Ryuk | xxxxxxx |

---

## Sobre o projeto

O DrinkDex é um catalogo de drinks e coquetéis onde o usuario pode se cadastrar, explorar receitas, favoritar bebidas e ver quais drinks estão sendo mais acessados em tempo real.

A ideia principal do projeto é demonstrar o conceito de **Polyglot Persistence**, que basicamente é usar o banco de dados mais adequado pra cada tipo de dado, em vez de enfiar tudo num banco só. Cada banco tem um ponto forte e a gente tentou aproveitar isso:

- Dados de usuario sao bem estruturados e precisam de consistencia → **PostgreSQL**
- Receitas de drinks variam muito entre si (ingredientes, modo de preparo, etc) → **MongoDB**
- Rankings e favoritos precisam ser rapidos e nao precisam de persistencia forte → **Redis**

---

## Arquitetura

```
┌─────────────┐
│   Frontend  │  (porta 3000 — HTML, CSS e JS puro)
└──────┬──────┘
       │ chamadas REST
       ▼
┌──────────────────────────────────────────────┐
│               Backend — 3 serviços           │
├─────────────┬──────────────┬─────────────────┤
│ user-service│drink-service │activity-service │
│  porta 3001 │  porta 3002  │   porta 3003    │
├─────────────┼──────────────┼─────────────────┤
│  PostgreSQL │   MongoDB    │     Redis       │
│  porta 5432 │ porta 27017  │   porta 6379    │
└─────────────┴──────────────┴─────────────────┘
```

---

## Por que cada banco?

### PostgreSQL — dados de usuario

Usuarios tem nome, email, senha, data de cadastro — tudo muito bem definido e que nao muda. Alem disso, a gente precisa garantir que dois usuarios nao tenham o mesmo email, o que é exatamente o tipo de coisa que um banco relacional faz bem com constraints. Escolhemos o PostgreSQL pela robustez e suporte completo a ACID.

### MongoDB — receitas de drinks

Cada drink é diferente. Um tem 3 ingredientes, outro tem 10. Um tem foto, outro nao tem. Tentar modelar isso numa tabela relacional seria bem complicado (varias tabelas, varios joins). No MongoDB a gente só cria um documento com o que precisar e pronto. Tambem usamos o indice de texto do mongo pra fazer busca por nome e ingredientes.

### Redis — ranking, favoritos e historico

Pra saber quais drinks estao sendo mais acessados em tempo real, precisamos de algo extremamente rapido. O Redis tem uma estrutura chamada **Sorted Set** que é perfeita pra isso — cada drink tem um "score" que a gente incrementa a cada visualizacao e dai pede os top 10. Pra favoritos usamos **Set** (sem duplicatas automatico) e pra historico usamos **List** (ordenada por insercao).

---

## Estrutura de pastas

```
drinkdex/
├── docker-compose.yml
├── servicos/
│   ├── servico-usuarios/     → Node.js + PostgreSQL
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── index.js
│   ├── servico-drinks/       → Node.js + MongoDB
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   ├── index.js
│   │   └── seed.js           → popula o banco com drinks de exemplo
│   └── servico-atividades/   → Node.js + Redis
│       ├── Dockerfile
│       ├── package.json
│       └── index.js
└── frontend/
    ├── Dockerfile
    └── public/
        ├── index.html
        ├── style.css
        └── app.js
```

---

## Como rodar

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
git clone https://github.com/<usuario>/drinkdex.git
cd drinkdex
```

Ou baixe o .zip pelo GitHub e extraia a pasta normalmente.

---

### 4. Subir todos os servicos

Com o Docker Desktop aberto e rodando, abra o terminal **dentro da pasta do projeto** (onde esta o `docker-compose.yml`) e rode:

```bash
docker compose up --build
```

Na primeira vez demora mais pq ele baixa as imagens do PostgreSQL, MongoDB, Redis e Node. Das proximas vezes é bem mais rapido.

Quando aparecer no terminal algo como `frontend`, `user-service`, `drink-service` e `activity-service` todos com "rodando na porta...", ta pronto.

---

### 5. Popular o banco com drinks de exemplo

Abre outro terminal (com os containers ainda rodando) e execute:

```bash
docker compose exec servico-drinks npm run seed
```

Isso insere 10 drinks classicos (Mojito, Caipirinha, Margarita, Old Fashioned, etc.) pra ja ter conteudo na hora de abrir o sistema.

---

### 6. Acessar a aplicacao

| O que é | Endereço |
|---------|---------|
| **Frontend (interface)** | http://localhost:3000 |
| API de Usuarios | http://localhost:3001 |
| API de Drinks | http://localhost:3002 |
| API de Atividades | http://localhost:3003 |

Abra o http://localhost:3000 no navegador e o sistema ja deve estar funcionando.

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

