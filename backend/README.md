# OCastro Backend

Backend em Python + Flask para o assistente pessoal OCastro.

## Pré-requisitos

*   Python 3.8+
*   Virtualenv (recomendado)

## Configuração

3.  **Configuração de Variáveis de Ambiente**:

    Copie o arquivo `.env.example` para `.env`:

    ```bash
    # Windows
    copy .env.example .env
    
    # Linux/Mac
    cp .env.example .env
    ```

    Edite `.env` se necessário.

4.  **Banco de Dados**:

    Inicialize e aplique as migrações:

    ```bash
    flask db init
    flask db migrate -m "Initial migration"
    flask db upgrade
    ```

## Execução

Para rodar o servidor de desenvolvimento:

```bash
flask run
# ou
python run.py
```

O servidor rodará em `http://localhost:5000`.

## Estrutura do Projeto

*   `app/`: Código fonte.
    *   `models/`: Modelos do banco de dados (SQLAlchemy).
    *   `routes/`: Endpoints da API (Blueprints).
    *   `schemas/`: Schemas de validação e serialização (Marshmallow).
    *   `services/`: Lógica de negócio complexa.
    *   `utils/`: Utilitários e Enums.
*   `migrations/`: Scripts de migração do banco.
*   `run.py`: Ponto de entrada da aplicação.

## Backend Endpoints

*   `/api/auth`: Registro e Login.
*   `/api/tasks`: CRUD de tarefas e Kanban.
*   `/api/calendar`: Dados para visualização de calendário.
*   `/api/voice`: Processamento simulado de comandos de voz.
