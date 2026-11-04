# Exercícios Aula 09: Conectividade, Resiliência, Sincronização e Consumo de Dados

Este projeto implementa todas as atividades propostas nas Aulas 1 a 4 sobre desenvolvimento mobile resiliente e offline-first com React Native, Expo e servidor Node.js de apoio.

---

## 📁 Estrutura do Projeto

```text
exercicios/aula09/
├── app/                      # Aplicativo React Native (Expo SDK 58 + TypeScript)
│   ├── src/
│   │   ├── components/       # Componentes reutilizáveis (BannerOffline)
│   │   ├── hooks/            # Hooks customizados (useOnline com NetInfo)
│   │   ├── screens/          # Telas das Aulas 1, 2, 3 e 4
│   │   │   ├── Aula1Screen.tsx
│   │   │   ├── Aula2e3Screen.tsx
│   │   │   └── Aula4Screen.tsx
│   │   ├── services/         # Camada HTTP com timeout, comRetry, produtos e medição
│   │   │   ├── http.ts
│   │   │   └── produtos.ts
│   │   ├── storage/          # Cache no AsyncStorage com data e hora
│   │   │   └── cache.ts
│   │   └── sync/             # Fila offline, Idempotency-Key, Pull since, Conflito 409
│   │       └── tarefas.ts
│   ├── App.tsx               # Interface com abas para cada aula e BannerOffline
│   └── package.json
├── servidor/                 # Servidor de apoio com rotas REST e simulações
│   └── server.js             # APIs de tarefas, produtos, falhas, idempotência e ETag
├── validar.js                # Suíte de testes automatizados de todas as regras
└── README.md
```

---

## 🚀 Como Executar

### 1. Iniciar o Servidor de Apoio
O servidor foi construído utilizando módulos nativos do Node.js (sem dependências externas):
```bash
cd exercicios/aula09/servidor
node server.js
```
O servidor iniciará em `http://0.0.0.0:3000`.

### 2. Iniciar o Aplicativo Expo
Em outro terminal:
```bash
cd exercicios/aula09/app
npm start
```
Pressione `w` para abrir na Web, ou escaneie o QR Code com o aplicativo Expo Go no seu smartphone ou emulador Android/iOS.

### 3. Executar a Validação Automatizada
Para rodar a bateria de testes de ponta a ponta:
```bash
node exercicios/aula09/validar.js
```

---

## 📋 Atividades Realizadas

### Aula 1 - Conectividade Não Persistente
1. **Projeto Expo & NetInfo**: Configurado com `@react-native-community/netinfo` e `AsyncStorage`.
2. **Hook `useOnline`**: Monitora o estado de rede (`isConnected` e `isInternetReachable`).
3. **Componente `BannerOffline`**: Alerta vermelho afixado no topo quando a conexão cai.
4. **Tela de Diagnóstico de Rede**: Exibe `type`, `isConnected` e `isInternetReachable` com atualização em tempo real ao ligar/desligar o Modo Avião.
5. **Timeout com AbortController (5s)**: Requisições abortadas após 5s com mensagens amigáveis e diferenciadas para:
   - ⏱️ **Timeout** (`AbortError` / tempo esgotado)
   - 🔍 **Erro 404** (recurso não encontrado)
   - 📡 **Falta de rede** (conexão recusada / inacessível)

### Aula 2 - Resiliência e Dados Offline
1. **AsyncStorage com Data/Hora**: Funções `salvarCache` e `lerCache` armazenando timestamp (`salvoEm`), formatado em `DD/MM/YYYY HH:mm:ss`.
2. **Cache-First na Lista**: Ao abrir a tela, exibe imediatamente os dados locais persistidos no cache e atualiza pela API em segundo plano.
3. **`comRetry` com Backoff Exponencial**: Repete requisições com falhas temporárias (503, timeout, rede) calculando atrasos progressivos (`baseMs * 2^(tentativa - 1) + jitter`).
4. **Fila de Pendências Offline**: Operações de criação, edição e exclusão feitas sem rede são salvas localmente na fila.
5. **Idempotência**: Cada operação possui uma `Idempotency-Key` única (UUID v4). Ao reconectar, a fila é enviada e o servidor descarta duplicidades. Confirmado via tela com estatísticas em tempo real.

### Aula 3 - Sincronização de Dados
1. **Pull Incremental (`since`)**: Função `sincronizarPull` envia o timestamp `since` da última sincronização e salva o novo marcador monotônico no AsyncStorage.
2. **Campo `sincronizado`**: Indicador visual na lista se a tarefa está sincronizada (badge verde) ou pendente (badge amarela).
3. **Tratamento de Exclusão Remota**: O servidor registra "lápides" (tombstones); ao sincronizar, tarefas excluídas no servidor são removidas da lista do app.
4. **Controle de Concorrência Otimista (HTTP 409)**: Envio do campo `versao`. Se o servidor tiver versão mais recente, responde 409 Conflict.
5. **Tela de Resolução de Conflitos**: Modal intuitivo que apresenta a versão local vs versão do servidor e permite ao usuário escolher qual versão manter.

### Aula 4 - Consumo de Dados
1. **Medição de Tamanho e Tempo**: Função `medirRequisicao` calcula bytes trafegados no corpo e tempo de resposta em milissegundos.
2. **Comparação `?campos=`**: Comparativo direto entre a lista completa de produtos (com objetos pesados) e a lista enxuta (`?campos=id,nome,preco`). Redução de dados de **~94%** (de 16.4 KB para 0.9 KB).
3. **Paginação com FlatList**: `onEndReached` e `onEndReachedThreshold={0.4}` carregando 20 itens por vez.
4. **Cache HTTP com ETag (304 Not Modified)**: O app armazena o cabeçalho `ETag` e envia `If-None-Match`. Na segunda requisição, o servidor responde `304 Not Modified` com 0 bytes no corpo, economizando tráfego de rede.
5. **Opção "Baixar apenas no Wi-Fi"**: Switch integrado ao NetInfo que bloqueia ou restringe downloads pesados caso o aparelho esteja em rede móvel (celular) ou sem Wi-Fi.
