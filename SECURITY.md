# Security Policy

## Supported Versions

This project is actively supported on the latest code in the default branch.

| Version               | Supported |
| --------------------- | --------- |
| `main`                | Yes       |
| older commits / forks | No        |

## Reporting a Vulnerability

Please do not open public GitHub issues for security vulnerabilities.

Instead, report them privately through one of these channels:

- GitHub Security Advisories: use the repository's private vulnerability reporting feature if available.
- Email: contact the maintainer at `elvisdragonmao@gmail.com`.

When reporting, please include:

- a clear description of the issue
- affected components or paths
- reproduction steps or proof of concept
- impact assessment if known
- any suggested mitigation

You can expect a response acknowledging the report within 7 days. After triage, we will share next steps and coordinate disclosure timing where appropriate.

## What to Expect

- We will validate the report and assess impact.
- If the issue is confirmed, we will work on a fix and may ask for more details.
- Please allow time for remediation before public disclosure.
- After a fix is available, we may publish a security advisory or changelog note.

## Scope Notes

Security-sensitive areas in this repository include:

- authentication and authorization in `apps/api`
- file upload and artifact access flows
- Docker-based grading execution in `apps/worker`
- MinIO and PostgreSQL deployment configuration
- any path traversal, sandbox escape, SSRF, RCE, or privilege escalation issues

## Out of Scope

The following are generally out of scope unless they create a broader impact:

- missing best-practice headers on local development environments
- self-inflicted misconfiguration in private deployments
- denial-of-service reports without a concrete application-level weakness
- social engineering or phishing simulations against maintainers

## Secrets

If you accidentally discover exposed credentials, tokens, or secrets:

- do not reuse or share them
- report them privately using the process above
- include where they were found so they can be rotated quickly
