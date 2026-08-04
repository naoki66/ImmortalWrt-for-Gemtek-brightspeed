#!/usr/bin/env bash
export LANG=C
export LC_ALL=C
[ -n "$TOPDIR" ] && cd $TOPDIR

GET_REV=$1

try_version() {
	[ -f version ] || return 1
	REV="$(cat version)"
	[ -n "$REV" ]
}

try_git() {
	REBOOT=ee53a240ac902dc83209008a2671e7fdcf55957a
	git rev-parse --git-dir >/dev/null 2>&1 || return 1

	[ -n "$GET_REV" ] || GET_REV="HEAD"

	case "$GET_REV" in
	r*)
		GET_REV="$(echo $GET_REV | tr -d 'r')"
		BASE_REV="$(git rev-list ${REBOOT}..HEAD 2>/dev/null | wc -l | awk '{print $1}')"
		[ $((BASE_REV - GET_REV)) -ge 0 ] && REV="$(git rev-parse HEAD~$((BASE_REV - GET_REV)))"
		;;
	*-*-*)  # ISO date format - for approximating when packages were removed or renamed
		GET_REV="$(git log -n 1 --format="%h" --until "$GET_REV")"
		;&  # FALLTHROUGH
	*)
		UPSTREAM_REF="$(git rev-parse --verify upstream/master 2>/dev/null)"
		if [ -z "$UPSTREAM_REF" ]; then
			BRANCH="$(git rev-parse --abbrev-ref HEAD)"
			UPSTREAM_REF="$(git rev-parse --verify --symbolic-full-name ${BRANCH}@{u} 2>/dev/null)"
			[ -n "$UPSTREAM_REF" ] || UPSTREAM_REF="$(git rev-parse --verify --symbolic-full-name main@{u} 2>/dev/null)"
		fi

		if [ -n "$UPSTREAM_REF" ]; then
			UPSTREAM_BASE="$(git merge-base $GET_REV $UPSTREAM_REF)"
			UPSTREAM_HASH="$(git log -n 1 --no-show-signature --format="%h" $UPSTREAM_BASE)"
		else
			UPSTREAM_HASH="$(git log -n 1 --no-show-signature --format="%h" $GET_REV)"
		fi

		LOCAL_HASH="$(git log -n 1 --no-show-signature --format="%h" $GET_REV)"
		BUILD_DATE="$(date +%Y-%-m-%-d)"

		REV="${BUILD_DATE}-${UPSTREAM_HASH}-${LOCAL_HASH}"

		;;
	esac

	[ -n "$REV" ]
}

try_hg() {
	[ -d .hg ] || return 1
	REV="$(hg log -r-1 --template '{desc}' | awk '{print $2}' | sed 's/\].*//')"
	REV="${REV:+r$REV}"
	[ -n "$REV" ]
}

try_version || try_git || try_hg || REV="unknown"
echo "$REV"
