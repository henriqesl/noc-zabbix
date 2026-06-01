# NOC Vision

Dashboard web para acompanhamento operacional de ambientes monitorados via Zabbix.

## Stack

- React
- TypeScript
- Vite
- Tailwind CSS

## Configuracao

Crie um arquivo `.env` local usando o modelo:

```bash
cp .env.example .env
```

Preencha as variaveis localmente. Nao publique tokens, URLs internas ou credenciais.

## Rodando

```bash
npm install
npm run dev
```

## Validacao

```bash
npm run lint
npm run test
npm run build
```

## Seguranca

O arquivo `.env` deve permanecer fora do Git. Para deploy publico, evite expor tokens no frontend; use uma API/backend intermediario.
