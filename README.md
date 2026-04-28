# 🍹 Catálogo de Drinks e Coquetéis

> Projeto da disciplina **Tuning de Dados** — Polyglot Persistence  
> Universidade Municipal de São Caetano do Sul (USCS)

![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-FF4438?style=for-the-badge&logo=redis&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)

---

## 👥 Integrantes

| Nome | 
|------|
| Heron de Souza |
| João Mateus E. B. da Silva |
| Matheus Concon |
| Dante Ryuk |

---

## 📖 Tema do Projeto

O projeto consiste em um **catálogo interativo de drinks e coquetéis**, onde usuários podem se cadastrar, explorar receitas, favoritar bebidas e visualizar os drinks mais acessados em tempo real.

A aplicação foi estruturada para demonstrar o conceito de **Polyglot Persistence** — a escolha do banco de dados ideal de acordo com a natureza e o padrão de uso de cada tipo de dado:

- **Usuários** têm dados estruturados, relacionamentos definidos e exigem consistência → banco relacional.
- **Receitas de drinks** são documentos ricos, semi-estruturados, com variações e ingredientes flexíveis → banco orientado a documentos.
- **Acessos recentes, rankings e favoritos em tempo real** são dados voláteis e de leitura intensiva, onde velocidade é prioridade → banco em memória com suporte a cache e estruturas de dados especializadas.

---

## 🗄️ Arquitetura de Dados

```
graph LR
    FE <--> BE
    BE <--> RDB[PostgreSQL]
    BE <--> DB1[MongoDB]
    BE <--> DB2[Redis]
```

### PostgreSQL — Banco Relacional (RDB)

**Justificativa:** Os dados de usuários possuem estrutura bem definida (nome, e-mail, senha, data de cadastro) e exigem integridade referencial e consistência transacional (ACID). O PostgreSQL é a escolha natural para esse tipo de entidade, onde relacionamentos entre tabelas e consultas estruturadas são frequentes.

**Armazena:**
- Cadastro de usuários (`users`)
- Autenticação e credenciais

### MongoDB — Document Storage (DB1)

**Justificativa:** Receitas de drinks são documentos naturalmente semi-estruturados: cada drink pode ter um número variável de ingredientes, modos de preparo distintos, tags, fotos e variações regionais. O modelo de documento do MongoDB elimina a necessidade de joins complexos e permite evoluir o schema sem migrações custosas, além de facilitar consultas full-text sobre ingredientes e nomes.

**Armazena:**
- Receitas de drinks (nome, ingredientes, modo de preparo, categoria, imagem, tags)
- CRUD completo de receitas

### Redis — Key-Value / In-Memory Store (DB2)

**Justificativa:** Funcionalidades como "drinks mais visualizados", "últimos drinks acessados" e "favoritos do usuário" demandam leitura extremamente rápida e não requerem persistência durável. O Redis, com suas estruturas nativas como `Sorted Sets` (para rankings) e `Lists` (para histórico), oferece performance de sub-milissegundo ideal para esses casos de uso.

**Armazena:**
- Ranking dos drinks mais acessados (Sorted Set)
- Histórico de acessos recentes por usuário (List)
- Cache de receitas consultadas com frequência (String/Hash)
- Favoritos do usuário (Set)

---

## ⚙️ Backend — Serviços

O backend é dividido em **3 serviços independentes**, cada um responsável por uma fatia da aplicação:

| Serviço | Responsabilidade | Banco utilizado |
|--------|-----------------|-----------------|
| `user-service` | CRUD de usuários, autenticação | PostgreSQL |
| `drink-service` | CRUD de receitas de drinks | MongoDB |
| `activity-service` | Rankings, favoritos, histórico de acessos | Redis |

---

## 🖥️ Frontend

O frontend consome os três serviços via API REST e permite:

- Cadastro e login de usuários
- Listagem, busca e visualização de receitas de drinks
- Cadastro, edição e remoção de receitas (CRUD completo)
- Visualização do ranking de drinks mais acessados
- Gerenciamento de favoritos e histórico de navegação

---

## 🚀 Como Executar o Projeto

### Pré-requisitos

- [Docker](https://www.docker.com/) e [Docker Compose](https://docs.docker.com/compose/) instalados
- [Node.js](https://nodejs.org/) v18+ (caso queira rodar sem Docker)

### 1. Clone o repositório

```bash
git clone https://github.com/<seu-usuario>/catalogo-drinks.git
cd catalogo-drinks
```

### 2. Suba todos os serviços com Docker Compose

```bash
docker compose up --build
```

Isso irá inicializar automaticamente:

| Serviço | Porta |
|--------|-------|
| Frontend | `http://localhost:3000` |
| User Service (PostgreSQL) | `http://localhost:3001` |
| Drink Service (MongoDB) | `http://localhost:3002` |
| Activity Service (Redis) | `http://localhost:3003` |
| PostgreSQL | `5432` |
| MongoDB | `27017` |
| Redis | `6379` |

### 3. (Opcional) Popular o banco com dados de exemplo

```bash
docker compose exec drink-service npm run seed
```

---

## 📁 Estrutura do Repositório

```
catalogo-drinks/
├── frontend/               # Interface web (FE)
├── services/
│   ├── user-service/       # CRUD de usuários — PostgreSQL
│   ├── drink-service/      # CRUD de drinks — MongoDB
│   └── activity-service/   # Rankings e favoritos — Redis
├── docker-compose.yml
└── README.md
```

---

## 📚 Disciplina

**Tuning de Dados** — Projeto Polyglot Persistence  
Universidade Municipal de São Caetano do Sul — USCS
