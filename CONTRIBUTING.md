# Contribuindo com o Roboroça

Obrigado pelo interesse em contribuir com o Roboroça!

## Como Contribuir

### 1. Reportar Bugs

Se encontrar um bug, abra uma issue com:
- Descrição clara do problema
- Passos para reproduzir
- Comportamento esperado vs atual
- Screenshots (se aplicável)
- Ambiente (OS, browser, versões)

### 2. Sugerir Funcionalidades

Para novas funcionalidades:
- Verifique se já não existe uma issue similar
- Descreva claramente a funcionalidade
- Explique o caso de uso
- Se possível, sugira uma implementação

### 3. Contribuir com Código

#### Setup do Ambiente

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/roboroca.git
cd roboroca

# Backend
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt

# Frontend
cd frontend
npm install
```

#### Workflow

1. Crie uma branch a partir de `main`:
```bash
git checkout -b feature/nome-da-feature
# ou
git checkout -b bugfix/descricao-do-bug
```

2. Faça suas alterações seguindo os padrões de código

3. Commit usando Conventional Commits:
```bash
git commit -m "feat: adiciona funcionalidade X"
git commit -m "fix: corrige bug no upload"
git commit -m "docs: atualiza README"
```

4. Push e abra um Pull Request

### Padrões de Código

#### Python (Backend)
- Siga PEP 8
- Use type hints
- Docstrings em funções públicas
- Testes para novas funcionalidades

#### TypeScript (Frontend)
- ESLint + Prettier
- Componentes funcionais com hooks
- Props tipadas
- Nomes descritivos

### Estrutura de Commits

```
<tipo>(<escopo>): <descrição>

[corpo opcional]

[rodapé opcional]
```

Tipos:
- `feat`: Nova funcionalidade
- `fix`: Correção de bug
- `docs`: Documentação
- `style`: Formatação
- `refactor`: Refatoração
- `test`: Testes
- `chore`: Manutenção

### Code Review

- Seja respeitoso e construtivo
- Explique o "porquê" das sugestões
- Aprove quando estiver satisfeito

---

Dúvidas? Abra uma issue ou entre em contato!
