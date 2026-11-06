#!/usr/bin/env bash

# A release action reuses an existing tag and cannot move it with
# target_commitish. Refuse to publish build artifacts under a different commit.
set -euo pipefail

if [[ $# -ne 2 ]]; then
	echo "Usage: $0 <tag> <build-commit>" >&2
	exit 2
fi

tag_ref="refs/tags/$1"
git check-ref-format "$tag_ref"
expected=$(git rev-parse --verify "$2^{commit}")
refs=$(git ls-remote --tags origin "$tag_ref" "$tag_ref^{}")
tag_object=$(awk -v ref="$tag_ref" '$2 == ref { print $1 }' <<< "$refs")
tag_commit=$(awk -v ref="$tag_ref^{}" '$2 == ref { print $1 }' <<< "$refs")

if [[ -z "$tag_object" ]]; then
	echo "Release tag $1 does not exist; it will be created at $expected."
	exit 0
fi

# Annotated tags have a peeled entry; lightweight tags point at the commit.
tag_commit="${tag_commit:-$tag_object}"
if [[ "$tag_commit" != "$expected" ]]; then
	echo "Release tag $1 points to $tag_commit, not build commit $expected." >&2
	exit 1
fi

echo "Release tag $1 already points to build commit $expected."
