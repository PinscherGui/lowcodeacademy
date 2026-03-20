# ⚡ Low Academy Portal

## 📖 Sobre o Projeto
O Portal Low Academy é um sistema web front-end nativo (HTML/CSS/JS) integrado ao **Supabase** (Backend as a Service). Ele gerencia as solicitações dos alunos, permitindo o controle de status pelo corpo educativo/coordenação.

## 🛠️ Tecnologias Utilizadas
- **HTML5**: Estruturação semântica das páginas.
- **CSS3 Vanilla**: Uso intenso de variáveis CSS (`:root`), Flexbox e efeitos de *glassmorphism*.
- **JavaScript (ESModules)**: Lógica no lado do cliente dividida em módulos.
- **Supabase**: Banco de dados PostgreSQL com API gerada instantaneamente, Autenticação de Usuários e RLS (Segurança de Linha).

## 🗂️ Estrutura de Arquivos

```text
Atividade Avaliativa Low Code/
├── DOCUMENTACAO.md          # Esta documentação global do projeto
├── index.html               # Landing page inicial transparente (Auto-redirecionamento)
├── login.html               # Página de Login e Registro (Abas Intercaladas)
├── dashboard_student.html   # Painel restrito para o Aluno
├── dashboard_educator.html  # Painel restrito para o Educador/Coordenador
├── css/
│   └── style.css            # Folha de estilo visual premium (SaaS)
└── js/
    ├── auth.js              # Lógica Suprema de autenticação via Provider e cadastro
    ├── educator.js          # Lógica do painel do educador (read/update requests complexos)
    ├── student.js           # Lógica do painel do aluno (create/read requests isolados)
    ├── supabaseClient.js    # Interfaceamento e Handshaking com a Plataforma Supabase
    └── utils.js             # Isolamento de UX (Skeleton Loaders) e Prevenção DOM XSS
```

## 🔐 Modelagem de Segurança & Tabelas SQL (Supabase RLS)
- **Tabela `profiles`**: Contém o vinculo publicável entre o usuário encriptado (`id` = `auth.users`), seu Nome (`name`) e sua Permissão (`role`).
- **Tabela `requests`**: Contém o espelho de todas as solicitações trafegadas (`id`, `user_id`, `title`, `description`, `status`, `created_at`).

Ambas as tabelas são blindadas via *Row Level Security* (RLS). Diferente de arquiteturas antigas que dependem de middlewares (PHP, Node), o Javascript faz chamadas normais anonimamente. É o Supabase Edge Network (Banco PostgreSQL) quem barra os alunos interceptadores de ler solicitações de outros, enquanto isenta o Educador para enxergar todos os *status* globalmente.

### 🛡️ Prevenção e Performance no Lado do Cliente (Atualização de Arquitetura V2)
Como parte do aprimoramento contínuo das tecnologias, integramos:
- **Mitigação Anti-XSS (DOM-Based e Stored XSS):** A introdução modular do algoritmo `escapeHTML()` no arquivo `utils.js` exige que toda e qualquer string injetada na malha HTML do painel do Educador (descrições e títulos vindo dos Alunos) sofra esterilização. A técnica amortece scripts maliciosos convertendo-os em entidades codificadas (Exemplo: de `<script>` para `&lt;script&gt;`).
- **Redução de Latência (Network Pre-connecting):** Injeção prioritária da norma de perfomance `<link rel="preconnect">`. O navegador do aluno adiantará agressivamente o "Handshake" DNS e TCP/TLS com o servidor remoto da Edge Network do Supabase, baixando a latência de primeira via (`TTFB` - Time to First Byte)
- **Psicologia em UI (UX Skeleton Loader):** Utilização isolada das matrizes animadas fantasma `renderSkeletonLoader()` que seguram o design fixado via keyframes `@pulse` enquanto os nós e metadados estão sendo requisitados e retornados Assincronamente (Awaits) pro painel.

### 🏢 Helpdesk Corporativo e Rastreabilidade (Sistema V3)
Inspirado arquiteturalmente em portais universitários estritamente corporativos, a versão atual transparece:
- **Bancos de Dados Relacionais Restritos (Tabela-Filha Histórica):** Foi erguida a tabela 1-para-Muitos `request_history`, encarregada de gravar perpetuamente a cadeia de tempo exata, salvando o nome do Ator processual, a Ação engatilhada e Pareceres (Comentários Oficiais em texto) sempre ligados transversalmente à Queixa Raiz. O aninhamento (Deep SQL Select) foi utilizado no client JS para puxar com alta resiliência toda a estrutura do Supabase no mesmo *Request*.
- **Categorizações Determinísticas:** Listas rígidas pré-mapeadas foram instaladas (`<select>`), forçando o estudante a atribuir departamentos claros (TI, Documentação, Finanças) na nova coluna SQL de banco de dados `category`.
- **Desenhador de Timeline CSS3 (Visualização de Rastreabilidade):** Construiu-se a ilusão óptica esférica vertical das *Linhas do Tempo* via cálculos milimétricos com Margin, Padding Absoluto e manipulação bruta de Pseudo-Elementos Globais DOM (`:.timeline-marker`), para ilustrar transparentemente as mensagens enviadas e instantes processuais ocorridos na página visualizadora.

## 🌐 Implantação e Hosting Público (Netlify CI/CD)
Toda a plataforma foi hospedada de maneira elástica garantindo um fluxo ininterrupto de avaliações, ao conectar diretamente as versões de código limpo do repositório remoto (**GitHub**) com as hospedagens *Front-End* na infraestrutura moderna de ponta global do **Netlify**.

A arquitetura obedece à engenharia de *Integração e Entrega Contínuas* da seguinte forma:
1. Todo o código-fonte foi estabilizado (`git init`, `add`, `commit`) localmente e espelhado pra fora (`git push`) pro versionador Github.
2. O sub-sistema do **Netlify** foi autenticado nativamente para fiscalizar a "Branch Master/Main" via O-Auth de forma limpa, já pre-reconhecendo a aplicação estrutural como uma SPA Multi-Page passível de deploys autônomos por não depender dos pesados ecossistemas construíveis via NodeJS.
3. Todas as alterações e melhorias vindouras são implantadas de forma independente na rede. Ao finalizar um *push* autônomo na rede local o Netlify repinta e despacha o domínio instantaneamente sem intervenção FTP (File Transfer Protocol).
Assim sendo, a Netlify age como Content Delivery Network injetando Vanilla puro enquanto a carga estrutural e relacional é estritamente encargo dos terminais REST endpoints do provedor de Database (Supabase).
