#!/bin/sh
# Usage:  npm run cache-fuzz        (debug on -- where the known defects live)
#         npm run cache-fuzz -- none  (no -d)
#
# Run this after ANY change to the object cache, and when adding a fixture
# graph. It needs `npm run build` first.
#
# WHY THIS EXISTS. Two cache defects shipped that a single-program cold/warm
# test cannot see, because both are only wrong RELATIVE TO A COMPILE THAT NEVER
# RAN IN THE SAME PROCESS. Every cache test before this one compiled one
# program cold then warm, so every entry it read was written by the compile
# that read it. The defects live in the gap between two DIFFERENT programs
# sharing a cache.
#
# A passing run proves nothing unless the pairs actually HIT. Check the hit
# counts when adding a graph -- a graph whose target always misses is a test
# that cannot fail.
# Order-permutation differential harness for the object cache.
#
# Invariant under test (I1, purity): a cache entry is a pure function of its
# key inputs, so the ORDER in which programs fill a shared cache must not
# change what any of them compiles to.
#
# Oracle: the uncached compile. No knowledge of the cache's mechanism is used
# or needed -- this finds order-dependence without knowing how it arises.
#
# Method: for every ORDERED PAIR (A,B) of top-level programs, prime a fresh
# cache with A, compile B against it, and compare B's binary to B's uncached
# reference. A mismatch means A's build changed B's output.
set -u
T=/workspaces/PNut-TS/dist/pnut-ts.js
FIX=/workspaces/PNut-TS/TEST/CACHE-fixtures
FLAGS="$1"; [ "$FLAGS" = "none" ] && FLAGS=""
WORK=$(mktemp -d /tmp/orderfuzz-XXXXXX)
cp "$FIX"/*.spin2 "$FIX"/*.dat "$WORK"/ 2>/dev/null
cd "$WORK" || exit 1

PROGS="dbg_cache_parentA dbg_cache_parentB expdef_parentX expdef_parentY \
expdef_subtree_parent optblock_rewind_parent ovr_deep_top root_app_top \
sgl_app_top ordfz_exp_direct ordfz_exp_indirect ordfz_deep_primer ordfz_deep_target ordfz_dup_primer ordfz_dup_target sibrec_primer sibrec_shifted sibrec_target spin_dbg_cache_parent"

echo "flags: [$FLAGS]   workdir: $WORK"

# --- Reference pass: uncached, the oracle -------------------------------
VALID=""
for p in $PROGS; do
    rm -f "$p.bin"
    if node $T $FLAGS -I . "$p.spin2" >/dev/null 2>&1 && [ -f "$p.bin" ]; then
        cp "$p.bin" "ref_$p.bin"; VALID="$VALID $p"
    else
        echo "  skip (does not compile with $FLAGS): $p"
    fi
done

PAIRS=0; FAILS=0
for a in $VALID; do
    for b in $VALID; do
        [ "$a" = "$b" ] && continue
        rm -rf cache; rm -f "$a.bin" "$b.bin"
        node $T $FLAGS --cache --cache-dir cache -I . "$a.spin2" >/dev/null 2>&1 || continue
        out=$(node $T $FLAGS --cache --cache-dir cache -I . "$b.spin2" 2>&1) || continue
        PAIRS=$((PAIRS+1))
        if ! cmp -s "$b.bin" "ref_$b.bin"; then
            FAILS=$((FAILS+1))
            hits=$(printf '%s' "$out" | sed -n 's/.*Object cache: \([^(]*\).*/\1/p')
            printf '  MISMATCH  prime=%-24s target=%-24s ref=%-7s got=%-7s (%s)\n' \
                "$a" "$b" "$(wc -c <"ref_$b.bin" | tr -d ' ')" "$(wc -c <"$b.bin" | tr -d ' ')" "$hits"
        fi
    done
done

echo "---- ordered pairs tested: $PAIRS   mismatches: $FAILS"
cd /; rm -rf "$WORK"
[ "$FAILS" -eq 0 ]
