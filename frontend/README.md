# Frontend - Gestão de Pacientes

Frontend React com TypeScript para o sistema de gestão de pacientes acadêmico.

## Tecnologias

- **React 18** com TypeScript
- **Vite** - Build tool
- **TailwindCSS** - Estilização
- **React Router v6** - Roteamento
- **Axios** - Cliente HTTP
- **Zustand** - Gerenciamento de estado (autenticação)
- **React Query** - Cache e gerenciamento de dados
- **date-fns** - Manipulação de datas

## Estrutura do Projeto

```
frontend/
├── src/
│   ├── components/
│   │   ├── Layout/
│   │   │   ├── Sidebar.tsx          # Menu lateral
│   │   │   └── ProtectedRoute.tsx   # Proteção de rotas
│   │   ├── PatientSearch/
│   │   │   └── SearchWithDropdown.tsx # Busca com dropdown
│   │   └── shared/
│   │       ├── Button.tsx           # Botão reutilizável
│   │       └── Input.tsx             # Input reutilizável
│   ├── pages/
│   │   ├── Login.tsx                # Página de login
│   │   ├── FormPage.tsx             # Página 1: Formulário
│   │   ├── ReturnPage.tsx           # Página 2: Retornos
│   │   └── ExportPage.tsx           # Página 3: Exportar/Importar
│   ├── services/
│   │   └── api.ts                   # Cliente Axios configurado
│   ├── hooks/
│   │   ├── useAuth.ts               # Hook de autenticação (Zustand)
│   │   └── useDebounce.ts           # Hook para debounce
│   ├── types/
│   │   └── index.ts                 # Tipos TypeScript
│   ├── App.tsx                      # Componente principal
│   └── main.tsx                     # Ponto de entrada
├── package.json
├── vite.config.ts
├── tsconfig.json
└── tailwind.config.js
```

## Instalação

1. **Instale as dependências:**

```bash
cd frontend
npm install
```

2. **Configure variáveis de ambiente:**

Crie um arquivo `.env` baseado no `.env.example`:

```bash
VITE_API_URL=http://localhost:8000
```

3. **Inicie o servidor de desenvolvimento:**

```bash
npm run dev
```

A aplicação estará disponível em: `http://localhost:3000`

## Build para Produção

```bash
npm run build
```

Os arquivos serão gerados na pasta `dist/`.

## Funcionalidades

### 1. Autenticação
- Login com JWT
- Proteção de rotas
- Persistência de sessão
- Logout

### 2. Formulário (Página 1)
- Buscar paciente existente (com debounce)
- Criar novo paciente
- Preencher formulário de resposta
- Salvar resposta no banco

### 3. Retornos (Página 2)
- Listar pacientes
- Ver retornos agendados
- Destaque para retornos atrasados e de hoje

### 4. Exportar/Importar (Página 3)
- Exportar todos os pacientes para Excel
- Importar pacientes de arquivo Excel
- Relatório detalhado de importação

## Rotas

- `/login` - Página de login
- `/form` - Formulário de pacientes (protegida)
- `/returns` - Retornos agendados (protegida)
- `/export` - Exportar/Importar (protegida)

## API Service

O arquivo `src/services/api.ts` contém todos os métodos para comunicação com o backend:

- `authService.login()` - Login
- `authService.register()` - Registro
- `patientService.searchPatients()` - Buscar pacientes
- `patientService.createPatient()` - Criar paciente
- `formService.createFormResponse()` - Criar resposta
- `formService.getFormResponsesByPatient()` - Buscar respostas
- `exportService.exportExcel()` - Exportar Excel
- `exportService.importExcel()` - Importar Excel

## Autenticação

O token JWT é automaticamente adicionado em todas as requisições através de um interceptor do Axios. Se o token expirar (401), o usuário é redirecionado para a página de login.

## Estado Global

A autenticação é gerenciada com Zustand e persiste no localStorage. Use o hook `useAuth()` em qualquer componente:

```typescript
const { user, isAuthenticated, login, logout } = useAuth();
```

## React Query

O React Query é usado para cache e gerenciamento de dados. Exemplo:

```typescript
const { data, isLoading } = useQuery({
  queryKey: ['patients'],
  queryFn: () => patientService.searchPatients(),
});
```

## Desenvolvimento

- **Hot Reload**: Ativado automaticamente
- **Proxy**: Configurado para redirecionar `/api` para `http://localhost:8000`
- **TypeScript**: Strict mode ativado
- **ESLint**: Configurado para React e TypeScript

## Licença

Este projeto é para uso acadêmico.

