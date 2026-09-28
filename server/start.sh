#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT/run"

if [[ ! -f paper.jar ]]; then
  echo "Falta paper.jar. Primero corre: bash install.sh"
  exit 1
fi

if [[ -n "${JAVA:-}" ]]; then
  JAVA_BIN="$JAVA"
elif [[ -n "${JAVA_HOME:-}" && -x "$JAVA_HOME/bin/java" ]]; then
  JAVA_BIN="$JAVA_HOME/bin/java"
else
  JAVA_BIN="$(command -v java || true)"
fi

if [[ -z "$JAVA_BIN" || ! -x "$JAVA_BIN" ]]; then
  echo "No encuentro Java. DEDsafío 4 usa Minecraft 26.3 y necesita Java 25 (Temurin)."
  echo "https://adoptium.net/temurin/releases/?version=25"
  exit 1
fi

VERSION="$("$JAVA_BIN" -version 2>&1 | head -n 1)"
MAJOR="$(echo "$VERSION" | sed -n 's/.* version "\([0-9][0-9]*\).*/\1/p')"
if [[ -z "$MAJOR" || "$MAJOR" -lt 25 ]]; then
  echo "Este servidor necesita Java 25 o más nuevo. Ahora hay: $VERSION"
  echo "https://adoptium.net/temurin/releases/?version=25"
  exit 1
fi

echo "Arrancando DEDsafío 4 con $VERSION"
exec "$JAVA_BIN" -Xms1G -Xmx2G -jar paper.jar --nogui
