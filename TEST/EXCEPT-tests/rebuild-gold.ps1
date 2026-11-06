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
      - Skip:         397 file(s), listed in -Skip below
      - Expect fail:  349 file(s), listed in -ExpectFail below; Error.txt -> <base>.errout.GOLD

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
            # child of a generated fixture, compiled through its parent
            "gen_err_b_dsdle__c1.spin2"
            "gen_err_b_dsdle__c2.spin2"
            "gen_err_b_dsdle__c3.spin2"
            "gen_err_b_eas_m190__x.spin2"
            "gen_err_b_exportdef_filename__c.spin2"
            "gen_err_b_loxdsde_m621__c1.spin2"
            "gen_err_b_loxdsde_m621__c2.spin2"
            "gen_err_b_loxdsde_m622__c1.spin2"
            "gen_err_b_loxdsde_m622__c2.spin2"
            "gen_err_b_loxoie__x.spin2"
            "gen_err_b_loxuoe__c000.spin2"
            "gen_err_b_loxuoe__c001.spin2"
            "gen_err_b_loxuoe__c002.spin2"
            "gen_err_b_loxuoe__c003.spin2"
            "gen_err_b_loxuoe__c004.spin2"
            "gen_err_b_loxuoe__c005.spin2"
            "gen_err_b_loxuoe__c006.spin2"
            "gen_err_b_loxuoe__c007.spin2"
            "gen_err_b_loxuoe__c008.spin2"
            "gen_err_b_loxuoe__c009.spin2"
            "gen_err_b_loxuoe__c010.spin2"
            "gen_err_b_loxuoe__c011.spin2"
            "gen_err_b_loxuoe__c012.spin2"
            "gen_err_b_loxuoe__c013.spin2"
            "gen_err_b_loxuoe__c014.spin2"
            "gen_err_b_loxuoe__c015.spin2"
            "gen_err_b_loxuoe__c016.spin2"
            "gen_err_b_loxuoe__c017.spin2"
            "gen_err_b_loxuoe__c018.spin2"
            "gen_err_b_loxuoe__c019.spin2"
            "gen_err_b_loxuoe__c020.spin2"
            "gen_err_b_loxuoe__c021.spin2"
            "gen_err_b_loxuoe__c022.spin2"
            "gen_err_b_loxuoe__c023.spin2"
            "gen_err_b_loxuoe__c024.spin2"
            "gen_err_b_loxuoe__c025.spin2"
            "gen_err_b_loxuoe__c026.spin2"
            "gen_err_b_loxuoe__c027.spin2"
            "gen_err_b_loxuoe__c028.spin2"
            "gen_err_b_loxuoe__c029.spin2"
            "gen_err_b_loxuoe__c030.spin2"
            "gen_err_b_loxuoe__c031.spin2"
            "gen_err_b_loxuoe__c032.spin2"
            "gen_err_b_loxuoe__c033.spin2"
            "gen_err_b_loxuoe__c034.spin2"
            "gen_err_b_loxuoe__c035.spin2"
            "gen_err_b_loxuoe__c036.spin2"
            "gen_err_b_loxuoe__c037.spin2"
            "gen_err_b_loxuoe__c038.spin2"
            "gen_err_b_loxuoe__c039.spin2"
            "gen_err_b_loxuoe__c040.spin2"
            "gen_err_b_loxuoe__c041.spin2"
            "gen_err_b_loxuoe__c042.spin2"
            "gen_err_b_loxuoe__c043.spin2"
            "gen_err_b_loxuoe__c044.spin2"
            "gen_err_b_loxuoe__c045.spin2"
            "gen_err_b_loxuoe__c046.spin2"
            "gen_err_b_loxuoe__c047.spin2"
            "gen_err_b_loxuoe__c048.spin2"
            "gen_err_b_loxuoe__c049.spin2"
            "gen_err_b_loxuoe__c050.spin2"
            "gen_err_b_loxuoe__c051.spin2"
            "gen_err_b_loxuoe__c052.spin2"
            "gen_err_b_loxuoe__c053.spin2"
            "gen_err_b_loxuoe__c054.spin2"
            "gen_err_b_loxuoe__c055.spin2"
            "gen_err_b_loxuoe__c056.spin2"
            "gen_err_b_loxuoe__c057.spin2"
            "gen_err_b_loxuoe__c058.spin2"
            "gen_err_b_loxuoe__c059.spin2"
            "gen_err_b_loxuoe__c060.spin2"
            "gen_err_b_loxuoe__c061.spin2"
            "gen_err_b_loxuoe__c062.spin2"
            "gen_err_b_loxuoe__c063.spin2"
            "gen_err_b_loxuoe__c064.spin2"
            "gen_err_b_loxuoe__c065.spin2"
            "gen_err_b_loxuoe__c066.spin2"
            "gen_err_b_loxuoe__c067.spin2"
            "gen_err_b_loxuoe__c068.spin2"
            "gen_err_b_loxuoe__c069.spin2"
            "gen_err_b_loxuoe__c070.spin2"
            "gen_err_b_loxuoe__c071.spin2"
            "gen_err_b_loxuoe__c072.spin2"
            "gen_err_b_loxuoe__c073.spin2"
            "gen_err_b_loxuoe__c074.spin2"
            "gen_err_b_loxuoe__c075.spin2"
            "gen_err_b_loxuoe__c076.spin2"
            "gen_err_b_loxuoe__c077.spin2"
            "gen_err_b_loxuoe__c078.spin2"
            "gen_err_b_loxuoe__c079.spin2"
            "gen_err_b_loxuoe__c080.spin2"
            "gen_err_b_loxuoe__c081.spin2"
            "gen_err_b_loxuoe__c082.spin2"
            "gen_err_b_loxuoe__c083.spin2"
            "gen_err_b_loxuoe__c084.spin2"
            "gen_err_b_loxuoe__c085.spin2"
            "gen_err_b_loxuoe__c086.spin2"
            "gen_err_b_loxuoe__c087.spin2"
            "gen_err_b_loxuoe__c088.spin2"
            "gen_err_b_loxuoe__c089.spin2"
            "gen_err_b_loxuoe__c090.spin2"
            "gen_err_b_loxuoe__c091.spin2"
            "gen_err_b_loxuoe__c092.spin2"
            "gen_err_b_loxuoe__c093.spin2"
            "gen_err_b_loxuoe__c094.spin2"
            "gen_err_b_loxuoe__c095.spin2"
            "gen_err_b_loxuoe__c096.spin2"
            "gen_err_b_loxuoe__c097.spin2"
            "gen_err_b_loxuoe__c098.spin2"
            "gen_err_b_loxuoe__c099.spin2"
            "gen_err_b_loxuoe__c100.spin2"
            "gen_err_b_loxuoe__c101.spin2"
            "gen_err_b_loxuoe__c102.spin2"
            "gen_err_b_loxuoe__c103.spin2"
            "gen_err_b_loxuoe__c104.spin2"
            "gen_err_b_loxuoe__c105.spin2"
            "gen_err_b_loxuoe__c106.spin2"
            "gen_err_b_loxuoe__c107.spin2"
            "gen_err_b_loxuoe__c108.spin2"
            "gen_err_b_loxuoe__c109.spin2"
            "gen_err_b_loxuoe__c110.spin2"
            "gen_err_b_loxuoe__c111.spin2"
            "gen_err_b_loxuoe__c112.spin2"
            "gen_err_b_loxuoe__c113.spin2"
            "gen_err_b_loxuoe__c114.spin2"
            "gen_err_b_loxuoe__c115.spin2"
            "gen_err_b_loxuoe__c116.spin2"
            "gen_err_b_loxuoe__c117.spin2"
            "gen_err_b_loxuoe__c118.spin2"
            "gen_err_b_loxuoe__c119.spin2"
            "gen_err_b_loxuoe__c120.spin2"
            "gen_err_b_loxuoe__c121.spin2"
            "gen_err_b_loxuoe__c122.spin2"
            "gen_err_b_loxuoe__c123.spin2"
            "gen_err_b_loxuoe__c124.spin2"
            "gen_err_b_loxuoe__c125.spin2"
            "gen_err_b_loxuoe__c126.spin2"
            "gen_err_b_loxuoe__c127.spin2"
            "gen_err_b_loxuoe__c128.spin2"
            "gen_err_b_loxuoe__c129.spin2"
            "gen_err_b_loxuoe__c130.spin2"
            "gen_err_b_loxuoe__c131.spin2"
            "gen_err_b_loxuoe__c132.spin2"
            "gen_err_b_loxuoe__c133.spin2"
            "gen_err_b_loxuoe__c134.spin2"
            "gen_err_b_loxuoe__c135.spin2"
            "gen_err_b_loxuoe__c136.spin2"
            "gen_err_b_loxuoe__c137.spin2"
            "gen_err_b_loxuoe__c138.spin2"
            "gen_err_b_loxuoe__c139.spin2"
            "gen_err_b_loxuoe__c140.spin2"
            "gen_err_b_loxuoe__c141.spin2"
            "gen_err_b_loxuoe__c142.spin2"
            "gen_err_b_loxuoe__c143.spin2"
            "gen_err_b_loxuoe__c144.spin2"
            "gen_err_b_loxuoe__c145.spin2"
            "gen_err_b_loxuoe__c146.spin2"
            "gen_err_b_loxuoe__c147.spin2"
            "gen_err_b_loxuoe__c148.spin2"
            "gen_err_b_loxuoe__c149.spin2"
            "gen_err_b_loxuoe__c150.spin2"
            "gen_err_b_loxuoe__c151.spin2"
            "gen_err_b_loxuoe__c152.spin2"
            "gen_err_b_loxuoe__c153.spin2"
            "gen_err_b_loxuoe__c154.spin2"
            "gen_err_b_loxuoe__c155.spin2"
            "gen_err_b_loxuoe__c156.spin2"
            "gen_err_b_loxuoe__c157.spin2"
            "gen_err_b_loxuoe__c158.spin2"
            "gen_err_b_loxuoe__c159.spin2"
            "gen_err_b_loxuoe__c160.spin2"
            "gen_err_b_loxuoe__c161.spin2"
            "gen_err_b_loxuoe__c162.spin2"
            "gen_err_b_loxuoe__c163.spin2"
            "gen_err_b_loxuoe__c164.spin2"
            "gen_err_b_loxuoe__c165.spin2"
            "gen_err_b_loxuoe__c166.spin2"
            "gen_err_b_loxuoe__c167.spin2"
            "gen_err_b_loxuoe__c168.spin2"
            "gen_err_b_loxuoe__c169.spin2"
            "gen_err_b_loxuoe__c170.spin2"
            "gen_err_b_loxuoe__c171.spin2"
            "gen_err_b_loxuoe__c172.spin2"
            "gen_err_b_loxuoe__c173.spin2"
            "gen_err_b_loxuoe__c174.spin2"
            "gen_err_b_loxuoe__c175.spin2"
            "gen_err_b_loxuoe__c176.spin2"
            "gen_err_b_loxuoe__c177.spin2"
            "gen_err_b_loxuoe__c178.spin2"
            "gen_err_b_loxuoe__c179.spin2"
            "gen_err_b_loxuoe__c180.spin2"
            "gen_err_b_loxuoe__c181.spin2"
            "gen_err_b_loxuoe__c182.spin2"
            "gen_err_b_loxuoe__c183.spin2"
            "gen_err_b_loxuoe__c184.spin2"
            "gen_err_b_loxuoe__c185.spin2"
            "gen_err_b_loxuoe__c186.spin2"
            "gen_err_b_loxuoe__c187.spin2"
            "gen_err_b_loxuoe__c188.spin2"
            "gen_err_b_loxuoe__c189.spin2"
            "gen_err_b_loxuoe__c190.spin2"
            "gen_err_b_loxuoe__c191.spin2"
            "gen_err_b_loxuoe__c192.spin2"
            "gen_err_b_loxuoe__c193.spin2"
            "gen_err_b_loxuoe__c194.spin2"
            "gen_err_b_loxuoe__c195.spin2"
            "gen_err_b_loxuoe__c196.spin2"
            "gen_err_b_loxuoe__c197.spin2"
            "gen_err_b_loxuoe__c198.spin2"
            "gen_err_b_loxuoe__c199.spin2"
            "gen_err_b_loxuoe__c200.spin2"
            "gen_err_b_loxuoe__c201.spin2"
            "gen_err_b_loxuoe__c202.spin2"
            "gen_err_b_loxuoe__c203.spin2"
            "gen_err_b_loxuoe__c204.spin2"
            "gen_err_b_loxuoe__c205.spin2"
            "gen_err_b_loxuoe__c206.spin2"
            "gen_err_b_loxuoe__c207.spin2"
            "gen_err_b_loxuoe__c208.spin2"
            "gen_err_b_loxuoe__c209.spin2"
            "gen_err_b_loxuoe__c210.spin2"
            "gen_err_b_loxuoe__c211.spin2"
            "gen_err_b_loxuoe__c212.spin2"
            "gen_err_b_loxuoe__c213.spin2"
            "gen_err_b_loxuoe__c214.spin2"
            "gen_err_b_loxuoe__c215.spin2"
            "gen_err_b_loxuoe__c216.spin2"
            "gen_err_b_loxuoe__c217.spin2"
            "gen_err_b_loxuoe__c218.spin2"
            "gen_err_b_loxuoe__c219.spin2"
            "gen_err_b_loxuoe__c220.spin2"
            "gen_err_b_loxuoe__c221.spin2"
            "gen_err_b_loxuoe__c222.spin2"
            "gen_err_b_loxuoe__c223.spin2"
            "gen_err_b_loxuoe__c224.spin2"
            "gen_err_b_loxuoe__c225.spin2"
            "gen_err_b_loxuoe__c226.spin2"
            "gen_err_b_loxuoe__c227.spin2"
            "gen_err_b_loxuoe__c228.spin2"
            "gen_err_b_loxuoe__c229.spin2"
            "gen_err_b_loxuoe__c230.spin2"
            "gen_err_b_loxuoe__c231.spin2"
            "gen_err_b_loxuoe__c232.spin2"
            "gen_err_b_loxuoe__c233.spin2"
            "gen_err_b_loxuoe__c234.spin2"
            "gen_err_b_loxuoe__c235.spin2"
            "gen_err_b_loxuoe__c236.spin2"
            "gen_err_b_loxuoe__c237.spin2"
            "gen_err_b_loxuoe__c238.spin2"
            "gen_err_b_loxuoe__c239.spin2"
            "gen_err_b_loxuoe__c240.spin2"
            "gen_err_b_loxuoe__c241.spin2"
            "gen_err_b_loxuoe__c242.spin2"
            "gen_err_b_loxuoe__c243.spin2"
            "gen_err_b_loxuoe__c244.spin2"
            "gen_err_b_loxuoe__c245.spin2"
            "gen_err_b_loxuoe__c246.spin2"
            "gen_err_b_loxuoe__c247.spin2"
            "gen_err_b_loxuoe__c248.spin2"
            "gen_err_b_loxuoe__c249.spin2"
            "gen_err_b_loxuoe__c250.spin2"
            "gen_err_b_loxuoe__c251.spin2"
            "gen_err_b_loxuoe__c252.spin2"
            "gen_err_b_loxuoe__c253.spin2"
            "gen_err_b_loxuoe__c254.spin2"
            "gen_err_b_loxuoe__c255.spin2"
            "gen_err_b_obj_name_cut_missing__child.spin2"
            "gen_err_b_obj_nesting_17__c01.spin2"
            "gen_err_b_obj_nesting_17__c02.spin2"
            "gen_err_b_obj_nesting_17__c03.spin2"
            "gen_err_b_obj_nesting_17__c04.spin2"
            "gen_err_b_obj_nesting_17__c05.spin2"
            "gen_err_b_obj_nesting_17__c06.spin2"
            "gen_err_b_obj_nesting_17__c07.spin2"
            "gen_err_b_obj_nesting_17__c08.spin2"
            "gen_err_b_obj_nesting_17__c09.spin2"
            "gen_err_b_obj_nesting_17__c10.spin2"
            "gen_err_b_obj_nesting_17__c11.spin2"
            "gen_err_b_obj_nesting_17__c12.spin2"
            "gen_err_b_obj_nesting_17__c13.spin2"
            "gen_err_b_obj_nesting_17__c14.spin2"
            "gen_err_b_obj_nesting_17__c15.spin2"
            "gen_err_b_obj_nesting_17__c16.spin2"
            "gen_err_b_pasm_object__c.spin2"
            "gen_err_b_tmop__x.spin2"
            "gen_err_b_tmvsid_m602__c.spin2"
            "gen_err_b_tmvsid_m603__c.spin2"
            "gen_err_c_eamn_m180__c.spin2"
            "gen_err_c_eamn_m181__c.spin2"
            "gen_err_c_eamn_m182__c.spin2"
            "gen_err_c_eaocsom__c.spin2"
            "gen_err_c_ecolon_obj__c.spin2"
            "gen_err_c_edot__c.spin2"
            "gen_err_c_eequal__c.spin2"
            "gen_err_c_oiina__c.spin2"
            "gen_err_c_spmcrmv_m590__c.spin2"
            "gen_err_f_child_object_m490__c00.spin2"
            "gen_err_f_child_object_m490__c01.spin2"
            "gen_err_f_child_object_m490__c02.spin2"
            "gen_err_f_child_object_m490__c03.spin2"
            "gen_err_f_child_object_m490__c04.spin2"
            "gen_err_f_child_object_m490__c05.spin2"
            "gen_err_f_child_object_m490__c06.spin2"
            "gen_err_f_child_object_m490__c07.spin2"
            "gen_err_f_child_object_m490__c08.spin2"
            "gen_err_f_child_object_m490__c09.spin2"
            "gen_err_f_child_object_m490__c10.spin2"
            "gen_err_f_child_object_m490__c11.spin2"
            "gen_err_f_child_object_m490__c12.spin2"
            "gen_err_f_child_object_m490__c13.spin2"
            "gen_err_f_child_object_m490__c14.spin2"
            "gen_err_f_child_object_m490__c15.spin2"
            "gen_err_f_child_object_m490__c16.spin2"
            "gen_err_f_child_object_m490__c17.spin2"
            "gen_err_f_child_object_m490__c18.spin2"
            "gen_err_f_child_object_m490__c19.spin2"
            "gen_err_f_child_object_m490__c20.spin2"
            "gen_err_f_child_object_m490__c21.spin2"
            "gen_err_f_child_object_m490__c22.spin2"
            "gen_err_f_child_object_m490__c23.spin2"
            "gen_err_f_child_object_m490__c24.spin2"
            "gen_err_f_child_object_m490__c25.spin2"
            "gen_err_f_image_m491__c00.spin2"
            "gen_err_f_image_m491__c01.spin2"
            "gen_err_f_image_m491__c02.spin2"
            "gen_err_f_image_m491__c03.spin2"
            "gen_err_f_image_m491__c04.spin2"
            "gen_err_f_image_m491__c05.spin2"
            "gen_err_f_image_m491__c06.spin2"
            "gen_err_f_image_m491__c07.spin2"
            "gen_err_f_image_m491__c08.spin2"
            "gen_err_f_image_m491__c09.spin2"
            "gen_err_f_image_m491__c10.spin2"
            "gen_err_f_image_m491__c11.spin2"
            "gen_err_f_image_m491__c12.spin2"
            "gen_err_f_image_m491__c13.spin2"
            "gen_err_f_image_m491__c14.spin2"
            "gen_err_f_image_m491__c15.spin2"
            "gen_err_f_image_m491__c16.spin2"
            "gen_err_f_image_m491__c17.spin2"
            "gen_err_f_image_m491__c18.spin2"
            "gen_err_f_image_m491__c19.spin2"
            "gen_err_f_image_m491__c20.spin2"
            "gen_err_f_image_m491__c21.spin2"
            "gen_err_f_image_m491__c22.spin2"
            "gen_err_f_image_m491__c23.spin2"
            "gen_err_f_image_m491__c24.spin2"
            "gen_err_f_obj_data_m691__c00.spin2"
            "gen_err_f_obj_data_m691__c01.spin2"
            "gen_err_f_obj_data_m691__c02.spin2"
            "gen_err_f_obj_data_m691__c03.spin2"
            "gen_err_f_obj_data_m691__c04.spin2"
            "gen_err_f_obj_data_m691__c05.spin2"
            "gen_err_f_obj_data_m691__c06.spin2"
            "gen_err_f_obj_data_m691__c07.spin2"
            "gen_err_f_obj_data_m691__c08.spin2"
            "gen_err_f_obj_data_m691__c09.spin2"
            "gen_err_f_obj_data_m691__c10.spin2"
            "gen_err_f_obj_data_m691__c11.spin2"
            "gen_err_f_obj_data_m691__c12.spin2"
            "gen_err_f_obj_data_m691__c13.spin2"
            "gen_err_f_obj_data_m691__c14.spin2"
            "gen_err_f_obj_data_m691__c15.spin2"
            "gen_err_f_obj_data_m691__c16.spin2"
            "gen_err_f_obj_data_m691__c17.spin2"
            "gen_err_f_obj_data_m691__c18.spin2"
            "gen_err_f_obj_data_m691__c19.spin2"
            "gen_err_f_obj_data_m691__c20.spin2"
            "gen_err_f_obj_data_m691__c21.spin2"
            "gen_err_f_obj_data_m691__c22.spin2"
            "gen_err_f_obj_data_m691__c23.spin2"
            "gen_err_f_obj_data_m691__c24.spin2"
            "gen_err_f_obj_data_m691__c25.spin2"
            "gen_err_f_obj_data_m691__c26.spin2"
            "gen_err_g_ifdef_in_include__inc.spin2"
            # fixtures.json row err_b_exportdef_filename is goldSource pnut-ts
            "gen_err_b_exportdef_filename.spin2"
            # fixtures.json row err_b_object_nesting is goldSource pnut-ts
            "gen_err_b_object_nesting.spin2"
            # fixtures.json row err_b_pasm_object is goldSource pnut-ts
            "gen_err_b_pasm_object.spin2"
            # fixtures.json row err_b_requires_version is goldSource pnut-ts
            "gen_err_b_requires_version.spin2"
            # fixtures.json row err_e_clkfreq_range is goldSource pnut-ts
            "gen_err_e_clkfreq_range.spin2"
            # fixtures.json row err_e_xinfreq_range is goldSource pnut-ts
            "gen_err_e_xinfreq_range.spin2"
            # fixtures.json row err_f_child_object_m490 is goldSource pnut-ts
            "gen_err_f_child_object_m490.spin2"
            # fixtures.json row err_f_hub_ram is goldSource pnut-ts
            "gen_err_f_hub_ram.spin2"
            # fixtures.json row err_f_image_m491 is goldSource pnut-ts
            "gen_err_f_image_m491.spin2"
            # fixtures.json row err_f_obj_data_m691 is goldSource pnut-ts
            "gen_err_f_obj_data_m691.spin2"
            # fixtures.json row err_g_elseif_unsupported is goldSource pnut-ts
            "gen_err_g_elseif_unsupported.spin2"
            # fixtures.json row err_g_if_unsupported is goldSource pnut-ts
            "gen_err_g_if_unsupported.spin2"
            # fixtures.json row err_g_ifdef_in_include is goldSource pnut-ts
            "gen_err_g_ifdef_in_include.spin2"
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
            # fixtures.json row err_b_struct_name_runtime_index_debug is reject
            "debug_gen_err_b_struct_name_runtime_index_debug.spin2"
            # fixtures.json row err_c_dditl_m150 is reject
            "debug_gen_err_c_dditl_m150.spin2"
            # fixtures.json row err_c_dditl_m151 is reject
            "debug_gen_err_c_dditl_m151.spin2"
            # fixtures.json row err_c_dditl_m152 is reject
            "debug_gen_err_c_dditl_m152.spin2"
            # fixtures.json row err_c_dditl_m153 is reject
            "debug_gen_err_c_dditl_m153.spin2"
            # fixtures.json row err_c_dditl_size_limit_plus1 is reject
            "debug_gen_err_c_dditl_size_limit_plus1.spin2"
            # fixtures.json row err_c_dmbmb is reject
            "debug_gen_err_c_dmbmb.spin2"
            # fixtures.json row err_c_dmmbd is reject
            "debug_gen_err_c_dmmbd.spin2"
            # fixtures.json row err_c_eaenop is reject
            "debug_gen_err_c_eaenop.spin2"
            # fixtures.json row err_c_eaet_m170 is reject
            "debug_gen_err_c_eaet_m170.spin2"
            # fixtures.json row err_c_eaet_m171 is reject
            "debug_gen_err_c_eaet_m171.spin2"
            # fixtures.json row err_c_ebackcmd is reject
            "debug_gen_err_c_ebackcmd.spin2"
            # fixtures.json row err_c_os is reject
            "debug_gen_err_c_os.spin2"
            # fixtures.json row err_c_rpcx is reject
            "debug_gen_err_c_rpcx.spin2"
            # fixtures.json row err_e_debugclk is reject
            "debug_gen_err_e_debugclk.spin2"
            # fixtures.json row err_e_debugcog is reject
            "debug_gen_err_e_debugcog.spin2"
            # fixtures.json row err_e_debugdly is reject
            "debug_gen_err_e_debugdly.spin2"
            # fixtures.json row fvars_too_big is reject
            "fvars_too_big.spin2"
            # fixtures.json row err_a_bmbpbb is reject
            "gen_err_a_bmbpbb.spin2"
            # fixtures.json row err_a_ce32b is reject
            "gen_err_a_ce32b.spin2"
            # fixtures.json row err_a_eatq is reject
            "gen_err_a_eatq.spin2"
            # fixtures.json row err_a_erbb is reject
            "gen_err_a_erbb.spin2"
            # fixtures.json row err_a_fpcmbw is reject
            "gen_err_a_fpcmbw.spin2"
            # fixtures.json row err_a_idbn is reject
            "gen_err_a_idbn.spin2"
            # fixtures.json row err_a_nmt4c is reject
            "gen_err_a_nmt4c.spin2"
            # fixtures.json row err_a_uc is reject
            "gen_err_a_uc.spin2"
            # fixtures.json row err_b2_bfaoa is reject
            "gen_err_b2_bfaoa.spin2"
            # fixtures.json row err_b2_bnebwlb_m680 is reject
            "gen_err_b2_bnebwlb_m680.spin2"
            # fixtures.json row err_b2_bnebwlb_m681 is reject
            "gen_err_b2_bnebwlb_m681.spin2"
            # fixtures.json row err_b2_eas_bitfield is reject
            "gen_err_b2_eas_bitfield.spin2"
            # fixtures.json row err_b2_easmn_bitfield is reject
            "gen_err_b2_easmn_bitfield.spin2"
            # fixtures.json row err_b2_lbnceubn is reject
            "gen_err_b2_lbnceubn.spin2"
            # fixtures.json row err_b_bdmbifc is reject
            "gen_err_b_bdmbifc.spin2"
            # fixtures.json row err_b_cannotfind is reject
            "gen_err_b_cannotfind.spin2"
            # fixtures.json row err_b_cfbex is reject
            "gen_err_b_cfbex.spin2"
            # fixtures.json row err_b_cfiinu is reject
            "gen_err_b_cfiinu.spin2"
            # fixtures.json row err_b_cfvmbw is reject
            "gen_err_b_cfvmbw.spin2"
            # fixtures.json row err_b_datnotfound_preload is reject
            "gen_err_b_datnotfound_preload.spin2"
            # fixtures.json row err_b_dsdle is reject
            "gen_err_b_dsdle.spin2"
            # fixtures.json row err_b_eaesn_m640 is reject
            "gen_err_b_eaesn_m640.spin2"
            # fixtures.json row err_b_eaesn_m641 is reject
            "gen_err_b_eaesn_m641.spin2"
            # fixtures.json row err_b_eas_m190 is reject
            "gen_err_b_eas_m190.spin2"
            # fixtures.json row err_b_eas_m191 is reject
            "gen_err_b_eas_m191.spin2"
            # fixtures.json row err_b_easmn_m650 is reject
            "gen_err_b_easmn_m650.spin2"
            # fixtures.json row err_b_easmn_m651 is reject
            "gen_err_b_easmn_m651.spin2"
            # fixtures.json row err_b_easn_m200 is reject
            "gen_err_b_easn_m200.spin2"
            # fixtures.json row err_b_easn_m201 is reject
            "gen_err_b_easn_m201.spin2"
            # fixtures.json row err_b_eaucnpos_dup is reject
            "gen_err_b_eaucnpos_dup.spin2"
            # fixtures.json row err_b_eaucnpos_m210 is reject
            "gen_err_b_eaucnpos_m210.spin2"
            # fixtures.json row err_b_eaucnpos_m211 is reject
            "gen_err_b_eaucnpos_m211.spin2"
            # fixtures.json row err_b_eaumn is reject
            "gen_err_b_eaumn.spin2"
            # fixtures.json row err_b_eauon is reject
            "gen_err_b_eauon.spin2"
            # fixtures.json row err_b_eaupn_m220 is reject
            "gen_err_b_eaupn_m220.spin2"
            # fixtures.json row err_b_eaupn_m221 is reject
            "gen_err_b_eaupn_m221.spin2"
            # fixtures.json row err_b_eaurn_m230 is reject
            "gen_err_b_eaurn_m230.spin2"
            # fixtures.json row err_b_eaurn_m231 is reject
            "gen_err_b_eaurn_m231.spin2"
            # fixtures.json row err_b_eausn is reject
            "gen_err_b_eausn.spin2"
            # fixtures.json row err_b_eauvn is reject
            "gen_err_b_eauvn.spin2"
            # fixtures.json row err_b_eauvnsa_m240 is reject
            "gen_err_b_eauvnsa_m240.spin2"
            # fixtures.json row err_b_eauvnsa_m241 is reject
            "gen_err_b_eauvnsa_m241.spin2"
            # fixtures.json row err_b_eauvnsa_m242 is reject
            "gen_err_b_eauvnsa_m242.spin2"
            # fixtures.json row err_b_eelcoeol is reject
            "gen_err_b_eelcoeol.spin2"
            # fixtures.json row err_b_eeol_struct_name_runtime_index is reject
            "gen_err_b_eeol_struct_name_runtime_index.spin2"
            # fixtures.json row err_b_eeol_struct_nameless_two_index is reject
            "gen_err_b_eeol_struct_nameless_two_index.spin2"
            # fixtures.json row err_b_eiconos is reject
            "gen_err_b_eiconos.spin2"
            # fixtures.json row err_b_eloe is reject
            "gen_err_b_eloe.spin2"
            # fixtures.json row err_b_ftl is reject
            "gen_err_b_ftl.spin2"
            # fixtures.json row err_b_iccbl is reject
            "gen_err_b_iccbl.spin2"
            # fixtures.json row err_b_iccbl_neg is reject
            "gen_err_b_iccbl_neg.spin2"
            # fixtures.json row err_b_icce is reject
            "gen_err_b_icce.spin2"
            # fixtures.json row err_b_ifc is reject
            "gen_err_b_ifc.spin2"
            # fixtures.json row err_b_ifufiq is reject
            "gen_err_b_ifufiq.spin2"
            # fixtures.json row err_b_iscexb_m400 is reject
            "gen_err_b_iscexb_m400.spin2"
            # fixtures.json row err_b_iscexb_m401 is reject
            "gen_err_b_iscexb_m401.spin2"
            # fixtures.json row err_b_iscexb_m402 is reject
            "gen_err_b_iscexb_m402.spin2"
            # fixtures.json row err_b_loxcase is reject
            "gen_err_b_loxcase.spin2"
            # fixtures.json row err_b_loxcasef is reject
            "gen_err_b_loxcasef.spin2"
            # fixtures.json row err_b_loxdsde_m621 is reject
            "gen_err_b_loxdsde_m621.spin2"
            # fixtures.json row err_b_loxdsde_m622 is reject
            "gen_err_b_loxdsde_m622.spin2"
            # fixtures.json row err_b_loxee is reject
            "gen_err_b_loxee.spin2"
            # fixtures.json row err_b_loxlve is reject
            "gen_err_b_loxlve.spin2"
            # fixtures.json row err_b_loxoie is reject
            "gen_err_b_loxoie.spin2"
            # fixtures.json row err_b_loxpe_m430 is reject
            "gen_err_b_loxpe_m430.spin2"
            # fixtures.json row err_b_loxpe_m431 is reject
            "gen_err_b_loxpe_m431.spin2"
            # fixtures.json row err_b_loxppme is reject
            "gen_err_b_loxppme.spin2"
            # fixtures.json row err_b_loxre_m440 is reject
            "gen_err_b_loxre_m440.spin2"
            # fixtures.json row err_b_loxre_m441 is reject
            "gen_err_b_loxre_m441.spin2"
            # fixtures.json row err_b_loxrs is reject
            "gen_err_b_loxrs.spin2"
            # fixtures.json row err_b_loxuoe is reject
            "gen_err_b_loxuoe.spin2"
            # fixtures.json row err_b_nce_m460 is reject
            "gen_err_b_nce_m460.spin2"
            # fixtures.json row err_b_nce_m461 is reject
            "gen_err_b_nce_m461.spin2"
            # fixtures.json row err_b_nqinsn is reject
            "gen_err_b_nqinsn.spin2"
            # fixtures.json row err_b_nqlcmb is reject
            "gen_err_b_nqlcmb.spin2"
            # fixtures.json row err_b_oaocbats is reject
            "gen_err_b_oaocbats.spin2"
            # fixtures.json row err_b_obj_name_cut_missing is reject
            "gen_err_b_obj_name_cut_missing.spin2"
            # fixtures.json row err_b_obj_nesting_17 is reject
            "gen_err_b_obj_nesting_17.spin2"
            # fixtures.json row err_b_ocmbf1tx is reject
            "gen_err_b_ocmbf1tx.spin2"
            # fixtures.json row err_b_ocmbf1tx_neg is reject
            "gen_err_b_ocmbf1tx_neg.spin2"
            # fixtures.json row err_b_omblc_m470 is reject
            "gen_err_b_omblc_m470.spin2"
            # fixtures.json row err_b_omblc_m471 is reject
            "gen_err_b_omblc_m471.spin2"
            # fixtures.json row err_b_pcba_m480 is reject
            "gen_err_b_pcba_m480.spin2"
            # fixtures.json row err_b_pcba_m481 is reject
            "gen_err_b_pcba_m481.spin2"
            # fixtures.json row err_b_sdnctn_m660 is reject
            "gen_err_b_sdnctn_m660.spin2"
            # fixtures.json row err_b_sdnctn_m661 is reject
            "gen_err_b_sdnctn_m661.spin2"
            # fixtures.json row err_b_sdnctn_m662 is reject
            "gen_err_b_sdnctn_m662.spin2"
            # fixtures.json row err_b_sehr_m530 is reject
            "gen_err_b_sehr_m530.spin2"
            # fixtures.json row err_b_sehr_m531 is reject
            "gen_err_b_sehr_m531.spin2"
            # fixtures.json row err_b_sehr_m531_at_limit is reject
            "gen_err_b_sehr_m531_at_limit.spin2"
            # fixtures.json row err_b_sehr_m532 is reject
            "gen_err_b_sehr_m532.spin2"
            # fixtures.json row err_b_sehr_m532_over_limit is reject
            "gen_err_b_sehr_m532_over_limit.spin2"
            # fixtures.json row err_b_sehr_m533 is reject
            "gen_err_b_sehr_m533.spin2"
            # fixtures.json row err_b_sehr_m533_over_limit is reject
            "gen_err_b_sehr_m533_over_limit.spin2"
            # fixtures.json row err_b_sehr_m534 is reject
            "gen_err_b_sehr_m534.spin2"
            # fixtures.json row err_b_sehr_m535 is reject
            "gen_err_b_sehr_m535.spin2"
            # fixtures.json row err_b_siad_m540 is reject
            "gen_err_b_siad_m540.spin2"
            # fixtures.json row err_b_siad_m541 is reject
            "gen_err_b_siad_m541.spin2"
            # fixtures.json row err_b_simbf_m670 is reject
            "gen_err_b_simbf_m670.spin2"
            # fixtures.json row err_b_simbf_m671 is reject
            "gen_err_b_simbf_m671.spin2"
            # fixtures.json row err_b_smbss_m580 is reject
            "gen_err_b_smbss_m580.spin2"
            # fixtures.json row err_b_smbss_m581 is reject
            "gen_err_b_smbss_m581.spin2"
            # fixtures.json row err_b_stosmne is reject
            "gen_err_b_stosmne.spin2"
            # fixtures.json row err_b_struct_name_member_runtime_index is reject
            "gen_err_b_struct_name_member_runtime_index.spin2"
            # fixtures.json row err_b_struct_name_runtime_index_assign is reject
            "gen_err_b_struct_name_runtime_index_assign.spin2"
            # fixtures.json row err_b_struct_name_runtime_index_multi_assign is reject
            "gen_err_b_struct_name_runtime_index_multi_assign.spin2"
            # fixtures.json row err_b_struct_name_runtime_index_sizeof is reject
            "gen_err_b_struct_name_runtime_index_sizeof.spin2"
            # fixtures.json row err_b_struct_name_runtime_index_whole_read is reject
            "gen_err_b_struct_name_runtime_index_whole_read.spin2"
            # fixtures.json row err_b_tmop is reject
            "gen_err_b_tmop.spin2"
            # fixtures.json row err_b_tmvsid_m600 is reject
            "gen_err_b_tmvsid_m600.spin2"
            # fixtures.json row err_b_tmvsid_m601 is reject
            "gen_err_b_tmvsid_m601.spin2"
            # fixtures.json row err_b_tmvsid_m602 is reject
            "gen_err_b_tmvsid_m602.spin2"
            # fixtures.json row err_b_tmvsid_m602_aligned_to_limit is reject
            "gen_err_b_tmvsid_m602_aligned_to_limit.spin2"
            # fixtures.json row err_b_tmvsid_m603 is reject
            "gen_err_b_tmvsid_m603.spin2"
            # fixtures.json row err_c_ainafbf is reject
            "gen_err_c_ainafbf.spin2"
            # fixtures.json row err_c_arina is reject
            "gen_err_c_arina.spin2"
            # fixtures.json row err_c_bwldcx is reject
            "gen_err_c_bwldcx.spin2"
            # fixtures.json row err_c_cmbf0t511_m130 is reject
            "gen_err_c_cmbf0t511_m130.spin2"
            # fixtures.json row err_c_cmbf0t511_m131 is reject
            "gen_err_c_cmbf0t511_m131.spin2"
            # fixtures.json row err_c_cmbf1t15 is reject
            "gen_err_c_cmbf1t15.spin2"
            # fixtures.json row err_c_dbz_m141 is reject
            "gen_err_c_dbz_m141.spin2"
            # fixtures.json row err_c_dbz_m142 is reject
            "gen_err_c_dbz_m142.spin2"
            # fixtures.json row err_c_dbz_m143 is reject
            "gen_err_c_dbz_m143.spin2"
            # fixtures.json row err_c_dbz_m144 is reject
            "gen_err_c_dbz_m144.spin2"
            # fixtures.json row err_c_dbz_m145 is reject
            "gen_err_c_dbz_m145.spin2"
            # fixtures.json row err_c_dbz_pub is reject
            "gen_err_c_dbz_pub.spin2"
            # fixtures.json row err_c_diioa is reject
            "gen_err_c_diioa.spin2"
            # fixtures.json row err_c_dioa is reject
            "gen_err_c_dioa.spin2"
            # fixtures.json row err_c_divo is reject
            "gen_err_c_divo.spin2"
            # fixtures.json row err_c_eacn is reject
            "gen_err_c_eacn.spin2"
            # fixtures.json row err_c_eads is reject
            "gen_err_c_eads.spin2"
            # fixtures.json row err_c_eaiov is reject
            "gen_err_c_eaiov.spin2"
            # fixtures.json row err_c_eamn_m180 is reject
            "gen_err_c_eamn_m180.spin2"
            # fixtures.json row err_c_eamn_m181 is reject
            "gen_err_c_eamn_m181.spin2"
            # fixtures.json row err_c_eamn_m182 is reject
            "gen_err_c_eamn_m182.spin2"
            # fixtures.json row err_c_eamomp is reject
            "gen_err_c_eamomp.spin2"
            # fixtures.json row err_c_eamoov is reject
            "gen_err_c_eamoov.spin2"
            # fixtures.json row err_c_eaocsom is reject
            "gen_err_c_eaocsom.spin2"
            # fixtures.json row err_c_eassign is reject
            "gen_err_c_eassign.spin2"
            # fixtures.json row err_c_eastott is reject
            "gen_err_c_eastott.spin2"
            # fixtures.json row err_c_easvmoo is reject
            "gen_err_c_easvmoo.spin2"
            # fixtures.json row err_c_eav_m250 is reject
            "gen_err_c_eav_m250.spin2"
            # fixtures.json row err_c_eav_m251 is reject
            "gen_err_c_eav_m251.spin2"
            # fixtures.json row err_c_ecoeol is reject
            "gen_err_c_ecoeol.spin2"
            # fixtures.json row err_c_ecolon_case is reject
            "gen_err_c_ecolon_case.spin2"
            # fixtures.json row err_c_ecolon_obj is reject
            "gen_err_c_ecolon_obj.spin2"
            # fixtures.json row err_c_ecolon_ternary is reject
            "gen_err_c_ecolon_ternary.spin2"
            # fixtures.json row err_c_ecomma is reject
            "gen_err_c_ecomma.spin2"
            # fixtures.json row err_c_ecor is reject
            "gen_err_c_ecor.spin2"
            # fixtures.json row err_c_edot is reject
            "gen_err_c_edot.spin2"
            # fixtures.json row err_c_eeol_m280 is reject
            "gen_err_c_eeol_m280.spin2"
            # fixtures.json row err_c_eeol_m281 is reject
            "gen_err_c_eeol_m281.spin2"
            # fixtures.json row err_c_eeone is reject
            "gen_err_c_eeone.spin2"
            # fixtures.json row err_c_eequal is reject
            "gen_err_c_eequal.spin2"
            # fixtures.json row err_c_efrom is reject
            "gen_err_c_efrom.spin2"
            # fixtures.json row err_c_eleft is reject
            "gen_err_c_eleft.spin2"
            # fixtures.json row err_c_eleftb is reject
            "gen_err_c_eleftb.spin2"
            # fixtures.json row err_c_enope is reject
            "gen_err_c_enope.spin2"
            # fixtures.json row err_c_epoeol is reject
            "gen_err_c_epoeol.spin2"
            # fixtures.json row err_c_epound is reject
            "gen_err_c_epound.spin2"
            # fixtures.json row err_c_eptr is reject
            "gen_err_c_eptr.spin2"
            # fixtures.json row err_c_eptrid is reject
            "gen_err_c_eptrid.spin2"
            # fixtures.json row err_c_eregsym is reject
            "gen_err_c_eregsym.spin2"
            # fixtures.json row err_c_eright_m300 is reject
            "gen_err_c_eright_m300.spin2"
            # fixtures.json row err_c_eright_m301 is reject
            "gen_err_c_eright_m301.spin2"
            # fixtures.json row err_c_erightb_m310 is reject
            "gen_err_c_erightb_m310.spin2"
            # fixtures.json row err_c_erightb_m311 is reject
            "gen_err_c_erightb_m311.spin2"
            # fixtures.json row err_c_esc_m320 is reject
            "gen_err_c_esc_m320.spin2"
            # fixtures.json row err_c_esc_m321 is reject
            "gen_err_c_esc_m321.spin2"
            # fixtures.json row err_c_esc_zero is reject
            "gen_err_c_esc_zero.spin2"
            # fixtures.json row err_c_esendd is reject
            "gen_err_c_esendd.spin2"
            # fixtures.json row err_c_esoeol is reject
            "gen_err_c_esoeol.spin2"
            # fixtures.json row err_c_etmrasr is reject
            "gen_err_c_etmrasr.spin2"
            # fixtures.json row err_c_eto is reject
            "gen_err_c_eto.spin2"
            # fixtures.json row err_c_fpcmbp_log_neg is reject
            "gen_err_c_fpcmbp_log_neg.spin2"
            # fixtures.json row err_c_fpcmbp_log_zero is reject
            "gen_err_c_fpcmbp_log_zero.spin2"
            # fixtures.json row err_c_fpcmbp_sqrt is reject
            "gen_err_c_fpcmbp_sqrt.spin2"
            # fixtures.json row err_c_fpnaiie is reject
            "gen_err_c_fpnaiie.spin2"
            # fixtures.json row err_c_fpo_exp_digits is reject
            "gen_err_c_fpo_exp_digits.spin2"
            # fixtures.json row err_c_fpo_exp_pack is reject
            "gen_err_c_fpo_exp_pack.spin2"
            # fixtures.json row err_c_fpo_exp_shift is reject
            "gen_err_c_fpo_exp_shift.spin2"
            # fixtures.json row err_c_fpo_m342 is reject
            "gen_err_c_fpo_m342.spin2"
            # fixtures.json row err_c_fpo_m344 is reject
            "gen_err_c_fpo_m344.spin2"
            # fixtures.json row err_c_fpo_pow is reject
            "gen_err_c_fpo_pow.spin2"
            # fixtures.json row err_c_fpo_scaled_product is reject
            "gen_err_c_fpo_scaled_product.spin2"
            # fixtures.json row err_c_iec_m390 is reject
            "gen_err_c_iec_m390.spin2"
            # fixtures.json row err_c_iec_m391 is reject
            "gen_err_c_iec_m391.spin2"
            # fixtures.json row err_c_inaifpe is reject
            "gen_err_c_inaifpe.spin2"
            # fixtures.json row err_c_ionaifpe is reject
            "gen_err_c_ionaifpe.spin2"
            # fixtures.json row err_c_lscmrf is reject
            "gen_err_c_lscmrf.spin2"
            # fixtures.json row err_c_lvmb_m450 is reject
            "gen_err_c_lvmb_m450.spin2"
            # fixtures.json row err_c_lvmb_m451 is reject
            "gen_err_c_lvmb_m451.spin2"
            # fixtures.json row err_c_mpmblv is reject
            "gen_err_c_mpmblv.spin2"
            # fixtures.json row err_c_oiina is reject
            "gen_err_c_oiina.spin2"
            # fixtures.json row err_c_ooioa is reject
            "gen_err_c_ooioa.spin2"
            # fixtures.json row err_c_pmbttsp is reject
            "gen_err_c_pmbttsp.spin2"
            # fixtures.json row err_c_recvcbu is reject
            "gen_err_c_recvcbu.spin2"
            # fixtures.json row err_c_register_in_array_size is reject
            "gen_err_c_register_in_array_size.spin2"
            # fixtures.json row err_c_scmrf_m512 is reject
            "gen_err_c_scmrf_m512.spin2"
            # fixtures.json row err_c_sdcx_m520 is reject
            "gen_err_c_sdcx_m520.spin2"
            # fixtures.json row err_c_sdcx_m521 is reject
            "gen_err_c_sdcx_m521.spin2"
            # fixtures.json row err_c_sdcx_m522 is reject
            "gen_err_c_sdcx_m522.spin2"
            # fixtures.json row err_c_sendcbu is reject
            "gen_err_c_sendcbu.spin2"
            # fixtures.json row err_c_soioa is reject
            "gen_err_c_soioa.spin2"
            # fixtures.json row err_c_spmcrmv_m590 is reject
            "gen_err_c_spmcrmv_m590.spin2"
            # fixtures.json row err_c_spmcrmv_m591 is reject
            "gen_err_c_spmcrmv_m591.spin2"
            # fixtures.json row err_c_spmcrmv_m592 is reject
            "gen_err_c_spmcrmv_m592.spin2"
            # fixtures.json row err_c_ticobu is reject
            "gen_err_c_ticobu.spin2"
            # fixtures.json row err_c_tmrmr is reject
            "gen_err_c_tmrmr.spin2"
            # fixtures.json row err_c_tmrnr is reject
            "gen_err_c_tmrnr.spin2"
            # fixtures.json row err_c_tocbufa_m610 is reject
            "gen_err_c_tocbufa_m610.spin2"
            # fixtures.json row err_c_tocbufa_m611 is reject
            "gen_err_c_tocbufa_m611.spin2"
            # fixtures.json row err_c_tocbufa_m612 is reject
            "gen_err_c_tocbufa_m612.spin2"
            # fixtures.json row err_c_us is reject
            "gen_err_c_us.spin2"
            # fixtures.json row err_c_vnao is reject
            "gen_err_c_vnao.spin2"
            # fixtures.json row err_d_aanawiac is reject
            "gen_err_d_aanawiac.spin2"
            # fixtures.json row err_d_amnex_m000 is reject
            "gen_err_d_amnex_m000.spin2"
            # fixtures.json row err_d_amnex_m001 is reject
            "gen_err_d_amnex_m001.spin2"
            # fixtures.json row err_d_bmbft is reject
            "gen_err_d_bmbft.spin2"
            # fixtures.json row err_d_caefl is reject
            "gen_err_d_caefl.spin2"
            # fixtures.json row err_d_cael_m110 is reject
            "gen_err_d_cael_m110.spin2"
            # fixtures.json row err_d_cael_m111 is reject
            "gen_err_d_cael_m111.spin2"
            # fixtures.json row err_d_cael_m112 is reject
            "gen_err_d_cael_m112.spin2"
            # fixtures.json row err_d_cael_m113 is reject
            "gen_err_d_cael_m113.spin2"
            # fixtures.json row err_d_cael_org_limit_below_start is reject
            "gen_err_d_cael_org_limit_below_start.spin2"
            # fixtures.json row err_d_caexl_m120 is reject
            "gen_err_d_caexl_m120.spin2"
            # fixtures.json row err_d_caexl_m121 is reject
            "gen_err_d_caexl_m121.spin2"
            # fixtures.json row err_d_cmbf0t255 is reject
            "gen_err_d_cmbf0t255.spin2"
            # fixtures.json row err_d_csmbla is reject
            "gen_err_d_csmbla.spin2"
            # fixtures.json row err_d_dcmbapi is reject
            "gen_err_d_dcmbapi.spin2"
            # fixtures.json row err_d_drmbpppp_m160 is reject
            "gen_err_d_drmbpppp_m160.spin2"
            # fixtures.json row err_d_drmbpppp_m161 is reject
            "gen_err_d_drmbpppp_m161.spin2"
            # fixtures.json row err_d_drmbpppp_m162 is reject
            "gen_err_d_drmbpppp_m162.spin2"
            # fixtures.json row err_d_drmbpppp_m163 is reject
            "gen_err_d_drmbpppp_m163.spin2"
            # fixtures.json row err_d_drmbpppp_m164 is reject
            "gen_err_d_drmbpppp_m164.spin2"
            # fixtures.json row err_d_dscobd is reject
            "gen_err_d_dscobd.spin2"
            # fixtures.json row err_d_dsmbpbas is reject
            "gen_err_d_dsmbpbas.spin2"
            # fixtures.json row err_d_eaaeoeol is reject
            "gen_err_d_eaaeoeol.spin2"
            # fixtures.json row err_d_eaasmi is reject
            "gen_err_d_eaasmi.spin2"
            # fixtures.json row err_d_eals is reject
            "gen_err_d_eals.spin2"
            # fixtures.json row err_d_eaunbwlo is reject
            "gen_err_d_eaunbwlo.spin2"
            # fixtures.json row err_d_ebwls is reject
            "gen_err_d_ebwls.spin2"
            # fixtures.json row err_d_edend_m260 is reject
            "gen_err_d_edend_m260.spin2"
            # fixtures.json row err_d_edend_m261 is reject
            "gen_err_d_edend_m261.spin2"
            # fixtures.json row err_d_edend_m262 is reject
            "gen_err_d_edend_m262.spin2"
            # fixtures.json row err_d_eend_m270 is reject
            "gen_err_d_eend_m270.spin2"
            # fixtures.json row err_d_eend_m271 is reject
            "gen_err_d_eend_m271.spin2"
            # fixtures.json row err_d_eidbwloe is reject
            "gen_err_d_eidbwloe.spin2"
            # fixtures.json row err_d_ewaox is reject
            "gen_err_d_ewaox.spin2"
            # fixtures.json row err_d_ewcwzwcz is reject
            "gen_err_d_ewcwzwcz.spin2"
            # fixtures.json row err_d_fvar_m351 is reject
            "gen_err_d_fvar_m351.spin2"
            # fixtures.json row err_d_habxl is reject
            "gen_err_d_habxl.spin2"
            # fixtures.json row err_d_hacd is reject
            "gen_err_d_hacd.spin2"
            # fixtures.json row err_d_haec_m360 is reject
            "gen_err_d_haec_m360.spin2"
            # fixtures.json row err_d_haec_m361 is reject
            "gen_err_d_haec_m361.spin2"
            # fixtures.json row err_d_haefl is reject
            "gen_err_d_haefl.spin2"
            # fixtures.json row err_d_hael_m370 is reject
            "gen_err_d_hael_m370.spin2"
            # fixtures.json row err_d_hael_m371 is reject
            "gen_err_d_hael_m371.spin2"
            # fixtures.json row err_d_icaexl_m380 is reject
            "gen_err_d_icaexl_m380.spin2"
            # fixtures.json row err_d_icaexl_m381 is reject
            "gen_err_d_icaexl_m381.spin2"
            # fixtures.json row err_d_isil is reject
            "gen_err_d_isil.spin2"
            # fixtures.json row err_d_loxdse is reject
            "gen_err_d_loxdse.spin2"
            # fixtures.json row err_d_nchcor is reject
            "gen_err_d_nchcor.spin2"
            # fixtures.json row err_d_oaet is reject
            "gen_err_d_oaet.spin2"
            # fixtures.json row err_d_ohnawads is reject
            "gen_err_d_ohnawads.spin2"
            # fixtures.json row err_d_ohnawiac is reject
            "gen_err_d_ohnawiac.spin2"
            # fixtures.json row err_d_oinaiom is reject
            "gen_err_d_oinaiom.spin2"
            # fixtures.json row err_d_onawads is reject
            "gen_err_d_onawads.spin2"
            # fixtures.json row err_d_onawiac is reject
            "gen_err_d_onawiac.spin2"
            # fixtures.json row err_d_picmr116 is reject
            "gen_err_d_picmr116.spin2"
            # fixtures.json row err_d_picmr6b is reject
            "gen_err_d_picmr6b.spin2"
            # fixtures.json row err_d_racc is reject
            "gen_err_d_racc.spin2"
            # fixtures.json row err_d_rainawi_m500 is reject
            "gen_err_d_rainawi_m500.spin2"
            # fixtures.json row err_d_rainawi_m501 is reject
            "gen_err_d_rainawi_m501.spin2"
            # fixtures.json row err_d_raioor is reject
            "gen_err_d_raioor.spin2"
            # fixtures.json row err_d_rbeiooa is reject
            "gen_err_d_rbeiooa.spin2"
            # fixtures.json row err_d_rbeioor is reject
            "gen_err_d_rbeioor.spin2"
            # fixtures.json row err_d_rcex is reject
            "gen_err_d_rcex.spin2"
            # fixtures.json row err_d_res_count_wrap is reject
            "gen_err_d_res_count_wrap.spin2"
            # fixtures.json row err_d_rinaiom is reject
            "gen_err_d_rinaiom.spin2"
            # fixtures.json row err_d_smb0t1_m550 is reject
            "gen_err_d_smb0t1_m550.spin2"
            # fixtures.json row err_d_smb0t1_m551 is reject
            "gen_err_d_smb0t1_m551.spin2"
            # fixtures.json row err_d_smb0t3_m560 is reject
            "gen_err_d_smb0t3_m560.spin2"
            # fixtures.json row err_d_smb0t3_m561 is reject
            "gen_err_d_smb0t3_m561.spin2"
            # fixtures.json row err_d_smb0t7_m570 is reject
            "gen_err_d_smb0t7_m570.spin2"
            # fixtures.json row err_d_smb0t7_m571 is reject
            "gen_err_d_smb0t7_m571.spin2"
            # fixtures.json row err_d_tdcbpbas is reject
            "gen_err_d_tdcbpbas.spin2"
            # fixtures.json row err_d_teinafti is reject
            "gen_err_d_teinafti.spin2"
            # fixtures.json row err_d_wmbft is reject
            "gen_err_d_wmbft.spin2"
            # fixtures.json row err_e_acobd is reject
            "gen_err_e_acobd.spin2"
            # fixtures.json row err_e_cccbd is reject
            "gen_err_e_cccbd.spin2"
            # fixtures.json row err_e_cfcobd is reject
            "gen_err_e_cfcobd.spin2"
            # fixtures.json row err_e_codcssf is reject
            "gen_err_e_codcssf.spin2"
            # fixtures.json row err_e_ddcobd is reject
            "gen_err_e_ddcobd.spin2"
            # fixtures.json row err_e_debugbaud is reject
            "gen_err_e_debugbaud.spin2"
            # fixtures.json row err_e_debugpin is reject
            "gen_err_e_debugpin.spin2"
            # fixtures.json row err_e_debugprx is reject
            "gen_err_e_debugprx.spin2"
            # fixtures.json row err_e_debugptx is reject
            "gen_err_e_debugptx.spin2"
            # fixtures.json row err_e_dmcobd is reject
            "gen_err_e_dmcobd.spin2"
            # fixtures.json row err_e_downbaud is reject
            "gen_err_e_downbaud.spin2"
            # fixtures.json row err_e_hsvi is reject
            "gen_err_e_hsvi.spin2"
            # fixtures.json row err_e_level44 is reject
            "gen_err_e_level44.spin2"
            # fixtures.json row err_e_lsvi is reject
            "gen_err_e_lsvi.spin2"
            # fixtures.json row err_e_pllscnba is reject
            "gen_err_e_pllscnba.spin2"
            # fixtures.json row err_f_pclo is reject
            "gen_err_f_pclo.spin2"
            # fixtures.json row err_g_bare_elseifdef is reject
            "gen_err_g_bare_elseifdef.spin2"
            # fixtures.json row err_g_bare_elseifndef is reject
            "gen_err_g_bare_elseifndef.spin2"
            # fixtures.json row err_g_bare_ifdef is reject
            "gen_err_g_bare_ifdef.spin2"
            # fixtures.json row err_g_bare_ifndef is reject
            "gen_err_g_bare_ifndef.spin2"
            # fixtures.json row err_g_bare_undef is reject
            "gen_err_g_bare_undef.spin2"
            # fixtures.json row err_g_define_blank is reject
            "gen_err_g_define_blank.spin2"
            # fixtures.json row err_g_ifdef_blank is reject
            "gen_err_g_ifdef_blank.spin2"
            # fixtures.json row err_g_ifndef_blank is reject
            "gen_err_g_ifndef_blank.spin2"
            # fixtures.json row err_g_stray_elseifndef is reject
            "gen_err_g_stray_elseifndef.spin2"
            # fixtures.json row err_g_undef_blank is reject
            "gen_err_g_undef_blank.spin2"
        )
}
finally {
    Pop-Location
}
