// generated resolver tests

//	 operation     a         b         result    isFloat/    throw/             symbol   type     preced  canFloat
//	                                             notFloat    noThrow
    reportResult = this.executeTest(testResolver, 0x00000000, 0x00000000, eOperationType.op_bitnot, false)   //        !        unary    0       -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x12345678, 0x00000000, eOperationType.op_bitnot, false)   //        !        unary    0       -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0xffffffff, 0x00000000, eOperationType.op_bitnot, false)   //        !        unary    0       -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x3F800000, 0x00000000, eOperationType.op_neg, true)   //        -        unary    0       yes
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0xBF800000, 0x00000000, eOperationType.op_neg, true)   //        -        unary    0       yes
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x00000000, 0x00000000, eOperationType.op_neg, false)   //        -        unary    0       yes
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x00000001, 0x00000000, eOperationType.op_neg, false)   //        -        unary    0       yes
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x80000000, 0x00000000, eOperationType.op_neg, false)   //        -        unary    0       yes
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x3F800000, 0x00000000, eOperationType.op_fneg, false)   //        -.       unary    0       -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0xBF800000, 0x00000000, eOperationType.op_fneg, false)   //        -.       unary    0       -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x3F800000, 0x00000000, eOperationType.op_abs, true)   //        ABS      unary    0       yes
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0xBF800000, 0x00000000, eOperationType.op_abs, true)   //        ABS      unary    0       yes
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0xFFFFFFFF, 0x00000000, eOperationType.op_abs, false)   //        ABS      unary    0       yes
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x00000001, 0x00000000, eOperationType.op_abs, false)   //        ABS      unary    0       yes
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x80000000, 0x00000000, eOperationType.op_abs, false)   //        ABS      unary    0       yes
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x3F800000, 0x00000000, eOperationType.op_fabs, true)   //        FABS     unary    0       -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0xBF800000, 0x00000000, eOperationType.op_fabs, true)   //        FABS     unary    0       -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x00000000, 0x00000000, eOperationType.op_encod, false)   //        ENCOD    unary    0       -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x00000001, 0x00000000, eOperationType.op_encod, false)   //        ENCOD    unary    0       -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x00010000, 0x00000000, eOperationType.op_encod, false)   //        ENCOD    unary    0       -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x80000000, 0x00000000, eOperationType.op_encod, false)   //        ENCOD    unary    0       -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0xF0000000, 0x00000000, eOperationType.op_decod, false)   //        DECOD    unary    0       -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x0FFFFFEC, 0x00000000, eOperationType.op_decod, false)   //        DECOD    unary    0       -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x0000001F, 0x00000000, eOperationType.op_decod, false)   //        DECOD    unary    0       -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x00000000, 0x00000000, eOperationType.op_bmask, false)   //        BMASK    unary    0       -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x0FFFFFEC, 0x00000000, eOperationType.op_bmask, false)   //        BMASK    unary    0       -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0xF00000FF, 0x00000000, eOperationType.op_bmask, false)   //        BMASK    unary    0       -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x00000000, 0x00000000, eOperationType.op_ones, false)   //        ONES     unary    0       -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x00100000, 0x00000000, eOperationType.op_ones, false)   //        ONES     unary    0       -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x12345678, 0x00000000, eOperationType.op_ones, false)   //        ONES     unary    0       -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x00000000, 0x00000000, eOperationType.op_sqrt, false)   //        SQRT     unary    0       -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x12345678, 0x00000000, eOperationType.op_sqrt, false)   //        SQRT     unary    0       -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0xFFFFFFFF, 0x00000000, eOperationType.op_sqrt, false)   //        SQRT     unary    0       -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x49742400, 0x00000000, eOperationType.op_fsqrt, false)   //        FSQRT    unary    0       -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x3F800000, 0x00000000, eOperationType.op_fsqrt, false)   //        FSQRT    unary    0       -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x00000000, 0x00000000, eOperationType.op_qlog, false)   //        QLOG     unary    0       -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x00000001, 0x00000000, eOperationType.op_qlog, false)   //        QLOG     unary    0       -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x0001E5E0, 0x00000000, eOperationType.op_qlog, false)   //        QLOG     unary    0       -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0xFFFFFFFF, 0x00000000, eOperationType.op_qlog, false)   //        QLOG     unary    0       -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x00000000, 0x00000000, eOperationType.op_qexp, false)   //        QEXP     unary    0       -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x87654321, 0x00000000, eOperationType.op_qexp, false)   //        QEXP     unary    0       -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0xEDCBA987, 0x00000000, eOperationType.op_qexp, false)   //        QEXP     unary    0       -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x0000ABCD, 0x00000008, eOperationType.op_shr, false)   //        >>       binary   1       -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0xFFFFFFFF, 0xFFFFFFFF, eOperationType.op_shr, false)   //        >>       binary   1       -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0xFFFFFFFF, 0xFFFFFFFF, eOperationType.op_shl, false)   //        <<       binary   1       -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x00000001, 0x000F0010, eOperationType.op_shl, false)   //        <<       binary   1       -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x80000000, 0xFFFFFFFF, eOperationType.op_sar, false)   //        SAR      binary   1       -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x7FFFFFFF, 0xF000000F, eOperationType.op_sar, false)   //        SAR      binary   1       -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x87654321, 0xFFFFFFFF, eOperationType.op_ror, false)   //        ROR      binary   1       -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x87654321, 0x80000010, eOperationType.op_ror, false)   //        ROR      binary   1       -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x87654321, 0xFFFFFFFF, eOperationType.op_rol, false)   //        ROL      binary   1       -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x87654321, 0x80000008, eOperationType.op_rol, false)   //        ROL      binary   1       -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x87654321, 0xFFFFFFF0, eOperationType.op_rev, false)   //        REV      binary   1       -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x0000000F, 0x00000000, eOperationType.op_rev, false)   //        REV      binary   1       -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x87654321, 0x00F00010, eOperationType.op_zerox, false)   //        ZEROX    binary   1       -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x80000000, 0xF000001F, eOperationType.op_zerox, false)   //        ZEROX    binary   1       -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x87654321, 0x00F00010, eOperationType.op_signx, false)   //        SIGNX    binary   1       -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x0000000A, 0xFFFFFFE3, eOperationType.op_signx, false)   //        SIGNX    binary   1       -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x00000007, 0xFFFFFFE3, eOperationType.op_signx, false)   //        SIGNX    binary   1       -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0xF000F000, 0x87654321, eOperationType.op_bitand, false)   //        &        binary   2       -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0xAAAAAAAA, 0x5555AAAA, eOperationType.op_bitand, false)   //        &        binary   2       -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0xF000FF00, 0x87654321, eOperationType.op_bitxor, false)   //        ^        binary   3       -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0xAAAAAAAA, 0x5555AAAA, eOperationType.op_bitxor, false)   //        ^        binary   3       -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0xAAAAAAAA, 0x55555555, eOperationType.op_bitor, false)   //        |        binary   4       -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x87654321, 0xF0F0F0F0, eOperationType.op_bitor, false)   //        |        binary   4       -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x788DBF9A, 0x3F800000, eOperationType.op_mul, true)   //        *        binary   5       yes
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0xFFFFFFFE, 0x00000100, eOperationType.op_mul, false)   //        *        binary   5       yes
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x12345678, 0x87654321, eOperationType.op_mul, false)   //        *        binary   5       yes
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x7DCCA14B, 0xC1200000, eOperationType.op_fmul, false)   //        *.       binary   5       -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x7DCCA14B, 0xBDCCCCCD, eOperationType.op_div, true)   //        /        binary   5       yes
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x00000064, 0x0000000A, eOperationType.op_div, false)   //        /        binary   5       yes
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x40000000, 0x00010000, eOperationType.op_div, false)   //        /        binary   5       yes
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0xC1C80000, 0x40E00000, eOperationType.op_fdiv, false)   //        /.       binary   5       -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0xF8000000, 0x00000003, eOperationType.op_divu, false)   //        +/       binary   5       -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0xFFFFFFFF, 0x3FFFFFFF, eOperationType.op_divu, false)   //        +/       binary   5       -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x40000000, 0x0000000D, eOperationType.op_rem, false)   //        //       binary   5       -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x00001000, 0x00000100, eOperationType.op_rem, false)   //        //       binary   5       -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0xF8000000, 0x00000003, eOperationType.op_remu, false)   //        +//      binary   5       -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0xFFFFFFFE, 0xFFFFFFFF, eOperationType.op_remu, false)   //        +//      binary   5       -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x80000000, 0xFFFFFFFF, eOperationType.op_sca, false)   //        SCA      binary   5       -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x12345678, 0x87654321, eOperationType.op_sca, false)   //        SCA      binary   5       -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x12345678, 0x87654321, eOperationType.op_scas, false)   //        SCAS     binary   5       -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x40000000, 0x12345678, eOperationType.op_scas, false)   //        SCAS     binary   5       -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x80000000, 0x90000000, eOperationType.op_frac, false)   //        FRAC     binary   5       -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x00000001, 0x00000003, eOperationType.op_frac, false)   //        FRAC     binary   5       -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x00000000, 0x00000000, eOperationType.op_add, true)   //        +        binary   6       yes
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x00000003, 0x00000004, eOperationType.op_add, false)   //        +        binary   6       yes
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0xFFFFFFFC, 0x00000010, eOperationType.op_add, false)   //        +        binary   6       yes
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x3F800000, 0x3F800000, eOperationType.op_fadd, false)   //        +.       binary   6       -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x42C80000, 0x42C60000, eOperationType.op_sub, true)   //        -        binary   6       yes
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x00000100, 0x00000001, eOperationType.op_sub, false)   //        -        binary   6       yes
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0xFFFFFFF8, 0xFFFFFFF0, eOperationType.op_sub, false)   //        -        binary   6       yes
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x49742400, 0x4479C000, eOperationType.op_fsub, false)   //        -.       binary   6       -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x4479C000, 0x49742400, eOperationType.op_fge, true)   //        #>       binary   7       yes
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x49742400, 0x4479C000, eOperationType.op_fge, true)   //        #>       binary   7       yes
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0xFFFFFFF0, 0x00000004, eOperationType.op_fge, false)   //        #>       binary   7       yes
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x00000080, 0xFFFFF000, eOperationType.op_fge, false)   //        #>       binary   7       yes
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x41A00000, 0x41200000, eOperationType.op_fle, true)   //        <#       binary   7       yes
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x41200000, 0x41A00000, eOperationType.op_fle, true)   //        <#       binary   7       yes
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0xFFFFFF00, 0xFF000000, eOperationType.op_fle, false)   //        <#       binary   7       yes
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0xFF000000, 0xFFFFFF00, eOperationType.op_fle, false)   //        <#       binary   7       yes
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0xFFFFFFF1, 0xFFFFFFF1, eOperationType.op_addbits, false)   //        ADDBITS  binary   8       -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x00000008, 0x00000003, eOperationType.op_addbits, false)   //        ADDBITS  binary   8       -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0xFFFFFFE1, 0xFFFFFFF1, eOperationType.op_addpins, false)   //        ADDPINS  binary   8       -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x00000038, 0x00000010, eOperationType.op_addpins, false)   //        ADDPINS  binary   8       -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x3F800000, 0x3F800000, eOperationType.op_lt, true)   //        <        binary   9       yes
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x3F800000, 0x40000000, eOperationType.op_lt, true)   //        <        binary   9       yes
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x40000000, 0x3F800000, eOperationType.op_lt, true)   //        <        binary   9       yes
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x00000001, 0x00000001, eOperationType.op_lt, false)   //        <        binary   9       yes
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x00000001, 0x00000002, eOperationType.op_lt, false)   //        <        binary   9       yes
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x00000002, 0x00000001, eOperationType.op_lt, false)   //        <        binary   9       yes
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x3F800000, 0x3F800000, eOperationType.op_flt, false)   //        <.       binary   9       -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x3F800000, 0x40000000, eOperationType.op_flt, false)   //        <.       binary   9       -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x40000000, 0x3F800000, eOperationType.op_flt, false)   //        <.       binary   9       -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0xFFFFFFFF, 0xFFFFFFFE, eOperationType.op_ltu, false)   //        +<       binary   9       -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x00000000, 0x80000000, eOperationType.op_ltu, false)   //        +<       binary   9       -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x80000000, 0x00000000, eOperationType.op_ltu, false)   //        +<       binary   9       -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x3F800000, 0x3F800000, eOperationType.op_lte, true)   //        <=       binary   9       yes
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x3F800000, 0x40000000, eOperationType.op_lte, true)   //        <=       binary   9       yes
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x40000000, 0x3F800000, eOperationType.op_lte, true)   //        <=       binary   9       yes
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x00000001, 0x00000001, eOperationType.op_lte, false)   //        <=       binary   9       yes
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x00000001, 0x00000002, eOperationType.op_lte, false)   //        <=       binary   9       yes
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x00000002, 0x00000001, eOperationType.op_lte, false)   //        <=       binary   9       yes
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x3F800000, 0x3F800000, eOperationType.op_flte, false)   //        <=.      binary   9       -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x3F800000, 0x40000000, eOperationType.op_flte, false)   //        <=.      binary   9       -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x40000000, 0x3F800000, eOperationType.op_flte, false)   //        <=.      binary   9       -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0xF0000000, 0xF0000000, eOperationType.op_lteu, false)   //        +<=      binary   9       -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0xF0000000, 0xFF000000, eOperationType.op_lteu, false)   //        +<=      binary   9       -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0xF0000000, 0x00000000, eOperationType.op_lteu, false)   //        +<=      binary   9       -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x3F800000, 0x3F800000, eOperationType.op_e, true)   //        ==       binary   9       yes
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x3F800000, 0x40000000, eOperationType.op_e, true)   //        ==       binary   9       yes
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x40000000, 0x3F800000, eOperationType.op_e, true)   //        ==       binary   9       yes
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x00000001, 0x00000001, eOperationType.op_e, false)   //        ==       binary   9       yes
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x00000001, 0x00000002, eOperationType.op_e, false)   //        ==       binary   9       yes
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x00000002, 0x00000001, eOperationType.op_e, false)   //        ==       binary   9       yes
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x3F800000, 0x3F800000, eOperationType.op_fe, false)   //        ==.      binary   9       -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x3F800000, 0x40000000, eOperationType.op_fe, false)   //        ==.      binary   9       -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x40000000, 0x3F800000, eOperationType.op_fe, false)   //        ==.      binary   9       -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x3F800000, 0x3F800000, eOperationType.op_ne, true)   //        <>       binary   9       yes
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x3F800000, 0x40000000, eOperationType.op_ne, true)   //        <>       binary   9       yes
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x40000000, 0x3F800000, eOperationType.op_ne, true)   //        <>       binary   9       yes
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x00000001, 0x00000001, eOperationType.op_ne, false)   //        <>       binary   9       yes
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x00000001, 0x00000002, eOperationType.op_ne, false)   //        <>       binary   9       yes
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x00000002, 0x00000001, eOperationType.op_ne, false)   //        <>       binary   9       yes
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x3F800000, 0x3F800000, eOperationType.op_fne, false)   //        <>.      binary   9       -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x3F800000, 0x40000000, eOperationType.op_fne, false)   //        <>.      binary   9       -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x40000000, 0x3F800000, eOperationType.op_fne, false)   //        <>.      binary   9       -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x3F800000, 0x3F800000, eOperationType.op_gte, true)   //        >=       binary   9       yes
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x3F800000, 0x40000000, eOperationType.op_gte, true)   //        >=       binary   9       yes
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x40000000, 0x3F800000, eOperationType.op_gte, true)   //        >=       binary   9       yes
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x00000001, 0x00000001, eOperationType.op_gte, false)   //        >=       binary   9       yes
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x00000001, 0x00000002, eOperationType.op_gte, false)   //        >=       binary   9       yes
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x00000002, 0x00000001, eOperationType.op_gte, false)   //        >=       binary   9       yes
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x3F800000, 0x3F800000, eOperationType.op_fgte, false)   //        >=.      binary   9       -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x3F800000, 0x40000000, eOperationType.op_fgte, false)   //        >=.      binary   9       -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x40000000, 0x3F800000, eOperationType.op_fgte, false)   //        >=.      binary   9       -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x80000000, 0x80000000, eOperationType.op_gteu, false)   //        +>=      binary   9       -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x80000000, 0x00000000, eOperationType.op_gteu, false)   //        +>=      binary   9       -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x00000000, 0x80000000, eOperationType.op_gteu, false)   //        +>=      binary   9       -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x3F800000, 0x3F800000, eOperationType.op_gt, true)   //        >        binary   9       yes
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x3F800000, 0x40000000, eOperationType.op_gt, true)   //        >        binary   9       yes
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x40000000, 0x3F800000, eOperationType.op_gt, true)   //        >        binary   9       yes
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x00000001, 0x00000001, eOperationType.op_gt, false)   //        >        binary   9       yes
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x00000001, 0x00000002, eOperationType.op_gt, false)   //        >        binary   9       yes
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x00000002, 0x00000001, eOperationType.op_gt, false)   //        >        binary   9       yes
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x3F800000, 0x3F800000, eOperationType.op_fgt, false)   //        >.       binary   9       -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x3F800000, 0x40000000, eOperationType.op_fgt, false)   //        >.       binary   9       -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x40000000, 0x3F800000, eOperationType.op_fgt, false)   //        >.       binary   9       -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x80000000, 0x80000000, eOperationType.op_gtu, false)   //        +>       binary   9       -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x7FFFFFFF, 0x80000000, eOperationType.op_gtu, false)   //        +>       binary   9       -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x80000000, 0x7FFFFFFF, eOperationType.op_gtu, false)   //        +>       binary   9       -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0xBF800000, 0x3F800000, eOperationType.op_ltegt, true)   //        <=>      binary   9       yes
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x3F800000, 0x3F800000, eOperationType.op_ltegt, true)   //        <=>      binary   9       yes
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x3F800000, 0xBF800000, eOperationType.op_ltegt, true)   //        <=>      binary   9       yes
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0xFFFFFFFF, 0x00000001, eOperationType.op_ltegt, false)   //        <=>      binary   9       yes
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x00000001, 0x00000001, eOperationType.op_ltegt, false)   //        <=>      binary   9       yes
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x00000001, 0xFFFFFFFF, eOperationType.op_ltegt, false)   //        <=>      binary   9       yes
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x00000001, 0x00000000, eOperationType.op_lognot, false)   //        !!, NOT  unary    10      -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x00000000, 0x00000000, eOperationType.op_lognot, false)   //        !!, NOT  unary    10      -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x00000001, 0x00000000, eOperationType.op_logand, false)   //        &&, AND  binary   11      -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x00000001, 0x00000001, eOperationType.op_logand, false)   //        &&, AND  binary   11      -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x00000001, 0x00000001, eOperationType.op_logxor, false)   //        ^^, XOR  binary   12      -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x00000000, 0x00000001, eOperationType.op_logxor, false)   //        ^^, XOR  binary   12      -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x00000000, 0x00000000, eOperationType.op_logor, false)   //        ||, OR   binary   13      -
    resultStrings.push(reportResult)
    reportResult = this.executeTest(testResolver, 0x00000000, 0x00000001, eOperationType.op_logor, false)   //        ||, OR   binary   13      -
    resultStrings.push(reportResult)
