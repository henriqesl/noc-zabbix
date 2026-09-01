# NOC Vision

NOC Vision is a web dashboard for operational monitoring of network environments tracked through Zabbix.

The project focuses on infrastructure visibility, alert prioritization and proxy-aware monitoring, separating offline proxies, truly offline devices and devices affected by proxy outages.

## Stack

- React
- TypeScript
- Vite
- Tailwind CSS

## Running Locally

Install dependencies:

```bash
npm install
```

Create a local environment file:

```bash
cp .env.example .env
```

Fill `.env` with the variables used by the Zabbix API:

```env
VITE_ZABBIX_URL=
VITE_ZABBIX_TOKEN=
```

Start the development server:

```bash
npm run dev
```

Production build:

```bash
npm run build
```

## Validation

```bash
npm run lint
npm run test
npm run build
```

## Project Conventions

### Display and audience

The interface is designed for wall monitors and operation-room displays:

- Full HD is the baseline layout;
- typography and spacing scale progressively at 2560 px and 3400 px;
- the first viewport prioritizes a plain-language operational verdict and actionable failures;
- technical filters and per-device details remain available below the executive summary;
- colors always appear with text labels, so status does not depend on color alone.

### Active Groups

The main dashboard only treats Zabbix groups as active when their names include one of these markers:

- `[BASE]`
- `[CLIENTE]`

This allows groups to exist in Zabbix without appearing in the main dashboard before they are operationally active.

### Estados operacionais

O dashboard separa o que o Zabbix consegue afirmar do que depende de conectividade:

- `Falha confirmada`: host indisponivel por trigger/estado do proprio host;
- `Sem confirmacao`: coleta desconhecida ou host dependente de proxy sem contato;
- `Respondendo`: host com disponibilidade confirmada pelo Zabbix.

Hosts sem confirmacao nao aumentam a contagem principal de incidentes ou alertas acionaveis. Terphane e Arlanxeo aparecem no painel de visibilidade como restricoes operacionais conhecidas da TI local.

### Alerts

Alerts are filtered and sorted in the frontend. Sorting supports ISO dates and numeric timestamps.

Available filters:

- client;
- severity;
- status;
- period;
- text search.

### Core Health

The core page separates servers, proxies, and network links by client. It only displays values returned or derived from the current Zabbix collection; simulated charts are not shown.

### Cameras

The cameras page works as an operational inventory. It separates confirmed camera failures from cameras without a reliable collection state.

## Security

The `.env` file must stay out of Git.

Do not publish tokens, internal URLs, or credentials. For public deployments, avoid exposing tokens in the frontend; use an intermediate API/backend to call Zabbix.
