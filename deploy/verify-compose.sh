#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Static checks on the deploy stack.
#
# These exist because of a real outage. The Traefik `websecure` labels shipped
# commented out, so this service published an HTTP router only: every https://
# request died at the router with a Bad Gateway while the container was healthy.
# Nothing anywhere would have caught it — this repository had no CI at all, and
# the backend's smoke suite covers the backend stack only.
#
# Everything here is static. No image is built and nothing is started, so it
# runs in seconds and is safe on every push.
#
#   ./deploy/verify-compose.sh
# ---------------------------------------------------------------------------
set -uo pipefail

cd "$(dirname "$0")/.."

COMPOSE="deploy/docker-compose.yml"
DOCKERFILE="deploy/Dockerfile"

PASS=0
FAIL=0
ok()  { PASS=$((PASS + 1)); printf '  \033[32m✓\033[0m %s\n' "$1"; }
bad() { FAIL=$((FAIL + 1)); printf '  \033[31m✗\033[0m %s\n' "$1"; [ -n "${2:-}" ] && printf '      %s\n' "$2"; }

printf '\n\033[1mDeploy stack\033[0m\n'

# The label block is read as text rather than via `docker compose config`, so this
# needs no container runtime and runs anywhere.
labels="$(grep -E '^\s+- "traefik\.' "$COMPOSE" 2>/dev/null)"

if [ -z "$labels" ]; then
  bad "traefik labels found in $COMPOSE" "no lines matching 'traefik.' — is the file intact?"
else
  ok "traefik labels found in $COMPOSE"
fi

# 1. Both routers. A service with only a `web` router answers http and fails every
#    https request at Traefik, which is a Bad Gateway that looks like the app is down.
for entrypoint in web websecure; do
  if printf '%s' "$labels" | grep -q "\-${entrypoint}\.entrypoints=${entrypoint}"; then
    ok "a '${entrypoint}' router is published"
  else
    bad "a '${entrypoint}' router is published" \
        "no router bound to the '${entrypoint}' entrypoint — https will fail at Traefik"
  fi
done

# 2. TLS actually enabled. The certresolver alone is not enough; the backend stack
#    carries tls=true and this file once omitted it, so uncommenting the block as
#    written would still not have served TLS.
if printf '%s' "$labels" | grep -q "websecure\.tls=true"; then
  ok "the websecure router sets tls=true"
else
  bad "the websecure router sets tls=true" "a certresolver without tls=true does not serve TLS"
fi

if printf '%s' "$labels" | grep -q "websecure\.tls\.certresolver="; then
  ok "the websecure router names a certresolver"
else
  bad "the websecure router names a certresolver"
fi

# 3. Traefik's port must equal the port the container listens on. They live in two
#    files, drift silently, and the symptom is again a 502.
traefik_port="$(printf '%s' "$labels" | grep -oE 'loadbalancer\.server\.port=[0-9]+' | grep -oE '[0-9]+$' | head -1)"
docker_port="$(grep -oE '^EXPOSE [0-9]+' "$DOCKERFILE" | grep -oE '[0-9]+$' | head -1)"
env_port="$(grep -oE 'PORT=[0-9]+' "$DOCKERFILE" | grep -oE '[0-9]+$' | head -1)"

if [ -n "$traefik_port" ] && [ "$traefik_port" = "$docker_port" ] && [ "$traefik_port" = "$env_port" ]; then
  ok "traefik, EXPOSE and PORT all agree on ${traefik_port}"
else
  bad "traefik, EXPOSE and PORT all agree" \
      "traefik=${traefik_port:-unset} EXPOSE=${docker_port:-unset} PORT=${env_port:-unset} — a mismatch is a 502"
fi

# 4. The stack must join the network Traefik watches, or it is never discovered.
if grep -q "dokploy-network" "$COMPOSE"; then
  ok "the service joins dokploy-network"
else
  bad "the service joins dokploy-network" "Traefik cannot discover a service outside its network"
fi

printf '\n\033[1mImage optimiser\033[0m\n'

# `remotePatterns: [{ hostname: '**' }]` lets the Next image optimiser fetch and re-serve
# any https URL — an open proxy on your bandwidth, and a way to make the server issue
# arbitrary outbound requests. It was there once; this stops it coming back quietly.
# Comment lines are stripped first: the config explains why the wildcard was removed and
# quotes it while doing so, which would otherwise match.
if grep -vE "^\s*(//|\*|/\*)" next.config.ts | grep -qE "hostname:\s*['\"]\*\*['\"]"; then
  bad "no wildcard image host" \
      "remotePatterns allows hostname '**' — the optimiser will proxy any https URL"
else
  ok "no wildcard image host"
fi

printf '\n\033[1mResult\033[0m\n  %d passed, %d failed\n\n' "$PASS" "$FAIL"
[ "$FAIL" -eq 0 ]
