#!/usr/bin/env bash
# Baja Paper 26.3, el plugin DEDsafío y plugins útiles de servidor.
# No toca el Realm ni el mundo New World.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
RUN="$ROOT/run"
UA="FastFut-dedsafio/1.0 (alvarochavezdev@gmail.com)"
mkdir -p "$RUN/plugins"

if [[ ! -f "$RUN/eula.txt" ]]; then
  cp "$ROOT/eula.txt" "$RUN/eula.txt"
fi
if [[ ! -f "$RUN/server.properties" ]]; then
  cp "$ROOT/server.properties" "$RUN/server.properties"
fi

download() {
  local url="$1"
  local dest="$2"
  echo "Bajando $(basename "$dest")"
  curl -fL --retry 3 --retry-delay 2 -A "$UA" -o "$dest.partial" "$url"
  mv "$dest.partial" "$dest"
}

if [[ ! -f "$RUN/paper.jar" ]]; then
  PAPER_URL="$(curl -fsSL -A "$UA" "https://fill.papermc.io/v3/projects/paper/versions/26.3/builds" | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d[0]["downloads"]["server:default"]["url"])')"
  download "$PAPER_URL" "$RUN/paper.jar"
fi

if [[ -f "$ROOT/plugin/build/libs/Dedsafio.jar" ]]; then
  cp "$ROOT/plugin/build/libs/Dedsafio.jar" "$RUN/plugins/Dedsafio.jar"
elif [[ -f "$ROOT/bundled/Dedsafio.jar" ]]; then
  cp "$ROOT/bundled/Dedsafio.jar" "$RUN/plugins/Dedsafio.jar"
else
  echo "No está Dedsafio.jar. Compila server/plugin o deja el jar en server/bundled."
  exit 1
fi

modrinth() {
  local slug="$1"
  local dest="$2"
  local url
  url="$(curl -fsSL -A "$UA" "https://api.modrinth.com/v2/project/${slug}/version?loaders=%5B%22paper%22%2C%22bukkit%22%2C%22spigot%22%5D&game_versions=%5B%2226.3%22%5D" | python3 -c 'import json,sys
d=json.load(sys.stdin)
if not d:
    raise SystemExit(0)
files=d[0].get("files") or []
prim=next((f for f in files if f.get("primary")), files[0])
print(prim["url"])')" || true
  if [[ -z "$url" ]]; then
    url="$(curl -fsSL -A "$UA" "https://api.modrinth.com/v2/project/${slug}/version?loaders=%5B%22paper%22%2C%22bukkit%22%2C%22spigot%22%5D" | python3 -c 'import json,sys
d=json.load(sys.stdin)
if not d:
    raise SystemExit(0)
files=d[0].get("files") or []
prim=next((f for f in files if f.get("primary")), files[0])
print(prim["url"])')" || true
  fi
  if [[ -z "$url" ]]; then
    echo "No encontré un jar de servidor para $slug. Lo salto."
    return 0
  fi
  download "$url" "$dest"
}

modrinth luckperms "$RUN/plugins/LuckPerms.jar"
modrinth worldedit "$RUN/plugins/WorldEdit.jar"
modrinth chunky "$RUN/plugins/Chunky.jar"
modrinth placeholderapi "$RUN/plugins/PlaceholderAPI.jar"
modrinth simple-voice-chat "$RUN/plugins/voicechat.jar"

# CoreProtect 24.1 y DecentHolograms 2.10.1 se apagan solos en 26.3.
rm -f "$RUN/plugins/CoreProtect.jar" "$RUN/plugins/DecentHolograms.jar"

WORLD_ZIP="$ROOT/../dedsafio4/DEDsafio4-Realm-26.3.zip"
if [[ ! -f "$RUN/world/level.dat" && -f "$WORLD_ZIP" ]]; then
  echo "Copiando el mundo DEDsafio 4 al servidor"
  mkdir -p "$RUN/world"
  unzip -q -o "$WORLD_ZIP" -d "$RUN/world"
  # El plugin del servidor reemplaza al datapack. Si los dos quedan, la ruleta gira dos veces.
  # Se deja el pack.mcmeta vacío para que el mundo no avise que falta dedsafio4.
  rm -rf "$RUN/world/datapacks/dedsafio4/data" "$RUN/world/dimensions/dedsafio" "$RUN/world/session.lock"
  mkdir -p "$RUN/world/datapacks/dedsafio4"
  if [[ ! -f "$RUN/world/datapacks/dedsafio4/pack.mcmeta" ]]; then
    cp "$ROOT/../dedsafio4/datapack/pack.mcmeta" "$RUN/world/datapacks/dedsafio4/pack.mcmeta"
  fi
fi

echo "Listo. Arranca con: bash start.sh"
echo "En la consola del servidor: op TuNombre"
