/** @format */
'use strict';

// src/classes/parseUtils.ts

// a collection of generally useful functions for parsing spin

export type SpinSymbolType =
  | 'type_left'
  | 'type_right'
  | 'type_leftb'
  | 'type_rightb'
  | 'type_comma'
  | 'type_equal'
  | 'type_pound'
  | 'type_colon'
  | 'type_back'
  | 'type_dot'
  | 'type_at'
  | 'type_til'
  | 'type_tick'
  | 'type_op'
  | 'type_op'
  | 'type_assign'
  | 'type_atat'
  | 'type_upat'
  | 'type_dotdot'
  | 'type_tiltil'
  | 'type_inc'
  | 'type_dec'
  | 'type_rnd';

export type SpinOpCode =
  | 'oc_bitnot'
  | 'oc_neg'
  | 'oc_bitand'
  | 'oc_bitxor'
  | 'oc_bitor'
  | 'oc_mul'
  | 'oc_div'
  | 'oc_add'
  | 'oc_sub'
  | 'oc_lt'
  | 'oc_gt'
  | 'oc_ternary'
  | 'oc_remu'
  | 'oc_lteu'
  | 'oc_gteu'
  | 'oc_ltegt'
  | 'oc_fne'
  | 'oc_fe'
  | 'oc_flte'
  | 'oc_fgte'
  | 'oc_shr'
  | 'oc_shl'
  | 'oc_divu'
  | 'oc_rem'
  | 'oc_fge'
  | 'oc_fle'
  | 'oc_ltu'
  | 'oc_lte'
  | 'oc_e'
  | 'oc_ne'
  | 'oc_gte'
  | 'oc_gtu'
  | 'oc_lognot'
  | 'oc_logand'
  | 'oc_logxor'
  | 'oc_logor'
  | 0;

export interface SpinSymbol {
  symbol: string;
  type: SpinSymbolType;
  value: SpinOpCode | 0;
}

const symbols: SpinSymbol[] = [
  // find_symbol_s1
  { symbol: '(', type: 'type_left', value: 0 },
  { symbol: ')', type: 'type_right', value: 0 },
  { symbol: '[', type: 'type_leftb', value: 0 },
  { symbol: ']', type: 'type_rightb', value: 0 },
  { symbol: ',', type: 'type_comma', value: 0 },
  { symbol: '=', type: 'type_equal', value: 0 },
  { symbol: '#', type: 'type_pound', value: 0 },
  { symbol: ':', type: 'type_colon', value: 0 },
  { symbol: '\\', type: 'type_back', value: 0 },
  { symbol: '.', type: 'type_dot', value: 0 },
  { symbol: '@', type: 'type_at', value: 0 },
  { symbol: '~', type: 'type_til', value: 0 },
  { symbol: '`', type: 'type_tick', value: 0 },
  { symbol: '!', type: 'type_op', value: 'oc_bitnot' },
  { symbol: '&', type: 'type_op', value: 'oc_bitand' },
  { symbol: '^', type: 'type_op', value: 'oc_bitxor' },
  { symbol: '|', type: 'type_op', value: 'oc_bitor' },
  { symbol: '*', type: 'type_op', value: 'oc_mul' },
  { symbol: '/', type: 'type_op', value: 'oc_div' },
  { symbol: '+', type: 'type_op', value: 'oc_add' },
  { symbol: '-', type: 'type_op', value: 'oc_sub' },
  { symbol: '<', type: 'type_op', value: 'oc_lt' },
  { symbol: '>', type: 'type_op', value: 'oc_gt' },
  { symbol: '?', type: 'type_op', value: 'oc_ternary' },
  // find_symbol_s3
  { symbol: '+//', type: 'type_op', value: 'oc_remu' },
  { symbol: '+<=', type: 'type_op', value: 'oc_lteu' },
  { symbol: '+>=', type: 'type_op', value: 'oc_gteu' },
  { symbol: '<=>', type: 'type_op', value: 'oc_ltegt' },
  { symbol: '<>.', type: 'type_op', value: 'oc_fne' },
  { symbol: '==.', type: 'type_op', value: 'oc_fe' },
  { symbol: '<=.', type: 'type_op', value: 'oc_flte' },
  { symbol: '>=.', type: 'type_op', value: 'oc_fgte' },
  // find_symbol_s2
  { symbol: ':=', type: 'type_assign', value: 0 },
  { symbol: '@@', type: 'type_atat', value: 0 },
  { symbol: '^@', type: 'type_upat', value: 0 },
  { symbol: '..', type: 'type_dotdot', value: 0 },
  { symbol: '~~', type: 'type_tiltil', value: 0 },
  { symbol: '++', type: 'type_inc', value: 0 },
  { symbol: '--', type: 'type_dec', value: 0 },
  { symbol: '??', type: 'type_rnd', value: 0 },
  { symbol: '>>', type: 'type_op', value: 'oc_shr' },
  { symbol: '<<', type: 'type_op', value: 'oc_shl' },
  { symbol: '+/', type: 'type_op', value: 'oc_divu' },
  { symbol: '//', type: 'type_op', value: 'oc_rem' },
  { symbol: '#>', type: 'type_op', value: 'oc_fge' },
  { symbol: '<#', type: 'type_op', value: 'oc_fle' },
  { symbol: '+<', type: 'type_op', value: 'oc_ltu' },
  { symbol: '<=', type: 'type_op', value: 'oc_lte' },
  { symbol: '==', type: 'type_op', value: 'oc_e' },
  { symbol: '<>', type: 'type_op', value: 'oc_ne' },
  { symbol: '>=', type: 'type_op', value: 'oc_gte' },
  { symbol: '+>', type: 'type_op', value: 'oc_gtu' },
  { symbol: '!!', type: 'type_op', value: 'oc_lognot' },
  { symbol: '&&', type: 'type_op', value: 'oc_logand' },
  { symbol: '^^', type: 'type_op', value: 'oc_logxor' },
  { symbol: '||', type: 'type_op', value: 'oc_logor' }
];

export class SpinElementCoding {
  private operands = new Map<string, number>();
  private pushPops = new Map<string, number>();
  private types = new Map<string, number>();
  private bytecodes = new Map<string, number>();

  constructor() {
    let counter = 0;
    this.operands = new Map<string, number>([
      ['operand_ds', counter],
      ['operand_bitx', (counter += 2)],
      ['operand_testb', (counter += 2)],
      ['operand_du', (counter += 2)],
      ['operand_duii', (counter += 2)],
      ['operand_duiz', (counter += 2)],
      ['operand_ds3set', (counter += 2)],
      ['operand_ds3get', (counter += 2)],
      ['operand_ds2set', (counter += 2)],
      ['operand_ds2get', (counter += 2)],
      ['operand_ds1set', (counter += 2)],
      ['operand_ds1get', (counter += 2)],
      ['operand_dsj', (counter += 2)],
      ['operand_ls', (counter += 2)],
      ['operand_lsj', (counter += 2)],
      ['operand_dsp', (counter += 2)],
      ['operand_lsp', (counter += 2)],
      ['operand_rep', (counter += 2)],
      ['operand_jmp', (counter += 2)],
      ['operand_call', (counter += 2)],
      ['operand_calld', (counter += 2)],
      ['operand_jpoll', (counter += 2)],
      ['operand_loc', (counter += 2)],
      ['operand_aug', (counter += 2)],
      ['operand_d', (counter += 2)],
      ['operand_de', (counter += 2)],
      ['operand_l', (counter += 2)],
      ['operand_cz', (counter += 2)],
      ['operand_pollwait', (counter += 2)],
      ['operand_getbrk', (counter += 2)],
      ['operand_pinop', (counter += 2)],
      ['operand_testp', (counter += 2)],
      ['operand_pushpop', (counter += 2)],
      ['operand_xlat', (counter += 2)],
      ['operand_akpin', (counter += 2)],
      ['operand_asmclk', (counter += 2)],
      ['operand_nop', (counter += 2)],
      ['operand_debug', (counter += 2)]
    ]);

    counter = 0;
    this.pushPops = new Map<string, number>([
      ['pp_pusha', counter], // PUSHA D/# --> WRLONG D/#,PTRA++
      ['pp_pushb', (counter += 2)], // PUSHB D/# --> WRLONG D/#,PTRB++
      ['pp_popa', (counter += 2)], // POPA D --> RDLONG D,--PTRA
      ['pp_popb', (counter += 2)] // POPB D --> RDLONG D,--PTRB
    ]);

    counter = 0;
    this.types = new Map<string, number>([
      ['type_undefined', counter], // undefined symbol, must be 0
      ['type_left', (counter += 2)], // (
      ['type_right', (counter += 2)], // )
      ['type_leftb', (counter += 2)], // [
      ['type_rightb', (counter += 2)], // ]
      ['type_comma', (counter += 2)], // ,
      ['type_equal', (counter += 2)], // =
      ['type_pound', (counter += 2)], // #
      ['type_colon', (counter += 2)], // :
      ['type_back', (counter += 2)], // \
      ['type_under', (counter += 2)], // _
      ['type_tick', (counter += 2)], // `
      ['type_dollar', (counter += 2)], // $ (without a hex digit following)
      ['type_percent', (counter += 2)], // % (without a bin digit following)
      ['type_dot', (counter += 2)], // .
      ['type_dotdot', (counter += 2)], // ..
      ['type_at', (counter += 2)], // @
      ['type_atat', (counter += 2)], // @@
      ['type_upat', (counter += 2)], // ^@
      ['type_til', (counter += 2)], // ~
      ['type_tiltil', (counter += 2)], // ~~
      ['type_inc', (counter += 2)], // ++
      ['type_dec', (counter += 2)], // --
      ['type_rnd', (counter += 2)], // ??
      ['type_assign', (counter += 2)], // :=
      ['type_op', (counter += 2)], // !, -, ABS, ENC, etc.
      ['type_float', (counter += 2)], // FLOAT
      ['type_round', (counter += 2)], // ROUND
      ['type_trunc', (counter += 2)], // TRUNC
      ['type_constr', (counter += 2)], // STRING
      ['type_conlstr', (counter += 2)], // LSTRING
      ['type_block', (counter += 2)], // CON, VAR, DAT, OBJ, PUB, PRI
      ['type_field', (counter += 2)], // FIELD
      ['type_size', (counter += 2)], // BYTE, WORD, LONG
      ['type_size_fit', (counter += 2)], // BYTEFIT, WORDFIT
      ['type_fvar', (counter += 2)], // FVAR, FVARS
      ['type_file', (counter += 2)], // FILE
      ['type_if', (counter += 2)], // IF
      ['type_ifnot', (counter += 2)], // IFNOT
      ['type_elseif', (counter += 2)], // ELSEIF
      ['type_elseifnot', (counter += 2)], // ELSEIFNOT
      ['type_else', (counter += 2)], // ELSE
      ['type_case', (counter += 2)], // CASE
      ['type_case_fast', (counter += 2)], // CASE_FAST
      ['type_other', (counter += 2)], // OTHER
      ['type_repeat', (counter += 2)], // REPEAT
      ['type_repeat_var', (counter += 2)], // REPEAT var - different QUIT method
      ['type_repeat_count', (counter += 2)], // REPEAT count - different QUIT method
      ['type_repeat_count_var', (counter += 2)], // REPEAT count WITH var - different QUIT method
      ['type_while', (counter += 2)], // WHILE
      ['type_until', (counter += 2)], // UNTIL
      ['type_from', (counter += 2)], // FROM
      ['type_to', (counter += 2)], // TO
      ['type_step', (counter += 2)], // STEP
      ['type_with', (counter += 2)], // WITH
      ['type_i_next_quit', (counter += 2)], // NEXT/QUIT
      ['type_i_return', (counter += 2)], // RETURN
      ['type_i_abort', (counter += 2)], // ABORT
      ['type_i_look', (counter += 2)], // LOOKUPZ/LOOKUP/LOOKDOWNZ/LOOKDOWN
      ['type_i_cogspin', (counter += 2)], // COGSPIN
      ['type_i_flex', (counter += 2)], // HUBSET, COGINIT, COGSTOP...
      ['type_recv', (counter += 2)], // RECV
      ['type_send', (counter += 2)], // SEND
      ['type_debug', (counter += 2)], // DEBUG
      ['type_debug_cmd', (counter += 2)], // DEBUG commands
      ['type_asm_end', (counter += 2)], // END
      ['type_asm_dir', (counter += 2)], // ORGH, ORG, ORGF, RES, FIT
      ['type_asm_cond', (counter += 2)], // IF_C, IF_Z, IF_NC, etc
      ['type_asm_inst', (counter += 2)], // RDBYTE, RDWORD, RDLONG, etc.
      ['type_asm_effect', (counter += 2)], // WC, WZ, WCZ
      ['type_asm_effect2', (counter += 2)], // ANDC, ANDZ, ORC, ORZ, XORC, XORZ
      ['type_reg', (counter += 2)], // REG
      ['type_con', (counter += 2)], // user constant integer (must be followed by type_con_float)
      ['type_con_float', (counter += 2)], // user constant float
      ['type_register', (counter += 2)], // user long register
      ['type_loc_byte', (counter += 2)], // user byte local
      ['type_loc_word', (counter += 2)], // user word local
      ['type_loc_long', (counter += 2)], // user long local
      ['type_var_byte', (counter += 2)], // user byte var
      ['type_var_word', (counter += 2)], // user word var
      ['type_var_long', (counter += 2)], // user long var
      ['type_dat_byte', (counter += 2)], // user byte dat
      ['type_dat_word', (counter += 2)], // user word dat (must follow type_dat_byte)
      ['type_dat_long', (counter += 2)], // user long dat (must follow type_dat_word)
      ['type_dat_long_res', (counter += 2)], // user res dat (must follow type_dat_long)
      ['type_hub_byte', (counter += 2)], // user byte hub
      ['type_hub_word', (counter += 2)], // user word hub
      ['type_hub_long', (counter += 2)], // user long hub
      ['type_obj', (counter += 2)], // user object
      ['type_objpub', (counter += 2)], // user object.subroutine
      ['type_objcon', (counter += 2)], // user object.constant (must be followed by type_objcon_float)
      ['type_objcon_float', (counter += 2)], // user object.constant float
      ['type_method', (counter += 2)], // user method
      ['type_end', (counter += 2)] // end-of-line c=0, end-of-file c=1
    ]);

    counter = 0;
    this.bytecodes = new Map<string, number>([
      ['bc_drop', counter++], // 0
      ['bc_drop_push', counter++], // 1
      ['bc_drop_trap', counter++], // 2
      ['bc_drop_trap_push', counter++], // 3

      ['bc_return_results', counter++], // 4
      ['bc_return_args', counter++], // 5

      ['bc_abort_0', counter++], // 6
      ['bc_abort_arg', counter++], // 7

      ['bc_call_obj_sub', counter++], // 8
      ['bc_call_obji_sub', counter++], // 9
      ['bc_call_sub', counter++], // 10
      ['bc_call_ptr', counter++], // 11
      ['bc_call_recv', counter++], // 12
      ['bc_call_send', counter++], // 13
      ['bc_call_send_bytes', counter++], // 14

      ['bc_mptr_obj_sub', counter++], // 15
      ['bc_mptr_obji_sub', counter++], // 16
      ['bc_mptr_sub', counter++], // 17

      ['bc_jmp', counter++], // 18
      ['bc_jz', counter++], // 19
      ['bc_jnz', counter++], // 20
      ['bc_tjz', counter++], // 21
      ['bc_djnz', counter++], // 22

      ['bc_pop', counter++], // 23
      ['bc_pop_rfvar', counter++], // 24

      ['bc_hub_bytecode', counter++], // 25

      ['bc_case_fast_init', counter++], // 26
      ['bc_case_fast_done', counter++], // 27

      ['bc_case_value', counter++], // 28
      ['bc_case_range', counter++], // 29
      ['bc_case_done', counter++], // 30

      ['bc_lookup_value', counter++], // 31
      ['bc_lookdown_value', counter++], // 32
      ['bc_lookup_range', counter++], // 33
      ['bc_lookdown_range', counter++], // 34
      ['bc_look_done', counter++], // 35

      ['bc_add_pbase', counter++], // 36

      ['bc_coginit', counter++], // 37
      ['bc_coginit_push', counter++], // 38
      ['bc_cogstop', counter++], // 39
      ['bc_cogid', counter++], // 41

      ['bc_locknew', counter++], // 42
      ['bc_lockret', counter++], // 43
      ['bc_locktry', counter++], // 44
      ['bc_lockrel', counter++], // 45
      ['bc_lockchk', counter++], // 46

      ['bc_cogatn', counter++], // 47
      ['bc_pollatn', counter++], // 48
      ['bc_waitatn', counter++], // 49

      ['bc_getrnd', counter++], // 50
      ['bc_getct', counter++], // 51
      ['bc_pollct', counter++], // 52
      ['bc_waitct', counter++], // 53

      ['bc_pinwrite', counter++], // 54
      ['bc_pinlow', counter++], // 55
      ['bc_pinhigh', counter++], // 56
      ['bc_pintoggle', counter++], // 57
      ['bc_pinfloat', counter++], // 58
      ['bc_pinread', counter++], // 59

      ['bc_pinstart', counter++], // 60
      ['bc_pinclear', counter++], // 61

      ['bc_wrpin', counter++], // 62
      ['bc_wxpin', counter++], // 63
      ['bc_wypin', counter++], // 64
      ['bc_akpin', counter++], // 65
      ['bc_rdpin', counter++], // 66
      ['bc_rqpin', counter++], // 67

      ['bc_debug', counter++], // 68

      ['bc_con_rfbyte', counter++], // 69
      ['bc_con_rfbyte_not', counter++], // 70
      ['bc_con_rfword', counter++], // 71
      ['bc_con_rfword_not', counter++], // 72
      ['bc_con_rflong', counter++], // 73
      ['bc_con_rfbyte_decod', counter++], // 74
      ['bc_con_rfbyte_decod_not', counter++], // 75
      ['bc_con_rfbyte_bmask', counter++], // 76
      ['bc_con_rfbyte_bmask_not', counter++], // 77

      ['bc_setup_field_p', counter++], // 78
      ['bc_setup_field_pi', counter++], // 79

      ['bc_setup_reg', counter++], // 80
      ['bc_setup_reg_pi', counter++], // 81

      ['bc_setup_byte_pbase', counter++], // 82
      ['bc_setup_byte_vbase', counter++], // 83
      ['bc_setup_byte_dbase', counter++], // 84

      ['bc_setup_byte_pbase_pi', counter++], // 85
      ['bc_setup_byte_vbase_pi', counter++], // 86
      ['bc_setup_byte_dbase_pi', counter++], // 87

      ['bc_setup_word_pbase', counter++], // 88
      ['bc_setup_word_vbase', counter++], // 89
      ['bc_setup_word_dbase', counter++], // 90

      ['bc_setup_word_pbase_pi', counter++], // 91
      ['bc_setup_word_vbase_pi', counter++], // 92
      ['bc_setup_word_dbase_pi', counter++], // 93

      ['bc_setup_long_pbase', counter++], // 94
      ['bc_setup_long_vbase', counter++], // 95
      ['bc_setup_long_dbase', counter++], // 96

      ['bc_setup_long_pbase_pi', counter++], // 97
      ['bc_setup_long_vbase_pi', counter++], // 98
      ['bc_setup_long_dbase_pi', counter++], // 99

      ['bc_setup_byte_pb_pi', counter++], // 100
      ['bc_setup_word_pb_pi', counter++], // 101
      ['bc_setup_long_pb_pi', counter++], // 102

      ['bc_setup_byte_pa', counter++], // 103
      ['bc_setup_word_pa', counter++], // 104
      ['bc_setup_long_pa', counter++], // 105

      ['unused1', counter++], // 106
      ['unused2', counter++], // 107

      ['bc_ternary', counter++], // 108

      ['bc_lt', counter++], // 109
      ['bc_ltu', counter++], // 110
      ['bc_lte', counter++], // 111
      ['bc_lteu', counter++], // 112
      ['bc_e', counter++], // 113
      ['bc_ne', counter++], // 114
      ['bc_gte', counter++], // 115
      ['bc_gteu', counter++], // 116
      ['bc_gt', counter++], // 117
      ['bc_gtu', counter++], // 118
      ['bc_ltegt', counter++], // 119

      ['bc_lognot', counter++], // 120
      ['bc_bitnot', counter++], // 121
      ['bc_neg', counter++], // 122
      ['bc_abs', counter++], // 123
      ['bc_encod', counter++], // 124
      ['bc_decod', counter++], // 125
      ['bc_bmask', counter++], // 126
      ['bc_ones', counter++], // 127
      ['bc_sqrt', counter++], // 128
      ['bc_qlog', counter++], // 129
      ['bc_qexp', counter++], // 130
      ['bc_shr', counter++], // 131
      ['bc_shl', counter++], // 132
      ['bc_sar', counter++], // 133
      ['bc_ror', counter++], // 134
      ['bc_rol', counter++], // 135
      ['bc_rev', counter++], // 136
      ['bc_zerox', counter++], // 137
      ['bc_signx', counter++], // 138
      ['bc_add', counter++], // 139
      ['bc_sub', counter++], // 140

      ['bc_logand', counter++], // 141
      ['bc_logxor', counter++], // 142
      ['bc_logor', counter++], // 143
      ['bc_bitand', counter++], // 144
      ['bc_bitxor', counter++], // 145
      ['bc_bitor', counter++], // 146
      ['bc_fge', counter++], // 147
      ['bc_fle', counter++], // 148
      ['bc_addbits', counter++], // 149
      ['bc_addpins', counter++], // 150

      ['bc_mul', counter++], // 151
      ['bc_div', counter++], // 152
      ['bc_divu', counter++], // 153
      ['bc_rem', counter++], // 154
      ['bc_remu', counter++], // 155
      ['bc_sca', counter++], // 156
      ['bc_scas', counter++], // 157
      ['bc_frac', counter++], // 158

      ['bc_string', counter++], // 159
      ['bc_bitrange', counter++] // 160 (0xA0)
    ]);

    counter = 161;
    this.bytecodes.set('bc_con_n', counter); // 161 (0xA1)
    counter += 16;
    this.bytecodes.set('bc_setup_reg_1D8_1F8', counter); // 177 (0xB1)
    counter += 16;
    this.bytecodes.set('bc_setup_var_0_15', counter); // 193 (0xC1)
    counter += 16;
    this.bytecodes.set('bc_setup_local_0_15', counter); // 209 (0xD1)
    counter += 16;
    this.bytecodes.set('bc_read_local_0_15', counter); // 225 (0xE1)
    counter += 16;
    this.bytecodes.set('bc_write_local_0_15', counter); // 241 (0xF1)
    counter += 16;

    this.bytecodes.set('bc_repeat_var_init_n', counter); // 257 (0x101)
    counter += 0x7a;
    this.bytecodes.set('bc_repeat_var_init_1', counter++); // 379 (0x17B)
    this.bytecodes.set('bc_repeat_var_init', counter++); // 380 (0x17C)
    this.bytecodes.set('bc_repeat_var_loop', counter++); // 381 (0x17D)

    this.bytecodes.set('bc_get_field', counter++); // 382 (0x17E)
    this.bytecodes.set('bc_get_addr', counter++); // 383 (0x17F)
    this.bytecodes.set('bc_read', counter++); // 384 (0x180)
    this.bytecodes.set('bc_write', counter++); // 385 (0x181)
    this.bytecodes.set('bc_write_push', counter++); // 386 (0x182)

    this.bytecodes.set('bc_var_inc', counter++); // 387 (0x183)
    this.bytecodes.set('bc_var_dec', counter++); // 388 (0x184)
    this.bytecodes.set('bc_var_preinc_push', counter++); // 389 (0x185)
    this.bytecodes.set('bc_var_predec_push', counter++); // 390 (0x186)
    this.bytecodes.set('bc_var_postinc_push', counter++); // 391 (0x187)
    this.bytecodes.set('bc_var_postdec_push', counter++); // 392 (0x188)
    this.bytecodes.set('bc_var_lognot', counter++); // 393 (0x189)
    this.bytecodes.set('bc_var_lognot_push', counter++); // 394 (0x18A)
    this.bytecodes.set('bc_var_bitnot', counter++); // 395 (0x18B)
    this.bytecodes.set('bc_var_bitnot_push', counter++); // 396 (0x18C)
    this.bytecodes.set('bc_var_swap', counter++); // 397 (0x18D)
    this.bytecodes.set('bc_var_rnd', counter++); // 398 (0x18E)
    this.bytecodes.set('bc_var_rnd_push', counter++); // 399 (0x18F)

    this.bytecodes.set('bc_lognot_write', counter++); // 400 (0x190)
    this.bytecodes.set('bc_bitnot_write', counter++); // 401 (0x191)
    this.bytecodes.set('bc_neg_write', counter++); // 402 (0x192)
    this.bytecodes.set('bc_abs_write', counter++); // 403 (0x193)
    this.bytecodes.set('bc_encod_write', counter++); // 404 (0x194)
    this.bytecodes.set('bc_decod_write', counter++); // 405 (0x195)
    this.bytecodes.set('bc_bmask_write', counter++); // 406 (0x196)
    this.bytecodes.set('bc_ones_write', counter++); // 407 (0x197)
    this.bytecodes.set('bc_sqrt_write', counter++); // 408 (0x198)
    this.bytecodes.set('bc_qlog_write', counter++); // 409 (0x199)
    this.bytecodes.set('bc_qexp_write', counter++); // 410 (0x19A)

    this.bytecodes.set('bc_shr_write', counter++); // 411 (0x19B)
    this.bytecodes.set('bc_shl_write', counter++); // 412 (0x19C)
    this.bytecodes.set('bc_sar_write', counter++); // 413 (0x19D)
    this.bytecodes.set('bc_ror_write', counter++); // 414 (0x19E)
    this.bytecodes.set('bc_rol_write', counter++); // 415 (0x19F)
    this.bytecodes.set('bc_rev_write', counter++); // 416 (0x1A0)
    this.bytecodes.set('bc_zerox_write', counter++); // 417 (0x1A1)
    this.bytecodes.set('bc_signx_write', counter++); // 418 (0x1A2)
    this.bytecodes.set('bc_add_write', counter++); // 419 (0x1A3)
    this.bytecodes.set('bc_sub_write', counter++); // 420 (0x1A4)

    this.bytecodes.set('bc_logand_write', counter++); // 421 (0x1A5)
    this.bytecodes.set('bc_logxor_write', counter++); // 422 (0x1A6)
    this.bytecodes.set('bc_logor_write', counter++); // 423 (0x1A7)
    this.bytecodes.set('bc_bitand_write', counter++); // 424 (0x1A8)
    this.bytecodes.set('bc_bitxor_write', counter++); // 425 (0x1A9)
    this.bytecodes.set('bc_bitor_write', counter++); // 426 (0x1AA)
    this.bytecodes.set('bc_fge_write', counter++); // 427 (0x1AB)
    this.bytecodes.set('bc_fle_write', counter++); // 428 (0x1AC)
    this.bytecodes.set('bc_addbits_write', counter++); // 429 (0x1AD)
    this.bytecodes.set('bc_addpins_write', counter++); // 430 (0x1AE)

    this.bytecodes.set('bc_mul_write', counter++); // 431 (0x1AF)
    this.bytecodes.set('bc_div_write', counter++); // 432 (0x1B0)
    this.bytecodes.set('bc_divu_write', counter++); // 433 (0x1B1)
    this.bytecodes.set('bc_rem_write', counter++); // 434 (0x1B2)
    this.bytecodes.set('bc_remu_write', counter++); // 435 (0x1B3)
    this.bytecodes.set('bc_sca_write', counter++); // 436 (0x1B4)
    this.bytecodes.set('bc_scas_write', counter++); // 437 (0x1B5)
    this.bytecodes.set('bc_frac_write', counter++); // 438 (0x1B6)

    this.bytecodes.set('bc_lognot_write_push', counter++); // 439 (0x1B7)
    this.bytecodes.set('bc_bitnot_write_push', counter++); // 440 (0x1B8)
    this.bytecodes.set('bc_neg_write_push', counter++); // 441 (0x1B9)
    this.bytecodes.set('bc_abs_write_push', counter++); // 442 (0x1BA)
    this.bytecodes.set('bc_encod_write_push', counter++); // 443 (0x1BB)
    this.bytecodes.set('bc_decod_write_push', counter++); // 444 (0x1BC)
    this.bytecodes.set('bc_bmask_write_push', counter++); // 445 (0x1BD)
    this.bytecodes.set('bc_ones_write_push', counter++); // 446 (0x1BE)
    this.bytecodes.set('bc_sqrt_write_push', counter++); // 447 (0x1BF)
    this.bytecodes.set('bc_qlog_write_push', counter++); // 448 (0x1C0)
    this.bytecodes.set('bc_qexp_write_push', counter++); // 449 (0x1C1)

    this.bytecodes.set('bc_shr_write_push', counter++); // 450 (0x1C2)
    this.bytecodes.set('bc_shl_write_push', counter++); // 451 (0x1C3)
    this.bytecodes.set('bc_sar_write_push', counter++); // 452 (0x1C4)
    this.bytecodes.set('bc_ror_write_push', counter++); // 453 (0x1C5)
    this.bytecodes.set('bc_rol_write_push', counter++); // 454 (0x1C6)
    this.bytecodes.set('bc_rev_write_push', counter++); // 455 (0x1C7)
    this.bytecodes.set('bc_zerox_write_push', counter++); // 456 (0x1C8)
    this.bytecodes.set('bc_signx_write_push', counter++); // 457 (0x1C9)
    this.bytecodes.set('bc_add_write_push', counter++); // 458 (0x1CA)
    this.bytecodes.set('bc_sub_write_push', counter++); // 459 (0x1CB)

    this.bytecodes.set('bc_logand_write_push', counter++); // 460 (0x1CC)
    this.bytecodes.set('bc_logxor_write_push', counter++); // 461 (0x1CD)
    this.bytecodes.set('bc_logor_write_push', counter++); // 462 (0x1CE)
    this.bytecodes.set('bc_bitand_write_push', counter++); // 463 (0x1CF)
    this.bytecodes.set('bc_bitxor_write_push', counter++); // 464 (0x1D0)
    this.bytecodes.set('bc_bitor_write_push', counter++); // 465 (0x1D1)
    this.bytecodes.set('bc_fge_write_push', counter++); // 466 (0x1D2)
    this.bytecodes.set('bc_fle_write_push', counter++); // 467 (0x1D3)
    this.bytecodes.set('bc_addbits_write_push', counter++); // 468 (0x1D4)
    this.bytecodes.set('bc_addpins_write_push', counter++); // 469 (0x1D5)

    this.bytecodes.set('bc_mul_write_push', counter++); // 470 (0x1D6)
    this.bytecodes.set('bc_div_write_push', counter++); // 471 (0x1D7)
    this.bytecodes.set('bc_divu_write_push', counter++); // 472 (0x1D8)
    this.bytecodes.set('bc_rem_write_push', counter++); // 473 (0x1D9)
    this.bytecodes.set('bc_remu_write_push', counter++); // 474 (0x1DA)
    this.bytecodes.set('bc_sca_write_push', counter++); // 475 (0x1DB)
    this.bytecodes.set('bc_scas_write_push', counter++); // 476 (0x1DC)
    this.bytecodes.set('bc_frac_write_push', counter++); // 477 (0x1DD)

    this.bytecodes.set('bc_setup_bfield_pop', counter++); // 478 (0x1DE)
    this.bytecodes.set('bc_setup_bfield_rfvar', counter++); // 479 (0x1DF)
    this.bytecodes.set('bc_setup_bfield_0_31', counter); // 480 (0x1E0)
    counter += 32; // counti adds 32 to the counter

    this.bytecodes.set('bc_hubset', counter); // 512 (0x200)  ;hub bytecodes, miscellaneous (step by 2)
    counter += 2;
    this.bytecodes.set('bc_clkset', counter); // 514 (0x202)
    counter += 2;
    this.bytecodes.set('bc_read_clkfreq', counter);
    counter += 2; // 516 (0x204)
    this.bytecodes.set('bc_cogspin', counter);
    counter += 2; // 518 (0x206)
    this.bytecodes.set('bc_cogchk', counter);
    counter += 2; // 520 (0x208)
    this.bytecodes.set('bc_inline', counter);
    counter += 2; // 522 (0x20A)
    this.bytecodes.set('bc_regexec', counter);
    counter += 2; // 524 (0x20C)
    this.bytecodes.set('bc_regload', counter);
    counter += 2; // 526 (0x20E)
    this.bytecodes.set('bc_call', counter);
    counter += 2; // 528 (0x210)
    this.bytecodes.set('bc_getregs', counter);
    counter += 2; // 530 (0x212)
    this.bytecodes.set('bc_setregs', counter);
    counter += 2; // 532 (0x214)
    this.bytecodes.set('bc_bytemove', counter);
    counter += 2; // 534 (0x216)
    this.bytecodes.set('bc_bytefill', counter);
    counter += 2; // 536 (0x218)
    this.bytecodes.set('bc_wordmove', counter);
    counter += 2; // 538 (0x21A)
    this.bytecodes.set('bc_wordfill', counter);
    counter += 2; // 540 (0x21C)
    this.bytecodes.set('bc_longmove', counter);
    counter += 2; // 542 (0x21E)
    this.bytecodes.set('bc_longfill', counter);
    counter += 2; // 544 (0x220)
    this.bytecodes.set('bc_strsize', counter);
    counter += 2; // 546 (0x222)
    this.bytecodes.set('bc_strcomp', counter);
    counter += 2; // 548 (0x224)
    this.bytecodes.set('bc_strcopy', counter);
    counter += 2; // 550 (0x226)
    this.bytecodes.set('bc_getcrc', counter);
    counter += 2; // 552 (0x228)
    this.bytecodes.set('bc_waitus', counter);
    counter += 2; // 554 (0x22A)
    this.bytecodes.set('bc_waitms', counter);
    counter += 2; // 556 (0x22C)
    this.bytecodes.set('bc_getms', counter);
    counter += 2; // 558 (0x22E)
    this.bytecodes.set('bc_getsec', counter);
    counter += 2; // 560 (0x230)
    this.bytecodes.set('bc_muldiv64', counter);
    counter += 2; // 562 (0x232)
    this.bytecodes.set('bc_qsin', counter);
    counter += 2; // 564 (0x234)
    this.bytecodes.set('bc_qcos', counter);
    counter += 2; // 566 (0x236)
    this.bytecodes.set('bc_rotxy', counter);
    counter += 2; // 568 (0x238)
    this.bytecodes.set('bc_polxy', counter);
    counter += 2; // 570 (0x23A)
    this.bytecodes.set('bc_xypol', counter);
    counter += 2; // 572 (0x23C)

    this.bytecodes.set('bc_nan', counter); // 574 (0x23E)
    counter += 2;
    this.bytecodes.set('bc_fneg', counter); // 576 (0x240)
    counter += 2;
    this.bytecodes.set('bc_fabs', counter); // 578 (0x242)
    counter += 2;
    this.bytecodes.set('bc_fsqrt', counter); // 580 (0x244)
    counter += 2;
    this.bytecodes.set('bc_fadd', counter); // 582 (0x246)
    counter += 2;
    this.bytecodes.set('bc_fsub', counter); // 584 (0x248)
    counter += 2;
    this.bytecodes.set('bc_fmul', counter); // 586 (0x24A)
    counter += 2;
    this.bytecodes.set('bc_fdiv', counter); // 588 (0x24C)
    counter += 2;
    this.bytecodes.set('bc_flt', counter); // 590 (0x24E)
    counter += 2;
    this.bytecodes.set('bc_fgt', counter); // 592 (0x250)
    counter += 2;
    this.bytecodes.set('bc_fne', counter); // 594 (0x252)
    counter += 2;
    this.bytecodes.set('bc_fe', counter); // 596 (0x254)
    counter += 2;
    this.bytecodes.set('bc_flte', counter); // 598 (0x256)
    counter += 2;
    this.bytecodes.set('bc_fgte', counter); // 600 (0x258)
    counter += 2;
    this.bytecodes.set('bc_round', counter); // 602 (0x25A)
    counter += 2;
    this.bytecodes.set('bc_trunc', counter); // 604 (0x25C)
    counter += 2;
    this.bytecodes.set('bc_float', counter); // 606 (0x25E)
    counter += 2;
  }
}

/**
 * The findSymbol function takes a string and returns the symbol that matches that string, or undefined if
 * no symbol matches.
 *
 * @export
 * @param {string} s
 * @return {*}  {(SpinSymbol | undefined)}
 * @memberof Compiler
 */
export function findSymbol(s: string): SpinSymbol | undefined {
  return symbols.find((symbol) => symbol.symbol === s);
}

/**
 * checks if a character is a digit, an underscore, or a letter (case insensitive)
 *
 * @export
 * @param {string} ch
 * @return {boolean}  T/F where T means ch is numeric, an underscore or a letter (case insensitive) or a digit
 */
export function checkWordChr(ch: string): boolean {
  const charCode = ch.charCodeAt(0);
  const isDigit = charCode >= '0'.charCodeAt(0) && charCode <= '9'.charCodeAt(0);
  const isUnderscore = ch === '_';
  const isLetter =
    (charCode >= 'A'.charCodeAt(0) && charCode <= 'Z'.charCodeAt(0)) || (charCode >= 'a'.charCodeAt(0) && charCode <= 'z'.charCodeAt(0));

  return isDigit || isUnderscore || isLetter;
}
/**
 * checks if a character is an underscore or a letter (case insensitive), but not a digit.
 *
 * @export
 * @param {string} ch
 * @return {boolean}  T/F where T means ch is numeric, an underscore or a letter (case insensitive)
 */
export function checkWordChrInitial(ch: string): boolean {
  const charCode = ch.charCodeAt(0);
  const isUnderscore = ch === '_';
  const isLetter =
    (charCode >= 'A'.charCodeAt(0) && charCode <= 'Z'.charCodeAt(0)) || (charCode >= 'a'.charCodeAt(0) && charCode <= 'z'.charCodeAt(0));

  return isUnderscore || isLetter;
}

/**
 * checks if a character is a hexadecimal digit and less than another character cl
 *
 * @export
 * @param {string} ch
 * @param {string} cl
 * @return {boolean} T/F where T means ch is hexadecimal and is less than cl
 */
export function checkDigit(ch: string, cl: string): boolean {
  if (!checkHex(ch)) {
    return false;
  }

  return ch.charCodeAt(0) < cl.charCodeAt(0);
}

/**
 * checks if a character is a hexadecimal digit.
 *
 * @export
 * @param {string} ch
 * @return {boolean}
 */
export function checkHex(ch: string): boolean {
  const charCode = ch.toUpperCase().charCodeAt(0);
  const isDigit = charCode >= '0'.charCodeAt(0) && charCode <= '9'.charCodeAt(0);
  const isHexLetter = charCode >= 'A'.charCodeAt(0) && charCode <= 'F'.charCodeAt(0);

  return isDigit || isHexLetter;
}

/**
 * converts one or more characters to uppercase
 *
 * @export
 * @param {string} ch
 * @return {string}
 */
export function uppercase(ch: string): string {
  return ch.toUpperCase();
}
