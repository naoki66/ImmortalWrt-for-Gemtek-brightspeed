#!/usr/bin/env bash

set -Eeuo pipefail

cd "$(dirname "$0")/.."

golang_dir="feeds/packages/lang/golang"
if [[ ! -d "$golang_dir" ]]; then
	echo "feeds/packages/lang/golang not found; run ./scripts/feeds update -a && ./scripts/feeds install -a first" >&2
	exit 1
fi

go_version="$(
	awk -F':=' '/^GO_DEFAULT_VERSION:=/ { print $2; exit }' "$golang_dir/golang-values.mk"
)"
if [[ -z "$go_version" ]]; then
	go_variant="$(
		find "$golang_dir" -maxdepth 1 -type d -name 'golang1.*' -printf '%f\n' |
			sort -V |
			tail -n 1
	)"
	go_version="${go_variant#golang}"
else
	go_variant="golang$go_version"
fi

staged_go="staging_dir/hostpkg/lib/go-$go_version/bin/go"
stamp_dir="staging_dir/hostpkg/stamp"
build_matches="$(compgen -G "build_dir/hostpkg/go-$go_version*" || true)"
staged_version=""

if [[ -x "$staged_go" ]]; then
	staged_version="$("$staged_go" version 2>/dev/null | awk '{ print $3 }')"
	if [[ "$staged_version" == "go$go_version".* ]]; then
		echo "Staged Go is current: $staged_version"
		exit 0
	fi
fi

if [[ ! -e "$stamp_dir/.golang_installed" && ! -e "$stamp_dir/.$go_variant"_installed && ! -e "$staged_go" && -z "$build_matches" ]]; then
	echo "No staged Go toolchain found; nothing to clean before the first build"
	exit 0
fi

echo "Cleaning stale Go host toolchain: expected go$go_version.x, found ${staged_version:-missing}"

make package/feeds/packages/golang/host/clean || true
make "package/feeds/packages/$go_variant/host/clean" || true
make package/feeds/packages/golang-bootstrap/host/clean || true

rm -rf \
	"build_dir/hostpkg/go-$go_version" \
	"build_dir/hostpkg/go-$go_version".* \
	build_dir/hostpkg/golang-* \
	build_dir/hostpkg/golang-bootstrap-* \
	"staging_dir/hostpkg/lib/go-$go_version" \
	"staging_dir/hostpkg/stamp/.$go_variant"_installed \
	staging_dir/hostpkg/stamp/.golang_installed \
	staging_dir/hostpkg/stamp/.golang-bootstrap_installed \
	tmp/go-build

echo "Stale Go host toolchain cleaned; rebuild golang/host or retry the failed Go package"
