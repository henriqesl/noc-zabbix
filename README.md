# NOC Vision

Web dashboard for operational monitoring of environments tracked through Zabbix.

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

### Active Groups

The main dashboard only treats Zabbix groups as active when their names include one of these markers:

- `[BASE]`
- `[CLIENTE]`

This allows groups to exist in Zabbix without appearing in the main dashboard before they are operationally active.

### Proxies

The dashboard separates:

- offline proxies;
- truly offline devices;
- devices offline because their proxy is unavailable.

Devices affected by an offline proxy do not increase the main critical-alert count. They are shown in a separate proxy-impact section.

### Alerts

Alerts are filtered and sorted in the frontend. Sorting supports ISO dates and numeric timestamps.

Available filters:

- client;
- severity;
- status;
- period;
- text search.

### Core Health

The core page separates servers, proxies, and network links by client. The current charts use a local simulated series in `generateMockCoreSeries()` and are structured to be replaced by real metrics later.

### Cameras

The cameras page works as an operational inventory. It separates truly offline cameras from cameras impacted by proxy outages.

## Security

The `.env` file must stay out of Git.

Do not publish tokens, internal URLs, or credentials. For public deployments, avoid exposing tokens in the frontend; use an intermediate API/backend to call Zabbix.
