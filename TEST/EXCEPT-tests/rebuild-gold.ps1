<#
.SYNOPSIS
    Regenerate GOLDs for EXCEPT-tests using Windows PNut.

.DESCRIPTION
    GENERATED FILE - DO NOT EDIT. Written by scripts/gold/gen-rebuild-scripts.js
    from scripts/gold/suites.json, scripts/fixtures/fixtures.json and this
    directory's .spin2 listing. Change those, then run: npm run gen-rebuild-scripts

    Rules:
      - Default flag: -c
      - Produces:     lst, obj, bin
      - Patterns:     debug_* -> -cd; isp_* -> -cd; coverage_debug_* -> -cd
      - Per-file:     (none)
      - Skip:         9 file(s), listed in -Skip below
      - Expect fail:  17 file(s), listed in -ExpectFail below; Error.txt -> <base>.errout.GOLD

    Sourced from: src/tests/EXCEPT-tests/pnut-ts-except.test.ts. The test compiles
    {debug_,isp_,coverage_debug_}*.spin2 with -d and every other file without;
    the pattern overrides are that rule.

    Expected to fail: every fixture with a fixtures.json reject row, and every
    hand-written fixture that has an .errout.GOLD. PNut's Error.txt for it is
    renamed to <base>.errout.GOLD.

    Kept (in -Skip, never compiled, GOLD left in place): fixtures whose
    goldSource is pnut-ts. A hand-written fixture is pnut-ts when it uses a
    preprocessor directive outside PNut's eight (suites.json pnutDirectives,
    REF-V52A/p2com.asm:20094-20101), i.e. #include, #error, #warn, #pragma.
#>
param(
    [int]$PNutVersion = 55,
    [string]$PNutInstallRoot = "C:\Program Files (x86)\Parallax Inc",
    [string]$PNutBinary = ""
)

. (Join-Path $PSScriptRoot "..\..\scripts\gold\rebuild-gold-lib.ps1")

Push-Location $PSScriptRoot
try {
    Invoke-RebuildGold `
        -PNutVersion $PNutVersion `
        -PNutInstallRoot $PNutInstallRoot `
        -PNutBinary $PNutBinary `
        -DefaultFlag "-c" `
        -PerFilePatternFlag @{
            "debug_*"          = "-cd"
            "isp_*"            = "-cd"
            "coverage_debug_*" = "-cd"
        } `
        -Skip @(
            # goldSource pnut-ts: uses #include
            "pperr_bare_include.spin2"
            "pperr_include_badtype.spin2"
            "pperr_include_noquotes.spin2"
            "pperr_include_notfound.spin2"
            # goldSource pnut-ts: uses #error
            "pperr_error_indented.spin2"
            "pperr_error_live.spin2"
            # goldSource pnut-ts: uses #warn, #error
            "pperr_multi_order.spin2"
            # goldSource pnut-ts: uses #pragma
            "pperr_pragma_nosym.spin2"
            "pperr_pragma_unsupported.spin2"
        ) `
        -ExpectFail @(
            # has .errout.GOLD
            "debug_empty_str.spin2"
            "exception_test_000.spin2"
            "exception_test_006.spin2"
            "exception_test_008.spin2"
            "exception_test_009.spin2"
            "exception_test_010.spin2"
            "pperr_bad_version.spin2"
            "pperr_bare_define.spin2"
            "pperr_define_args.spin2"
            "pperr_stray_else.spin2"
            "pperr_stray_elseifdef.spin2"
            "pperr_stray_endif.spin2"
            "pperr_unknown_directive.spin2"
            "pperr_unterminated_brace_comment.spin2"
            "pperr_unterminated_ifdef.spin2"
            "symbol_length_test_30max.spin2"
            # fixtures.json row fvars_too_big is reject
            "fvars_too_big.spin2"
        )
}
finally {
    Pop-Location
}
