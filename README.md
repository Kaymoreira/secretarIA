# SecretarIA - Sua Secretária Virtual Inteligente 🤖🗓️

![Badge em Desenvolvimento](https://img.shields.io/badge/status-em%20desenvolvimento-yellow)

## 📝 Descrição do Projeto

SecretarIA é uma aplicação web inovadora desenvolvida como **Projeto de Conclusão de Curso (TCC)**. O objetivo principal é atuar como uma secretária virtual inteligente, especializada no gerenciamento de agendas e na interação contextualizada com o usuário.

Utilizando o poder da **API da OpenAI (GPT-3.5-turbo)** integrada através do **LangChain**, a SecretarIA é capaz de:

- Gerenciar compromissos (criar, visualizar, editar - _futuro_, deletar).
- Oferecer diferentes visualizações de calendário (mês, ano, agenda).
- Responder a perguntas sobre a agenda do usuário através de uma interface de chat, utilizando o contexto dos eventos cadastrados.

Este projeto visa explorar a aplicação de modelos de linguagem grandes (LLMs) em tarefas práticas de organização e assistência pessoal.

## ✨ Funcionalidades Principais

- **Calendário Interativo:**
  - Visualização mensal, anual e formato de agenda.
  - Navegação entre meses e anos.
  - Destaque do dia atual.
  - Adição de novos eventos com título, data/hora de início e fim, tipo e descrição.
  - Visualização de detalhes dos eventos.
  - Exclusão de eventos com confirmação.
- **Chat Inteligente:**
  - Interface de chat para interação com a IA.
  - A IA responde perguntas baseadas nos eventos cadastrados na agenda.
  - Contextualização automática dos eventos para a IA antes de cada resposta.
- **API Backend:**
  - Endpoints para gerenciar eventos (CRUD - Create, Read, Update, Delete - _Update futuro_).
  - Endpoint para processar mensagens do chat e interagir com a OpenAI.

## 🚀 Tecnologias Utilizadas

- **Frontend:**
  - [Next.js](https://nextjs.org/) (React Framework)
  - [React](https://reactjs.org/)
  - [TypeScript](https://www.typescriptlang.org/)
  - [Tailwind CSS](https://tailwindcss.com/)
  - [date-fns](https://date-fns.org/) (Manipulação de Datas)
- **Backend:**
  - [Node.js](https://nodejs.org/)
  - [Express](https://expressjs.com/)
  - [TypeScript](https://www.typescriptlang.org/)
- **Inteligência Artificial:**
  - [OpenAI API (GPT-3.5-turbo)](https://openai.com/api/)
  - [LangChain](https://js.langchain.com/) (Framework para LLMs)
- **Outros:**
  - [Git](https://git-scm.com/) & [GitHub](https://github.com/)
  - [npm](https://www.npmjs.com/)

## 🔧 Configuração e Instalação

Siga os passos abaixo para configurar e executar o projeto localmente:

1.  **Clone o Repositório:**

    ```bash
    git clone https://github.com/Kaymoreira/secretarIA.git
    cd secretarIA
    ```

2.  **Instale as Dependências:**

    - Este projeto utiliza `npm`. Certifique-se de ter o Node.js e o npm instalados.

    ```bash
    npm install
    ```

3.  **Configure as Variáveis de Ambiente:**

    - Crie um arquivo chamado `.env` na raiz do projeto.
    - Adicione as seguintes variáveis (substitua pelos seus valores):
      ```env
      OPENAI_API_KEY=sua_chave_api_da_openai
      PORT=3001 # Porta para o servidor backend (opcional, padrão 3001)
      ```
    - **Importante:** Obtenha sua chave da API da OpenAI em [platform.openai.com](https://platform.openai.com/).

4.  **Execute o Servidor Backend:**

    - O backend (API) precisa estar rodando para que o frontend funcione corretamente.

    ```bash
    npm run dev:server # Verifique o script exato no seu package.json
    ```

    - O servidor estará rodando em `http://localhost:3001` (ou na porta definida em `.env`).

5.  **Execute o Frontend:**
    - Abra **outro terminal** na mesma pasta do projeto.
    ```bash
    npm run dev
    ```
    - A aplicação estará acessível em `http://localhost:3000`.

## ⚙️ Uso

1.  Acesse `http://localhost:3000` no seu navegador.
2.  Explore as visualizações do calendário (Mês, Ano, Agenda).
3.  Clique em um dia ou no botão "Adicionar Evento" para criar novos compromissos.
4.  Clique em um evento existente para ver seus detalhes ou excluí-lo.
5.  Navegue até a aba "Chat" para conversar com a SecretarIA sobre sua agenda.

## 🔩 Endpoints da API

O servidor backend expõe os seguintes endpoints:

- `GET /api/events`: Retorna todos os eventos.
- `POST /api/events`: Cria um novo evento.
- `GET /api/events/:id`: Retorna um evento específico pelo ID.
- `PUT /api/events/:id`: Atualiza um evento existente (**_a implementar_**).
- `DELETE /api/events/:id`: Exclui um evento pelo ID.
- `POST /api/chat`: Processa uma mensagem do usuário, interage com a OpenAI e retorna a resposta da IA.

## 🛣️ Roadmap (Próximos Passos)

- [ ] Implementar funcionalidade de **edição** de eventos.
- [ ] Adicionar funcionalidade de **lembretes/notificações**.
- [ ] Integrar com um **banco de dados** (ex: PostgreSQL, MongoDB) para persistência de dados.
- [ ] Implementar **autenticação** de usuários.
- [ ] Melhorar a capacidade de **contextualização** e a **memória** do chat.
- [ ] Refinar a interface do usuário (UI/UX).
- [ ] Adicionar testes automatizados.

## 👨‍💻 Autor

- **Kayque Costa Moreira**
  - QA Tester
  - [GitHub](https://github.com/Kaymoreira)
  - [LinkedIn](https://www.linkedin.com/in/seu-linkedin/) <--- (Atualize com seu link!)

## 📄 Licença

Este projeto é licenciado sob a MIT License. Veja o arquivo `LICENSE` para mais detalhes (**_Nota: Arquivo LICENSE não criado ainda_**).
