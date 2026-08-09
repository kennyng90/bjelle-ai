#!/usr/bin/env bash
# Søk i og les Cloudflare-dokumentasjonen uten å dra indeksene inn i konteksten.
# Se SKILL.md.
set -euo pipefail

BASE="https://developers.cloudflare.com"
CACHE="${TMPDIR:-/tmp}/bjelle-cf-docs"
TTL_MIN=1440

usage() {
	cat >&2 <<'EOF'
Bruk:
  cf-docs.sh products [søkeord...]        Finn produktnavnet å søke under
  cf-docs.sh search <produkt> <søkeord...> Finn sider i ett produkt
  cf-docs.sh read <url>                    Skriv ut siden som markdown

Eksempel:
  cf-docs.sh search queues dead letter
  cf-docs.sh read https://developers.cloudflare.com/queues/configuration/dead-letter-queues/
EOF
	exit 64
}

# Indeksene er 7-82 KB. De caches et døgn og grepes, aldri leses i sin helhet.
index() {
	local product="${1:-}" file url
	if [ -z "$product" ]; then
		file="$CACHE/_root.txt"
		url="$BASE/llms.txt"
	else
		file="$CACHE/${product//\//_}.txt"
		url="$BASE/$product/llms.txt"
	fi

	if [ ! -f "$file" ] || [ -n "$(find "$file" -mmin "+$TTL_MIN" 2>/dev/null)" ]; then
		mkdir -p "$CACHE"
		if ! curl -sfL "$url" -o "$file.part" 2>/dev/null; then
			rm -f "$file.part"
			echo "Fant ingen indeks på $url." >&2
			echo "Sjekk produktnavnet med: cf-docs.sh products <ord>" >&2
			return 1
		fi
		mv "$file.part" "$file"
	fi
	printf '%s\n' "$file"
}

# Alle søkeord må treffe samme linje. Linjene har formen
# "- [Tittel](url): beskrivelse", og både tittel og beskrivelse er verdt å søke i.
filter() {
	local file="$1" out
	shift
	out=$(grep '^- \[' "$file")
	for term in "$@"; do
		out=$(printf '%s\n' "$out" | grep -i -- "$term") || {
			echo "Ingen treff på: $*" >&2
			return 1
		}
	done
	printf '%s\n' "$out" | sed 's/^- //' | cut -c1-200
}

cmd="${1:-}"
[ -n "$cmd" ] || usage
shift || true

case "$cmd" in
products)
	file=$(index)
	if [ $# -eq 0 ]; then
		sed 's/^- //' "$file" | grep '^\[' | cut -c1-200
	else
		filter "$file" "$@"
	fi
	;;
search)
	[ $# -ge 2 ] || usage
	product="$1"
	shift
	file=$(index "$product")
	filter "$file" "$@"
	;;
read)
	[ $# -eq 1 ] || usage
	url="$1"
	case "$url" in
	"$BASE"/*) ;;
	*)
		echo "Kun $BASE er tillatt her. Fikk: $url" >&2
		exit 1
		;;
	esac
	# Accept-headeren gir markdown også når stien har flyttet seg. Uten den lander
	# en utdatert lenke på HTML-versjonen, som er nær hundre ganger så stor.
	curl -sSfL -H "Accept: text/markdown" "$url"
	;;
*)
	usage
	;;
esac
