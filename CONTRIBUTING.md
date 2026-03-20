# Contributing to emjudge

Thanks for your interest in improving emjudge. This project combines a web app, API, and judge worker, so small changes in one package can affect behavior across the monorepo. These guidelines help keep contributions reviewable and safe to run.

## Before You Start

- Read the `README.md` for setup, architecture, and core workflows.
- Review the `CODE_OF_CONDUCT.md` before participating in discussions.
- For vulnerabilities, follow `SECURITY.md` instead of opening a public issue.
- Search existing issues and pull requests before starting duplicate work.

## Development Setup

1. Install dependencies with `pnpm install`.
2. Copy `.env.example` to `.env` and fill in local values.
3. Start infrastructure with `docker compose up -d`.
4. Run database setup with `pnpm db:migrate` and `pnpm db:seed`.
5. Start the app with `pnpm dev` and the worker with `pnpm dev:worker`.

## Ways to Contribute

- Report reproducible bugs with clear steps, expected behavior, and actual behavior.
- Propose features that fit the project goal of frontend assignment submission and automated grading.
- Improve documentation, onboarding, or contributor workflows.
- Submit focused pull requests with tests or validation notes when relevant.

## Contribution Guidelines

### Keep changes focused

Prefer small pull requests with one clear purpose. Separate refactors from feature work when possible.

### Follow the monorepo boundaries

- Put shared types, schemas, constants, and contracts in `packages/shared`.
- Keep app-specific logic in the relevant package under `apps/web`, `apps/api`, or `apps/worker`.
- Update documentation when setup, workflows, or contributor expectations change.

### Respect safety-sensitive areas

Please take extra care when changing:

- authentication and authorization
- upload handling and artifact access
- Docker execution and grading isolation
- database migrations and seed data
- environment-variable driven configuration

Call out any risk or migration impact in your pull request.

## Code Style

- Use the existing TypeScript, React, and Fastify conventions already present in the repository.
- Prefer clear names and simple control flow over clever abstractions.
- Keep formatting consistent with Prettier.
- Avoid unrelated drive-by changes in the same pull request.

## Testing and Validation

Run the checks that match your change before opening a pull request.

- `pnpm format:check`
- `pnpm lint`
- `pnpm build`

If you change one package only, it is fine to run a targeted command such as:

- `pnpm --filter @judge/web build`
- `pnpm --filter @judge/api build`
- `pnpm --filter @judge/worker build`

If you cannot run a check locally, explain why in the pull request and describe what you validated instead.

## Pull Request Process

1. Branch from the latest default branch.
2. Make your changes and keep commits readable.
3. Include tests, screenshots, or API notes when they help reviewers verify the change.
4. Fill out the pull request template completely.
5. Respond to review feedback with follow-up commits unless a maintainer asks for a different workflow.

## Commit Messages

Use short, descriptive commit messages that explain intent. Examples:

- `fix submission artifact cleanup`
- `add assignment bulk import validation`
- `docs clarify worker setup`

## Reporting Bugs and Requesting Features

Use the issue templates when possible so maintainers have the information needed to respond quickly. Include:

- the affected app or package
- reproduction steps
- expected and actual behavior
- logs, screenshots, or failing payloads when relevant
- environment details if the issue is setup-specific

## Questions

If you are unsure whether a change fits the roadmap, open a discussion through an issue first so implementation effort stays aligned with project priorities.
