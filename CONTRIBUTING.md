# Contributing

## Setup

```bash
git clone https://github.com/boroppi/envpeek.git
cd envpeek
npm install
```

## Development

```bash
npm run test:watch
```

## Checks before a pull request

```bash
npm run typecheck
npm test
npm run lint
npm run build
```

Pull requests should:

- Keep production dependencies at zero unless there is a strong reason
- Never log or assert raw secret values in a way that prints them
- Add or update tests for any change to parsing, classification, or masking
- Leave `tests/leakage.test.ts` passing

Do not add telemetry, network calls, or features that write to the user's repository.
