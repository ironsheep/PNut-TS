/** @format */
'use strict';

// src/classes/parseUtils.ts

// a collection of generally useful functions for parsing spin

import { eElementType, eValueType, eByteCode } from './types';

export interface iSpinSymbol {
  symbol: string;
  type: eElementType;
  value: number;
}

enum SYMBOLS {
  ABS = 'ABS',
  FABS = 'FABS',
  ENCOD = 'ENCOD',
  DECOD = 'DECOD',
  BMASK = 'BMASK',
  ONES = 'ONES',
  SQRT = 'SQRT',
  FSQRT = 'FSQRT',
  QLOG = 'QLOG',
  QEXP = 'QEXP',
  SAR = 'SAR',
  ROR = 'ROR',
  ROL = 'ROL',
  REV = 'REV',
  ZEROX = 'ZEROX',
  SIGNX = 'SIGNX',
  SCA = 'SCA',
  SCAS = 'SCAS',
  FRAC = 'FRAC',
  ADDBITS = 'ADDBITS',
  ADDPINS = 'ADDPINS',
  NOT = 'NOT',
  AND = 'AND',
  XOR = 'XOR',
  OR = 'OR',
  FLOAT = 'FLOAT',
  ROUND = 'ROUND',
  TRUNC = 'TRUNC',
  STRING = 'STRING',
  CON = 'CON',
  OBJ = 'OBJ',
  VAR = 'VAR',
  PUB = 'PUB',
  PRI = 'PRI',
  DAT = 'DAT',
  FIELD = 'FIELD',
  BYTE = 'BYTE',
  WORD = 'WORD',
  LONG = 'LONG',
  BYTEFIT = 'BYTEFIT',
  WORDFIT = 'WORDFIT',
  FVAR = 'FVAR',
  FVARS = 'FVARS',
  FILE = 'FILE',
  IF = 'IF',
  IFNOT = 'IFNOT',
  ELSEIF = 'ELSEIF',
  ELSEIFNOT = 'ELSEIFNOT',
  ELSE = 'ELSE',
  CASE = 'CASE',
  CASE_FAST = 'CASE_FAST',
  OTHER = 'OTHER',
  REPEAT = 'REPEAT',
  WHILE = 'WHILE',
  UNTIL = 'UNTIL',
  FROM = 'FROM',
  TO = 'TO',
  STEP = 'STEP',
  WITH = 'WITH',
  NEXT = 'NEXT',
  QUIT = 'QUIT',
  RETURN = 'RETURN',
  ABORT = 'ABORT',
  LOOKUPZ = 'LOOKUPZ',
  LOOKUP = 'LOOKUP',
  LOOKDOWNZ = 'LOOKDOWNZ',
  LOOKDOWN = 'LOOKDOWN',
  COGSPIN = 'COGSPIN',
  RECV = 'RECV',
  SEND = 'SEND',
  DEBUG = 'DEBUG',
  DLY = 'DLY',
  PC_KEY = 'PC_KEY',
  PC_MOUSE = 'PC_MOUSE',
  ZSTR = 'ZSTR',
  ZSTR_ = 'ZSTR_',
  FDEC = 'FDEC',
  FDEC_ = 'FDEC_',
  FDEC_REG_ARRAY = 'FDEC_REG_ARRAY',
  FDEC_REG_ARRAY_ = 'FDEC_REG_ARRAY_',
  LSTR = 'LSTR',
  LSTR_ = 'LSTR_',
  FDEC_ARRAY = 'FDEC_ARRAY',
  FDEC_ARRAY_ = 'FDEC_ARRAY_',
  UDEC = 'UDEC',
  UDEC_ = 'UDEC_',
  UDEC_BYTE = 'UDEC_BYTE',
  UDEC_BYTE_ = 'UDEC_BYTE_',
  UDEC_WORD = 'UDEC_WORD',
  UDEC_WORD_ = 'UDEC_WORD_',
  UDEC_LONG = 'UDEC_LONG',
  UDEC_LONG_ = 'UDEC_LONG_',
  UDEC_REG_ARRAY = 'UDEC_REG_ARRAY',
  UDEC_REG_ARRAY_ = 'UDEC_REG_ARRAY_',
  UDEC_BYTE_ARRAY = 'UDEC_BYTE_ARRAY',
  UDEC_BYTE_ARRAY_ = 'UDEC_BYTE_ARRAY_',
  UDEC_WORD_ARRAY = 'UDEC_WORD_ARRAY',
  UDEC_WORD_ARRAY_ = 'UDEC_WORD_ARRAY_',
  UDEC_LONG_ARRAY = 'UDEC_LONG_ARRAY',
  UDEC_LONG_ARRAY_ = 'UDEC_LONG_ARRAY_',
  SDEC = 'SDEC',
  SDEC_ = 'SDEC_',
  SDEC_BYTE = 'SDEC_BYTE',
  SDEC_BYTE_ = 'SDEC_BYTE_',
  SDEC_WORD = 'SDEC_WORD',
  SDEC_WORD_ = 'SDEC_WORD_',
  SDEC_LONG = 'SDEC_LONG',
  SDEC_LONG_ = 'SDEC_LONG_',
  SDEC_REG_ARRAY = 'SDEC_REG_ARRAY',
  SDEC_REG_ARRAY_ = 'SDEC_REG_ARRAY_',
  SDEC_BYTE_ARRAY = 'SDEC_BYTE_ARRAY',
  SDEC_BYTE_ARRAY_ = 'SDEC_BYTE_ARRAY_',
  SDEC_WORD_ARRAY = 'SDEC_WORD_ARRAY',
  SDEC_WORD_ARRAY_ = 'SDEC_WORD_ARRAY_',
  SDEC_LONG_ARRAY = 'SDEC_LONG_ARRAY',
  SDEC_LONG_ARRAY_ = 'SDEC_LONG_ARRAY_',
  UHEX = 'UHEX',
  UHEX_ = 'UHEX_',
  UHEX_BYTE = 'UHEX_BYTE',
  UHEX_BYTE_ = 'UHEX_BYTE_',
  UHEX_WORD = 'UHEX_WORD',
  UHEX_WORD_ = 'UHEX_WORD_',
  UHEX_LONG = 'UHEX_LONG',
  UHEX_LONG_ = 'UHEX_LONG_',
  UHEX_REG_ARRAY = 'UHEX_REG_ARRAY',
  UHEX_REG_ARRAY_ = 'UHEX_REG_ARRAY_',
  UHEX_BYTE_ARRAY = 'UHEX_BYTE_ARRAY',
  UHEX_BYTE_ARRAY_ = 'UHEX_BYTE_ARRAY_',
  UHEX_WORD_ARRAY = 'UHEX_WORD_ARRAY',
  UHEX_WORD_ARRAY_ = 'UHEX_WORD_ARRAY_',
  UHEX_LONG_ARRAY = 'UHEX_LONG_ARRAY',
  UHEX_LONG_ARRAY_ = 'UHEX_LONG_ARRAY_',
  SHEX = 'SHEX',
  SHEX_ = 'SHEX_',
  SHEX_BYTE = 'SHEX_BYTE',
  SHEX_BYTE_ = 'SHEX_BYTE_',
  SHEX_WORD = 'SHEX_WORD',
  SHEX_WORD_ = 'SHEX_WORD_',
  SHEX_LONG = 'SHEX_LONG',
  SHEX_LONG_ = 'SHEX_LONG_',
  SHEX_REG_ARRAY = 'SHEX_REG_ARRAY',
  SHEX_REG_ARRAY_ = 'SHEX_REG_ARRAY_',
  SHEX_BYTE_ARRAY = 'SHEX_BYTE_ARRAY',
  SHEX_BYTE_ARRAY_ = 'SHEX_BYTE_ARRAY_',
  SHEX_WORD_ARRAY = 'SHEX_WORD_ARRAY',
  SHEX_WORD_ARRAY_ = 'SHEX_WORD_ARRAY_',
  SHEX_LONG_ARRAY = 'SHEX_LONG_ARRAY',
  SHEX_LONG_ARRAY_ = 'SHEX_LONG_ARRAY_',
  UBIN = 'UBIN',
  UBIN_ = 'UBIN_',
  UBIN_BYTE = 'UBIN_BYTE',
  UBIN_BYTE_ = 'UBIN_BYTE_',
  UBIN_WORD = 'UBIN_WORD',
  UBIN_WORD_ = 'UBIN_WORD_',
  UBIN_LONG = 'UBIN_LONG',
  UBIN_LONG_ = 'UBIN_LONG_',
  UBIN_REG_ARRAY = 'UBIN_REG_ARRAY',
  UBIN_REG_ARRAY_ = 'UBIN_REG_ARRAY_',
  UBIN_BYTE_ARRAY = 'UBIN_BYTE_ARRAY',
  UBIN_BYTE_ARRAY_ = 'UBIN_BYTE_ARRAY_',
  UBIN_WORD_ARRAY = 'UBIN_WORD_ARRAY',
  UBIN_WORD_ARRAY_ = 'UBIN_WORD_ARRAY_',
  UBIN_LONG_ARRAY = 'UBIN_LONG_ARRAY',
  UBIN_LONG_ARRAY_ = 'UBIN_LONG_ARRAY_',
  SBIN = 'SBIN',
  SBIN_ = 'SBIN_',
  SBIN_BYTE = 'SBIN_BYTE',
  SBIN_BYTE_ = 'SBIN_BYTE_',
  SBIN_WORD = 'SBIN_WORD',
  SBIN_WORD_ = 'SBIN_WORD_',
  SBIN_LONG = 'SBIN_LONG',
  SBIN_LONG_ = 'SBIN_LONG_',
  SBIN_REG_ARRAY = 'SBIN_REG_ARRAY',
  SBIN_REG_ARRAY_ = 'SBIN_REG_ARRAY_',
  SBIN_BYTE_ARRAY = 'SBIN_BYTE_ARRAY',
  SBIN_BYTE_ARRAY_ = 'SBIN_BYTE_ARRAY_',
  SBIN_WORD_ARRAY = 'SBIN_WORD_ARRAY',
  SBIN_WORD_ARRAY_ = 'SBIN_WORD_ARRAY_',
  SBIN_LONG_ARRAY = 'SBIN_LONG_ARRAY',
  SBIN_LONG_ARRAY_ = 'SBIN_LONG_ARRAY_',
  END = 'END',
  _ = '_',
  HUBSET = 'HUBSET',
  COGINIT = 'COGINIT',
  COGSTOP = 'COGSTOP',
  COGID = 'COGID',
  COGCHK = 'COGCHK',
  GETRND = 'GETRND',
  GETCT = 'GETCT',
  POLLCT = 'POLLCT',
  WAITCT = 'WAITCT',
  PINWRITE = 'PINWRITE',
  PINW = 'PINW',
  PINLOW = 'PINLOW',
  PINL = 'PINL',
  PINHIGH = 'PINHIGH',
  PINH = 'PINH',
  PINTOGGLE = 'PINTOGGLE',
  PINT = 'PINT',
  PINFLOAT = 'PINFLOAT',
  PINF = 'PINF',
  PINREAD = 'PINREAD',
  PINR = 'PINR',
  PINSTART = 'PINSTART',
  PINCLEAR = 'PINCLEAR',
  WRPIN = 'WRPIN',
  WXPIN = 'WXPIN',
  WYPIN = 'WYPIN',
  AKPIN = 'AKPIN',
  RDPIN = 'RDPIN',
  RQPIN = 'RQPIN',
  ROTXY = 'ROTXY',
  POLXY = 'POLXY',
  XYPOL = 'XYPOL',
  LOCKNEW = 'LOCKNEW',
  LOCKRET = 'LOCKRET',
  LOCKTRY = 'LOCKTRY',
  LOCKREL = 'LOCKREL',
  LOCKCHK = 'LOCKCHK',
  COGATN = 'COGATN',
  POLLATN = 'POLLATN',
  WAITATN = 'WAITATN',
  CLKSET = 'CLKSET',
  REGEXEC = 'REGEXEC',
  REGLOAD = 'REGLOAD',
  CALL = 'CALL',
  GETREGS = 'GETREGS',
  SETREGS = 'SETREGS',
  BYTEMOVE = 'BYTEMOVE',
  BYTEFILL = 'BYTEFILL',
  WORDMOVE = 'WORDMOVE',
  WORDFILL = 'WORDFILL',
  LONGMOVE = 'LONGMOVE',
  LONGFILL = 'LONGFILL',
  STRSIZE = 'STRSIZE',
  STRCOMP = 'STRCOMP',
  STRCOPY = 'STRCOPY',
  GETCRC = 'GETCRC',
  WAITUS = 'WAITUS',
  WAITMS = 'WAITMS',
  GETMS = 'GETMS',
  GETSEC = 'GETSEC',
  MULDIV64 = 'MULDIV64',
  QSIN = 'QSIN',
  QCOS = 'QCOS',
  NAN = 'NAN',
  ORGH = 'ORGH',
  ALIGNW = 'ALIGNW',
  ALIGNL = 'ALIGNL',
  ORG = 'ORG',
  ORGF = 'ORGF',
  RES = 'RES',
  FIT = 'FIT',
  _RET_ = '_RET_',
  IF_NC_AND_NZ = 'IF_NC_AND_NZ',
  IF_NZ_AND_NC = 'IF_NZ_AND_NC',
  IF_GT = 'IF_GT',
  IF_A = 'IF_A',
  IF_NC_AND_Z = 'IF_NC_AND_Z',
  IF_Z_AND_NC = 'IF_Z_AND_NC',
  IF_NC = 'IF_NC',
  IF_GE = 'IF_GE',
  IF_AE = 'IF_AE',
  IF_C_AND_NZ = 'IF_C_AND_NZ',
  IF_NZ_AND_C = 'IF_NZ_AND_C',
  IF_NZ = 'IF_NZ',
  IF_NE = 'IF_NE',
  IF_C_NE_Z = 'IF_C_NE_Z',
  IF_Z_NE_C = 'IF_Z_NE_C',
  IF_NC_OR_NZ = 'IF_NC_OR_NZ',
  IF_NZ_OR_NC = 'IF_NZ_OR_NC',
  IF_C_AND_Z = 'IF_C_AND_Z',
  IF_Z_AND_C = 'IF_Z_AND_C',
  IF_C_EQ_Z = 'IF_C_EQ_Z',
  IF_Z_EQ_C = 'IF_Z_EQ_C',
  IF_Z = 'IF_Z',
  IF_E = 'IF_E',
  IF_NC_OR_Z = 'IF_NC_OR_Z',
  IF_Z_OR_NC = 'IF_Z_OR_NC',
  IF_C = 'IF_C',
  IF_LT = 'IF_LT',
  IF_B = 'IF_B',
  IF_C_OR_NZ = 'IF_C_OR_NZ',
  IF_NZ_OR_C = 'IF_NZ_OR_C',
  IF_C_OR_Z = 'IF_C_OR_Z',
  IF_Z_OR_C = 'IF_Z_OR_C',
  IF_LE = 'IF_LE',
  IF_BE = 'IF_BE',
  IF_ALWAYS = 'IF_ALWAYS',
  IF_00 = 'IF_00',
  IF_01 = 'IF_01',
  IF_10 = 'IF_10',
  IF_11 = 'IF_11',
  IF_X0 = 'IF_X0',
  IF_X1 = 'IF_X1',
  IF_0X = 'IF_0X',
  IF_1X = 'IF_1X',
  IF_NOT_00 = 'IF_NOT_00',
  IF_NOT_01 = 'IF_NOT_01',
  IF_NOT_10 = 'IF_NOT_10',
  IF_NOT_11 = 'IF_NOT_11',
  IF_SAME = 'IF_SAME',
  IF_DIFF = 'IF_DIFF',
  IF_0000 = 'IF_0000',
  IF_0001 = 'IF_0001',
  IF_0010 = 'IF_0010',
  IF_0011 = 'IF_0011',
  IF_0100 = 'IF_0100',
  IF_0101 = 'IF_0101',
  IF_0110 = 'IF_0110',
  IF_0111 = 'IF_0111',
  IF_1000 = 'IF_1000',
  IF_1001 = 'IF_1001',
  IF_1010 = 'IF_1010',
  IF_1011 = 'IF_1011',
  IF_1100 = 'IF_1100',
  IF_1101 = 'IF_1101',
  IF_1110 = 'IF_1110',
  IF_1111 = 'IF_1111',
  SHR = 'SHR',
  SHL = 'SHL',
  RCR = 'RCR',
  RCL = 'RCL',
  SAL = 'SAL',
  ADD = 'ADD',
  ADDX = 'ADDX',
  ADDS = 'ADDS',
  ADDSX = 'ADDSX',
  SUB = 'SUB',
  SUBX = 'SUBX',
  SUBS = 'SUBS',
  SUBSX = 'SUBSX',
  CMP = 'CMP',
  CMPX = 'CMPX',
  CMPS = 'CMPS',
  CMPSX = 'CMPSX',
  CMPR = 'CMPR',
  CMPM = 'CMPM',
  SUBR = 'SUBR',
  CMPSUB = 'CMPSUB',
  FGE = 'FGE',
  FLE = 'FLE',
  FGES = 'FGES',
  FLES = 'FLES',
  SUMC = 'SUMC',
  SUMNC = 'SUMNC',
  SUMZ = 'SUMZ',
  SUMNZ = 'SUMNZ',
  BITL = 'BITL',
  BITH = 'BITH',
  BITC = 'BITC',
  BITNC = 'BITNC',
  BITZ = 'BITZ',
  BITNZ = 'BITNZ',
  BITRND = 'BITRND',
  BITNOT = 'BITNOT',
  TESTB = 'TESTB',
  TESTBN = 'TESTBN',
  ANDN = 'ANDN',
  MUXC = 'MUXC',
  MUXNC = 'MUXNC',
  MUXZ = 'MUXZ',
  MUXNZ = 'MUXNZ',
  MOV = 'MOV',
  NEG = 'NEG',
  NEGC = 'NEGC',
  NEGNC = 'NEGNC',
  NEGZ = 'NEGZ',
  NEGNZ = 'NEGNZ',
  INCMOD = 'INCMOD',
  DECMOD = 'DECMOD',
  TEST = 'TEST',
  TESTN = 'TESTN',
  SETNIB = 'SETNIB',
  GETNIB = 'GETNIB',
  ROLNIB = 'ROLNIB',
  SETBYTE = 'SETBYTE',
  GETBYTE = 'GETBYTE',
  ROLBYTE = 'ROLBYTE',
  SETWORD = 'SETWORD',
  GETWORD = 'GETWORD',
  ROLWORD = 'ROLWORD',
  ALTSN = 'ALTSN',
  ALTGN = 'ALTGN',
  ALTSB = 'ALTSB',
  ALTGB = 'ALTGB',
  ALTSW = 'ALTSW',
  ALTGW = 'ALTGW',
  ALTR = 'ALTR',
  ALTD = 'ALTD',
  ALTS = 'ALTS',
  ALTB = 'ALTB',
  ALTI = 'ALTI',
  SETR = 'SETR',
  SETD = 'SETD',
  SETS = 'SETS',
  CRCBIT = 'CRCBIT',
  CRCNIB = 'CRCNIB',
  MUXNITS = 'MUXNITS',
  MUXNIBS = 'MUXNIBS',
  MUXQ = 'MUXQ',
  MOVBYTS = 'MOVBYTS',
  MUL = 'MUL',
  MULS = 'MULS',
  ADDPIX = 'ADDPIX',
  MULPIX = 'MULPIX',
  BLNPIX = 'BLNPIX',
  MIXPIX = 'MIXPIX',
  ADDCT1 = 'ADDCT1',
  ADDCT2 = 'ADDCT2',
  ADDCT3 = 'ADDCT3',
  WMLONG = 'WMLONG',
  RDLUT = 'RDLUT',
  RDBYTE = 'RDBYTE',
  RDWORD = 'RDWORD',
  RDLONG = 'RDLONG',
  CALLPA = 'CALLPA',
  CALLPB = 'CALLPB',
  DJZ = 'DJZ',
  DJNZ = 'DJNZ',
  DJF = 'DJF',
  DJNF = 'DJNF',
  IJZ = 'IJZ',
  IJNZ = 'IJNZ',
  TJZ = 'TJZ',
  TJNZ = 'TJNZ',
  TJF = 'TJF',
  TJNF = 'TJNF',
  TJS = 'TJS',
  TJNS = 'TJNS',
  TJV = 'TJV',
  JINT = 'JINT',
  JCT1 = 'JCT1',
  JCT2 = 'JCT2',
  JCT3 = 'JCT3',
  JSE1 = 'JSE1',
  JSE2 = 'JSE2',
  JSE3 = 'JSE3',
  JSE4 = 'JSE4',
  JPAT = 'JPAT',
  JFBW = 'JFBW',
  JXMT = 'JXMT',
  JXFI = 'JXFI',
  JXRO = 'JXRO',
  JXRL = 'JXRL',
  JATN = 'JATN',
  JQMT = 'JQMT',
  JNINT = 'JNINT',
  JNCT1 = 'JNCT1',
  JNCT2 = 'JNCT2',
  JNCT3 = 'JNCT3',
  JNSE1 = 'JNSE1',
  JNSE2 = 'JNSE2',
  JNSE3 = 'JNSE3',
  JNSE4 = 'JNSE4',
  JNPAT = 'JNPAT',
  JNFBW = 'JNFBW',
  JNXMT = 'JNXMT',
  JNXFI = 'JNXFI',
  JNXRO = 'JNXRO',
  JNXRL = 'JNXRL',
  JNATN = 'JNATN',
  JNQMT = 'JNQMT',
  SETPAT = 'SETPAT',
  WRLUT = 'WRLUT',
  WRBYTE = 'WRBYTE',
  WRWORD = 'WRWORD',
  WRLONG = 'WRLONG',
  RDFAST = 'RDFAST',
  WRFAST = 'WRFAST',
  FBLOCK = 'FBLOCK',
  XINIT = 'XINIT',
  XZERO = 'XZERO',
  XCONT = 'XCONT',
  REP = 'REP',
  QMUL = 'QMUL',
  QDIV = 'QDIV',
  QFRAC = 'QFRAC',
  QSQRT = 'QSQRT',
  QROTATE = 'QROTATE',
  QVECTOR = 'QVECTOR',
  RFBYTE = 'RFBYTE',
  RFWORD = 'RFWORD',
  RFLONG = 'RFLONG',
  RFVAR = 'RFVAR',
  RFVARS = 'RFVARS',
  WFBYTE = 'WFBYTE',
  WFWORD = 'WFWORD',
  WFLONG = 'WFLONG',
  GETQX = 'GETQX',
  GETQY = 'GETQY',
  SETDACS = 'SETDACS',
  SETXFRQ = 'SETXFRQ',
  GETXACC = 'GETXACC',
  WAITX = 'WAITX',
  SETSE1 = 'SETSE1',
  SETSE2 = 'SETSE2',
  SETSE3 = 'SETSE3',
  SETSE4 = 'SETSE4',
  POLLINT = 'POLLINT',
  POLLCT1 = 'POLLCT1',
  POLLCT2 = 'POLLCT2',
  POLLCT3 = 'POLLCT3',
  POLLSE1 = 'POLLSE1',
  POLLSE2 = 'POLLSE2',
  POLLSE3 = 'POLLSE3',
  POLLSE4 = 'POLLSE4',
  POLLPAT = 'POLLPAT',
  POLLFBW = 'POLLFBW',
  POLLXMT = 'POLLXMT',
  POLLXFI = 'POLLXFI',
  POLLXRO = 'POLLXRO',
  POLLXRL = 'POLLXRL',
  POLLQMT = 'POLLQMT',
  WAITINT = 'WAITINT',
  WAITCT1 = 'WAITCT1',
  WAITCT2 = 'WAITCT2',
  WAITCT3 = 'WAITCT3',
  WAITSE1 = 'WAITSE1',
  WAITSE2 = 'WAITSE2',
  WAITSE3 = 'WAITSE3',
  WAITSE4 = 'WAITSE4',
  WAITPAT = 'WAITPAT',
  WAITFBW = 'WAITFBW',
  WAITXMT = 'WAITXMT',
  WAITXFI = 'WAITXFI',
  WAITXRO = 'WAITXRO',
  WAITXRL = 'WAITXRL',
  ALLOWI = 'ALLOWI',
  STALLI = 'STALLI',
  TRGINT1 = 'TRGINT1',
  TRGINT2 = 'TRGINT2',
  TRGINT3 = 'TRGINT3',
  NIXINT1 = 'NIXINT1',
  NIXINT2 = 'NIXINT2',
  NIXINT3 = 'NIXINT3',
  SETINT1 = 'SETINT1',
  SETINT2 = 'SETINT2',
  SETINT3 = 'SETINT3',
  SETQ = 'SETQ',
  SETQ2 = 'SETQ2',
  PUSH = 'PUSH',
  POP = 'POP',
  JMPREL = 'JMPREL',
  SKIP = 'SKIP',
  SKIPF = 'SKIPF',
  EXECF = 'EXECF',
  GETPTR = 'GETPTR',
  GETBRK = 'GETBRK',
  COGBRK = 'COGBRK',
  BRK = 'BRK',
  SETLUTS = 'SETLUTS',
  SETCY = 'SETCY',
  SETCI = 'SETCI',
  SETCQ = 'SETCQ',
  SETCFRQ = 'SETCFRQ',
  SETCMOD = 'SETCMOD',
  SETPIV = 'SETPIV',
  SETPIX = 'SETPIX',
  TESTP = 'TESTP',
  TESTPN = 'TESTPN',
  DIRL = 'DIRL',
  DIRH = 'DIRH',
  DIRC = 'DIRC',
  DIRNC = 'DIRNC',
  DIRZ = 'DIRZ',
  DIRNZ = 'DIRNZ',
  DIRRND = 'DIRRND',
  DIRNOT = 'DIRNOT',
  OUTL = 'OUTL',
  OUTH = 'OUTH',
  OUTC = 'OUTC',
  OUTNC = 'OUTNC',
  OUTZ = 'OUTZ',
  OUTNZ = 'OUTNZ',
  OUTRND = 'OUTRND',
  OUTNOT = 'OUTNOT',
  FLTL = 'FLTL',
  FLTH = 'FLTH',
  FLTC = 'FLTC',
  FLTNC = 'FLTNC',
  FLTZ = 'FLTZ',
  FLTNZ = 'FLTNZ',
  FLTRND = 'FLTRND',
  FLTNOT = 'FLTNOT',
  DRVL = 'DRVL',
  DRVH = 'DRVH',
  DRVC = 'DRVC',
  DRVNC = 'DRVNC',
  DRVZ = 'DRVZ',
  DRVNZ = 'DRVNZ',
  DRVRND = 'DRVRND',
  DRVNOT = 'DRVNOT',
  SPLITB = 'SPLITB',
  MERGEB = 'MERGEB',
  SPLITW = 'SPLITW',
  MERGEW = 'MERGEW',
  SEUSSF = 'SEUSSF',
  SEUSSR = 'SEUSSR',
  RGBSQZ = 'RGBSQZ',
  RGBEXP = 'RGBEXP',
  XORO32 = 'XORO32',
  RCZR = 'RCZR',
  RCZL = 'RCZL',
  WRC = 'WRC',
  WRNC = 'WRNC',
  WRZ = 'WRZ',
  WRNZ = 'WRNZ',
  MODCZ = 'MODCZ',
  MODC = 'MODC',
  MODZ = 'MODZ',
  SETSCP = 'SETSCP',
  GETSCP = 'GETSCP',
  JMP = 'JMP',
  CALLA = 'CALLA',
  CALLB = 'CALLB',
  CALLD = 'CALLD',
  LOC = 'LOC',
  AUGS = 'AUGS',
  AUGD = 'AUGD',
  PUSHA = 'PUSHA',
  PUSHB = 'PUSHB',
  POPA = 'POPA',
  POPB = 'POPB',
  RET = 'RET',
  RETA = 'RETA',
  RETB = 'RETB',
  RETI0 = 'RETI0',
  RETI1 = 'RETI1',
  RETI2 = 'RETI2',
  RETI3 = 'RETI3',
  RESI0 = 'RESI0',
  RESI1 = 'RESI1',
  RESI2 = 'RESI2',
  RESI3 = 'RESI3',
  XSTOP = 'XSTOP',
  ASMCLK = 'ASMCLK',
  NOP = 'NOP',
  WC = 'WC',
  WZ = 'WZ',
  WCZ = 'WCZ',
  ANDC = 'ANDC',
  ANDZ = 'ANDZ',
  ORC = 'ORC',
  ORZ = 'ORZ',
  XORC = 'XORC',
  XORZ = 'XORZ',
  _CLR = '_CLR',
  _NC_AND_NZ = '_NC_AND_NZ',
  _NZ_AND_NC = '_NZ_AND_NC',
  _GT = '_GT',
  _NC_AND_Z = '_NC_AND_Z',
  _Z_AND_NC = '_Z_AND_NC',
  _NC = '_NC',
  _GE = '_GE',
  _C_AND_NZ = '_C_AND_NZ',
  _NZ_AND_C = '_NZ_AND_C',
  _NZ = '_NZ',
  _NE = '_NE',
  _C_NE_Z = '_C_NE_Z',
  _Z_NE_C = '_Z_NE_C',
  _NC_OR_NZ = '_NC_OR_NZ',
  _NZ_OR_NC = '_NZ_OR_NC',
  _C_AND_Z = '_C_AND_Z',
  _Z_AND_C = '_Z_AND_C',
  _C_EQ_Z = '_C_EQ_Z',
  _Z_EQ_C = '_Z_EQ_C',
  _Z = '_Z',
  _E = '_E',
  _NC_OR_Z = '_NC_OR_Z',
  _Z_OR_NC = '_Z_OR_NC',
  _C = '_C',
  _LT = '_LT',
  _C_OR_NZ = '_C_OR_NZ',
  _NZ_OR_C = '_NZ_OR_C',
  _C_OR_Z = '_C_OR_Z',
  _Z_OR_C = '_Z_OR_C',
  _LE = '_LE',
  _SET = '_SET',
  REG = 'REG',
  PR0 = 'PR0',
  PR1 = 'PR1',
  PR2 = 'PR2',
  PR3 = 'PR3',
  PR4 = 'PR4',
  PR5 = 'PR5',
  PR6 = 'PR6',
  PR7 = 'PR7',
  IJMP3 = 'IJMP3',
  IRET3 = 'IRET3',
  IJMP2 = 'IJMP2',
  IRET2 = 'IRET2',
  IJMP1 = 'IJMP1',
  IRET1 = 'IRET1',
  PA = 'PA',
  PB = 'PB',
  PTRA = 'PTRA',
  PTRB = 'PTRB',
  DIRA = 'DIRA',
  DIRB = 'DIRB',
  OUTA = 'OUTA',
  OUTB = 'OUTB',
  INA = 'INA',
  INB = 'INB',
  CLKMODE = 'CLKMODE',
  CLKFREQ = 'CLKFREQ',
  VARBASE = 'VARBASE',
  FALSE = 'FALSE',
  TRUE = 'TRUE',
  NEGX = 'NEGX',
  POSX = 'POSX',
  PI = 'PI',
  COGEXEC = 'COGEXEC',
  HUBEXEC = 'HUBEXEC',
  COGEXEC_NEW = 'COGEXEC_NEW',
  HUBEXEC_NEW = 'HUBEXEC_NEW',
  COGEXEC_NEW_PAIR = 'COGEXEC_NEW_PAIR',
  HUBEXEC_NEW_PAIR = 'HUBEXEC_NEW_PAIR',
  NEWCOG = 'NEWCOG',
  P_TRUE_A = 'P_TRUE_A',
  P_INVERT_A = 'P_INVERT_A',
  P_LOCAL_A = 'P_LOCAL_A',
  P_PLUS1_A = 'P_PLUS1_A',
  P_PLUS2_A = 'P_PLUS2_A',
  P_PLUS3_A = 'P_PLUS3_A',
  P_OUTBIT_A = 'P_OUTBIT_A',
  P_MINUS3_A = 'P_MINUS3_A',
  P_MINUS2_A = 'P_MINUS2_A',
  P_MINUS1_A = 'P_MINUS1_A',
  P_TRUE_B = 'P_TRUE_B',
  P_INVERT_B = 'P_INVERT_B',
  P_LOCAL_B = 'P_LOCAL_B',
  P_PLUS1_B = 'P_PLUS1_B',
  P_PLUS2_B = 'P_PLUS2_B',
  P_PLUS3_B = 'P_PLUS3_B',
  P_OUTBIT_B = 'P_OUTBIT_B',
  P_MINUS3_B = 'P_MINUS3_B',
  P_MINUS2_B = 'P_MINUS2_B',
  P_MINUS1_B = 'P_MINUS1_B',
  P_PASS_AB = 'P_PASS_AB',
  P_AND_AB = 'P_AND_AB',
  P_OR_AB = 'P_OR_AB',
  P_XOR_AB = 'P_XOR_AB',
  P_FILT0_AB = 'P_FILT0_AB',
  P_FILT1_AB = 'P_FILT1_AB',
  P_FILT2_AB = 'P_FILT2_AB',
  P_FILT3_AB = 'P_FILT3_AB',
  P_LOGIC_A = 'P_LOGIC_A',
  P_LOGIC_A_FB = 'P_LOGIC_A_FB',
  P_LOGIC_B_FB = 'P_LOGIC_B_FB',
  P_SCHMITT_A = 'P_SCHMITT_A',
  P_SCHMITT_A_FB = 'P_SCHMITT_A_FB',
  P_SCHMITT_B_FB = 'P_SCHMITT_B_FB',
  P_COMPARE_AB = 'P_COMPARE_AB',
  P_COMPARE_AB_FB = 'P_COMPARE_AB_FB',
  P_ADC_GIO = 'P_ADC_GIO',
  P_ADC_VIO = 'P_ADC_VIO',
  P_ADC_FLOAT = 'P_ADC_FLOAT',
  P_ADC_1X = 'P_ADC_1X',
  P_ADC_3X = 'P_ADC_3X',
  P_ADC_10X = 'P_ADC_10X',
  P_ADC_30X = 'P_ADC_30X',
  P_ADC_100X = 'P_ADC_100X',
  P_DAC_990R_3V = 'P_DAC_990R_3V',
  P_DAC_600R_2V = 'P_DAC_600R_2V',
  P_DAC_124R_3V = 'P_DAC_124R_3V',
  P_DAC_75R_2V = 'P_DAC_75R_2V',
  P_LEVEL_A = 'P_LEVEL_A',
  P_LEVEL_A_FBN = 'P_LEVEL_A_FBN',
  P_LEVEL_B_FBP = 'P_LEVEL_B_FBP',
  P_LEVEL_B_FBN = 'P_LEVEL_B_FBN',
  P_ASYNC_IO = 'P_ASYNC_IO',
  P_SYNC_IO = 'P_SYNC_IO',
  P_TRUE_IN = 'P_TRUE_IN',
  P_INVERT_IN = 'P_INVERT_IN',
  P_TRUE_OUTPUT = 'P_TRUE_OUTPUT',
  P_TRUE_OUT = 'P_TRUE_OUT',
  P_INVERT_OUTPUT = 'P_INVERT_OUTPUT',
  P_INVERT_OUT = 'P_INVERT_OUT',
  P_HIGH_FAST = 'P_HIGH_FAST',
  P_HIGH_1K5 = 'P_HIGH_1K5',
  P_HIGH_15K = 'P_HIGH_15K',
  P_HIGH_150K = 'P_HIGH_150K',
  P_HIGH_1MA = 'P_HIGH_1MA',
  P_HIGH_100UA = 'P_HIGH_100UA',
  P_HIGH_10UA = 'P_HIGH_10UA',
  P_HIGH_FLOAT = 'P_HIGH_FLOAT',
  P_LOW_FAST = 'P_LOW_FAST',
  P_LOW_1K5 = 'P_LOW_1K5',
  P_LOW_15K = 'P_LOW_15K',
  P_LOW_150K = 'P_LOW_150K',
  P_LOW_1MA = 'P_LOW_1MA',
  P_LOW_100UA = 'P_LOW_100UA',
  P_LOW_10UA = 'P_LOW_10UA',
  P_LOW_FLOAT = 'P_LOW_FLOAT',
  P_TT_00 = 'P_TT_00',
  P_TT_01 = 'P_TT_01',
  P_TT_10 = 'P_TT_10',
  P_TT_11 = 'P_TT_11',
  P_OE = 'P_OE',
  P_CHANNEL = 'P_CHANNEL',
  P_BITDAC = 'P_BITDAC',
  P_NORMAL = 'P_NORMAL',
  P_REPOSITORY = 'P_REPOSITORY',
  P_DAC_NOISE = 'P_DAC_NOISE',
  P_DAC_DITHER_RND = 'P_DAC_DITHER_RND',
  P_DAC_DITHER_PWM = 'P_DAC_DITHER_PWM',
  P_PULSE = 'P_PULSE',
  P_TRANSITION = 'P_TRANSITION',
  P_NCO_FREQ = 'P_NCO_FREQ',
  P_NCO_DUTY = 'P_NCO_DUTY',
  P_PWM_TRIANGLE = 'P_PWM_TRIANGLE',
  P_PWM_SAWTOOTH = 'P_PWM_SAWTOOTH',
  P_PWM_SMPS = 'P_PWM_SMPS',
  P_QUADRATURE = 'P_QUADRATURE',
  P_REG_UP = 'P_REG_UP',
  P_REG_UP_DOWN = 'P_REG_UP_DOWN',
  P_COUNT_RISES = 'P_COUNT_RISES',
  P_COUNT_HIGHS = 'P_COUNT_HIGHS',
  P_STATE_TICKS = 'P_STATE_TICKS',
  P_HIGH_TICKS = 'P_HIGH_TICKS',
  P_EVENTS_TICKS = 'P_EVENTS_TICKS',
  P_PERIODS_TICKS = 'P_PERIODS_TICKS',
  P_PERIODS_HIGHS = 'P_PERIODS_HIGHS',
  P_COUNTER_TICKS = 'P_COUNTER_TICKS',
  P_COUNTER_HIGHS = 'P_COUNTER_HIGHS',
  P_COUNTER_PERIODS = 'P_COUNTER_PERIODS',
  P_ADC = 'P_ADC',
  P_ADC_EXT = 'P_ADC_EXT',
  P_ADC_SCOPE = 'P_ADC_SCOPE',
  P_USB_PAIR = 'P_USB_PAIR',
  P_SYNC_TX = 'P_SYNC_TX',
  P_SYNC_RX = 'P_SYNC_RX',
  P_ASYNC_TX = 'P_ASYNC_TX',
  P_ASYNC_RX = 'P_ASYNC_RX',
  X_IMM_32X1_LUT = 'X_IMM_32X1_LUT',
  X_IMM_16X2_LUT = 'X_IMM_16X2_LUT',
  X_IMM_8X4_LUT = 'X_IMM_8X4_LUT',
  X_IMM_4X8_LUT = 'X_IMM_4X8_LUT',
  X_IMM_32X1_1DAC1 = 'X_IMM_32X1_1DAC1',
  X_IMM_16X2_2DAC1 = 'X_IMM_16X2_2DAC1',
  X_IMM_16X2_1DAC2 = 'X_IMM_16X2_1DAC2',
  X_IMM_8X4_4DAC1 = 'X_IMM_8X4_4DAC1',
  X_IMM_8X4_2DAC2 = 'X_IMM_8X4_2DAC2',
  X_IMM_8X4_1DAC4 = 'X_IMM_8X4_1DAC4',
  X_IMM_4X8_4DAC2 = 'X_IMM_4X8_4DAC2',
  X_IMM_4X8_2DAC4 = 'X_IMM_4X8_2DAC4',
  X_IMM_4X8_1DAC8 = 'X_IMM_4X8_1DAC8',
  X_IMM_2X16_4DAC4 = 'X_IMM_2X16_4DAC4',
  X_IMM_2X16_2DAC8 = 'X_IMM_2X16_2DAC8',
  X_IMM_1X32_4DAC8 = 'X_IMM_1X32_4DAC8',
  X_RFLONG_32X1_LUT = 'X_RFLONG_32X1_LUT',
  X_RFLONG_16X2_LUT = 'X_RFLONG_16X2_LUT',
  X_RFLONG_8X4_LUT = 'X_RFLONG_8X4_LUT',
  X_RFLONG_4X8_LUT = 'X_RFLONG_4X8_LUT',
  X_RFBYTE_1P_1DAC1 = 'X_RFBYTE_1P_1DAC1',
  X_RFBYTE_2P_2DAC1 = 'X_RFBYTE_2P_2DAC1',
  X_RFBYTE_2P_1DAC2 = 'X_RFBYTE_2P_1DAC2',
  X_RFBYTE_4P_4DAC1 = 'X_RFBYTE_4P_4DAC1',
  X_RFBYTE_4P_2DAC2 = 'X_RFBYTE_4P_2DAC2',
  X_RFBYTE_4P_1DAC4 = 'X_RFBYTE_4P_1DAC4',
  X_RFBYTE_8P_4DAC2 = 'X_RFBYTE_8P_4DAC2',
  X_RFBYTE_8P_2DAC4 = 'X_RFBYTE_8P_2DAC4',
  X_RFBYTE_8P_1DAC8 = 'X_RFBYTE_8P_1DAC8',
  X_RFWORD_16P_4DAC4 = 'X_RFWORD_16P_4DAC4',
  X_RFWORD_16P_2DAC8 = 'X_RFWORD_16P_2DAC8',
  X_RFLONG_32P_4DAC8 = 'X_RFLONG_32P_4DAC8',
  X_RFBYTE_LUMA8 = 'X_RFBYTE_LUMA8',
  X_RFBYTE_RGBI8 = 'X_RFBYTE_RGBI8',
  X_RFBYTE_RGB8 = 'X_RFBYTE_RGB8',
  X_RFWORD_RGB16 = 'X_RFWORD_RGB16',
  X_RFLONG_RGB24 = 'X_RFLONG_RGB24',
  X_1P_1DAC1_WFBYTE = 'X_1P_1DAC1_WFBYTE',
  X_2P_2DAC1_WFBYTE = 'X_2P_2DAC1_WFBYTE',
  X_2P_1DAC2_WFBYTE = 'X_2P_1DAC2_WFBYTE',
  X_4P_4DAC1_WFBYTE = 'X_4P_4DAC1_WFBYTE',
  X_4P_2DAC2_WFBYTE = 'X_4P_2DAC2_WFBYTE',
  X_4P_1DAC4_WFBYTE = 'X_4P_1DAC4_WFBYTE',
  X_8P_4DAC2_WFBYTE = 'X_8P_4DAC2_WFBYTE',
  X_8P_2DAC4_WFBYTE = 'X_8P_2DAC4_WFBYTE',
  X_8P_1DAC8_WFBYTE = 'X_8P_1DAC8_WFBYTE',
  X_16P_4DAC4_WFWORD = 'X_16P_4DAC4_WFWORD',
  X_16P_2DAC8_WFWORD = 'X_16P_2DAC8_WFWORD',
  X_32P_4DAC8_WFLONG = 'X_32P_4DAC8_WFLONG',
  X_1ADC8_0P_1DAC8_WFBYTE = 'X_1ADC8_0P_1DAC8_WFBYTE',
  X_1ADC8_8P_2DAC8_WFWORD = 'X_1ADC8_8P_2DAC8_WFWORD',
  X_2ADC8_0P_2DAC8_WFWORD = 'X_2ADC8_0P_2DAC8_WFWORD',
  X_2ADC8_16P_4DAC8_WFLONG = 'X_2ADC8_16P_4DAC8_WFLONG',
  X_4ADC8_0P_4DAC8_WFLONG = 'X_4ADC8_0P_4DAC8_WFLONG',
  X_DDS_GOERTZEL_SINC1 = 'X_DDS_GOERTZEL_SINC1',
  X_DDS_GOERTZEL_SINC2 = 'X_DDS_GOERTZEL_SINC2',
  X_DACS_OFF = 'X_DACS_OFF',
  X_DACS_0_0_0_0 = 'X_DACS_0_0_0_0',
  X_DACS_X_X_0_0 = 'X_DACS_X_X_0_0',
  X_DACS_0_0_X_X = 'X_DACS_0_0_X_X',
  X_DACS_X_X_X_0 = 'X_DACS_X_X_X_0',
  X_DACS_X_X_0_X = 'X_DACS_X_X_0_X',
  X_DACS_X_0_X_X = 'X_DACS_X_0_X_X',
  X_DACS_0_X_X_X = 'X_DACS_0_X_X_X',
  X_DACS_0N0_0N0 = 'X_DACS_0N0_0N0',
  X_DACS_X_X_0N0 = 'X_DACS_X_X_0N0',
  X_DACS_0N0_X_X = 'X_DACS_0N0_X_X',
  X_DACS_1_0_1_0 = 'X_DACS_1_0_1_0',
  X_DACS_X_X_1_0 = 'X_DACS_X_X_1_0',
  X_DACS_1_0_X_X = 'X_DACS_1_0_X_X',
  X_DACS_1N1_0N0 = 'X_DACS_1N1_0N0',
  X_DACS_3_2_1_0 = 'X_DACS_3_2_1_0',
  X_PINS_OFF = 'X_PINS_OFF',
  X_PINS_ON = 'X_PINS_ON',
  X_WRITE_OFF = 'X_WRITE_OFF',
  X_WRITE_ON = 'X_WRITE_ON',
  X_ALT_OFF = 'X_ALT_OFF',
  X_ALT_ON = 'X_ALT_ON',
  INT_OFF = 'INT_OFF',
  EVENT_INT = 'EVENT_INT',
  EVENT_CT1 = 'EVENT_CT1',
  EVENT_CT2 = 'EVENT_CT2',
  EVENT_CT3 = 'EVENT_CT3',
  EVENT_SE1 = 'EVENT_SE1',
  EVENT_SE2 = 'EVENT_SE2',
  EVENT_SE3 = 'EVENT_SE3',
  EVENT_SE4 = 'EVENT_SE4',
  EVENT_PAT = 'EVENT_PAT',
  EVENT_FBW = 'EVENT_FBW',
  EVENT_XMT = 'EVENT_XMT',
  EVENT_XFI = 'EVENT_XFI',
  EVENT_XRO = 'EVENT_XRO',
  EVENT_XRL = 'EVENT_XRL',
  EVENT_ATN = 'EVENT_ATN',
  EVENT_QMT = 'EVENT_QMT'
}

function asmcodeValue(v1: number, v2: number, v3: number): number {
  // calculate the actual asm code value from given parts
  //
  // macro		asmcode	symbol,v1,v2,v3
  // symbol		=	(v3 shl 11) + (v2 shl 9) + v1
  //         endm
  return (v3 << 11) + (v2 << 9) + v1;
}

function flexcodeValue(bytecode: number, params: number, results: number, pinfld: number, hubcode: number): number {
  // calculate the actual flexcode value from given parts
  //
  // macro		flexcode	symbol,bytecode,params,results,pinfld,hubcode
  // symbol		=		bytecode + (params shl 8) + (results shl 11) + (pinfld shl 14) + (hubcode shl 15)
  //         endm

  return bytecode + (params << 8) + (results << 11) + (pinfld << 14) + (hubcode << 15);
}

function opcodeValue(
  v1: number,
  v2: number,
  v3: number,
  v4: number,
  v5: number,
  v6: number,
  v7: number,
  v8: number,
  v9: number,
  v10: number
): number {
  // calculate the actual opcode value from given parts
  //
  // macro		opcode	symbol,v1,v2,v3,v4,v5,v6,v7,v8,v9,v10
  // symbol		=	v1 + (v2 shl 8) + (v3 shl 16) + (v4 shl 24) + (v5 shl 25) + (v6 shl 26) + (v7 shl 27) + (v8 shl 28) + (v9 shl 29) + (v10 shl 30)
  //        endm
  return v1 + (v2 << 8) + (v3 << 16) + (v4 << 24) + (v5 << 25) + (v6 << 26) + (v7 << 27) + (v8 << 28) + (v9 << 29) + (v10 << 30);
}

export class SpinSymbolTables {
  private automatic_symbols = new Map<SYMBOLS, [eElementType, eValueType | number]>();
  private flexcodeValues = new Map<eFlexcode, number>();
  private asmcodeValues = new Map<eAsmcode, number>();
  private opcodeValues = new Map<eOpcode, number>();
  private find_symbol_s1: iSpinSymbol[] = [];
  private find_symbol_s2: iSpinSymbol[] = [];
  private find_symbol_s3: iSpinSymbol[] = [];

  constructor() {
    this.find_symbol_s1 = [
      // find_symbol_s1
      { symbol: '(', type: eElementType.type_left, value: 0 },
      { symbol: ')', type: eElementType.type_right, value: 0 },
      { symbol: '[', type: eElementType.type_leftb, value: 0 },
      { symbol: ']', type: eElementType.type_rightb, value: 0 },
      { symbol: ',', type: eElementType.type_comma, value: 0 },
      { symbol: '=', type: eElementType.type_equal, value: 0 },
      { symbol: '#', type: eElementType.type_pound, value: 0 },
      { symbol: ':', type: eElementType.type_colon, value: 0 },
      { symbol: '\\', type: eElementType.type_back, value: 0 },
      { symbol: '.', type: eElementType.type_dot, value: 0 },
      { symbol: '@', type: eElementType.type_at, value: 0 },
      { symbol: '~', type: eElementType.type_til, value: 0 },
      { symbol: '`', type: eElementType.type_tick, value: 0 },
      { symbol: '!', type: eElementType.type_op, value: this.opcodeValue(eOpcode.oc_bitnot) },
      { symbol: '&', type: eElementType.type_op, value: this.opcodeValue(eOpcode.oc_bitand) },
      { symbol: '^', type: eElementType.type_op, value: this.opcodeValue(eOpcode.oc_bitxor) },
      { symbol: '|', type: eElementType.type_op, value: this.opcodeValue(eOpcode.oc_bitor) },
      { symbol: '*', type: eElementType.type_op, value: this.opcodeValue(eOpcode.oc_mul) },
      { symbol: '/', type: eElementType.type_op, value: this.opcodeValue(eOpcode.oc_div) },
      { symbol: '+', type: eElementType.type_op, value: this.opcodeValue(eOpcode.oc_add) },
      { symbol: '-', type: eElementType.type_op, value: this.opcodeValue(eOpcode.oc_sub) },
      { symbol: '<', type: eElementType.type_op, value: this.opcodeValue(eOpcode.oc_lt) },
      { symbol: '>', type: eElementType.type_op, value: this.opcodeValue(eOpcode.oc_gt) },
      { symbol: '?', type: eElementType.type_op, value: this.opcodeValue(eOpcode.oc_ternary) }
    ];

    this.find_symbol_s2 = [
      // find_symbol_s2
      { symbol: ':=', type: eElementType.type_assign, value: 0 },
      { symbol: '@@', type: eElementType.type_atat, value: 0 },
      { symbol: '^@', type: eElementType.type_upat, value: 0 },
      { symbol: '..', type: eElementType.type_dotdot, value: 0 },
      { symbol: '~~', type: eElementType.type_tiltil, value: 0 },
      { symbol: '++', type: eElementType.type_inc, value: 0 },
      { symbol: '--', type: eElementType.type_dec, value: 0 },
      { symbol: '??', type: eElementType.type_rnd, value: 0 },
      { symbol: '>>', type: eElementType.type_op, value: this.opcodeValue(eOpcode.oc_shr) },
      { symbol: '<<', type: eElementType.type_op, value: this.opcodeValue(eOpcode.oc_shl) },
      { symbol: '+/', type: eElementType.type_op, value: this.opcodeValue(eOpcode.oc_divu) },
      { symbol: '//', type: eElementType.type_op, value: this.opcodeValue(eOpcode.oc_rem) },
      { symbol: '#>', type: eElementType.type_op, value: this.opcodeValue(eOpcode.oc_fge) },
      { symbol: '<#', type: eElementType.type_op, value: this.opcodeValue(eOpcode.oc_fle) },
      { symbol: '+<', type: eElementType.type_op, value: this.opcodeValue(eOpcode.oc_ltu) },
      { symbol: '<=', type: eElementType.type_op, value: this.opcodeValue(eOpcode.oc_lte) },
      { symbol: '==', type: eElementType.type_op, value: this.opcodeValue(eOpcode.oc_e) },
      { symbol: '<>', type: eElementType.type_op, value: this.opcodeValue(eOpcode.oc_ne) },
      { symbol: '>=', type: eElementType.type_op, value: this.opcodeValue(eOpcode.oc_gte) },
      { symbol: '+>', type: eElementType.type_op, value: this.opcodeValue(eOpcode.oc_gtu) },
      { symbol: '!!', type: eElementType.type_op, value: this.opcodeValue(eOpcode.oc_lognot) },
      { symbol: '&&', type: eElementType.type_op, value: this.opcodeValue(eOpcode.oc_logand) },
      { symbol: '^^', type: eElementType.type_op, value: this.opcodeValue(eOpcode.oc_logxor) },
      { symbol: '||', type: eElementType.type_op, value: this.opcodeValue(eOpcode.oc_logor) }
    ];

    this.find_symbol_s3 = [
      // find_symbol_s3
      { symbol: '+//', type: eElementType.type_op, value: this.opcodeValue(eOpcode.oc_remu) },
      { symbol: '+<=', type: eElementType.type_op, value: this.opcodeValue(eOpcode.oc_lteu) },
      { symbol: '+>=', type: eElementType.type_op, value: this.opcodeValue(eOpcode.oc_gteu) },
      { symbol: '<=>', type: eElementType.type_op, value: this.opcodeValue(eOpcode.oc_ltegt) },
      { symbol: '<>.', type: eElementType.type_op, value: this.opcodeValue(eOpcode.oc_fne) },
      { symbol: '==.', type: eElementType.type_op, value: this.opcodeValue(eOpcode.oc_fe) },
      { symbol: '<=.', type: eElementType.type_op, value: this.opcodeValue(eOpcode.oc_flte) },
      { symbol: '>=.', type: eElementType.type_op, value: this.opcodeValue(eOpcode.oc_fgte) }
    ];

    // generated opcode table load

    //		oc		op		prec	bytecode	ternary	binary	unary	assign	float	alias	hubcode
    this.opcodeValues.set(eOpcode.oc_bitnot, opcodeValue(eValueType.op_bitnot, 0, eByteCode.bc_bitnot, 0, 0, 1, 1, 0, 0, 0)); //  !
    this.opcodeValues.set(eOpcode.oc_neg, opcodeValue(eValueType.op_neg, 0, eByteCode.bc_neg, 0, 0, 1, 1, 1, 0, 0)); //  -	(uses op_sub symbol)
    this.opcodeValues.set(eOpcode.oc_fneg, opcodeValue(eValueType.op_fneg, 0, eByteCode.bc_fneg, 0, 0, 1, 0, 1, 0, 1)); //  -.	(uses op_fsub symbol)
    this.opcodeValues.set(eOpcode.oc_abs, opcodeValue(eValueType.op_abs, 0, eByteCode.bc_abs, 0, 0, 1, 1, 1, 0, 0)); //  ABS
    this.opcodeValues.set(eOpcode.oc_fabs, opcodeValue(eValueType.op_fabs, 0, eByteCode.bc_fabs, 0, 0, 1, 0, 1, 0, 1)); //  FABS
    this.opcodeValues.set(eOpcode.oc_encod, opcodeValue(eValueType.op_encod, 0, eByteCode.bc_encod, 0, 0, 1, 1, 0, 0, 0)); //  ENCOD
    this.opcodeValues.set(eOpcode.oc_decod, opcodeValue(eValueType.op_decod, 0, eByteCode.bc_decod, 0, 0, 1, 1, 0, 0, 0)); //  DECOD
    this.opcodeValues.set(eOpcode.oc_bmask, opcodeValue(eValueType.op_bmask, 0, eByteCode.bc_bmask, 0, 0, 1, 1, 0, 0, 0)); //  BMASK
    this.opcodeValues.set(eOpcode.oc_ones, opcodeValue(eValueType.op_ones, 0, eByteCode.bc_ones, 0, 0, 1, 1, 0, 0, 0)); //  ONES
    this.opcodeValues.set(eOpcode.oc_sqrt, opcodeValue(eValueType.op_sqrt, 0, eByteCode.bc_sqrt, 0, 0, 1, 1, 0, 0, 0)); //  SQRT
    this.opcodeValues.set(eOpcode.oc_fsqrt, opcodeValue(eValueType.op_fsqrt, 0, eByteCode.bc_fsqrt, 0, 0, 1, 0, 1, 0, 1)); //  FSQRT
    this.opcodeValues.set(eOpcode.oc_qlog, opcodeValue(eValueType.op_qlog, 0, eByteCode.bc_qlog, 0, 0, 1, 1, 0, 0, 0)); //  QLOG
    this.opcodeValues.set(eOpcode.oc_qexp, opcodeValue(eValueType.op_qexp, 0, eByteCode.bc_qexp, 0, 0, 1, 1, 0, 0, 0)); //  QEXP
    this.opcodeValues.set(eOpcode.oc_shr, opcodeValue(eValueType.op_shr, 1, eByteCode.bc_shr, 0, 1, 0, 1, 0, 0, 0)); //  >>
    this.opcodeValues.set(eOpcode.oc_shl, opcodeValue(eValueType.op_shl, 1, eByteCode.bc_shl, 0, 1, 0, 1, 0, 0, 0)); //  <<
    this.opcodeValues.set(eOpcode.oc_sar, opcodeValue(eValueType.op_sar, 1, eByteCode.bc_sar, 0, 1, 0, 1, 0, 0, 0)); //  SAR
    this.opcodeValues.set(eOpcode.oc_ror, opcodeValue(eValueType.op_ror, 1, eByteCode.bc_ror, 0, 1, 0, 1, 0, 0, 0)); //  ROR
    this.opcodeValues.set(eOpcode.oc_rol, opcodeValue(eValueType.op_rol, 1, eByteCode.bc_rol, 0, 1, 0, 1, 0, 0, 0)); //  ROL
    this.opcodeValues.set(eOpcode.oc_rev, opcodeValue(eValueType.op_rev, 1, eByteCode.bc_rev, 0, 1, 0, 1, 0, 0, 0)); //  REV
    this.opcodeValues.set(eOpcode.oc_zerox, opcodeValue(eValueType.op_zerox, 1, eByteCode.bc_zerox, 0, 1, 0, 1, 0, 0, 0)); //  ZEROX
    this.opcodeValues.set(eOpcode.oc_signx, opcodeValue(eValueType.op_signx, 1, eByteCode.bc_signx, 0, 1, 0, 1, 0, 0, 0)); //  SIGNX
    this.opcodeValues.set(eOpcode.oc_bitand, opcodeValue(eValueType.op_bitand, 2, eByteCode.bc_bitand, 0, 1, 0, 1, 0, 0, 0)); //  &
    this.opcodeValues.set(eOpcode.oc_bitxor, opcodeValue(eValueType.op_bitxor, 3, eByteCode.bc_bitxor, 0, 1, 0, 1, 0, 0, 0)); //  ^
    this.opcodeValues.set(eOpcode.oc_bitor, opcodeValue(eValueType.op_bitor, 4, eByteCode.bc_bitor, 0, 1, 0, 1, 0, 0, 0)); //  |
    this.opcodeValues.set(eOpcode.oc_mul, opcodeValue(eValueType.op_mul, 5, eByteCode.bc_mul, 0, 1, 0, 1, 1, 0, 0)); //  *
    this.opcodeValues.set(eOpcode.oc_fmul, opcodeValue(eValueType.op_fmul, 5, eByteCode.bc_fmul, 0, 1, 0, 0, 1, 0, 1)); //  *.
    this.opcodeValues.set(eOpcode.oc_div, opcodeValue(eValueType.op_div, 5, eByteCode.bc_div, 0, 1, 0, 1, 1, 0, 0)); //  /
    this.opcodeValues.set(eOpcode.oc_fdiv, opcodeValue(eValueType.op_fdiv, 5, eByteCode.bc_fdiv, 0, 1, 0, 0, 1, 0, 1)); //  /.
    this.opcodeValues.set(eOpcode.oc_divu, opcodeValue(eValueType.op_divu, 5, eByteCode.bc_divu, 0, 1, 0, 1, 0, 0, 0)); //  +/
    this.opcodeValues.set(eOpcode.oc_rem, opcodeValue(eValueType.op_rem, 5, eByteCode.bc_rem, 0, 1, 0, 1, 0, 0, 0)); //  //
    this.opcodeValues.set(eOpcode.oc_remu, opcodeValue(eValueType.op_remu, 5, eByteCode.bc_remu, 0, 1, 0, 1, 0, 0, 0)); //  +//
    this.opcodeValues.set(eOpcode.oc_sca, opcodeValue(eValueType.op_sca, 5, eByteCode.bc_sca, 0, 1, 0, 1, 0, 0, 0)); //  SCA
    this.opcodeValues.set(eOpcode.oc_scas, opcodeValue(eValueType.op_scas, 5, eByteCode.bc_scas, 0, 1, 0, 1, 0, 0, 0)); //  SCAS
    this.opcodeValues.set(eOpcode.oc_frac, opcodeValue(eValueType.op_frac, 5, eByteCode.bc_frac, 0, 1, 0, 1, 0, 0, 0)); //  FRAC
    this.opcodeValues.set(eOpcode.oc_add, opcodeValue(eValueType.op_add, 6, eByteCode.bc_add, 0, 1, 0, 1, 1, 0, 0)); //  +
    this.opcodeValues.set(eOpcode.oc_fadd, opcodeValue(eValueType.op_fadd, 6, eByteCode.bc_fadd, 0, 1, 0, 0, 1, 0, 1)); //  +.
    this.opcodeValues.set(eOpcode.oc_sub, opcodeValue(eValueType.op_sub, 6, eByteCode.bc_sub, 0, 1, 0, 1, 1, 0, 0)); //  -
    this.opcodeValues.set(eOpcode.oc_fsub, opcodeValue(eValueType.op_fsub, 6, eByteCode.bc_fsub, 0, 1, 0, 0, 1, 0, 1)); //  -.
    this.opcodeValues.set(eOpcode.oc_fge, opcodeValue(eValueType.op_fge, 7, eByteCode.bc_fge, 0, 1, 0, 1, 1, 0, 0)); //  #>
    this.opcodeValues.set(eOpcode.oc_fle, opcodeValue(eValueType.op_fle, 7, eByteCode.bc_fle, 0, 1, 0, 1, 1, 0, 0)); //  <#
    this.opcodeValues.set(eOpcode.oc_addbits, opcodeValue(eValueType.op_addbits, 8, eByteCode.bc_addbits, 0, 1, 0, 1, 0, 0, 0)); //  ADDBITS
    this.opcodeValues.set(eOpcode.oc_addpins, opcodeValue(eValueType.op_addpins, 8, eByteCode.bc_addpins, 0, 1, 0, 1, 0, 0, 0)); //  ADDPINS
    this.opcodeValues.set(eOpcode.oc_lt, opcodeValue(eValueType.op_lt, 9, eByteCode.bc_lt, 0, 1, 0, 0, 1, 0, 0)); //  <
    this.opcodeValues.set(eOpcode.oc_flt, opcodeValue(eValueType.op_flt, 9, eByteCode.bc_flt, 0, 1, 0, 0, 1, 0, 1)); //  <.
    this.opcodeValues.set(eOpcode.oc_ltu, opcodeValue(eValueType.op_ltu, 9, eByteCode.bc_ltu, 0, 1, 0, 0, 0, 0, 0)); //  +<
    this.opcodeValues.set(eOpcode.oc_lte, opcodeValue(eValueType.op_lte, 9, eByteCode.bc_lte, 0, 1, 0, 0, 1, 0, 0)); //  <=
    this.opcodeValues.set(eOpcode.oc_flte, opcodeValue(eValueType.op_flte, 9, eByteCode.bc_flte, 0, 1, 0, 0, 1, 0, 1)); //  <=.
    this.opcodeValues.set(eOpcode.oc_lteu, opcodeValue(eValueType.op_lteu, 9, eByteCode.bc_lteu, 0, 1, 0, 0, 0, 0, 0)); //  +<=
    this.opcodeValues.set(eOpcode.oc_e, opcodeValue(eValueType.op_e, 9, eByteCode.bc_e, 0, 1, 0, 0, 1, 0, 0)); //  ==
    this.opcodeValues.set(eOpcode.oc_fe, opcodeValue(eValueType.op_fe, 9, eByteCode.bc_fe, 0, 1, 0, 0, 1, 0, 1)); //  ==.
    this.opcodeValues.set(eOpcode.oc_ne, opcodeValue(eValueType.op_ne, 9, eByteCode.bc_ne, 0, 1, 0, 0, 1, 0, 0)); //  <>
    this.opcodeValues.set(eOpcode.oc_fne, opcodeValue(eValueType.op_fne, 9, eByteCode.bc_fne, 0, 1, 0, 0, 1, 0, 1)); //  <>.
    this.opcodeValues.set(eOpcode.oc_gte, opcodeValue(eValueType.op_gte, 9, eByteCode.bc_gte, 0, 1, 0, 0, 1, 0, 0)); //  >=
    this.opcodeValues.set(eOpcode.oc_fgte, opcodeValue(eValueType.op_fgte, 9, eByteCode.bc_fgte, 0, 1, 0, 0, 1, 0, 1)); //  >=.
    this.opcodeValues.set(eOpcode.oc_gteu, opcodeValue(eValueType.op_gteu, 9, eByteCode.bc_gteu, 0, 1, 0, 0, 0, 0, 0)); //  +>=
    this.opcodeValues.set(eOpcode.oc_gt, opcodeValue(eValueType.op_gt, 9, eByteCode.bc_gt, 0, 1, 0, 0, 1, 0, 0)); //  >
    this.opcodeValues.set(eOpcode.oc_fgt, opcodeValue(eValueType.op_fgt, 9, eByteCode.bc_fgt, 0, 1, 0, 0, 1, 0, 1)); //  >.
    this.opcodeValues.set(eOpcode.oc_gtu, opcodeValue(eValueType.op_gtu, 9, eByteCode.bc_gtu, 0, 1, 0, 0, 0, 0, 0)); //  +>
    this.opcodeValues.set(eOpcode.oc_ltegt, opcodeValue(eValueType.op_ltegt, 9, eByteCode.bc_ltegt, 0, 1, 0, 0, 1, 0, 0)); //  <=>
    this.opcodeValues.set(eOpcode.oc_lognot, opcodeValue(eValueType.op_lognot, 10, eByteCode.bc_lognot, 0, 0, 1, 1, 0, 1, 0)); //  !!
    this.opcodeValues.set(eOpcode.oc_lognot_name, opcodeValue(eValueType.op_lognot, 10, eByteCode.bc_lognot, 0, 0, 1, 1, 0, 0, 0)); //  NOT
    this.opcodeValues.set(eOpcode.oc_logand, opcodeValue(eValueType.op_logand, 11, eByteCode.bc_logand, 0, 1, 0, 1, 0, 1, 0)); //  &&
    this.opcodeValues.set(eOpcode.oc_logand_name, opcodeValue(eValueType.op_logand, 11, eByteCode.bc_logand, 0, 1, 0, 1, 0, 0, 0)); //  AND
    this.opcodeValues.set(eOpcode.oc_logxor, opcodeValue(eValueType.op_logxor, 12, eByteCode.bc_logxor, 0, 1, 0, 1, 0, 1, 0)); //  ^^
    this.opcodeValues.set(eOpcode.oc_logxor_name, opcodeValue(eValueType.op_logxor, 12, eByteCode.bc_logxor, 0, 1, 0, 1, 0, 0, 0)); //  XOR
    this.opcodeValues.set(eOpcode.oc_logor, opcodeValue(eValueType.op_logor, 13, eByteCode.bc_logor, 0, 1, 0, 1, 0, 1, 0)); //  ||
    this.opcodeValues.set(eOpcode.oc_logor_name, opcodeValue(eValueType.op_logor, 13, eByteCode.bc_logor, 0, 1, 0, 1, 0, 0, 0)); //  OR
    this.opcodeValues.set(eOpcode.oc_ternary, opcodeValue(eValueType.op_ternary, 14, 0, 1, 0, 0, 1, 0, 0, 0)); //  ?
    //
    // generated Assembly codes table load
    //		---------------------------------------------------------------------------------------
    this.asmcodeValues.set(eAsmcode.ac_ror, asmcodeValue(0b000000000, 0b11, eValueType.operand_ds)); // 	ROR	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_rol, asmcodeValue(0b000000100, 0b11, eValueType.operand_ds)); // 	ROL	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_shr, asmcodeValue(0b000001000, 0b11, eValueType.operand_ds)); // 	SHR	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_shl, asmcodeValue(0b000001100, 0b11, eValueType.operand_ds)); // 	SHL	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_rcr, asmcodeValue(0b000010000, 0b11, eValueType.operand_ds)); // 	RCR	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_rcl, asmcodeValue(0b000010100, 0b11, eValueType.operand_ds)); // 	RCL	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_sar, asmcodeValue(0b000011000, 0b11, eValueType.operand_ds)); // 	SAR	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_sal, asmcodeValue(0b000011100, 0b11, eValueType.operand_ds)); // 	SAL	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_add, asmcodeValue(0b000100000, 0b11, eValueType.operand_ds)); // 	ADD	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_addx, asmcodeValue(0b000100100, 0b11, eValueType.operand_ds)); // 	ADDX	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_adds, asmcodeValue(0b000101000, 0b11, eValueType.operand_ds)); // 	ADDS	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_addsx, asmcodeValue(0b000101100, 0b11, eValueType.operand_ds)); // 	ADDSX	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_sub, asmcodeValue(0b000110000, 0b11, eValueType.operand_ds)); // 	SUB	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_subx, asmcodeValue(0b000110100, 0b11, eValueType.operand_ds)); // 	SUBX	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_subs, asmcodeValue(0b000111000, 0b11, eValueType.operand_ds)); // 	SUBS	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_subsx, asmcodeValue(0b000111100, 0b11, eValueType.operand_ds)); // 	SUBSX	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_cmp, asmcodeValue(0b001000000, 0b11, eValueType.operand_ds)); // 	CMP	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_cmpx, asmcodeValue(0b001000100, 0b11, eValueType.operand_ds)); // 	CMPX	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_cmps, asmcodeValue(0b001001000, 0b11, eValueType.operand_ds)); // 	CMPS	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_cmpsx, asmcodeValue(0b001001100, 0b11, eValueType.operand_ds)); // 	CMPSX	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_cmpr, asmcodeValue(0b001010000, 0b11, eValueType.operand_ds)); // 	CMPR	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_cmpm, asmcodeValue(0b001010100, 0b11, eValueType.operand_ds)); // 	CMPM	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_subr, asmcodeValue(0b001011000, 0b11, eValueType.operand_ds)); // 	SUBR	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_cmpsub, asmcodeValue(0b001011100, 0b11, eValueType.operand_ds)); // 	CMPSUB	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_fge, asmcodeValue(0b001100000, 0b11, eValueType.operand_ds)); // 	FGE	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_fle, asmcodeValue(0b001100100, 0b11, eValueType.operand_ds)); // 	FLE	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_fges, asmcodeValue(0b001101000, 0b11, eValueType.operand_ds)); // 	FGES	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_fles, asmcodeValue(0b001101100, 0b11, eValueType.operand_ds)); // 	FLES	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_sumc, asmcodeValue(0b001110000, 0b11, eValueType.operand_ds)); // 	SUMC	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_sumnc, asmcodeValue(0b001110100, 0b11, eValueType.operand_ds)); // 	SUMNC	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_sumz, asmcodeValue(0b001111000, 0b11, eValueType.operand_ds)); // 	SUMZ	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_sumnz, asmcodeValue(0b001111100, 0b11, eValueType.operand_ds)); // 	SUMNZ	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_bitl, asmcodeValue(0b010000000, 0b00, eValueType.operand_bitx)); // 	BITL	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_bith, asmcodeValue(0b010000100, 0b00, eValueType.operand_bitx)); // 	BITH	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_bitc, asmcodeValue(0b010001000, 0b00, eValueType.operand_bitx)); // 	BITC	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_bitnc, asmcodeValue(0b010001100, 0b00, eValueType.operand_bitx)); // 	BITNC	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_bitz, asmcodeValue(0b010010000, 0b00, eValueType.operand_bitx)); // 	BITZ	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_bitnz, asmcodeValue(0b010010100, 0b00, eValueType.operand_bitx)); // 	BITNZ	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_bitrnd, asmcodeValue(0b010011000, 0b00, eValueType.operand_bitx)); // 	BITRND	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_bitnot, asmcodeValue(0b010011100, 0b00, eValueType.operand_bitx)); // 	BITNOT	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_testb, asmcodeValue(0b010000000, 0b00, eValueType.operand_testb)); // 	TESTB	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_testbn, asmcodeValue(0b010000100, 0b00, eValueType.operand_testb)); // 	TESTBN	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_and, asmcodeValue(0b010100000, 0b11, eValueType.operand_ds)); // 	AND	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_andn, asmcodeValue(0b010100100, 0b11, eValueType.operand_ds)); // 	ANDN	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_or, asmcodeValue(0b010101000, 0b11, eValueType.operand_ds)); // 	OR	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_xor, asmcodeValue(0b010101100, 0b11, eValueType.operand_ds)); // 	XOR	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_muxc, asmcodeValue(0b010110000, 0b11, eValueType.operand_ds)); // 	MUXC	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_muxnc, asmcodeValue(0b010110100, 0b11, eValueType.operand_ds)); // 	MUXNC	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_muxz, asmcodeValue(0b010111000, 0b11, eValueType.operand_ds)); // 	MUXZ	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_muxnz, asmcodeValue(0b010111100, 0b11, eValueType.operand_ds)); // 	MUXNZ	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_mov, asmcodeValue(0b011000000, 0b11, eValueType.operand_ds)); // 	MOV	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_not, asmcodeValue(0b011000100, 0b11, eValueType.operand_du)); // 	NOT	D{,S/#}
    this.asmcodeValues.set(eAsmcode.ac_abs, asmcodeValue(0b011001000, 0b11, eValueType.operand_du)); // 	ABS	D{,S/#}
    this.asmcodeValues.set(eAsmcode.ac_neg, asmcodeValue(0b011001100, 0b11, eValueType.operand_du)); // 	NEG	D{,S/#}
    this.asmcodeValues.set(eAsmcode.ac_negc, asmcodeValue(0b011010000, 0b11, eValueType.operand_du)); // 	NEGC	D{,S/#}
    this.asmcodeValues.set(eAsmcode.ac_negnc, asmcodeValue(0b011010100, 0b11, eValueType.operand_du)); // 	NEGNC	D{,S/#}
    this.asmcodeValues.set(eAsmcode.ac_negz, asmcodeValue(0b011011000, 0b11, eValueType.operand_du)); // 	NEGZ	D{,S/#}
    this.asmcodeValues.set(eAsmcode.ac_negnz, asmcodeValue(0b011011100, 0b11, eValueType.operand_du)); // 	NEGNZ	D{,S/#}
    this.asmcodeValues.set(eAsmcode.ac_incmod, asmcodeValue(0b011100000, 0b11, eValueType.operand_ds)); // 	INCMOD	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_decmod, asmcodeValue(0b011100100, 0b11, eValueType.operand_ds)); // 	DECMOD	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_zerox, asmcodeValue(0b011101000, 0b11, eValueType.operand_ds)); // 	ZEROX	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_signx, asmcodeValue(0b011101100, 0b11, eValueType.operand_ds)); // 	SIGNX	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_encod, asmcodeValue(0b011110000, 0b11, eValueType.operand_du)); // 	ENCOD	D{,S/#}
    this.asmcodeValues.set(eAsmcode.ac_ones, asmcodeValue(0b011110100, 0b11, eValueType.operand_du)); // 	ONES	D{,S/#}
    this.asmcodeValues.set(eAsmcode.ac_test, asmcodeValue(0b011111000, 0b11, eValueType.operand_du)); // 	TEST	D,{S/#}
    this.asmcodeValues.set(eAsmcode.ac_testn, asmcodeValue(0b011111100, 0b11, eValueType.operand_ds)); // 	TESTN	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_setnib, asmcodeValue(0b100000000, 0b00, eValueType.operand_ds3set)); // 	SETNIB	{D,}S/#{,#0..7}
    this.asmcodeValues.set(eAsmcode.ac_getnib, asmcodeValue(0b100001000, 0b00, eValueType.operand_ds3get)); // 	GETNIB	D{,S/#,#0..7}
    this.asmcodeValues.set(eAsmcode.ac_rolnib, asmcodeValue(0b100010000, 0b00, eValueType.operand_ds3get)); // 	ROLNIB	D{,S/#,#0..7}
    this.asmcodeValues.set(eAsmcode.ac_setbyte, asmcodeValue(0b100011000, 0b00, eValueType.operand_ds2set)); // 	SETBYTE	{D,}S/#{,#0..3}
    this.asmcodeValues.set(eAsmcode.ac_getbyte, asmcodeValue(0b100011100, 0b00, eValueType.operand_ds2get)); // 	GETBYTE	D{,S/#,#0..3}
    this.asmcodeValues.set(eAsmcode.ac_rolbyte, asmcodeValue(0b100100000, 0b00, eValueType.operand_ds2get)); // 	ROLBYTE	D{,S/#,#0..3}
    this.asmcodeValues.set(eAsmcode.ac_setword, asmcodeValue(0b100100100, 0b00, eValueType.operand_ds1set)); // 	SETWORD	{D,}S/#{,#0..1}
    this.asmcodeValues.set(eAsmcode.ac_getword, asmcodeValue(0b100100110, 0b00, eValueType.operand_ds1get)); // 	GETWORD	D{,S/#,#0..1}
    this.asmcodeValues.set(eAsmcode.ac_rolword, asmcodeValue(0b100101000, 0b00, eValueType.operand_ds1get)); // 	ROLWORD	D{,S/#,#0..1}
    this.asmcodeValues.set(eAsmcode.ac_altsn, asmcodeValue(0b100101010, 0b00, eValueType.operand_duiz)); // 	ALTSN	D{,S/#}
    this.asmcodeValues.set(eAsmcode.ac_altgn, asmcodeValue(0b100101011, 0b00, eValueType.operand_duiz)); // 	ALTGN	D{,S/#}
    this.asmcodeValues.set(eAsmcode.ac_altsb, asmcodeValue(0b100101100, 0b00, eValueType.operand_duiz)); // 	ALTSB	D{,S/#}
    this.asmcodeValues.set(eAsmcode.ac_altgb, asmcodeValue(0b100101101, 0b00, eValueType.operand_duiz)); // 	ALTGB	D{,S/#}
    this.asmcodeValues.set(eAsmcode.ac_altsw, asmcodeValue(0b100101110, 0b00, eValueType.operand_duiz)); // 	ALTSW	D{,S/#}
    this.asmcodeValues.set(eAsmcode.ac_altgw, asmcodeValue(0b100101111, 0b00, eValueType.operand_duiz)); // 	ALTGW	D{,S/#}
    this.asmcodeValues.set(eAsmcode.ac_altr, asmcodeValue(0b100110000, 0b00, eValueType.operand_duiz)); // 	ALTR	D{,S/#}
    this.asmcodeValues.set(eAsmcode.ac_altd, asmcodeValue(0b100110001, 0b00, eValueType.operand_duiz)); // 	ALTD	D{,S/#}
    this.asmcodeValues.set(eAsmcode.ac_alts, asmcodeValue(0b100110010, 0b00, eValueType.operand_duiz)); // 	ALTS	D{,S/#}
    this.asmcodeValues.set(eAsmcode.ac_altb, asmcodeValue(0b100110011, 0b00, eValueType.operand_duiz)); // 	ALTB	D{,S/#}
    this.asmcodeValues.set(eAsmcode.ac_alti, asmcodeValue(0b100110100, 0b00, eValueType.operand_duii)); // 	ALTI	D{,S/#}
    this.asmcodeValues.set(eAsmcode.ac_setr, asmcodeValue(0b100110101, 0b00, eValueType.operand_ds)); // 	SETR	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_setd, asmcodeValue(0b100110110, 0b00, eValueType.operand_ds)); // 	SETD	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_sets, asmcodeValue(0b100110111, 0b00, eValueType.operand_ds)); // 	SETS	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_decod, asmcodeValue(0b100111000, 0b00, eValueType.operand_du)); // 	DECOD	D{,S/#}
    this.asmcodeValues.set(eAsmcode.ac_bmask, asmcodeValue(0b100111001, 0b00, eValueType.operand_du)); // 	BMASK	D{,S/#}
    this.asmcodeValues.set(eAsmcode.ac_crcbit, asmcodeValue(0b100111010, 0b00, eValueType.operand_ds)); // 	CRCBIT	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_crcnib, asmcodeValue(0b100111011, 0b00, eValueType.operand_ds)); // 	CRCNIB	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_muxnits, asmcodeValue(0b100111100, 0b00, eValueType.operand_ds)); // 	MUXNITS	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_muxnibs, asmcodeValue(0b100111101, 0b00, eValueType.operand_ds)); // 	MUXNIBS	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_muxq, asmcodeValue(0b100111110, 0b00, eValueType.operand_ds)); // 	MUXQ	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_movbyts, asmcodeValue(0b100111111, 0b00, eValueType.operand_ds)); // 	MOVBYTS	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_mul, asmcodeValue(0b101000000, 0b01, eValueType.operand_ds)); // 	MUL	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_muls, asmcodeValue(0b101000010, 0b01, eValueType.operand_ds)); // 	MULS	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_sca, asmcodeValue(0b101000100, 0b01, eValueType.operand_ds)); // 	SCA	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_scas, asmcodeValue(0b101000110, 0b01, eValueType.operand_ds)); // 	SCAS	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_addpix, asmcodeValue(0b101001000, 0b00, eValueType.operand_ds)); // 	ADDPIX	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_mulpix, asmcodeValue(0b101001001, 0b00, eValueType.operand_ds)); // 	MULPIX	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_blnpix, asmcodeValue(0b101001010, 0b00, eValueType.operand_ds)); // 	BLNPIX	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_mixpix, asmcodeValue(0b101001011, 0b00, eValueType.operand_ds)); // 	MIXPIX	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_addct1, asmcodeValue(0b101001100, 0b00, eValueType.operand_ds)); // 	ADDCT1	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_addct2, asmcodeValue(0b101001101, 0b00, eValueType.operand_ds)); // 	ADDCT2	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_addct3, asmcodeValue(0b101001110, 0b00, eValueType.operand_ds)); // 	ADDCT3	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_wmlong, asmcodeValue(0b101001111, 0b00, eValueType.operand_dsp)); // 	WMLONG_	D,S/#/PTRx
    this.asmcodeValues.set(eAsmcode.ac_rqpin, asmcodeValue(0b101010000, 0b10, eValueType.operand_ds)); // 	RQPIN	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_rdpin, asmcodeValue(0b101010001, 0b10, eValueType.operand_ds)); // 	RDPIN	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_rdlut, asmcodeValue(0b101010100, 0b11, eValueType.operand_dsp)); // 	RDLUT	D,S/#/PTRx
    this.asmcodeValues.set(eAsmcode.ac_rdbyte, asmcodeValue(0b101011000, 0b11, eValueType.operand_dsp)); // 	RDBYTE	D,S/#/PTRx
    this.asmcodeValues.set(eAsmcode.ac_rdword, asmcodeValue(0b101011100, 0b11, eValueType.operand_dsp)); // 	RDWORD	D,S/#/PTRx
    this.asmcodeValues.set(eAsmcode.ac_rdlong, asmcodeValue(0b101100000, 0b11, eValueType.operand_dsp)); // 	RDLONG	D,S/#/PTRx
    this.asmcodeValues.set(eAsmcode.ac_callpa, asmcodeValue(0b101101000, 0b00, eValueType.operand_lsj)); // 	CALLPA	D/#,S/#
    this.asmcodeValues.set(eAsmcode.ac_callpb, asmcodeValue(0b101101010, 0b00, eValueType.operand_lsj)); // 	CALLPB	D/#,S/#
    this.asmcodeValues.set(eAsmcode.ac_djz, asmcodeValue(0b101101100, 0b00, eValueType.operand_dsj)); // 	DJZ	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_djnz, asmcodeValue(0b101101101, 0b00, eValueType.operand_dsj)); // 	DJNZ	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_djf, asmcodeValue(0b101101110, 0b00, eValueType.operand_dsj)); // 	DJF	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_djnf, asmcodeValue(0b101101111, 0b00, eValueType.operand_dsj)); // 	DJNF	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_ijz, asmcodeValue(0b101110000, 0b00, eValueType.operand_dsj)); // 	IJZ	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_ijnz, asmcodeValue(0b101110001, 0b00, eValueType.operand_dsj)); // 	IJNZ	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_tjz, asmcodeValue(0b101110010, 0b00, eValueType.operand_dsj)); // 	TJZ	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_tjnz, asmcodeValue(0b101110011, 0b00, eValueType.operand_dsj)); // 	TJNZ	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_tjf, asmcodeValue(0b101110100, 0b00, eValueType.operand_dsj)); // 	TJF	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_tjnf, asmcodeValue(0b101110101, 0b00, eValueType.operand_dsj)); // 	TJNF	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_tjs, asmcodeValue(0b101110110, 0b00, eValueType.operand_dsj)); // 	TJS	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_tjns, asmcodeValue(0b101110111, 0b00, eValueType.operand_dsj)); // 	TJNS	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_tjv, asmcodeValue(0b101111000, 0b00, eValueType.operand_dsj)); // 	TJV	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_jint, asmcodeValue(0b000000000, 0b00, eValueType.operand_jpoll)); // 	JINT	S/#
    this.asmcodeValues.set(eAsmcode.ac_jct1, asmcodeValue(0b000000001, 0b00, eValueType.operand_jpoll)); // 	JCT1	S/#
    this.asmcodeValues.set(eAsmcode.ac_jct2, asmcodeValue(0b000000010, 0b00, eValueType.operand_jpoll)); // 	JCT2	S/#
    this.asmcodeValues.set(eAsmcode.ac_jct3, asmcodeValue(0b000000011, 0b00, eValueType.operand_jpoll)); // 	JCT3	S/#
    this.asmcodeValues.set(eAsmcode.ac_jse1, asmcodeValue(0b000000100, 0b00, eValueType.operand_jpoll)); // 	JSE1	S/#
    this.asmcodeValues.set(eAsmcode.ac_jse2, asmcodeValue(0b000000101, 0b00, eValueType.operand_jpoll)); // 	JSE2	S/#
    this.asmcodeValues.set(eAsmcode.ac_jse3, asmcodeValue(0b000000110, 0b00, eValueType.operand_jpoll)); // 	JSE3	S/#
    this.asmcodeValues.set(eAsmcode.ac_jse4, asmcodeValue(0b000000111, 0b00, eValueType.operand_jpoll)); // 	JSE4	S/#
    this.asmcodeValues.set(eAsmcode.ac_jpat, asmcodeValue(0b000001000, 0b00, eValueType.operand_jpoll)); // 	JPAT	S/#
    this.asmcodeValues.set(eAsmcode.ac_jfbw, asmcodeValue(0b000001001, 0b00, eValueType.operand_jpoll)); // 	JFBW	S/#
    this.asmcodeValues.set(eAsmcode.ac_jxmt, asmcodeValue(0b000001010, 0b00, eValueType.operand_jpoll)); // 	JXMT	S/#
    this.asmcodeValues.set(eAsmcode.ac_jxfi, asmcodeValue(0b000001011, 0b00, eValueType.operand_jpoll)); // 	JXFI	S/#
    this.asmcodeValues.set(eAsmcode.ac_jxro, asmcodeValue(0b000001100, 0b00, eValueType.operand_jpoll)); // 	JXRO	S/#
    this.asmcodeValues.set(eAsmcode.ac_jxrl, asmcodeValue(0b000001101, 0b00, eValueType.operand_jpoll)); // 	JXRL	S/#
    this.asmcodeValues.set(eAsmcode.ac_jatn, asmcodeValue(0b000001110, 0b00, eValueType.operand_jpoll)); // 	JATN	S/#
    this.asmcodeValues.set(eAsmcode.ac_jqmt, asmcodeValue(0b000001111, 0b00, eValueType.operand_jpoll)); // 	JQMT	S/#
    this.asmcodeValues.set(eAsmcode.ac_jnint, asmcodeValue(0b000010000, 0b00, eValueType.operand_jpoll)); // 	JNINT	S/#
    this.asmcodeValues.set(eAsmcode.ac_jnct1, asmcodeValue(0b000010001, 0b00, eValueType.operand_jpoll)); // 	JNCT1	S/#
    this.asmcodeValues.set(eAsmcode.ac_jnct2, asmcodeValue(0b000010010, 0b00, eValueType.operand_jpoll)); // 	JNCT2	S/#
    this.asmcodeValues.set(eAsmcode.ac_jnct3, asmcodeValue(0b000010011, 0b00, eValueType.operand_jpoll)); // 	JNCT3	S/#
    this.asmcodeValues.set(eAsmcode.ac_jnse1, asmcodeValue(0b000010100, 0b00, eValueType.operand_jpoll)); // 	JNSE1	S/#
    this.asmcodeValues.set(eAsmcode.ac_jnse2, asmcodeValue(0b000010101, 0b00, eValueType.operand_jpoll)); // 	JNSE2	S/#
    this.asmcodeValues.set(eAsmcode.ac_jnse3, asmcodeValue(0b000010110, 0b00, eValueType.operand_jpoll)); // 	JNSE3	S/#
    this.asmcodeValues.set(eAsmcode.ac_jnse4, asmcodeValue(0b000010111, 0b00, eValueType.operand_jpoll)); // 	JNSE4	S/#
    this.asmcodeValues.set(eAsmcode.ac_jnpat, asmcodeValue(0b000011000, 0b00, eValueType.operand_jpoll)); // 	JNPAT	S/#
    this.asmcodeValues.set(eAsmcode.ac_jnfbw, asmcodeValue(0b000011001, 0b00, eValueType.operand_jpoll)); // 	JNFBW	S/#
    this.asmcodeValues.set(eAsmcode.ac_jnxmt, asmcodeValue(0b000011010, 0b00, eValueType.operand_jpoll)); // 	JNXMT	S/#
    this.asmcodeValues.set(eAsmcode.ac_jnxfi, asmcodeValue(0b000011011, 0b00, eValueType.operand_jpoll)); // 	JNXFI	S/#
    this.asmcodeValues.set(eAsmcode.ac_jnxro, asmcodeValue(0b000011100, 0b00, eValueType.operand_jpoll)); // 	JNXRO	S/#
    this.asmcodeValues.set(eAsmcode.ac_jnxrl, asmcodeValue(0b000011101, 0b00, eValueType.operand_jpoll)); // 	JNXRL	S/#
    this.asmcodeValues.set(eAsmcode.ac_jnatn, asmcodeValue(0b000011110, 0b00, eValueType.operand_jpoll)); // 	JNATN	S/#
    this.asmcodeValues.set(eAsmcode.ac_jnqmt, asmcodeValue(0b000011111, 0b00, eValueType.operand_jpoll)); // 	JNQMT	S/#
    this.asmcodeValues.set(eAsmcode.ac_setpat, asmcodeValue(0b101111110, 0b00, eValueType.operand_ls)); // 	SETPAT	D/#,S/#
    this.asmcodeValues.set(eAsmcode.ac_wrpin, asmcodeValue(0b110000000, 0b00, eValueType.operand_ls)); // 	WRPIN	D/#,S/#
    this.asmcodeValues.set(eAsmcode.ac_wxpin, asmcodeValue(0b110000010, 0b00, eValueType.operand_ls)); // 	WXPIN	D/#,S/#
    this.asmcodeValues.set(eAsmcode.ac_wypin, asmcodeValue(0b110000100, 0b00, eValueType.operand_ls)); // 	WYPIN	D/#,S/#
    this.asmcodeValues.set(eAsmcode.ac_wrlut, asmcodeValue(0b110000110, 0b00, eValueType.operand_lsp)); // 	WRLUT	D/#,S/#/PTRx
    this.asmcodeValues.set(eAsmcode.ac_wrbyte, asmcodeValue(0b110001000, 0b00, eValueType.operand_lsp)); // 	WRBYTE	D/#,S/#/PTRx
    this.asmcodeValues.set(eAsmcode.ac_wrword, asmcodeValue(0b110001010, 0b00, eValueType.operand_lsp)); // 	WRWORD	D/#,S/#/PTRx
    this.asmcodeValues.set(eAsmcode.ac_wrlong, asmcodeValue(0b110001100, 0b00, eValueType.operand_lsp)); // 	WRLONG	D/#,S/#/PTRx
    this.asmcodeValues.set(eAsmcode.ac_rdfast, asmcodeValue(0b110001110, 0b00, eValueType.operand_ls)); // 	RDFAST	D/#,S/#
    this.asmcodeValues.set(eAsmcode.ac_wrfast, asmcodeValue(0b110010000, 0b00, eValueType.operand_ls)); // 	WRFAST	D/#,S/#
    this.asmcodeValues.set(eAsmcode.ac_fblock, asmcodeValue(0b110010010, 0b00, eValueType.operand_ls)); // 	FBLOCK	D/#,S/#
    this.asmcodeValues.set(eAsmcode.ac_xinit, asmcodeValue(0b110010100, 0b00, eValueType.operand_ls)); // 	XINIT	D/#,S/#
    this.asmcodeValues.set(eAsmcode.ac_xzero, asmcodeValue(0b110010110, 0b00, eValueType.operand_ls)); // 	XZERO	D/#,S/#
    this.asmcodeValues.set(eAsmcode.ac_xcont, asmcodeValue(0b110011000, 0b00, eValueType.operand_ls)); // 	XCONT	D/#,S/#
    this.asmcodeValues.set(eAsmcode.ac_rep, asmcodeValue(0b110011010, 0b00, eValueType.operand_rep)); // 	REP	D/#/@,S/#
    this.asmcodeValues.set(eAsmcode.ac_coginit, asmcodeValue(0b110011100, 0b10, eValueType.operand_ls)); // 	COGINIT	D/#,S/#
    this.asmcodeValues.set(eAsmcode.ac_qmul, asmcodeValue(0b110100000, 0b00, eValueType.operand_ls)); // 	QMUL	D/#,S/#
    this.asmcodeValues.set(eAsmcode.ac_qdiv, asmcodeValue(0b110100010, 0b00, eValueType.operand_ls)); // 	QDIV	D/#,S/#
    this.asmcodeValues.set(eAsmcode.ac_qfrac, asmcodeValue(0b110100100, 0b00, eValueType.operand_ls)); // 	QFRAC	D/#,S/#
    this.asmcodeValues.set(eAsmcode.ac_qsqrt, asmcodeValue(0b110100110, 0b00, eValueType.operand_ls)); // 	QSQRT	D/#,S/#
    this.asmcodeValues.set(eAsmcode.ac_qrotate, asmcodeValue(0b110101000, 0b00, eValueType.operand_ls)); // 	QROTATE	D/#,S/#
    this.asmcodeValues.set(eAsmcode.ac_qvector, asmcodeValue(0b110101010, 0b00, eValueType.operand_ls)); // 	QVECTOR	D/#,S/#
    this.asmcodeValues.set(eAsmcode.ac_hubset, asmcodeValue(0b000000000, 0b00, eValueType.operand_l)); // 	HUBSET	D/#
    this.asmcodeValues.set(eAsmcode.ac_cogid, asmcodeValue(0b000000001, 0b10, eValueType.operand_l)); // 	COGID	D/#
    this.asmcodeValues.set(eAsmcode.ac_cogstop, asmcodeValue(0b000000011, 0b00, eValueType.operand_l)); // 	COGSTOP	D/#
    this.asmcodeValues.set(eAsmcode.ac_locknew, asmcodeValue(0b000000100, 0b10, eValueType.operand_d)); // 	LOCKNEW	D
    this.asmcodeValues.set(eAsmcode.ac_lockret, asmcodeValue(0b000000101, 0b00, eValueType.operand_l)); // 	LOCKRET	D/#
    this.asmcodeValues.set(eAsmcode.ac_locktry, asmcodeValue(0b000000110, 0b10, eValueType.operand_l)); // 	LOCKTRY	D/#
    this.asmcodeValues.set(eAsmcode.ac_lockrel, asmcodeValue(0b000000111, 0b10, eValueType.operand_l)); // 	LOCKREL	D/#
    this.asmcodeValues.set(eAsmcode.ac_qlog, asmcodeValue(0b000001110, 0b00, eValueType.operand_l)); // 	QLOG	D/#
    this.asmcodeValues.set(eAsmcode.ac_qexp, asmcodeValue(0b000001111, 0b00, eValueType.operand_l)); // 	QEXP	D/#
    this.asmcodeValues.set(eAsmcode.ac_rfbyte, asmcodeValue(0b000010000, 0b11, eValueType.operand_d)); // 	RFBYTE	D
    this.asmcodeValues.set(eAsmcode.ac_rfword, asmcodeValue(0b000010001, 0b11, eValueType.operand_d)); // 	RFWORD	D
    this.asmcodeValues.set(eAsmcode.ac_rflong, asmcodeValue(0b000010010, 0b11, eValueType.operand_d)); // 	RFLONG	D
    this.asmcodeValues.set(eAsmcode.ac_rfvar, asmcodeValue(0b000010011, 0b11, eValueType.operand_d)); // 	RFVAR	D
    this.asmcodeValues.set(eAsmcode.ac_rfvars, asmcodeValue(0b000010100, 0b11, eValueType.operand_d)); // 	RFVARS	D
    this.asmcodeValues.set(eAsmcode.ac_wfbyte, asmcodeValue(0b000010101, 0b00, eValueType.operand_l)); // 	WFBYTE	D/#
    this.asmcodeValues.set(eAsmcode.ac_wfword, asmcodeValue(0b000010110, 0b00, eValueType.operand_l)); // 	WFWORD	D/#
    this.asmcodeValues.set(eAsmcode.ac_wflong, asmcodeValue(0b000010111, 0b00, eValueType.operand_l)); // 	WFLONG	D/#
    this.asmcodeValues.set(eAsmcode.ac_getqx, asmcodeValue(0b000011000, 0b11, eValueType.operand_d)); // 	GETQX	D
    this.asmcodeValues.set(eAsmcode.ac_getqy, asmcodeValue(0b000011001, 0b11, eValueType.operand_d)); // 	GETQY	D
    this.asmcodeValues.set(eAsmcode.ac_getct, asmcodeValue(0b000011010, 0b10, eValueType.operand_d)); // 	GETCT	D
    this.asmcodeValues.set(eAsmcode.ac_getrnd, asmcodeValue(0b000011011, 0b11, eValueType.operand_de)); // 	GETRND	D
    this.asmcodeValues.set(eAsmcode.ac_setdacs, asmcodeValue(0b000011100, 0b00, eValueType.operand_l)); // 	SETDACS	D/#
    this.asmcodeValues.set(eAsmcode.ac_setxfrq, asmcodeValue(0b000011101, 0b00, eValueType.operand_l)); // 	SETXFRQ	D/#
    this.asmcodeValues.set(eAsmcode.ac_getxacc, asmcodeValue(0b000011110, 0b00, eValueType.operand_d)); // 	GETXACC	D
    this.asmcodeValues.set(eAsmcode.ac_waitx, asmcodeValue(0b000011111, 0b11, eValueType.operand_l)); // 	WAITX	D/#
    this.asmcodeValues.set(eAsmcode.ac_setse1, asmcodeValue(0b000100000, 0b00, eValueType.operand_l)); // 	SETSE1	D/#
    this.asmcodeValues.set(eAsmcode.ac_setse2, asmcodeValue(0b000100001, 0b00, eValueType.operand_l)); // 	SETSE2	D/#
    this.asmcodeValues.set(eAsmcode.ac_setse3, asmcodeValue(0b000100010, 0b00, eValueType.operand_l)); // 	SETSE3	D/#
    this.asmcodeValues.set(eAsmcode.ac_setse4, asmcodeValue(0b000100011, 0b00, eValueType.operand_l)); // 	SETSE4	D/#
    this.asmcodeValues.set(eAsmcode.ac_pollint, asmcodeValue(0b000000000, 0b11, eValueType.operand_pollwait)); // 	POLLINT
    this.asmcodeValues.set(eAsmcode.ac_pollct1, asmcodeValue(0b000000001, 0b11, eValueType.operand_pollwait)); // 	POLLCT1
    this.asmcodeValues.set(eAsmcode.ac_pollct2, asmcodeValue(0b000000010, 0b11, eValueType.operand_pollwait)); // 	POLLCT2
    this.asmcodeValues.set(eAsmcode.ac_pollct3, asmcodeValue(0b000000011, 0b11, eValueType.operand_pollwait)); // 	POLLCT3
    this.asmcodeValues.set(eAsmcode.ac_pollse1, asmcodeValue(0b000000100, 0b11, eValueType.operand_pollwait)); // 	POLLSE1
    this.asmcodeValues.set(eAsmcode.ac_pollse2, asmcodeValue(0b000000101, 0b11, eValueType.operand_pollwait)); // 	POLLSE2
    this.asmcodeValues.set(eAsmcode.ac_pollse3, asmcodeValue(0b000000110, 0b11, eValueType.operand_pollwait)); // 	POLLSE3
    this.asmcodeValues.set(eAsmcode.ac_pollse4, asmcodeValue(0b000000111, 0b11, eValueType.operand_pollwait)); // 	POLLSE4
    this.asmcodeValues.set(eAsmcode.ac_pollpat, asmcodeValue(0b000001000, 0b11, eValueType.operand_pollwait)); // 	POLLPAT
    this.asmcodeValues.set(eAsmcode.ac_pollfbw, asmcodeValue(0b000001001, 0b11, eValueType.operand_pollwait)); // 	POLLFBW
    this.asmcodeValues.set(eAsmcode.ac_pollxmt, asmcodeValue(0b000001010, 0b11, eValueType.operand_pollwait)); // 	POLLXMT
    this.asmcodeValues.set(eAsmcode.ac_pollxfi, asmcodeValue(0b000001011, 0b11, eValueType.operand_pollwait)); // 	POLLXFI
    this.asmcodeValues.set(eAsmcode.ac_pollxro, asmcodeValue(0b000001100, 0b11, eValueType.operand_pollwait)); // 	POLLXRO
    this.asmcodeValues.set(eAsmcode.ac_pollxrl, asmcodeValue(0b000001101, 0b11, eValueType.operand_pollwait)); // 	POLLXRL
    this.asmcodeValues.set(eAsmcode.ac_pollatn, asmcodeValue(0b000001110, 0b11, eValueType.operand_pollwait)); // 	POLLATN
    this.asmcodeValues.set(eAsmcode.ac_pollqmt, asmcodeValue(0b000001111, 0b11, eValueType.operand_pollwait)); // 	POLLQMT
    this.asmcodeValues.set(eAsmcode.ac_waitint, asmcodeValue(0b000010000, 0b11, eValueType.operand_pollwait)); // 	WAITINT
    this.asmcodeValues.set(eAsmcode.ac_waitct1, asmcodeValue(0b000010001, 0b11, eValueType.operand_pollwait)); // 	WAITCT1
    this.asmcodeValues.set(eAsmcode.ac_waitct2, asmcodeValue(0b000010010, 0b11, eValueType.operand_pollwait)); // 	WAITCT2
    this.asmcodeValues.set(eAsmcode.ac_waitct3, asmcodeValue(0b000010011, 0b11, eValueType.operand_pollwait)); // 	WAITCT3
    this.asmcodeValues.set(eAsmcode.ac_waitse1, asmcodeValue(0b000010100, 0b11, eValueType.operand_pollwait)); // 	WAITSE1
    this.asmcodeValues.set(eAsmcode.ac_waitse2, asmcodeValue(0b000010101, 0b11, eValueType.operand_pollwait)); // 	WAITSE2
    this.asmcodeValues.set(eAsmcode.ac_waitse3, asmcodeValue(0b000010110, 0b11, eValueType.operand_pollwait)); // 	WAITSE3
    this.asmcodeValues.set(eAsmcode.ac_waitse4, asmcodeValue(0b000010111, 0b11, eValueType.operand_pollwait)); // 	WAITSE4
    this.asmcodeValues.set(eAsmcode.ac_waitpat, asmcodeValue(0b000011000, 0b11, eValueType.operand_pollwait)); // 	WAITPAT
    this.asmcodeValues.set(eAsmcode.ac_waitfbw, asmcodeValue(0b000011001, 0b11, eValueType.operand_pollwait)); // 	WAITFBW
    this.asmcodeValues.set(eAsmcode.ac_waitxmt, asmcodeValue(0b000011010, 0b11, eValueType.operand_pollwait)); // 	WAITXMT
    this.asmcodeValues.set(eAsmcode.ac_waitxfi, asmcodeValue(0b000011011, 0b11, eValueType.operand_pollwait)); // 	WAITXFI
    this.asmcodeValues.set(eAsmcode.ac_waitxro, asmcodeValue(0b000011100, 0b11, eValueType.operand_pollwait)); // 	WAITXRO
    this.asmcodeValues.set(eAsmcode.ac_waitxrl, asmcodeValue(0b000011101, 0b11, eValueType.operand_pollwait)); // 	WAITXRL
    this.asmcodeValues.set(eAsmcode.ac_waitatn, asmcodeValue(0b000011110, 0b11, eValueType.operand_pollwait)); // 	WAITATN
    this.asmcodeValues.set(eAsmcode.ac_allowi, asmcodeValue(0b000100000, 0b00, eValueType.operand_pollwait)); // 	ALLOWI
    this.asmcodeValues.set(eAsmcode.ac_stalli, asmcodeValue(0b000100001, 0b00, eValueType.operand_pollwait)); // 	STALLI
    this.asmcodeValues.set(eAsmcode.ac_trgint1, asmcodeValue(0b000100010, 0b00, eValueType.operand_pollwait)); // 	TRGINT1
    this.asmcodeValues.set(eAsmcode.ac_trgint2, asmcodeValue(0b000100011, 0b00, eValueType.operand_pollwait)); // 	TRGINT2
    this.asmcodeValues.set(eAsmcode.ac_trgint3, asmcodeValue(0b000100100, 0b00, eValueType.operand_pollwait)); // 	TRGINT3
    this.asmcodeValues.set(eAsmcode.ac_nixint1, asmcodeValue(0b000100101, 0b00, eValueType.operand_pollwait)); // 	NIXINT1
    this.asmcodeValues.set(eAsmcode.ac_nixint2, asmcodeValue(0b000100110, 0b00, eValueType.operand_pollwait)); // 	NIXINT2
    this.asmcodeValues.set(eAsmcode.ac_nixint3, asmcodeValue(0b000100111, 0b00, eValueType.operand_pollwait)); // 	NIXINT3
    this.asmcodeValues.set(eAsmcode.ac_setint1, asmcodeValue(0b000100101, 0b00, eValueType.operand_l)); // 	SETINT1	D/#
    this.asmcodeValues.set(eAsmcode.ac_setint2, asmcodeValue(0b000100110, 0b00, eValueType.operand_l)); // 	SETINT2	D/#
    this.asmcodeValues.set(eAsmcode.ac_setint3, asmcodeValue(0b000100111, 0b00, eValueType.operand_l)); // 	SETINT3	D/#
    this.asmcodeValues.set(eAsmcode.ac_setq, asmcodeValue(0b000101000, 0b00, eValueType.operand_l)); // 	SETQ	D/#
    this.asmcodeValues.set(eAsmcode.ac_setq2, asmcodeValue(0b000101001, 0b00, eValueType.operand_l)); // 	SETQ2	D/#
    this.asmcodeValues.set(eAsmcode.ac_push, asmcodeValue(0b000101010, 0b00, eValueType.operand_l)); // 	PUSH	D/#
    this.asmcodeValues.set(eAsmcode.ac_pop, asmcodeValue(0b000101011, 0b11, eValueType.operand_d)); // 	POP	D
    this.asmcodeValues.set(eAsmcode.ac_jmprel, asmcodeValue(0b000110000, 0b00, eValueType.operand_l)); // 	JMPREL	D/#
    this.asmcodeValues.set(eAsmcode.ac_skip, asmcodeValue(0b000110001, 0b00, eValueType.operand_l)); // 	SKIP	D/#
    this.asmcodeValues.set(eAsmcode.ac_skipf, asmcodeValue(0b000110010, 0b00, eValueType.operand_l)); // 	SKIPF	D/#
    this.asmcodeValues.set(eAsmcode.ac_execf, asmcodeValue(0b000110011, 0b00, eValueType.operand_l)); // 	EXECF	D/#
    this.asmcodeValues.set(eAsmcode.ac_getptr, asmcodeValue(0b000110100, 0b00, eValueType.operand_d)); // 	GETPTR	D
    this.asmcodeValues.set(eAsmcode.ac_getbrk, asmcodeValue(0b000110101, 0b11, eValueType.operand_getbrk)); // 	GETBRK	D
    this.asmcodeValues.set(eAsmcode.ac_cogbrk, asmcodeValue(0b000110101, 0b00, eValueType.operand_l)); // 	COGBRK	D/#
    this.asmcodeValues.set(eAsmcode.ac_brk, asmcodeValue(0b000110110, 0b00, eValueType.operand_l)); // 	BRK	D/#
    this.asmcodeValues.set(eAsmcode.ac_setluts, asmcodeValue(0b000110111, 0b00, eValueType.operand_l)); // 	SETLUTS	D/#
    this.asmcodeValues.set(eAsmcode.ac_setcy, asmcodeValue(0b000111000, 0b00, eValueType.operand_l)); // 	SETCY	D/#
    this.asmcodeValues.set(eAsmcode.ac_setci, asmcodeValue(0b000111001, 0b00, eValueType.operand_l)); // 	SETCI	D/#
    this.asmcodeValues.set(eAsmcode.ac_setcq, asmcodeValue(0b000111010, 0b00, eValueType.operand_l)); // 	SETCQ	D/#
    this.asmcodeValues.set(eAsmcode.ac_setcfrq, asmcodeValue(0b000111011, 0b00, eValueType.operand_l)); // 	SETCFRQ	D/#
    this.asmcodeValues.set(eAsmcode.ac_setcmod, asmcodeValue(0b000111100, 0b00, eValueType.operand_l)); // 	SETCMOD	D/#
    this.asmcodeValues.set(eAsmcode.ac_setpiv, asmcodeValue(0b000111101, 0b00, eValueType.operand_l)); // 	SETPIV	D/#
    this.asmcodeValues.set(eAsmcode.ac_setpix, asmcodeValue(0b000111110, 0b00, eValueType.operand_l)); // 	SETPIX	D/#
    this.asmcodeValues.set(eAsmcode.ac_cogatn, asmcodeValue(0b000111111, 0b00, eValueType.operand_l)); // 	COGATN	D/#
    this.asmcodeValues.set(eAsmcode.ac_testp, asmcodeValue(0b001000000, 0b00, eValueType.operand_testp)); // 	TESTP	D/#
    this.asmcodeValues.set(eAsmcode.ac_testpn, asmcodeValue(0b001000001, 0b00, eValueType.operand_testp)); // 	TESTPN	D/#
    this.asmcodeValues.set(eAsmcode.ac_dirl, asmcodeValue(0b001000000, 0b00, eValueType.operand_pinop)); // 	DIRL	D/#
    this.asmcodeValues.set(eAsmcode.ac_dirh, asmcodeValue(0b001000001, 0b00, eValueType.operand_pinop)); // 	DIRH	D/#
    this.asmcodeValues.set(eAsmcode.ac_dirc, asmcodeValue(0b001000010, 0b00, eValueType.operand_pinop)); // 	DIRC	D/#
    this.asmcodeValues.set(eAsmcode.ac_dirnc, asmcodeValue(0b001000011, 0b00, eValueType.operand_pinop)); // 	DIRNC	D/#
    this.asmcodeValues.set(eAsmcode.ac_dirz, asmcodeValue(0b001000100, 0b00, eValueType.operand_pinop)); // 	DIRZ	D/#
    this.asmcodeValues.set(eAsmcode.ac_dirnz, asmcodeValue(0b001000101, 0b00, eValueType.operand_pinop)); // 	DIRNZ	D/#
    this.asmcodeValues.set(eAsmcode.ac_dirrnd, asmcodeValue(0b001000110, 0b00, eValueType.operand_pinop)); // 	DIRRND	D/#
    this.asmcodeValues.set(eAsmcode.ac_dirnot, asmcodeValue(0b001000111, 0b00, eValueType.operand_pinop)); // 	DIRNOT	D/#
    this.asmcodeValues.set(eAsmcode.ac_outl, asmcodeValue(0b001001000, 0b00, eValueType.operand_pinop)); // 	OUTL	D/#
    this.asmcodeValues.set(eAsmcode.ac_outh, asmcodeValue(0b001001001, 0b00, eValueType.operand_pinop)); // 	OUTH	D/#
    this.asmcodeValues.set(eAsmcode.ac_outc, asmcodeValue(0b001001010, 0b00, eValueType.operand_pinop)); // 	OUTC	D/#
    this.asmcodeValues.set(eAsmcode.ac_outnc, asmcodeValue(0b001001011, 0b00, eValueType.operand_pinop)); // 	OUTNC	D/#
    this.asmcodeValues.set(eAsmcode.ac_outz, asmcodeValue(0b001001100, 0b00, eValueType.operand_pinop)); // 	OUTZ	D/#
    this.asmcodeValues.set(eAsmcode.ac_outnz, asmcodeValue(0b001001101, 0b00, eValueType.operand_pinop)); // 	OUTNZ	D/#
    this.asmcodeValues.set(eAsmcode.ac_outrnd, asmcodeValue(0b001001110, 0b00, eValueType.operand_pinop)); // 	OUTRND	D/#
    this.asmcodeValues.set(eAsmcode.ac_outnot, asmcodeValue(0b001001111, 0b00, eValueType.operand_pinop)); // 	OUTNOT	D/#
    this.asmcodeValues.set(eAsmcode.ac_fltl, asmcodeValue(0b001010000, 0b00, eValueType.operand_pinop)); // 	FLTL	D/#
    this.asmcodeValues.set(eAsmcode.ac_flth, asmcodeValue(0b001010001, 0b00, eValueType.operand_pinop)); // 	FLTH	D/#
    this.asmcodeValues.set(eAsmcode.ac_fltc, asmcodeValue(0b001010010, 0b00, eValueType.operand_pinop)); // 	FLTC	D/#
    this.asmcodeValues.set(eAsmcode.ac_fltnc, asmcodeValue(0b001010011, 0b00, eValueType.operand_pinop)); // 	FLTNC	D/#
    this.asmcodeValues.set(eAsmcode.ac_fltz, asmcodeValue(0b001010100, 0b00, eValueType.operand_pinop)); // 	FLTZ	D/#
    this.asmcodeValues.set(eAsmcode.ac_fltnz, asmcodeValue(0b001010101, 0b00, eValueType.operand_pinop)); // 	FLTNZ	D/#
    this.asmcodeValues.set(eAsmcode.ac_fltrnd, asmcodeValue(0b001010110, 0b00, eValueType.operand_pinop)); // 	FLTRND	D/#
    this.asmcodeValues.set(eAsmcode.ac_fltnot, asmcodeValue(0b001010111, 0b00, eValueType.operand_pinop)); // 	FLTNOT	D/#
    this.asmcodeValues.set(eAsmcode.ac_drvl, asmcodeValue(0b001011000, 0b00, eValueType.operand_pinop)); // 	DRVL	D/#
    this.asmcodeValues.set(eAsmcode.ac_drvh, asmcodeValue(0b001011001, 0b00, eValueType.operand_pinop)); // 	DRVH	D/#
    this.asmcodeValues.set(eAsmcode.ac_drvc, asmcodeValue(0b001011010, 0b00, eValueType.operand_pinop)); // 	DRVC	D/#
    this.asmcodeValues.set(eAsmcode.ac_drvnc, asmcodeValue(0b001011011, 0b00, eValueType.operand_pinop)); // 	DRVNC	D/#
    this.asmcodeValues.set(eAsmcode.ac_drvz, asmcodeValue(0b001011100, 0b00, eValueType.operand_pinop)); // 	DRVZ	D/#
    this.asmcodeValues.set(eAsmcode.ac_drvnz, asmcodeValue(0b001011101, 0b00, eValueType.operand_pinop)); // 	DRVNZ	D/#
    this.asmcodeValues.set(eAsmcode.ac_drvrnd, asmcodeValue(0b001011110, 0b00, eValueType.operand_pinop)); // 	DRVRND	D/#
    this.asmcodeValues.set(eAsmcode.ac_drvnot, asmcodeValue(0b001011111, 0b00, eValueType.operand_pinop)); // 	DRVNOT	D/#
    this.asmcodeValues.set(eAsmcode.ac_splitb, asmcodeValue(0b001100000, 0b00, eValueType.operand_d)); // 	SPLITB	D
    this.asmcodeValues.set(eAsmcode.ac_mergeb, asmcodeValue(0b001100001, 0b00, eValueType.operand_d)); // 	MERGEB	D
    this.asmcodeValues.set(eAsmcode.ac_splitw, asmcodeValue(0b001100010, 0b00, eValueType.operand_d)); // 	SPLITW	D
    this.asmcodeValues.set(eAsmcode.ac_mergew, asmcodeValue(0b001100011, 0b00, eValueType.operand_d)); // 	MERGEW	D
    this.asmcodeValues.set(eAsmcode.ac_seussf, asmcodeValue(0b001100100, 0b00, eValueType.operand_d)); // 	SEUSSF	D
    this.asmcodeValues.set(eAsmcode.ac_seussr, asmcodeValue(0b001100101, 0b00, eValueType.operand_d)); // 	SEUSSR	D
    this.asmcodeValues.set(eAsmcode.ac_rgbsqz, asmcodeValue(0b001100110, 0b00, eValueType.operand_d)); // 	RGBSQZ	D
    this.asmcodeValues.set(eAsmcode.ac_rgbexp, asmcodeValue(0b001100111, 0b00, eValueType.operand_d)); // 	RGBEXP	D
    this.asmcodeValues.set(eAsmcode.ac_xoro32, asmcodeValue(0b001101000, 0b00, eValueType.operand_d)); // 	XORO32	D
    this.asmcodeValues.set(eAsmcode.ac_rev, asmcodeValue(0b001101001, 0b00, eValueType.operand_d)); // 	REV	D
    this.asmcodeValues.set(eAsmcode.ac_rczr, asmcodeValue(0b001101010, 0b11, eValueType.operand_d)); // 	RCZR	D
    this.asmcodeValues.set(eAsmcode.ac_rczl, asmcodeValue(0b001101011, 0b11, eValueType.operand_d)); // 	RCZL	D
    this.asmcodeValues.set(eAsmcode.ac_wrc, asmcodeValue(0b001101100, 0b00, eValueType.operand_d)); // 	WRC	D
    this.asmcodeValues.set(eAsmcode.ac_wrnc, asmcodeValue(0b001101101, 0b00, eValueType.operand_d)); // 	WRNC	D
    this.asmcodeValues.set(eAsmcode.ac_wrz, asmcodeValue(0b001101110, 0b00, eValueType.operand_d)); // 	WRZ	D
    this.asmcodeValues.set(eAsmcode.ac_wrnz, asmcodeValue(0b001101111, 0b00, eValueType.operand_d)); // 	WRNZ	D
    this.asmcodeValues.set(eAsmcode.ac_modcz, asmcodeValue(0b001101111, 0b11, eValueType.operand_cz)); // 	MODCZ	c,z
    this.asmcodeValues.set(eAsmcode.ac_modc, asmcodeValue(0b001101111, 0b10, eValueType.operand_cz)); // 	MODC	c
    this.asmcodeValues.set(eAsmcode.ac_modz, asmcodeValue(0b001101111, 0b01, eValueType.operand_cz)); // 	MODZ	z
    this.asmcodeValues.set(eAsmcode.ac_setscp, asmcodeValue(0b001110000, 0b00, eValueType.operand_l)); // 	SETSCP	D/#
    this.asmcodeValues.set(eAsmcode.ac_getscp, asmcodeValue(0b001110001, 0b00, eValueType.operand_d)); // 	GETSCP	D
    this.asmcodeValues.set(eAsmcode.ac_jmp, asmcodeValue(0b110110000, 0b00, eValueType.operand_jmp)); // 	JMP	# <or> D
    this.asmcodeValues.set(eAsmcode.ac_call, asmcodeValue(0b110110100, 0b00, eValueType.operand_call)); // 	CALL	# <or> D
    this.asmcodeValues.set(eAsmcode.ac_calla, asmcodeValue(0b110111000, 0b00, eValueType.operand_call)); // 	CALLA	# <or> D
    this.asmcodeValues.set(eAsmcode.ac_callb, asmcodeValue(0b110111100, 0b00, eValueType.operand_call)); // 	CALLB	# <or> D
    this.asmcodeValues.set(eAsmcode.ac_calld, asmcodeValue(0b111000000, 0b00, eValueType.operand_calld)); // 	CALLD	reg,# / D,S
    this.asmcodeValues.set(eAsmcode.ac_loc, asmcodeValue(0b111010000, 0b00, eValueType.operand_loc)); // 	LOC	reg,#
    this.asmcodeValues.set(eAsmcode.ac_augs, asmcodeValue(0b111100000, 0b00, eValueType.operand_aug)); // 	AUGS	#
    this.asmcodeValues.set(eAsmcode.ac_augd, asmcodeValue(0b111110000, 0b00, eValueType.operand_aug)); // 	AUGD	#
    this.asmcodeValues.set(eAsmcode.ac_pusha, asmcodeValue(eValueType.pp_pusha, 0b00, eValueType.operand_pushpop)); // 	PUSHA	D/#	alias instructions
    this.asmcodeValues.set(eAsmcode.ac_pushb, asmcodeValue(eValueType.pp_pushb, 0b00, eValueType.operand_pushpop)); // 	PUSHB	D/#
    this.asmcodeValues.set(eAsmcode.ac_popa, asmcodeValue(eValueType.pp_popa, 0b11, eValueType.operand_pushpop)); // 	POPA	D
    this.asmcodeValues.set(eAsmcode.ac_popb, asmcodeValue(eValueType.pp_popb, 0b11, eValueType.operand_pushpop)); // 	POPB	D
    this.asmcodeValues.set(eAsmcode.ac_ret, asmcodeValue(0, 0b11, eValueType.operand_xlat)); // 	RET
    this.asmcodeValues.set(eAsmcode.ac_reta, asmcodeValue(1, 0b11, eValueType.operand_xlat)); // 	RETA
    this.asmcodeValues.set(eAsmcode.ac_retb, asmcodeValue(2, 0b11, eValueType.operand_xlat)); // 	RETB
    this.asmcodeValues.set(eAsmcode.ac_reti0, asmcodeValue(3, 0b00, eValueType.operand_xlat)); // 	RETI0
    this.asmcodeValues.set(eAsmcode.ac_reti1, asmcodeValue(4, 0b00, eValueType.operand_xlat)); // 	RETI1
    this.asmcodeValues.set(eAsmcode.ac_reti2, asmcodeValue(5, 0b00, eValueType.operand_xlat)); // 	RETI2
    this.asmcodeValues.set(eAsmcode.ac_reti3, asmcodeValue(6, 0b00, eValueType.operand_xlat)); // 	RETI3
    this.asmcodeValues.set(eAsmcode.ac_resi0, asmcodeValue(7, 0b00, eValueType.operand_xlat)); // 	RESI0
    this.asmcodeValues.set(eAsmcode.ac_resi1, asmcodeValue(8, 0b00, eValueType.operand_xlat)); // 	RESI1
    this.asmcodeValues.set(eAsmcode.ac_resi2, asmcodeValue(9, 0b00, eValueType.operand_xlat)); // 	RESI2
    this.asmcodeValues.set(eAsmcode.ac_resi3, asmcodeValue(10, 0b00, eValueType.operand_xlat)); // 	RESI3
    this.asmcodeValues.set(eAsmcode.ac_xstop, asmcodeValue(11, 0b00, eValueType.operand_xlat)); // 	XSTOP
    this.asmcodeValues.set(eAsmcode.ac_akpin, asmcodeValue(0, 0b00, eValueType.operand_akpin)); // 	AKPIN	S/#
    this.asmcodeValues.set(eAsmcode.ac_asmclk, asmcodeValue(0, 0b00, eValueType.operand_asmclk)); // 	ASMCLK
    this.asmcodeValues.set(eAsmcode.ac_nop, asmcodeValue(0b000000000, 0b00, eValueType.operand_nop)); // 	NOP
    this.asmcodeValues.set(eAsmcode.ac_debug, asmcodeValue(0b000110110, 0b00, eValueType.operand_debug)); // 	DEBUG()
    //
    // generated flexcode table load
    //
    //		flexcode	bytecode	params	results	pinfld	hubcode
    //		---------------------------------------------------------------------------------------
    this.flexcodeValues.set(eFlexcode.fc_coginit, flexcodeValue(eByteCode.bc_coginit, 3, 0, 0, 0)); // (also asm instruction)

    this.flexcodeValues.set(eFlexcode.fc_coginit_push, flexcodeValue(eByteCode.bc_coginit_push, 3, 1, 0, 0));
    this.flexcodeValues.set(eFlexcode.fc_cogstop, flexcodeValue(eByteCode.bc_cogstop, 1, 0, 0, 0)); // (also asm instruction)

    this.flexcodeValues.set(eFlexcode.fc_cogid, flexcodeValue(eByteCode.bc_cogid, 0, 1, 0, 0)); // (also asm instruction)

    this.flexcodeValues.set(eFlexcode.fc_cogchk, flexcodeValue(eByteCode.bc_cogchk, 1, 1, 0, 1));
    this.flexcodeValues.set(eFlexcode.fc_getrnd, flexcodeValue(eByteCode.bc_getrnd, 0, 1, 0, 0)); // (also asm instruction)

    this.flexcodeValues.set(eFlexcode.fc_getct, flexcodeValue(eByteCode.bc_getct, 0, 1, 0, 0)); // (also asm instruction)

    this.flexcodeValues.set(eFlexcode.fc_pollct, flexcodeValue(eByteCode.bc_pollct, 1, 1, 0, 0));
    this.flexcodeValues.set(eFlexcode.fc_waitct, flexcodeValue(eByteCode.bc_waitct, 1, 0, 0, 0));
    this.flexcodeValues.set(eFlexcode.fc_pinwrite, flexcodeValue(eByteCode.bc_pinwrite, 2, 0, 1, 0));
    this.flexcodeValues.set(eFlexcode.fc_pinlow, flexcodeValue(eByteCode.bc_pinlow, 1, 0, 1, 0));
    this.flexcodeValues.set(eFlexcode.fc_pinhigh, flexcodeValue(eByteCode.bc_pinhigh, 1, 0, 1, 0));
    this.flexcodeValues.set(eFlexcode.fc_pintoggle, flexcodeValue(eByteCode.bc_pintoggle, 1, 0, 1, 0));
    this.flexcodeValues.set(eFlexcode.fc_pinfloat, flexcodeValue(eByteCode.bc_pinfloat, 1, 0, 1, 0));
    this.flexcodeValues.set(eFlexcode.fc_pinread, flexcodeValue(eByteCode.bc_pinread, 1, 1, 1, 0));
    this.flexcodeValues.set(eFlexcode.fc_pinstart, flexcodeValue(eByteCode.bc_pinstart, 4, 0, 1, 0));
    this.flexcodeValues.set(eFlexcode.fc_pinclear, flexcodeValue(eByteCode.bc_pinclear, 1, 0, 1, 0));
    this.flexcodeValues.set(eFlexcode.fc_wrpin, flexcodeValue(eByteCode.bc_wrpin, 2, 0, 1, 0)); // (also asm instruction)

    this.flexcodeValues.set(eFlexcode.fc_wxpin, flexcodeValue(eByteCode.bc_wxpin, 2, 0, 1, 0)); // (also asm instruction)

    this.flexcodeValues.set(eFlexcode.fc_wypin, flexcodeValue(eByteCode.bc_wypin, 2, 0, 1, 0)); // (also asm instruction)

    this.flexcodeValues.set(eFlexcode.fc_akpin, flexcodeValue(eByteCode.bc_akpin, 1, 0, 1, 0)); // (also asm instruction)

    this.flexcodeValues.set(eFlexcode.fc_rdpin, flexcodeValue(eByteCode.bc_rdpin, 1, 1, 0, 0)); // (also asm instruction)

    this.flexcodeValues.set(eFlexcode.fc_rqpin, flexcodeValue(eByteCode.bc_rqpin, 1, 1, 0, 0)); // (also asm instruction)

    this.flexcodeValues.set(eFlexcode.fc_locknew, flexcodeValue(eByteCode.bc_locknew, 0, 1, 0, 0)); // (also asm instruction)

    this.flexcodeValues.set(eFlexcode.fc_lockret, flexcodeValue(eByteCode.bc_lockret, 1, 0, 0, 0)); // (also asm instruction)

    this.flexcodeValues.set(eFlexcode.fc_locktry, flexcodeValue(eByteCode.bc_locktry, 1, 1, 0, 0)); // (also asm instruction)

    this.flexcodeValues.set(eFlexcode.fc_lockrel, flexcodeValue(eByteCode.bc_lockrel, 1, 0, 0, 0)); // (also asm instruction)

    this.flexcodeValues.set(eFlexcode.fc_lockchk, flexcodeValue(eByteCode.bc_lockchk, 1, 1, 0, 0));
    this.flexcodeValues.set(eFlexcode.fc_cogatn, flexcodeValue(eByteCode.bc_cogatn, 1, 0, 0, 0)); // (also asm instruction)

    this.flexcodeValues.set(eFlexcode.fc_pollatn, flexcodeValue(eByteCode.bc_pollatn, 0, 1, 0, 0)); // (also asm instruction)

    this.flexcodeValues.set(eFlexcode.fc_waitatn, flexcodeValue(eByteCode.bc_waitatn, 0, 0, 0, 0)); // (also asm instruction)

    this.flexcodeValues.set(eFlexcode.fc_hubset, flexcodeValue(eByteCode.bc_hubset, 1, 0, 0, 1)); // (also asm instruction)

    this.flexcodeValues.set(eFlexcode.fc_clkset, flexcodeValue(eByteCode.bc_clkset, 2, 0, 0, 1));
    this.flexcodeValues.set(eFlexcode.fc_regexec, flexcodeValue(eByteCode.bc_regexec, 1, 0, 0, 1));
    this.flexcodeValues.set(eFlexcode.fc_regload, flexcodeValue(eByteCode.bc_regload, 1, 0, 0, 1));
    this.flexcodeValues.set(eFlexcode.fc_call, flexcodeValue(eByteCode.bc_call, 1, 0, 0, 1)); // (also asm instruction)

    this.flexcodeValues.set(eFlexcode.fc_getregs, flexcodeValue(eByteCode.bc_getregs, 3, 0, 0, 1));
    this.flexcodeValues.set(eFlexcode.fc_setregs, flexcodeValue(eByteCode.bc_setregs, 3, 0, 0, 1));
    this.flexcodeValues.set(eFlexcode.fc_bytemove, flexcodeValue(eByteCode.bc_bytemove, 3, 0, 0, 1));
    this.flexcodeValues.set(eFlexcode.fc_bytefill, flexcodeValue(eByteCode.bc_bytefill, 3, 0, 0, 1));
    this.flexcodeValues.set(eFlexcode.fc_wordmove, flexcodeValue(eByteCode.bc_wordmove, 3, 0, 0, 1));
    this.flexcodeValues.set(eFlexcode.fc_wordfill, flexcodeValue(eByteCode.bc_wordfill, 3, 0, 0, 1));
    this.flexcodeValues.set(eFlexcode.fc_longmove, flexcodeValue(eByteCode.bc_longmove, 3, 0, 0, 1));
    this.flexcodeValues.set(eFlexcode.fc_longfill, flexcodeValue(eByteCode.bc_longfill, 3, 0, 0, 1));
    this.flexcodeValues.set(eFlexcode.fc_strsize, flexcodeValue(eByteCode.bc_strsize, 1, 1, 0, 1));
    this.flexcodeValues.set(eFlexcode.fc_strcomp, flexcodeValue(eByteCode.bc_strcomp, 2, 1, 0, 1));
    this.flexcodeValues.set(eFlexcode.fc_strcopy, flexcodeValue(eByteCode.bc_strcopy, 3, 0, 0, 1));
    this.flexcodeValues.set(eFlexcode.fc_getcrc, flexcodeValue(eByteCode.bc_getcrc, 3, 1, 0, 1));
    this.flexcodeValues.set(eFlexcode.fc_waitus, flexcodeValue(eByteCode.bc_waitus, 1, 0, 0, 1));
    this.flexcodeValues.set(eFlexcode.fc_waitms, flexcodeValue(eByteCode.bc_waitms, 1, 0, 0, 1));
    this.flexcodeValues.set(eFlexcode.fc_getms, flexcodeValue(eByteCode.bc_getms, 0, 1, 0, 1));
    this.flexcodeValues.set(eFlexcode.fc_getsec, flexcodeValue(eByteCode.bc_getsec, 0, 1, 0, 1));
    this.flexcodeValues.set(eFlexcode.fc_muldiv64, flexcodeValue(eByteCode.bc_muldiv64, 3, 1, 0, 1));
    this.flexcodeValues.set(eFlexcode.fc_qsin, flexcodeValue(eByteCode.bc_qsin, 3, 1, 0, 1));
    this.flexcodeValues.set(eFlexcode.fc_qcos, flexcodeValue(eByteCode.bc_qcos, 3, 1, 0, 1));
    this.flexcodeValues.set(eFlexcode.fc_rotxy, flexcodeValue(eByteCode.bc_rotxy, 3, 2, 0, 1));
    this.flexcodeValues.set(eFlexcode.fc_polxy, flexcodeValue(eByteCode.bc_polxy, 2, 2, 0, 1));
    this.flexcodeValues.set(eFlexcode.fc_xypol, flexcodeValue(eByteCode.bc_xypol, 2, 2, 0, 1));
    this.flexcodeValues.set(eFlexcode.fc_nan, flexcodeValue(eByteCode.bc_nan, 1, 1, 0, 1));
    this.flexcodeValues.set(eFlexcode.fc_round, flexcodeValue(eByteCode.bc_round, 1, 1, 0, 1));
    this.flexcodeValues.set(eFlexcode.fc_trunc, flexcodeValue(eByteCode.bc_trunc, 1, 1, 0, 1));
    this.flexcodeValues.set(eFlexcode.fc_float, flexcodeValue(eByteCode.bc_float, 1, 1, 0, 1));

    // generated opcode table load

    //		oc		op		prec	bytecode	ternary	binary	unary	assign	float	alias	hubcode
    this.opcodeValues.set(eOpcode.oc_bitnot, opcodeValue(eValueType.op_bitnot, 0, eByteCode.bc_bitnot, 0, 0, 1, 1, 0, 0, 0)); //  !
    this.opcodeValues.set(eOpcode.oc_neg, opcodeValue(eValueType.op_neg, 0, eByteCode.bc_neg, 0, 0, 1, 1, 1, 0, 0)); //  -	(uses op_sub symbol)
    this.opcodeValues.set(eOpcode.oc_fneg, opcodeValue(eValueType.op_fneg, 0, eByteCode.bc_fneg, 0, 0, 1, 0, 1, 0, 1)); //  -.	(uses op_fsub symbol)
    this.opcodeValues.set(eOpcode.oc_abs, opcodeValue(eValueType.op_abs, 0, eByteCode.bc_abs, 0, 0, 1, 1, 1, 0, 0)); //  ABS
    this.opcodeValues.set(eOpcode.oc_fabs, opcodeValue(eValueType.op_fabs, 0, eByteCode.bc_fabs, 0, 0, 1, 0, 1, 0, 1)); //  FABS
    this.opcodeValues.set(eOpcode.oc_encod, opcodeValue(eValueType.op_encod, 0, eByteCode.bc_encod, 0, 0, 1, 1, 0, 0, 0)); //  ENCOD
    this.opcodeValues.set(eOpcode.oc_decod, opcodeValue(eValueType.op_decod, 0, eByteCode.bc_decod, 0, 0, 1, 1, 0, 0, 0)); //  DECOD
    this.opcodeValues.set(eOpcode.oc_bmask, opcodeValue(eValueType.op_bmask, 0, eByteCode.bc_bmask, 0, 0, 1, 1, 0, 0, 0)); //  BMASK
    this.opcodeValues.set(eOpcode.oc_ones, opcodeValue(eValueType.op_ones, 0, eByteCode.bc_ones, 0, 0, 1, 1, 0, 0, 0)); //  ONES
    this.opcodeValues.set(eOpcode.oc_sqrt, opcodeValue(eValueType.op_sqrt, 0, eByteCode.bc_sqrt, 0, 0, 1, 1, 0, 0, 0)); //  SQRT
    this.opcodeValues.set(eOpcode.oc_fsqrt, opcodeValue(eValueType.op_fsqrt, 0, eByteCode.bc_fsqrt, 0, 0, 1, 0, 1, 0, 1)); //  FSQRT
    this.opcodeValues.set(eOpcode.oc_qlog, opcodeValue(eValueType.op_qlog, 0, eByteCode.bc_qlog, 0, 0, 1, 1, 0, 0, 0)); //  QLOG
    this.opcodeValues.set(eOpcode.oc_qexp, opcodeValue(eValueType.op_qexp, 0, eByteCode.bc_qexp, 0, 0, 1, 1, 0, 0, 0)); //  QEXP
    this.opcodeValues.set(eOpcode.oc_shr, opcodeValue(eValueType.op_shr, 1, eByteCode.bc_shr, 0, 1, 0, 1, 0, 0, 0)); //  >>
    this.opcodeValues.set(eOpcode.oc_shl, opcodeValue(eValueType.op_shl, 1, eByteCode.bc_shl, 0, 1, 0, 1, 0, 0, 0)); //  <<
    this.opcodeValues.set(eOpcode.oc_sar, opcodeValue(eValueType.op_sar, 1, eByteCode.bc_sar, 0, 1, 0, 1, 0, 0, 0)); //  SAR
    this.opcodeValues.set(eOpcode.oc_ror, opcodeValue(eValueType.op_ror, 1, eByteCode.bc_ror, 0, 1, 0, 1, 0, 0, 0)); //  ROR
    this.opcodeValues.set(eOpcode.oc_rol, opcodeValue(eValueType.op_rol, 1, eByteCode.bc_rol, 0, 1, 0, 1, 0, 0, 0)); //  ROL
    this.opcodeValues.set(eOpcode.oc_rev, opcodeValue(eValueType.op_rev, 1, eByteCode.bc_rev, 0, 1, 0, 1, 0, 0, 0)); //  REV
    this.opcodeValues.set(eOpcode.oc_zerox, opcodeValue(eValueType.op_zerox, 1, eByteCode.bc_zerox, 0, 1, 0, 1, 0, 0, 0)); //  ZEROX
    this.opcodeValues.set(eOpcode.oc_signx, opcodeValue(eValueType.op_signx, 1, eByteCode.bc_signx, 0, 1, 0, 1, 0, 0, 0)); //  SIGNX
    this.opcodeValues.set(eOpcode.oc_bitand, opcodeValue(eValueType.op_bitand, 2, eByteCode.bc_bitand, 0, 1, 0, 1, 0, 0, 0)); //  &
    this.opcodeValues.set(eOpcode.oc_bitxor, opcodeValue(eValueType.op_bitxor, 3, eByteCode.bc_bitxor, 0, 1, 0, 1, 0, 0, 0)); //  ^
    this.opcodeValues.set(eOpcode.oc_bitor, opcodeValue(eValueType.op_bitor, 4, eByteCode.bc_bitor, 0, 1, 0, 1, 0, 0, 0)); //  |
    this.opcodeValues.set(eOpcode.oc_mul, opcodeValue(eValueType.op_mul, 5, eByteCode.bc_mul, 0, 1, 0, 1, 1, 0, 0)); //  *
    this.opcodeValues.set(eOpcode.oc_fmul, opcodeValue(eValueType.op_fmul, 5, eByteCode.bc_fmul, 0, 1, 0, 0, 1, 0, 1)); //  *.
    this.opcodeValues.set(eOpcode.oc_div, opcodeValue(eValueType.op_div, 5, eByteCode.bc_div, 0, 1, 0, 1, 1, 0, 0)); //  /
    this.opcodeValues.set(eOpcode.oc_fdiv, opcodeValue(eValueType.op_fdiv, 5, eByteCode.bc_fdiv, 0, 1, 0, 0, 1, 0, 1)); //  /.
    this.opcodeValues.set(eOpcode.oc_divu, opcodeValue(eValueType.op_divu, 5, eByteCode.bc_divu, 0, 1, 0, 1, 0, 0, 0)); //  +/
    this.opcodeValues.set(eOpcode.oc_rem, opcodeValue(eValueType.op_rem, 5, eByteCode.bc_rem, 0, 1, 0, 1, 0, 0, 0)); //  //
    this.opcodeValues.set(eOpcode.oc_remu, opcodeValue(eValueType.op_remu, 5, eByteCode.bc_remu, 0, 1, 0, 1, 0, 0, 0)); //  +//
    this.opcodeValues.set(eOpcode.oc_sca, opcodeValue(eValueType.op_sca, 5, eByteCode.bc_sca, 0, 1, 0, 1, 0, 0, 0)); //  SCA
    this.opcodeValues.set(eOpcode.oc_scas, opcodeValue(eValueType.op_scas, 5, eByteCode.bc_scas, 0, 1, 0, 1, 0, 0, 0)); //  SCAS
    this.opcodeValues.set(eOpcode.oc_frac, opcodeValue(eValueType.op_frac, 5, eByteCode.bc_frac, 0, 1, 0, 1, 0, 0, 0)); //  FRAC
    this.opcodeValues.set(eOpcode.oc_add, opcodeValue(eValueType.op_add, 6, eByteCode.bc_add, 0, 1, 0, 1, 1, 0, 0)); //  +
    this.opcodeValues.set(eOpcode.oc_fadd, opcodeValue(eValueType.op_fadd, 6, eByteCode.bc_fadd, 0, 1, 0, 0, 1, 0, 1)); //  +.
    this.opcodeValues.set(eOpcode.oc_sub, opcodeValue(eValueType.op_sub, 6, eByteCode.bc_sub, 0, 1, 0, 1, 1, 0, 0)); //  -
    this.opcodeValues.set(eOpcode.oc_fsub, opcodeValue(eValueType.op_fsub, 6, eByteCode.bc_fsub, 0, 1, 0, 0, 1, 0, 1)); //  -.
    this.opcodeValues.set(eOpcode.oc_fge, opcodeValue(eValueType.op_fge, 7, eByteCode.bc_fge, 0, 1, 0, 1, 1, 0, 0)); //  #>
    this.opcodeValues.set(eOpcode.oc_fle, opcodeValue(eValueType.op_fle, 7, eByteCode.bc_fle, 0, 1, 0, 1, 1, 0, 0)); //  <#
    this.opcodeValues.set(eOpcode.oc_addbits, opcodeValue(eValueType.op_addbits, 8, eByteCode.bc_addbits, 0, 1, 0, 1, 0, 0, 0)); //  ADDBITS
    this.opcodeValues.set(eOpcode.oc_addpins, opcodeValue(eValueType.op_addpins, 8, eByteCode.bc_addpins, 0, 1, 0, 1, 0, 0, 0)); //  ADDPINS
    this.opcodeValues.set(eOpcode.oc_lt, opcodeValue(eValueType.op_lt, 9, eByteCode.bc_lt, 0, 1, 0, 0, 1, 0, 0)); //  <
    this.opcodeValues.set(eOpcode.oc_flt, opcodeValue(eValueType.op_flt, 9, eByteCode.bc_flt, 0, 1, 0, 0, 1, 0, 1)); //  <.
    this.opcodeValues.set(eOpcode.oc_ltu, opcodeValue(eValueType.op_ltu, 9, eByteCode.bc_ltu, 0, 1, 0, 0, 0, 0, 0)); //  +<
    this.opcodeValues.set(eOpcode.oc_lte, opcodeValue(eValueType.op_lte, 9, eByteCode.bc_lte, 0, 1, 0, 0, 1, 0, 0)); //  <=
    this.opcodeValues.set(eOpcode.oc_flte, opcodeValue(eValueType.op_flte, 9, eByteCode.bc_flte, 0, 1, 0, 0, 1, 0, 1)); //  <=.
    this.opcodeValues.set(eOpcode.oc_lteu, opcodeValue(eValueType.op_lteu, 9, eByteCode.bc_lteu, 0, 1, 0, 0, 0, 0, 0)); //  +<=
    this.opcodeValues.set(eOpcode.oc_e, opcodeValue(eValueType.op_e, 9, eByteCode.bc_e, 0, 1, 0, 0, 1, 0, 0)); //  ==
    this.opcodeValues.set(eOpcode.oc_fe, opcodeValue(eValueType.op_fe, 9, eByteCode.bc_fe, 0, 1, 0, 0, 1, 0, 1)); //  ==.
    this.opcodeValues.set(eOpcode.oc_ne, opcodeValue(eValueType.op_ne, 9, eByteCode.bc_ne, 0, 1, 0, 0, 1, 0, 0)); //  <>
    this.opcodeValues.set(eOpcode.oc_fne, opcodeValue(eValueType.op_fne, 9, eByteCode.bc_fne, 0, 1, 0, 0, 1, 0, 1)); //  <>.
    this.opcodeValues.set(eOpcode.oc_gte, opcodeValue(eValueType.op_gte, 9, eByteCode.bc_gte, 0, 1, 0, 0, 1, 0, 0)); //  >=
    this.opcodeValues.set(eOpcode.oc_fgte, opcodeValue(eValueType.op_fgte, 9, eByteCode.bc_fgte, 0, 1, 0, 0, 1, 0, 1)); //  >=.
    this.opcodeValues.set(eOpcode.oc_gteu, opcodeValue(eValueType.op_gteu, 9, eByteCode.bc_gteu, 0, 1, 0, 0, 0, 0, 0)); //  +>=
    this.opcodeValues.set(eOpcode.oc_gt, opcodeValue(eValueType.op_gt, 9, eByteCode.bc_gt, 0, 1, 0, 0, 1, 0, 0)); //  >
    this.opcodeValues.set(eOpcode.oc_fgt, opcodeValue(eValueType.op_fgt, 9, eByteCode.bc_fgt, 0, 1, 0, 0, 1, 0, 1)); //  >.
    this.opcodeValues.set(eOpcode.oc_gtu, opcodeValue(eValueType.op_gtu, 9, eByteCode.bc_gtu, 0, 1, 0, 0, 0, 0, 0)); //  +>
    this.opcodeValues.set(eOpcode.oc_ltegt, opcodeValue(eValueType.op_ltegt, 9, eByteCode.bc_ltegt, 0, 1, 0, 0, 1, 0, 0)); //  <=>
    this.opcodeValues.set(eOpcode.oc_lognot, opcodeValue(eValueType.op_lognot, 10, eByteCode.bc_lognot, 0, 0, 1, 1, 0, 1, 0)); //  !!
    this.opcodeValues.set(eOpcode.oc_lognot_name, opcodeValue(eValueType.op_lognot, 10, eByteCode.bc_lognot, 0, 0, 1, 1, 0, 0, 0)); //  NOT
    this.opcodeValues.set(eOpcode.oc_logand, opcodeValue(eValueType.op_logand, 11, eByteCode.bc_logand, 0, 1, 0, 1, 0, 1, 0)); //  &&
    this.opcodeValues.set(eOpcode.oc_logand_name, opcodeValue(eValueType.op_logand, 11, eByteCode.bc_logand, 0, 1, 0, 1, 0, 0, 0)); //  AND
    this.opcodeValues.set(eOpcode.oc_logxor, opcodeValue(eValueType.op_logxor, 12, eByteCode.bc_logxor, 0, 1, 0, 1, 0, 1, 0)); //  ^^
    this.opcodeValues.set(eOpcode.oc_logxor_name, opcodeValue(eValueType.op_logxor, 12, eByteCode.bc_logxor, 0, 1, 0, 1, 0, 0, 0)); //  XOR
    this.opcodeValues.set(eOpcode.oc_logor, opcodeValue(eValueType.op_logor, 13, eByteCode.bc_logor, 0, 1, 0, 1, 0, 1, 0)); //  ||
    this.opcodeValues.set(eOpcode.oc_logor_name, opcodeValue(eValueType.op_logor, 13, eByteCode.bc_logor, 0, 1, 0, 1, 0, 0, 0)); //  OR
    this.opcodeValues.set(eOpcode.oc_ternary, opcodeValue(eValueType.op_ternary, 14, 0, 1, 0, 0, 1, 0, 0, 0)); //  ?

    //
    // generated Automatic symbols table load
    //
    //		---------------------------------------------------------------------------------------

    this.automatic_symbols.set(SYMBOLS.ABS, [eElementType.type_op, this.opcodeValue(eOpcode.oc_abs)]); // (also asm instruction)
    this.automatic_symbols.set(SYMBOLS.FABS, [eElementType.type_op, this.opcodeValue(eOpcode.oc_fabs)]);
    this.automatic_symbols.set(SYMBOLS.ENCOD, [eElementType.type_op, this.opcodeValue(eOpcode.oc_encod)]); // (also asm instruction)
    this.automatic_symbols.set(SYMBOLS.DECOD, [eElementType.type_op, this.opcodeValue(eOpcode.oc_decod)]); // (also asm instruction)
    this.automatic_symbols.set(SYMBOLS.BMASK, [eElementType.type_op, this.opcodeValue(eOpcode.oc_bmask)]); // (also asm instruction)
    this.automatic_symbols.set(SYMBOLS.ONES, [eElementType.type_op, this.opcodeValue(eOpcode.oc_ones)]); // (also asm instruction)
    this.automatic_symbols.set(SYMBOLS.SQRT, [eElementType.type_op, this.opcodeValue(eOpcode.oc_sqrt)]);
    this.automatic_symbols.set(SYMBOLS.FSQRT, [eElementType.type_op, this.opcodeValue(eOpcode.oc_fsqrt)]);
    this.automatic_symbols.set(SYMBOLS.QLOG, [eElementType.type_op, this.opcodeValue(eOpcode.oc_qlog)]); // (also asm instruction)
    this.automatic_symbols.set(SYMBOLS.QEXP, [eElementType.type_op, this.opcodeValue(eOpcode.oc_qexp)]); // (also asm instruction)
    this.automatic_symbols.set(SYMBOLS.SAR, [eElementType.type_op, this.opcodeValue(eOpcode.oc_sar)]); // (also asm instruction)
    this.automatic_symbols.set(SYMBOLS.ROR, [eElementType.type_op, this.opcodeValue(eOpcode.oc_ror)]); // (also asm instruction)
    this.automatic_symbols.set(SYMBOLS.ROL, [eElementType.type_op, this.opcodeValue(eOpcode.oc_rol)]); // (also asm instruction)
    this.automatic_symbols.set(SYMBOLS.REV, [eElementType.type_op, this.opcodeValue(eOpcode.oc_rev)]); // (also asm instruction)
    this.automatic_symbols.set(SYMBOLS.ZEROX, [eElementType.type_op, this.opcodeValue(eOpcode.oc_zerox)]); // (also asm instruction)
    this.automatic_symbols.set(SYMBOLS.SIGNX, [eElementType.type_op, this.opcodeValue(eOpcode.oc_signx)]); // (also asm instruction)
    this.automatic_symbols.set(SYMBOLS.SCA, [eElementType.type_op, this.opcodeValue(eOpcode.oc_sca)]); // (also asm instruction)
    this.automatic_symbols.set(SYMBOLS.SCAS, [eElementType.type_op, this.opcodeValue(eOpcode.oc_scas)]); // (also asm instruction)
    this.automatic_symbols.set(SYMBOLS.FRAC, [eElementType.type_op, this.opcodeValue(eOpcode.oc_frac)]);
    this.automatic_symbols.set(SYMBOLS.ADDBITS, [eElementType.type_op, this.opcodeValue(eOpcode.oc_addbits)]);
    this.automatic_symbols.set(SYMBOLS.ADDPINS, [eElementType.type_op, this.opcodeValue(eOpcode.oc_addpins)]);
    this.automatic_symbols.set(SYMBOLS.NOT, [eElementType.type_op, this.opcodeValue(eOpcode.oc_lognot_name)]); // (also asm instruction)
    this.automatic_symbols.set(SYMBOLS.AND, [eElementType.type_op, this.opcodeValue(eOpcode.oc_logand_name)]); // (also asm instruction)
    this.automatic_symbols.set(SYMBOLS.XOR, [eElementType.type_op, this.opcodeValue(eOpcode.oc_logxor_name)]); // (also asm instruction)
    this.automatic_symbols.set(SYMBOLS.OR, [eElementType.type_op, this.opcodeValue(eOpcode.oc_logor_name)]); // (also asm instruction)

    this.automatic_symbols.set(SYMBOLS.FLOAT, [eElementType.type_float, 0]); // floating-point operators
    this.automatic_symbols.set(SYMBOLS.ROUND, [eElementType.type_round, 0]);
    this.automatic_symbols.set(SYMBOLS.TRUNC, [eElementType.type_trunc, 0]);

    this.automatic_symbols.set(SYMBOLS.STRING, [eElementType.type_constr, 0]); // string expressions

    this.automatic_symbols.set(SYMBOLS.CON, [eElementType.type_block, eValueType.block_con]); // block designators
    this.automatic_symbols.set(SYMBOLS.OBJ, [eElementType.type_block, eValueType.block_obj]);
    this.automatic_symbols.set(SYMBOLS.VAR, [eElementType.type_block, eValueType.block_var]);
    this.automatic_symbols.set(SYMBOLS.PUB, [eElementType.type_block, eValueType.block_pub]);
    this.automatic_symbols.set(SYMBOLS.PRI, [eElementType.type_block, eValueType.block_pri]);
    this.automatic_symbols.set(SYMBOLS.DAT, [eElementType.type_block, eValueType.block_dat]);

    this.automatic_symbols.set(SYMBOLS.FIELD, [eElementType.type_field, 0]); // field

    this.automatic_symbols.set(SYMBOLS.BYTE, [eElementType.type_size, 0]); // size
    this.automatic_symbols.set(SYMBOLS.WORD, [eElementType.type_size, 1]);
    this.automatic_symbols.set(SYMBOLS.LONG, [eElementType.type_size, 2]);

    this.automatic_symbols.set(SYMBOLS.BYTEFIT, [eElementType.type_size_fit, 0]); // size fits
    this.automatic_symbols.set(SYMBOLS.WORDFIT, [eElementType.type_size_fit, 1]);

    this.automatic_symbols.set(SYMBOLS.FVAR, [eElementType.type_fvar, 0]); // fvar
    this.automatic_symbols.set(SYMBOLS.FVARS, [eElementType.type_fvar, 1]);

    this.automatic_symbols.set(SYMBOLS.FILE, [eElementType.type_file, 0]); // file-related

    this.automatic_symbols.set(SYMBOLS.IF, [eElementType.type_if, 0]); // high-level structures
    this.automatic_symbols.set(SYMBOLS.IFNOT, [eElementType.type_ifnot, 0]);
    this.automatic_symbols.set(SYMBOLS.ELSEIF, [eElementType.type_elseif, 0]);
    this.automatic_symbols.set(SYMBOLS.ELSEIFNOT, [eElementType.type_elseifnot, 0]);
    this.automatic_symbols.set(SYMBOLS.ELSE, [eElementType.type_else, 0]);
    this.automatic_symbols.set(SYMBOLS.CASE, [eElementType.type_case, 0]);
    this.automatic_symbols.set(SYMBOLS.CASE_FAST, [eElementType.type_case_fast, 0]);
    this.automatic_symbols.set(SYMBOLS.OTHER, [eElementType.type_other, 0]);
    this.automatic_symbols.set(SYMBOLS.REPEAT, [eElementType.type_repeat, 0]);
    this.automatic_symbols.set(SYMBOLS.WHILE, [eElementType.type_while, 0]);
    this.automatic_symbols.set(SYMBOLS.UNTIL, [eElementType.type_until, 0]);
    this.automatic_symbols.set(SYMBOLS.FROM, [eElementType.type_from, 0]);
    this.automatic_symbols.set(SYMBOLS.TO, [eElementType.type_to, 0]);
    this.automatic_symbols.set(SYMBOLS.STEP, [eElementType.type_step, 0]);
    this.automatic_symbols.set(SYMBOLS.WITH, [eElementType.type_with, 0]);

    this.automatic_symbols.set(SYMBOLS.NEXT, [eElementType.type_i_next_quit, 0]); // high-level instructions
    this.automatic_symbols.set(SYMBOLS.QUIT, [eElementType.type_i_next_quit, 1]);
    this.automatic_symbols.set(SYMBOLS.RETURN, [eElementType.type_i_return, 0]);
    this.automatic_symbols.set(SYMBOLS.ABORT, [eElementType.type_i_abort, 0]);
    this.automatic_symbols.set(SYMBOLS.LOOKUPZ, [eElementType.type_i_look, 0b00]);
    this.automatic_symbols.set(SYMBOLS.LOOKUP, [eElementType.type_i_look, 0b01]);
    this.automatic_symbols.set(SYMBOLS.LOOKDOWNZ, [eElementType.type_i_look, 0b10]);
    this.automatic_symbols.set(SYMBOLS.LOOKDOWN, [eElementType.type_i_look, 0b11]);
    this.automatic_symbols.set(SYMBOLS.COGSPIN, [eElementType.type_i_cogspin, 0]);
    this.automatic_symbols.set(SYMBOLS.RECV, [eElementType.type_recv, 0]);
    this.automatic_symbols.set(SYMBOLS.SEND, [eElementType.type_send, 0]);

    this.automatic_symbols.set(SYMBOLS.DEBUG, [eElementType.type_debug, 0]); // debug

    this.automatic_symbols.set(SYMBOLS.DLY, [eElementType.type_debug_cmd, eValueType.dc_dly]); // debug commands
    this.automatic_symbols.set(SYMBOLS.PC_KEY, [eElementType.type_debug_cmd, eValueType.dc_pc_key]);
    this.automatic_symbols.set(SYMBOLS.PC_MOUSE, [eElementType.type_debug_cmd, eValueType.dc_pc_mouse]);

    this.automatic_symbols.set(SYMBOLS.ZSTR, [eElementType.type_debug_cmd, 0b00100100]);
    this.automatic_symbols.set(SYMBOLS.ZSTR_, [eElementType.type_debug_cmd, 0b00100110]);
    this.automatic_symbols.set(SYMBOLS.FDEC, [eElementType.type_debug_cmd, 0b00101100]);
    this.automatic_symbols.set(SYMBOLS.FDEC_, [eElementType.type_debug_cmd, 0b00101110]);
    this.automatic_symbols.set(SYMBOLS.FDEC_REG_ARRAY, [eElementType.type_debug_cmd, 0b00110000]);
    this.automatic_symbols.set(SYMBOLS.FDEC_REG_ARRAY_, [eElementType.type_debug_cmd, 0b00110010]);
    this.automatic_symbols.set(SYMBOLS.LSTR, [eElementType.type_debug_cmd, 0b00110100]);
    this.automatic_symbols.set(SYMBOLS.LSTR_, [eElementType.type_debug_cmd, 0b00110110]);
    this.automatic_symbols.set(SYMBOLS.FDEC_ARRAY, [eElementType.type_debug_cmd, 0b00111100]);
    this.automatic_symbols.set(SYMBOLS.FDEC_ARRAY_, [eElementType.type_debug_cmd, 0b00111110]);

    this.automatic_symbols.set(SYMBOLS.UDEC, [eElementType.type_debug_cmd, 0b01000000]);
    this.automatic_symbols.set(SYMBOLS.UDEC_, [eElementType.type_debug_cmd, 0b01000010]);
    this.automatic_symbols.set(SYMBOLS.UDEC_BYTE, [eElementType.type_debug_cmd, 0b01000100]);
    this.automatic_symbols.set(SYMBOLS.UDEC_BYTE_, [eElementType.type_debug_cmd, 0b01000110]);
    this.automatic_symbols.set(SYMBOLS.UDEC_WORD, [eElementType.type_debug_cmd, 0b01001000]);
    this.automatic_symbols.set(SYMBOLS.UDEC_WORD_, [eElementType.type_debug_cmd, 0b01001010]);
    this.automatic_symbols.set(SYMBOLS.UDEC_LONG, [eElementType.type_debug_cmd, 0b01001100]);
    this.automatic_symbols.set(SYMBOLS.UDEC_LONG_, [eElementType.type_debug_cmd, 0b01001110]);
    this.automatic_symbols.set(SYMBOLS.UDEC_REG_ARRAY, [eElementType.type_debug_cmd, 0b01010000]);
    this.automatic_symbols.set(SYMBOLS.UDEC_REG_ARRAY_, [eElementType.type_debug_cmd, 0b01010010]);
    this.automatic_symbols.set(SYMBOLS.UDEC_BYTE_ARRAY, [eElementType.type_debug_cmd, 0b01010100]);
    this.automatic_symbols.set(SYMBOLS.UDEC_BYTE_ARRAY_, [eElementType.type_debug_cmd, 0b01010110]);
    this.automatic_symbols.set(SYMBOLS.UDEC_WORD_ARRAY, [eElementType.type_debug_cmd, 0b01011000]);
    this.automatic_symbols.set(SYMBOLS.UDEC_WORD_ARRAY_, [eElementType.type_debug_cmd, 0b01011010]);
    this.automatic_symbols.set(SYMBOLS.UDEC_LONG_ARRAY, [eElementType.type_debug_cmd, 0b01011100]);
    this.automatic_symbols.set(SYMBOLS.UDEC_LONG_ARRAY_, [eElementType.type_debug_cmd, 0b01011110]);

    this.automatic_symbols.set(SYMBOLS.SDEC, [eElementType.type_debug_cmd, 0b01100000]);
    this.automatic_symbols.set(SYMBOLS.SDEC_, [eElementType.type_debug_cmd, 0b01100010]);
    this.automatic_symbols.set(SYMBOLS.SDEC_BYTE, [eElementType.type_debug_cmd, 0b01100100]);
    this.automatic_symbols.set(SYMBOLS.SDEC_BYTE_, [eElementType.type_debug_cmd, 0b01100110]);
    this.automatic_symbols.set(SYMBOLS.SDEC_WORD, [eElementType.type_debug_cmd, 0b01101000]);
    this.automatic_symbols.set(SYMBOLS.SDEC_WORD_, [eElementType.type_debug_cmd, 0b01101010]);
    this.automatic_symbols.set(SYMBOLS.SDEC_LONG, [eElementType.type_debug_cmd, 0b01101100]);
    this.automatic_symbols.set(SYMBOLS.SDEC_LONG_, [eElementType.type_debug_cmd, 0b01101110]);
    this.automatic_symbols.set(SYMBOLS.SDEC_REG_ARRAY, [eElementType.type_debug_cmd, 0b01110000]);
    this.automatic_symbols.set(SYMBOLS.SDEC_REG_ARRAY_, [eElementType.type_debug_cmd, 0b01110010]);
    this.automatic_symbols.set(SYMBOLS.SDEC_BYTE_ARRAY, [eElementType.type_debug_cmd, 0b01110100]);
    this.automatic_symbols.set(SYMBOLS.SDEC_BYTE_ARRAY_, [eElementType.type_debug_cmd, 0b01110110]);
    this.automatic_symbols.set(SYMBOLS.SDEC_WORD_ARRAY, [eElementType.type_debug_cmd, 0b01111000]);
    this.automatic_symbols.set(SYMBOLS.SDEC_WORD_ARRAY_, [eElementType.type_debug_cmd, 0b01111010]);
    this.automatic_symbols.set(SYMBOLS.SDEC_LONG_ARRAY, [eElementType.type_debug_cmd, 0b01111100]);
    this.automatic_symbols.set(SYMBOLS.SDEC_LONG_ARRAY_, [eElementType.type_debug_cmd, 0b01111110]);

    this.automatic_symbols.set(SYMBOLS.UHEX, [eElementType.type_debug_cmd, 0b10000000]);
    this.automatic_symbols.set(SYMBOLS.UHEX_, [eElementType.type_debug_cmd, 0b10000010]);
    this.automatic_symbols.set(SYMBOLS.UHEX_BYTE, [eElementType.type_debug_cmd, 0b10000100]);
    this.automatic_symbols.set(SYMBOLS.UHEX_BYTE_, [eElementType.type_debug_cmd, 0b10000110]);
    this.automatic_symbols.set(SYMBOLS.UHEX_WORD, [eElementType.type_debug_cmd, 0b10001000]);
    this.automatic_symbols.set(SYMBOLS.UHEX_WORD_, [eElementType.type_debug_cmd, 0b10001010]);
    this.automatic_symbols.set(SYMBOLS.UHEX_LONG, [eElementType.type_debug_cmd, 0b10001100]);
    this.automatic_symbols.set(SYMBOLS.UHEX_LONG_, [eElementType.type_debug_cmd, 0b10001110]);
    this.automatic_symbols.set(SYMBOLS.UHEX_REG_ARRAY, [eElementType.type_debug_cmd, 0b10010000]);
    this.automatic_symbols.set(SYMBOLS.UHEX_REG_ARRAY_, [eElementType.type_debug_cmd, 0b10010010]);
    this.automatic_symbols.set(SYMBOLS.UHEX_BYTE_ARRAY, [eElementType.type_debug_cmd, 0b10010100]);
    this.automatic_symbols.set(SYMBOLS.UHEX_BYTE_ARRAY_, [eElementType.type_debug_cmd, 0b10010110]);
    this.automatic_symbols.set(SYMBOLS.UHEX_WORD_ARRAY, [eElementType.type_debug_cmd, 0b10011000]);
    this.automatic_symbols.set(SYMBOLS.UHEX_WORD_ARRAY_, [eElementType.type_debug_cmd, 0b10011010]);
    this.automatic_symbols.set(SYMBOLS.UHEX_LONG_ARRAY, [eElementType.type_debug_cmd, 0b10011100]);
    this.automatic_symbols.set(SYMBOLS.UHEX_LONG_ARRAY_, [eElementType.type_debug_cmd, 0b10011110]);

    this.automatic_symbols.set(SYMBOLS.SHEX, [eElementType.type_debug_cmd, 0b10100000]);
    this.automatic_symbols.set(SYMBOLS.SHEX_, [eElementType.type_debug_cmd, 0b10100010]);
    this.automatic_symbols.set(SYMBOLS.SHEX_BYTE, [eElementType.type_debug_cmd, 0b10100100]);
    this.automatic_symbols.set(SYMBOLS.SHEX_BYTE_, [eElementType.type_debug_cmd, 0b10100110]);
    this.automatic_symbols.set(SYMBOLS.SHEX_WORD, [eElementType.type_debug_cmd, 0b10101000]);
    this.automatic_symbols.set(SYMBOLS.SHEX_WORD_, [eElementType.type_debug_cmd, 0b10101010]);
    this.automatic_symbols.set(SYMBOLS.SHEX_LONG, [eElementType.type_debug_cmd, 0b10101100]);
    this.automatic_symbols.set(SYMBOLS.SHEX_LONG_, [eElementType.type_debug_cmd, 0b10101110]);
    this.automatic_symbols.set(SYMBOLS.SHEX_REG_ARRAY, [eElementType.type_debug_cmd, 0b10110000]);
    this.automatic_symbols.set(SYMBOLS.SHEX_REG_ARRAY_, [eElementType.type_debug_cmd, 0b10110010]);
    this.automatic_symbols.set(SYMBOLS.SHEX_BYTE_ARRAY, [eElementType.type_debug_cmd, 0b10110100]);
    this.automatic_symbols.set(SYMBOLS.SHEX_BYTE_ARRAY_, [eElementType.type_debug_cmd, 0b10110110]);
    this.automatic_symbols.set(SYMBOLS.SHEX_WORD_ARRAY, [eElementType.type_debug_cmd, 0b10111000]);
    this.automatic_symbols.set(SYMBOLS.SHEX_WORD_ARRAY_, [eElementType.type_debug_cmd, 0b10111010]);
    this.automatic_symbols.set(SYMBOLS.SHEX_LONG_ARRAY, [eElementType.type_debug_cmd, 0b10111100]);
    this.automatic_symbols.set(SYMBOLS.SHEX_LONG_ARRAY_, [eElementType.type_debug_cmd, 0b10111110]);

    this.automatic_symbols.set(SYMBOLS.UBIN, [eElementType.type_debug_cmd, 0b11000000]);
    this.automatic_symbols.set(SYMBOLS.UBIN_, [eElementType.type_debug_cmd, 0b11000010]);
    this.automatic_symbols.set(SYMBOLS.UBIN_BYTE, [eElementType.type_debug_cmd, 0b11000100]);
    this.automatic_symbols.set(SYMBOLS.UBIN_BYTE_, [eElementType.type_debug_cmd, 0b11000110]);
    this.automatic_symbols.set(SYMBOLS.UBIN_WORD, [eElementType.type_debug_cmd, 0b11001000]);
    this.automatic_symbols.set(SYMBOLS.UBIN_WORD_, [eElementType.type_debug_cmd, 0b11001010]);
    this.automatic_symbols.set(SYMBOLS.UBIN_LONG, [eElementType.type_debug_cmd, 0b11001100]);
    this.automatic_symbols.set(SYMBOLS.UBIN_LONG_, [eElementType.type_debug_cmd, 0b11001110]);
    this.automatic_symbols.set(SYMBOLS.UBIN_REG_ARRAY, [eElementType.type_debug_cmd, 0b11010000]);
    this.automatic_symbols.set(SYMBOLS.UBIN_REG_ARRAY_, [eElementType.type_debug_cmd, 0b11010010]);
    this.automatic_symbols.set(SYMBOLS.UBIN_BYTE_ARRAY, [eElementType.type_debug_cmd, 0b11010100]);
    this.automatic_symbols.set(SYMBOLS.UBIN_BYTE_ARRAY_, [eElementType.type_debug_cmd, 0b11010110]);
    this.automatic_symbols.set(SYMBOLS.UBIN_WORD_ARRAY, [eElementType.type_debug_cmd, 0b11011000]);
    this.automatic_symbols.set(SYMBOLS.UBIN_WORD_ARRAY_, [eElementType.type_debug_cmd, 0b11011010]);
    this.automatic_symbols.set(SYMBOLS.UBIN_LONG_ARRAY, [eElementType.type_debug_cmd, 0b11011100]);
    this.automatic_symbols.set(SYMBOLS.UBIN_LONG_ARRAY_, [eElementType.type_debug_cmd, 0b11011110]);

    this.automatic_symbols.set(SYMBOLS.SBIN, [eElementType.type_debug_cmd, 0b11100000]);
    this.automatic_symbols.set(SYMBOLS.SBIN_, [eElementType.type_debug_cmd, 0b11100010]);
    this.automatic_symbols.set(SYMBOLS.SBIN_BYTE, [eElementType.type_debug_cmd, 0b11100100]);
    this.automatic_symbols.set(SYMBOLS.SBIN_BYTE_, [eElementType.type_debug_cmd, 0b11100110]);
    this.automatic_symbols.set(SYMBOLS.SBIN_WORD, [eElementType.type_debug_cmd, 0b11101000]);
    this.automatic_symbols.set(SYMBOLS.SBIN_WORD_, [eElementType.type_debug_cmd, 0b11101010]);
    this.automatic_symbols.set(SYMBOLS.SBIN_LONG, [eElementType.type_debug_cmd, 0b11101100]);
    this.automatic_symbols.set(SYMBOLS.SBIN_LONG_, [eElementType.type_debug_cmd, 0b11101110]);
    this.automatic_symbols.set(SYMBOLS.SBIN_REG_ARRAY, [eElementType.type_debug_cmd, 0b11110000]);
    this.automatic_symbols.set(SYMBOLS.SBIN_REG_ARRAY_, [eElementType.type_debug_cmd, 0b11110010]);
    this.automatic_symbols.set(SYMBOLS.SBIN_BYTE_ARRAY, [eElementType.type_debug_cmd, 0b11110100]);
    this.automatic_symbols.set(SYMBOLS.SBIN_BYTE_ARRAY_, [eElementType.type_debug_cmd, 0b11110110]);
    this.automatic_symbols.set(SYMBOLS.SBIN_WORD_ARRAY, [eElementType.type_debug_cmd, 0b11111000]);
    this.automatic_symbols.set(SYMBOLS.SBIN_WORD_ARRAY_, [eElementType.type_debug_cmd, 0b11111010]);
    this.automatic_symbols.set(SYMBOLS.SBIN_LONG_ARRAY, [eElementType.type_debug_cmd, 0b11111100]);
    this.automatic_symbols.set(SYMBOLS.SBIN_LONG_ARRAY_, [eElementType.type_debug_cmd, 0b11111110]);

    this.automatic_symbols.set(SYMBOLS.END, [eElementType.type_asm_end, 0]); // misc
    this.automatic_symbols.set(SYMBOLS._, [eElementType.type_under, 0]);

    this.automatic_symbols.set(SYMBOLS.HUBSET, [eElementType.type_i_flex, this.flexValue(eFlexcode.fc_hubset)]); // (also asm instruction)

    this.automatic_symbols.set(SYMBOLS.COGINIT, [eElementType.type_i_flex, this.flexValue(eFlexcode.fc_coginit)]); // (also asm instruction)
    this.automatic_symbols.set(SYMBOLS.COGSTOP, [eElementType.type_i_flex, this.flexValue(eFlexcode.fc_cogstop)]); // (also asm instruction)
    this.automatic_symbols.set(SYMBOLS.COGID, [eElementType.type_i_flex, this.flexValue(eFlexcode.fc_cogid)]); // (also asm instruction)
    this.automatic_symbols.set(SYMBOLS.COGCHK, [eElementType.type_i_flex, this.flexValue(eFlexcode.fc_cogchk)]);

    this.automatic_symbols.set(SYMBOLS.GETRND, [eElementType.type_i_flex, this.flexValue(eFlexcode.fc_getrnd)]); // (also asm instruction)
    this.automatic_symbols.set(SYMBOLS.GETCT, [eElementType.type_i_flex, this.flexValue(eFlexcode.fc_getct)]); // (also asm instruction)
    this.automatic_symbols.set(SYMBOLS.POLLCT, [eElementType.type_i_flex, this.flexValue(eFlexcode.fc_pollct)]);
    this.automatic_symbols.set(SYMBOLS.WAITCT, [eElementType.type_i_flex, this.flexValue(eFlexcode.fc_waitct)]);

    this.automatic_symbols.set(SYMBOLS.PINWRITE, [eElementType.type_i_flex, this.flexValue(eFlexcode.fc_pinwrite)]);
    this.automatic_symbols.set(SYMBOLS.PINW, [eElementType.type_i_flex, this.flexValue(eFlexcode.fc_pinwrite)]);
    this.automatic_symbols.set(SYMBOLS.PINLOW, [eElementType.type_i_flex, this.flexValue(eFlexcode.fc_pinlow)]);
    this.automatic_symbols.set(SYMBOLS.PINL, [eElementType.type_i_flex, this.flexValue(eFlexcode.fc_pinlow)]);
    this.automatic_symbols.set(SYMBOLS.PINHIGH, [eElementType.type_i_flex, this.flexValue(eFlexcode.fc_pinhigh)]);
    this.automatic_symbols.set(SYMBOLS.PINH, [eElementType.type_i_flex, this.flexValue(eFlexcode.fc_pinhigh)]);
    this.automatic_symbols.set(SYMBOLS.PINTOGGLE, [eElementType.type_i_flex, this.flexValue(eFlexcode.fc_pintoggle)]);
    this.automatic_symbols.set(SYMBOLS.PINT, [eElementType.type_i_flex, this.flexValue(eFlexcode.fc_pintoggle)]);
    this.automatic_symbols.set(SYMBOLS.PINFLOAT, [eElementType.type_i_flex, this.flexValue(eFlexcode.fc_pinfloat)]);
    this.automatic_symbols.set(SYMBOLS.PINF, [eElementType.type_i_flex, this.flexValue(eFlexcode.fc_pinfloat)]);
    this.automatic_symbols.set(SYMBOLS.PINREAD, [eElementType.type_i_flex, this.flexValue(eFlexcode.fc_pinread)]);
    this.automatic_symbols.set(SYMBOLS.PINR, [eElementType.type_i_flex, this.flexValue(eFlexcode.fc_pinread)]);

    this.automatic_symbols.set(SYMBOLS.PINSTART, [eElementType.type_i_flex, this.flexValue(eFlexcode.fc_pinstart)]);
    this.automatic_symbols.set(SYMBOLS.PINCLEAR, [eElementType.type_i_flex, this.flexValue(eFlexcode.fc_pinclear)]);

    this.automatic_symbols.set(SYMBOLS.WRPIN, [eElementType.type_i_flex, this.flexValue(eFlexcode.fc_wrpin)]); // (also asm instruction)
    this.automatic_symbols.set(SYMBOLS.WXPIN, [eElementType.type_i_flex, this.flexValue(eFlexcode.fc_wxpin)]); // (also asm instruction)
    this.automatic_symbols.set(SYMBOLS.WYPIN, [eElementType.type_i_flex, this.flexValue(eFlexcode.fc_wypin)]); // (also asm instruction)
    this.automatic_symbols.set(SYMBOLS.AKPIN, [eElementType.type_i_flex, this.flexValue(eFlexcode.fc_akpin)]); // (also asm instruction)
    this.automatic_symbols.set(SYMBOLS.RDPIN, [eElementType.type_i_flex, this.flexValue(eFlexcode.fc_rdpin)]); // (also asm instruction)
    this.automatic_symbols.set(SYMBOLS.RQPIN, [eElementType.type_i_flex, this.flexValue(eFlexcode.fc_rqpin)]); // (also asm instruction)

    this.automatic_symbols.set(SYMBOLS.ROTXY, [eElementType.type_i_flex, this.flexValue(eFlexcode.fc_rotxy)]);
    this.automatic_symbols.set(SYMBOLS.POLXY, [eElementType.type_i_flex, this.flexValue(eFlexcode.fc_polxy)]);
    this.automatic_symbols.set(SYMBOLS.XYPOL, [eElementType.type_i_flex, this.flexValue(eFlexcode.fc_xypol)]);

    this.automatic_symbols.set(SYMBOLS.LOCKNEW, [eElementType.type_i_flex, this.flexValue(eFlexcode.fc_locknew)]); // (also asm instruction)
    this.automatic_symbols.set(SYMBOLS.LOCKRET, [eElementType.type_i_flex, this.flexValue(eFlexcode.fc_lockret)]); // (also asm instruction)
    this.automatic_symbols.set(SYMBOLS.LOCKTRY, [eElementType.type_i_flex, this.flexValue(eFlexcode.fc_locktry)]); // (also asm instruction)
    this.automatic_symbols.set(SYMBOLS.LOCKREL, [eElementType.type_i_flex, this.flexValue(eFlexcode.fc_lockrel)]); // (also asm instruction)
    this.automatic_symbols.set(SYMBOLS.LOCKCHK, [eElementType.type_i_flex, this.flexValue(eFlexcode.fc_lockchk)]);

    this.automatic_symbols.set(SYMBOLS.COGATN, [eElementType.type_i_flex, this.flexValue(eFlexcode.fc_cogatn)]); // (also asm instruction)
    this.automatic_symbols.set(SYMBOLS.POLLATN, [eElementType.type_i_flex, this.flexValue(eFlexcode.fc_pollatn)]); // (also asm instruction)
    this.automatic_symbols.set(SYMBOLS.WAITATN, [eElementType.type_i_flex, this.flexValue(eFlexcode.fc_waitatn)]); // (also asm instruction)

    this.automatic_symbols.set(SYMBOLS.CLKSET, [eElementType.type_i_flex, this.flexValue(eFlexcode.fc_clkset)]);
    this.automatic_symbols.set(SYMBOLS.REGEXEC, [eElementType.type_i_flex, this.flexValue(eFlexcode.fc_regexec)]);
    this.automatic_symbols.set(SYMBOLS.REGLOAD, [eElementType.type_i_flex, this.flexValue(eFlexcode.fc_regload)]);
    this.automatic_symbols.set(SYMBOLS.CALL, [eElementType.type_i_flex, this.flexValue(eFlexcode.fc_call)]); // (also asm instruction)
    this.automatic_symbols.set(SYMBOLS.GETREGS, [eElementType.type_i_flex, this.flexValue(eFlexcode.fc_getregs)]);
    this.automatic_symbols.set(SYMBOLS.SETREGS, [eElementType.type_i_flex, this.flexValue(eFlexcode.fc_setregs)]);

    this.automatic_symbols.set(SYMBOLS.BYTEMOVE, [eElementType.type_i_flex, this.flexValue(eFlexcode.fc_bytemove)]);
    this.automatic_symbols.set(SYMBOLS.BYTEFILL, [eElementType.type_i_flex, this.flexValue(eFlexcode.fc_bytefill)]);
    this.automatic_symbols.set(SYMBOLS.WORDMOVE, [eElementType.type_i_flex, this.flexValue(eFlexcode.fc_wordmove)]);
    this.automatic_symbols.set(SYMBOLS.WORDFILL, [eElementType.type_i_flex, this.flexValue(eFlexcode.fc_wordfill)]);
    this.automatic_symbols.set(SYMBOLS.LONGMOVE, [eElementType.type_i_flex, this.flexValue(eFlexcode.fc_longmove)]);
    this.automatic_symbols.set(SYMBOLS.LONGFILL, [eElementType.type_i_flex, this.flexValue(eFlexcode.fc_longfill)]);

    this.automatic_symbols.set(SYMBOLS.STRSIZE, [eElementType.type_i_flex, this.flexValue(eFlexcode.fc_strsize)]);
    this.automatic_symbols.set(SYMBOLS.STRCOMP, [eElementType.type_i_flex, this.flexValue(eFlexcode.fc_strcomp)]);
    this.automatic_symbols.set(SYMBOLS.STRCOPY, [eElementType.type_i_flex, this.flexValue(eFlexcode.fc_strcopy)]);

    this.automatic_symbols.set(SYMBOLS.GETCRC, [eElementType.type_i_flex, this.flexValue(eFlexcode.fc_getcrc)]);

    this.automatic_symbols.set(SYMBOLS.WAITUS, [eElementType.type_i_flex, this.flexValue(eFlexcode.fc_waitus)]);
    this.automatic_symbols.set(SYMBOLS.WAITMS, [eElementType.type_i_flex, this.flexValue(eFlexcode.fc_waitms)]);
    this.automatic_symbols.set(SYMBOLS.GETMS, [eElementType.type_i_flex, this.flexValue(eFlexcode.fc_getms)]);
    this.automatic_symbols.set(SYMBOLS.GETSEC, [eElementType.type_i_flex, this.flexValue(eFlexcode.fc_getsec)]);
    this.automatic_symbols.set(SYMBOLS.MULDIV64, [eElementType.type_i_flex, this.flexValue(eFlexcode.fc_muldiv64)]);
    this.automatic_symbols.set(SYMBOLS.QSIN, [eElementType.type_i_flex, this.flexValue(eFlexcode.fc_qsin)]);
    this.automatic_symbols.set(SYMBOLS.QCOS, [eElementType.type_i_flex, this.flexValue(eFlexcode.fc_qcos)]);

    this.automatic_symbols.set(SYMBOLS.NAN, [eElementType.type_i_flex, this.flexValue(eFlexcode.fc_nan)]);

    this.automatic_symbols.set(SYMBOLS.ORGH, [eElementType.type_asm_dir, eValueType.dir_orgh]); // assembly directives
    this.automatic_symbols.set(SYMBOLS.ALIGNW, [eElementType.type_asm_dir, eValueType.dir_alignw]);
    this.automatic_symbols.set(SYMBOLS.ALIGNL, [eElementType.type_asm_dir, eValueType.dir_alignl]);
    this.automatic_symbols.set(SYMBOLS.ORG, [eElementType.type_asm_dir, eValueType.dir_org]);
    this.automatic_symbols.set(SYMBOLS.ORGF, [eElementType.type_asm_dir, eValueType.dir_orgf]);
    this.automatic_symbols.set(SYMBOLS.RES, [eElementType.type_asm_dir, eValueType.dir_res]);
    this.automatic_symbols.set(SYMBOLS.FIT, [eElementType.type_asm_dir, eValueType.dir_fit]);

    this.automatic_symbols.set(SYMBOLS._RET_, [eElementType.type_asm_cond, eValueType.if_never]); // assembly conditionals
    this.automatic_symbols.set(SYMBOLS.IF_NC_AND_NZ, [eElementType.type_asm_cond, eValueType.if_nc_and_nz]);
    this.automatic_symbols.set(SYMBOLS.IF_NZ_AND_NC, [eElementType.type_asm_cond, eValueType.if_nc_and_nz]);
    this.automatic_symbols.set(SYMBOLS.IF_GT, [eElementType.type_asm_cond, eValueType.if_nc_and_nz]);
    this.automatic_symbols.set(SYMBOLS.IF_A, [eElementType.type_asm_cond, eValueType.if_nc_and_nz]);
    this.automatic_symbols.set(SYMBOLS.IF_NC_AND_Z, [eElementType.type_asm_cond, eValueType.if_nc_and_z]);
    this.automatic_symbols.set(SYMBOLS.IF_Z_AND_NC, [eElementType.type_asm_cond, eValueType.if_nc_and_z]);
    this.automatic_symbols.set(SYMBOLS.IF_NC, [eElementType.type_asm_cond, eValueType.if_nc]);
    this.automatic_symbols.set(SYMBOLS.IF_GE, [eElementType.type_asm_cond, eValueType.if_nc]);
    this.automatic_symbols.set(SYMBOLS.IF_AE, [eElementType.type_asm_cond, eValueType.if_nc]);
    this.automatic_symbols.set(SYMBOLS.IF_C_AND_NZ, [eElementType.type_asm_cond, eValueType.if_c_and_nz]);
    this.automatic_symbols.set(SYMBOLS.IF_NZ_AND_C, [eElementType.type_asm_cond, eValueType.if_c_and_nz]);
    this.automatic_symbols.set(SYMBOLS.IF_NZ, [eElementType.type_asm_cond, eValueType.if_nz]);
    this.automatic_symbols.set(SYMBOLS.IF_NE, [eElementType.type_asm_cond, eValueType.if_nz]);
    this.automatic_symbols.set(SYMBOLS.IF_C_NE_Z, [eElementType.type_asm_cond, eValueType.if_c_ne_z]);
    this.automatic_symbols.set(SYMBOLS.IF_Z_NE_C, [eElementType.type_asm_cond, eValueType.if_c_ne_z]);
    this.automatic_symbols.set(SYMBOLS.IF_NC_OR_NZ, [eElementType.type_asm_cond, eValueType.if_nc_or_nz]);
    this.automatic_symbols.set(SYMBOLS.IF_NZ_OR_NC, [eElementType.type_asm_cond, eValueType.if_nc_or_nz]);
    this.automatic_symbols.set(SYMBOLS.IF_C_AND_Z, [eElementType.type_asm_cond, eValueType.if_c_and_z]);
    this.automatic_symbols.set(SYMBOLS.IF_Z_AND_C, [eElementType.type_asm_cond, eValueType.if_c_and_z]);
    this.automatic_symbols.set(SYMBOLS.IF_C_EQ_Z, [eElementType.type_asm_cond, eValueType.if_c_eq_z]);
    this.automatic_symbols.set(SYMBOLS.IF_Z_EQ_C, [eElementType.type_asm_cond, eValueType.if_c_eq_z]);
    this.automatic_symbols.set(SYMBOLS.IF_Z, [eElementType.type_asm_cond, eValueType.if_z]);
    this.automatic_symbols.set(SYMBOLS.IF_E, [eElementType.type_asm_cond, eValueType.if_z]);
    this.automatic_symbols.set(SYMBOLS.IF_NC_OR_Z, [eElementType.type_asm_cond, eValueType.if_nc_or_z]);
    this.automatic_symbols.set(SYMBOLS.IF_Z_OR_NC, [eElementType.type_asm_cond, eValueType.if_nc_or_z]);
    this.automatic_symbols.set(SYMBOLS.IF_C, [eElementType.type_asm_cond, eValueType.if_c]);
    this.automatic_symbols.set(SYMBOLS.IF_LT, [eElementType.type_asm_cond, eValueType.if_c]);
    this.automatic_symbols.set(SYMBOLS.IF_B, [eElementType.type_asm_cond, eValueType.if_c]);
    this.automatic_symbols.set(SYMBOLS.IF_C_OR_NZ, [eElementType.type_asm_cond, eValueType.if_c_or_nz]);
    this.automatic_symbols.set(SYMBOLS.IF_NZ_OR_C, [eElementType.type_asm_cond, eValueType.if_c_or_nz]);
    this.automatic_symbols.set(SYMBOLS.IF_C_OR_Z, [eElementType.type_asm_cond, eValueType.if_c_or_z]);
    this.automatic_symbols.set(SYMBOLS.IF_Z_OR_C, [eElementType.type_asm_cond, eValueType.if_c_or_z]);
    this.automatic_symbols.set(SYMBOLS.IF_LE, [eElementType.type_asm_cond, eValueType.if_c_or_z]);
    this.automatic_symbols.set(SYMBOLS.IF_BE, [eElementType.type_asm_cond, eValueType.if_c_or_z]);
    this.automatic_symbols.set(SYMBOLS.IF_ALWAYS, [eElementType.type_asm_cond, eValueType.if_always]);

    this.automatic_symbols.set(SYMBOLS.IF_00, [eElementType.type_asm_cond, eValueType.if_nc_and_nz]);
    this.automatic_symbols.set(SYMBOLS.IF_01, [eElementType.type_asm_cond, eValueType.if_nc_and_z]);
    this.automatic_symbols.set(SYMBOLS.IF_10, [eElementType.type_asm_cond, eValueType.if_c_and_nz]);
    this.automatic_symbols.set(SYMBOLS.IF_11, [eElementType.type_asm_cond, eValueType.if_c_and_z]);
    this.automatic_symbols.set(SYMBOLS.IF_X0, [eElementType.type_asm_cond, eValueType.if_nz]);
    this.automatic_symbols.set(SYMBOLS.IF_X1, [eElementType.type_asm_cond, eValueType.if_z]);
    this.automatic_symbols.set(SYMBOLS.IF_0X, [eElementType.type_asm_cond, eValueType.if_nc]);
    this.automatic_symbols.set(SYMBOLS.IF_1X, [eElementType.type_asm_cond, eValueType.if_c]);
    this.automatic_symbols.set(SYMBOLS.IF_NOT_00, [eElementType.type_asm_cond, eValueType.if_c_or_z]);
    this.automatic_symbols.set(SYMBOLS.IF_NOT_01, [eElementType.type_asm_cond, eValueType.if_c_or_nz]);
    this.automatic_symbols.set(SYMBOLS.IF_NOT_10, [eElementType.type_asm_cond, eValueType.if_nc_or_z]);
    this.automatic_symbols.set(SYMBOLS.IF_NOT_11, [eElementType.type_asm_cond, eValueType.if_nc_or_nz]);
    this.automatic_symbols.set(SYMBOLS.IF_SAME, [eElementType.type_asm_cond, eValueType.if_c_eq_z]);
    this.automatic_symbols.set(SYMBOLS.IF_DIFF, [eElementType.type_asm_cond, eValueType.if_c_ne_z]);

    this.automatic_symbols.set(SYMBOLS.IF_0000, [eElementType.type_asm_cond, 0b0000]);
    this.automatic_symbols.set(SYMBOLS.IF_0001, [eElementType.type_asm_cond, 0b0001]);
    this.automatic_symbols.set(SYMBOLS.IF_0010, [eElementType.type_asm_cond, 0b0010]);
    this.automatic_symbols.set(SYMBOLS.IF_0011, [eElementType.type_asm_cond, 0b0011]);
    this.automatic_symbols.set(SYMBOLS.IF_0100, [eElementType.type_asm_cond, 0b0100]);
    this.automatic_symbols.set(SYMBOLS.IF_0101, [eElementType.type_asm_cond, 0b0101]);
    this.automatic_symbols.set(SYMBOLS.IF_0110, [eElementType.type_asm_cond, 0b0110]);
    this.automatic_symbols.set(SYMBOLS.IF_0111, [eElementType.type_asm_cond, 0b0111]);
    this.automatic_symbols.set(SYMBOLS.IF_1000, [eElementType.type_asm_cond, 0b1000]);
    this.automatic_symbols.set(SYMBOLS.IF_1001, [eElementType.type_asm_cond, 0b1001]);
    this.automatic_symbols.set(SYMBOLS.IF_1010, [eElementType.type_asm_cond, 0b1010]);
    this.automatic_symbols.set(SYMBOLS.IF_1011, [eElementType.type_asm_cond, 0b1011]);
    this.automatic_symbols.set(SYMBOLS.IF_1100, [eElementType.type_asm_cond, 0b1100]);
    this.automatic_symbols.set(SYMBOLS.IF_1101, [eElementType.type_asm_cond, 0b1101]);
    this.automatic_symbols.set(SYMBOLS.IF_1110, [eElementType.type_asm_cond, 0b1110]);
    this.automatic_symbols.set(SYMBOLS.IF_1111, [eElementType.type_asm_cond, 0b1111]);

    // assembly instructions

    // 	sym	type_asm_inst,		ac_ror,		'ROR'		(declared as type_op)
    // 	sym	type_asm_inst,		ac_rol,		'ROL'		(declared as type_op)
    this.automatic_symbols.set(SYMBOLS.SHR, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_shr)]);
    this.automatic_symbols.set(SYMBOLS.SHL, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_shl)]);
    this.automatic_symbols.set(SYMBOLS.RCR, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_rcr)]);
    this.automatic_symbols.set(SYMBOLS.RCL, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_rcl)]);
    // 	sym	type_asm_inst,		ac_sar,		'SAR'		(declared as type_op)
    this.automatic_symbols.set(SYMBOLS.SAL, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_sal)]);

    this.automatic_symbols.set(SYMBOLS.ADD, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_add)]);
    this.automatic_symbols.set(SYMBOLS.ADDX, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_addx)]);
    this.automatic_symbols.set(SYMBOLS.ADDS, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_adds)]);
    this.automatic_symbols.set(SYMBOLS.ADDSX, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_addsx)]);

    this.automatic_symbols.set(SYMBOLS.SUB, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_sub)]);
    this.automatic_symbols.set(SYMBOLS.SUBX, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_subx)]);
    this.automatic_symbols.set(SYMBOLS.SUBS, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_subs)]);
    this.automatic_symbols.set(SYMBOLS.SUBSX, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_subsx)]);

    this.automatic_symbols.set(SYMBOLS.CMP, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_cmp)]);
    this.automatic_symbols.set(SYMBOLS.CMPX, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_cmpx)]);
    this.automatic_symbols.set(SYMBOLS.CMPS, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_cmps)]);
    this.automatic_symbols.set(SYMBOLS.CMPSX, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_cmpsx)]);

    this.automatic_symbols.set(SYMBOLS.CMPR, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_cmpr)]);
    this.automatic_symbols.set(SYMBOLS.CMPM, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_cmpm)]);
    this.automatic_symbols.set(SYMBOLS.SUBR, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_subr)]);
    this.automatic_symbols.set(SYMBOLS.CMPSUB, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_cmpsub)]);

    this.automatic_symbols.set(SYMBOLS.FGE, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_fge)]);
    this.automatic_symbols.set(SYMBOLS.FLE, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_fle)]);
    this.automatic_symbols.set(SYMBOLS.FGES, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_fges)]);
    this.automatic_symbols.set(SYMBOLS.FLES, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_fles)]);

    this.automatic_symbols.set(SYMBOLS.SUMC, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_sumc)]);
    this.automatic_symbols.set(SYMBOLS.SUMNC, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_sumnc)]);
    this.automatic_symbols.set(SYMBOLS.SUMZ, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_sumz)]);
    this.automatic_symbols.set(SYMBOLS.SUMNZ, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_sumnz)]);

    this.automatic_symbols.set(SYMBOLS.BITL, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_bitl)]);
    this.automatic_symbols.set(SYMBOLS.BITH, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_bith)]);
    this.automatic_symbols.set(SYMBOLS.BITC, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_bitc)]);
    this.automatic_symbols.set(SYMBOLS.BITNC, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_bitnc)]);
    this.automatic_symbols.set(SYMBOLS.BITZ, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_bitz)]);
    this.automatic_symbols.set(SYMBOLS.BITNZ, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_bitnz)]);
    this.automatic_symbols.set(SYMBOLS.BITRND, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_bitrnd)]);
    this.automatic_symbols.set(SYMBOLS.BITNOT, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_bitnot)]);

    this.automatic_symbols.set(SYMBOLS.TESTB, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_testb)]);
    this.automatic_symbols.set(SYMBOLS.TESTBN, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_testbn)]);

    // 	sym	type_asm_inst,		ac_and,		'AND'		(declared as type_op)
    this.automatic_symbols.set(SYMBOLS.ANDN, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_andn)]);
    // 	sym	type_asm_inst,		ac_or,		'OR'		(declared as type_op)
    // 	sym	type_asm_inst,		ac_xor,		'XOR'		(declared as type_op)

    this.automatic_symbols.set(SYMBOLS.MUXC, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_muxc)]);
    this.automatic_symbols.set(SYMBOLS.MUXNC, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_muxnc)]);
    this.automatic_symbols.set(SYMBOLS.MUXZ, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_muxz)]);
    this.automatic_symbols.set(SYMBOLS.MUXNZ, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_muxnz)]);

    this.automatic_symbols.set(SYMBOLS.MOV, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_mov)]);
    // 	sym	type_asm_inst,		ac_not,		'NOT'		(declared as type_op)
    // 	sym	type_asm_inst,		ac_abs,		'ABS'		(declared as type_op)
    this.automatic_symbols.set(SYMBOLS.NEG, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_neg)]);

    this.automatic_symbols.set(SYMBOLS.NEGC, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_negc)]);
    this.automatic_symbols.set(SYMBOLS.NEGNC, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_negnc)]);
    this.automatic_symbols.set(SYMBOLS.NEGZ, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_negz)]);
    this.automatic_symbols.set(SYMBOLS.NEGNZ, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_negnz)]);

    this.automatic_symbols.set(SYMBOLS.INCMOD, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_incmod)]);
    this.automatic_symbols.set(SYMBOLS.DECMOD, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_decmod)]);
    // 	sym	type_asm_inst,		ac_zerox,	'ZEROX'		(declared as type_op)
    // 	sym	type_asm_inst,		ac_signx,	'SIGNX'		(declared as type_op)

    // 	sym	type_asm_inst,		ac_encod,	'ENCOD'		(declared as type_op)
    // 	sym	type_asm_inst,		ac_ones,	'ONES'		(declared as type_op)
    this.automatic_symbols.set(SYMBOLS.TEST, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_test)]);
    this.automatic_symbols.set(SYMBOLS.TESTN, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_testn)]);

    this.automatic_symbols.set(SYMBOLS.SETNIB, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_setnib)]);
    this.automatic_symbols.set(SYMBOLS.GETNIB, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_getnib)]);
    this.automatic_symbols.set(SYMBOLS.ROLNIB, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_rolnib)]);

    this.automatic_symbols.set(SYMBOLS.SETBYTE, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_setbyte)]);
    this.automatic_symbols.set(SYMBOLS.GETBYTE, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_getbyte)]);
    this.automatic_symbols.set(SYMBOLS.ROLBYTE, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_rolbyte)]);

    this.automatic_symbols.set(SYMBOLS.SETWORD, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_setword)]);
    this.automatic_symbols.set(SYMBOLS.GETWORD, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_getword)]);
    this.automatic_symbols.set(SYMBOLS.ROLWORD, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_rolword)]);

    this.automatic_symbols.set(SYMBOLS.ALTSN, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_altsn)]);
    this.automatic_symbols.set(SYMBOLS.ALTGN, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_altgn)]);
    this.automatic_symbols.set(SYMBOLS.ALTSB, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_altsb)]);
    this.automatic_symbols.set(SYMBOLS.ALTGB, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_altgb)]);
    this.automatic_symbols.set(SYMBOLS.ALTSW, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_altsw)]);
    this.automatic_symbols.set(SYMBOLS.ALTGW, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_altgw)]);
    this.automatic_symbols.set(SYMBOLS.ALTR, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_altr)]);
    this.automatic_symbols.set(SYMBOLS.ALTD, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_altd)]);
    this.automatic_symbols.set(SYMBOLS.ALTS, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_alts)]);
    this.automatic_symbols.set(SYMBOLS.ALTB, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_altb)]);
    this.automatic_symbols.set(SYMBOLS.ALTI, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_alti)]);
    this.automatic_symbols.set(SYMBOLS.SETR, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_setr)]);
    this.automatic_symbols.set(SYMBOLS.SETD, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_setd)]);
    this.automatic_symbols.set(SYMBOLS.SETS, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_sets)]);
    // 	sym	type_asm_inst,		ac_decod,	'DECOD'		(declared as type_op)
    // 	sym	type_asm_inst,		ac_bmask,	'BMASK'		(declared as type_op)
    this.automatic_symbols.set(SYMBOLS.CRCBIT, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_crcbit)]);
    this.automatic_symbols.set(SYMBOLS.CRCNIB, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_crcnib)]);
    this.automatic_symbols.set(SYMBOLS.MUXNITS, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_muxnits)]);
    this.automatic_symbols.set(SYMBOLS.MUXNIBS, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_muxnibs)]);
    this.automatic_symbols.set(SYMBOLS.MUXQ, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_muxq)]);
    this.automatic_symbols.set(SYMBOLS.MOVBYTS, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_movbyts)]);

    this.automatic_symbols.set(SYMBOLS.MUL, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_mul)]);
    this.automatic_symbols.set(SYMBOLS.MULS, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_muls)]);
    // 	sym	type_asm_inst,		ac_sca,		'SCA'		(declared as type_op)
    // 	sym	type_asm_inst,		ac_scas,	'SCAS'		(declared as type_op)

    this.automatic_symbols.set(SYMBOLS.ADDPIX, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_addpix)]);
    this.automatic_symbols.set(SYMBOLS.MULPIX, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_mulpix)]);
    this.automatic_symbols.set(SYMBOLS.BLNPIX, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_blnpix)]);
    this.automatic_symbols.set(SYMBOLS.MIXPIX, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_mixpix)]);

    this.automatic_symbols.set(SYMBOLS.ADDCT1, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_addct1)]);
    this.automatic_symbols.set(SYMBOLS.ADDCT2, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_addct2)]);
    this.automatic_symbols.set(SYMBOLS.ADDCT3, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_addct3)]);
    this.automatic_symbols.set(SYMBOLS.WMLONG, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_wmlong)]);

    // 	sym	type_asm_inst,		ac_rqpin,	'RQPIN'		(declared as type_i_flex)
    // 	sym	type_asm_inst,		ac_rdpin,	'RDPIN'		(declared as type_i_flex)
    this.automatic_symbols.set(SYMBOLS.RDLUT, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_rdlut)]);

    this.automatic_symbols.set(SYMBOLS.RDBYTE, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_rdbyte)]);
    this.automatic_symbols.set(SYMBOLS.RDWORD, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_rdword)]);
    this.automatic_symbols.set(SYMBOLS.RDLONG, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_rdlong)]);

    this.automatic_symbols.set(SYMBOLS.CALLPA, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_callpa)]);
    this.automatic_symbols.set(SYMBOLS.CALLPB, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_callpb)]);

    this.automatic_symbols.set(SYMBOLS.DJZ, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_djz)]);
    this.automatic_symbols.set(SYMBOLS.DJNZ, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_djnz)]);
    this.automatic_symbols.set(SYMBOLS.DJF, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_djf)]);
    this.automatic_symbols.set(SYMBOLS.DJNF, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_djnf)]);

    this.automatic_symbols.set(SYMBOLS.IJZ, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_ijz)]);
    this.automatic_symbols.set(SYMBOLS.IJNZ, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_ijnz)]);

    this.automatic_symbols.set(SYMBOLS.TJZ, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_tjz)]);
    this.automatic_symbols.set(SYMBOLS.TJNZ, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_tjnz)]);
    this.automatic_symbols.set(SYMBOLS.TJF, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_tjf)]);
    this.automatic_symbols.set(SYMBOLS.TJNF, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_tjnf)]);
    this.automatic_symbols.set(SYMBOLS.TJS, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_tjs)]);
    this.automatic_symbols.set(SYMBOLS.TJNS, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_tjns)]);
    this.automatic_symbols.set(SYMBOLS.TJV, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_tjv)]);

    this.automatic_symbols.set(SYMBOLS.JINT, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_jint)]);
    this.automatic_symbols.set(SYMBOLS.JCT1, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_jct1)]);
    this.automatic_symbols.set(SYMBOLS.JCT2, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_jct2)]);
    this.automatic_symbols.set(SYMBOLS.JCT3, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_jct3)]);
    this.automatic_symbols.set(SYMBOLS.JSE1, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_jse1)]);
    this.automatic_symbols.set(SYMBOLS.JSE2, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_jse2)]);
    this.automatic_symbols.set(SYMBOLS.JSE3, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_jse3)]);
    this.automatic_symbols.set(SYMBOLS.JSE4, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_jse4)]);
    this.automatic_symbols.set(SYMBOLS.JPAT, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_jpat)]);
    this.automatic_symbols.set(SYMBOLS.JFBW, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_jfbw)]);
    this.automatic_symbols.set(SYMBOLS.JXMT, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_jxmt)]);
    this.automatic_symbols.set(SYMBOLS.JXFI, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_jxfi)]);
    this.automatic_symbols.set(SYMBOLS.JXRO, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_jxro)]);
    this.automatic_symbols.set(SYMBOLS.JXRL, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_jxrl)]);
    this.automatic_symbols.set(SYMBOLS.JATN, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_jatn)]);
    this.automatic_symbols.set(SYMBOLS.JQMT, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_jqmt)]);

    this.automatic_symbols.set(SYMBOLS.JNINT, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_jnint)]);
    this.automatic_symbols.set(SYMBOLS.JNCT1, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_jnct1)]);
    this.automatic_symbols.set(SYMBOLS.JNCT2, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_jnct2)]);
    this.automatic_symbols.set(SYMBOLS.JNCT3, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_jnct3)]);
    this.automatic_symbols.set(SYMBOLS.JNSE1, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_jnse1)]);
    this.automatic_symbols.set(SYMBOLS.JNSE2, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_jnse2)]);
    this.automatic_symbols.set(SYMBOLS.JNSE3, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_jnse3)]);
    this.automatic_symbols.set(SYMBOLS.JNSE4, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_jnse4)]);
    this.automatic_symbols.set(SYMBOLS.JNPAT, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_jnpat)]);
    this.automatic_symbols.set(SYMBOLS.JNFBW, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_jnfbw)]);
    this.automatic_symbols.set(SYMBOLS.JNXMT, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_jnxmt)]);
    this.automatic_symbols.set(SYMBOLS.JNXFI, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_jnxfi)]);
    this.automatic_symbols.set(SYMBOLS.JNXRO, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_jnxro)]);
    this.automatic_symbols.set(SYMBOLS.JNXRL, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_jnxrl)]);
    this.automatic_symbols.set(SYMBOLS.JNATN, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_jnatn)]);
    this.automatic_symbols.set(SYMBOLS.JNQMT, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_jnqmt)]);

    // 	sym	type_asm_inst,		ac_empty,	'<empty>'
    // 	sym	type_asm_inst,		ac_empty,	'<empty>'
    this.automatic_symbols.set(SYMBOLS.SETPAT, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_setpat)]);

    // 	sym	type_asm_inst,		ac_wrpin,	'WRPIN'		(declared as type_i_flex)
    // 	sym	type_asm_inst,		ac_wxpin,	'WXPIN'		(declared as type_i_flex)
    // 	sym	type_asm_inst,		ac_wypin,	'WYPIN'		(declared as type_i_flex)
    this.automatic_symbols.set(SYMBOLS.WRLUT, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_wrlut)]);

    this.automatic_symbols.set(SYMBOLS.WRBYTE, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_wrbyte)]);
    this.automatic_symbols.set(SYMBOLS.WRWORD, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_wrword)]);
    this.automatic_symbols.set(SYMBOLS.WRLONG, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_wrlong)]);

    this.automatic_symbols.set(SYMBOLS.RDFAST, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_rdfast)]);
    this.automatic_symbols.set(SYMBOLS.WRFAST, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_wrfast)]);
    this.automatic_symbols.set(SYMBOLS.FBLOCK, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_fblock)]);

    this.automatic_symbols.set(SYMBOLS.XINIT, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_xinit)]);
    this.automatic_symbols.set(SYMBOLS.XZERO, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_xzero)]);
    this.automatic_symbols.set(SYMBOLS.XCONT, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_xcont)]);

    this.automatic_symbols.set(SYMBOLS.REP, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_rep)]);

    // 	sym	type_asm_inst,		ac_coginit,	'COGINIT'	(declared as type_i_flex)
    this.automatic_symbols.set(SYMBOLS.QMUL, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_qmul)]);
    this.automatic_symbols.set(SYMBOLS.QDIV, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_qdiv)]);
    this.automatic_symbols.set(SYMBOLS.QFRAC, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_qfrac)]);
    this.automatic_symbols.set(SYMBOLS.QSQRT, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_qsqrt)]);
    this.automatic_symbols.set(SYMBOLS.QROTATE, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_qrotate)]);
    this.automatic_symbols.set(SYMBOLS.QVECTOR, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_qvector)]);

    // 	sym	type_asm_inst,		ac_hubset,	'HUBSET'	(declared as type_i_flex)
    // 	sym	type_asm_inst,		ac_cogid,	'COGID'		(declared as type_i_flex)
    // 	sym	type_asm_inst,		ac_cogstop,	'COGSTOP'	(declared as type_i_flex)
    // 	sym	type_asm_inst,		ac_locknew,	'LOCKNEW'	(declared as type_i_flex)
    // 	sym	type_asm_inst,		ac_lockret,	'LOCKRET'	(declared as type_i_flex)
    // 	sym	type_asm_inst,		ac_locktry,	'LOCKTRY'	(declared as type_i_flex)
    // 	sym	type_asm_inst,		ac_lockrel,	'LOCKREL'	(declared as type_i_flex)
    // 	sym	type_asm_inst,		ac_qlog,	'QLOG'		(declared as type_op)
    // 	sym	type_asm_inst,		ac_qexp,	'QEXP'		(declared as type_op)

    this.automatic_symbols.set(SYMBOLS.RFBYTE, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_rfbyte)]);
    this.automatic_symbols.set(SYMBOLS.RFWORD, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_rfword)]);
    this.automatic_symbols.set(SYMBOLS.RFLONG, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_rflong)]);
    this.automatic_symbols.set(SYMBOLS.RFVAR, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_rfvar)]);
    this.automatic_symbols.set(SYMBOLS.RFVARS, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_rfvars)]);

    this.automatic_symbols.set(SYMBOLS.WFBYTE, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_wfbyte)]);
    this.automatic_symbols.set(SYMBOLS.WFWORD, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_wfword)]);
    this.automatic_symbols.set(SYMBOLS.WFLONG, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_wflong)]);

    this.automatic_symbols.set(SYMBOLS.GETQX, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_getqx)]);
    this.automatic_symbols.set(SYMBOLS.GETQY, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_getqy)]);

    // 	sym	type_asm_inst,		ac_getct,	'GETCT'		(declared as type_i_flex)
    // 	sym	type_asm_inst,		ac_getrnd,	'GETRND'	(declared as type_i_flex)

    this.automatic_symbols.set(SYMBOLS.SETDACS, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_setdacs)]);
    this.automatic_symbols.set(SYMBOLS.SETXFRQ, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_setxfrq)]);
    this.automatic_symbols.set(SYMBOLS.GETXACC, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_getxacc)]);

    this.automatic_symbols.set(SYMBOLS.WAITX, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_waitx)]);

    this.automatic_symbols.set(SYMBOLS.SETSE1, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_setse1)]);
    this.automatic_symbols.set(SYMBOLS.SETSE2, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_setse2)]);
    this.automatic_symbols.set(SYMBOLS.SETSE3, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_setse3)]);
    this.automatic_symbols.set(SYMBOLS.SETSE4, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_setse4)]);

    this.automatic_symbols.set(SYMBOLS.POLLINT, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_pollint)]);
    this.automatic_symbols.set(SYMBOLS.POLLCT1, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_pollct1)]);
    this.automatic_symbols.set(SYMBOLS.POLLCT2, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_pollct2)]);
    this.automatic_symbols.set(SYMBOLS.POLLCT3, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_pollct3)]);
    this.automatic_symbols.set(SYMBOLS.POLLSE1, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_pollse1)]);
    this.automatic_symbols.set(SYMBOLS.POLLSE2, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_pollse2)]);
    this.automatic_symbols.set(SYMBOLS.POLLSE3, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_pollse3)]);
    this.automatic_symbols.set(SYMBOLS.POLLSE4, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_pollse4)]);
    this.automatic_symbols.set(SYMBOLS.POLLPAT, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_pollpat)]);
    this.automatic_symbols.set(SYMBOLS.POLLFBW, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_pollfbw)]);
    this.automatic_symbols.set(SYMBOLS.POLLXMT, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_pollxmt)]);
    this.automatic_symbols.set(SYMBOLS.POLLXFI, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_pollxfi)]);
    this.automatic_symbols.set(SYMBOLS.POLLXRO, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_pollxro)]);
    this.automatic_symbols.set(SYMBOLS.POLLXRL, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_pollxrl)]);
    // 	sym	type_asm_inst,		ac_pollatn,	'POLLATN'	(declared as type_i_flex)
    this.automatic_symbols.set(SYMBOLS.POLLQMT, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_pollqmt)]);

    this.automatic_symbols.set(SYMBOLS.WAITINT, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_waitint)]);
    this.automatic_symbols.set(SYMBOLS.WAITCT1, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_waitct1)]);
    this.automatic_symbols.set(SYMBOLS.WAITCT2, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_waitct2)]);
    this.automatic_symbols.set(SYMBOLS.WAITCT3, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_waitct3)]);
    this.automatic_symbols.set(SYMBOLS.WAITSE1, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_waitse1)]);
    this.automatic_symbols.set(SYMBOLS.WAITSE2, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_waitse2)]);
    this.automatic_symbols.set(SYMBOLS.WAITSE3, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_waitse3)]);
    this.automatic_symbols.set(SYMBOLS.WAITSE4, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_waitse4)]);
    this.automatic_symbols.set(SYMBOLS.WAITPAT, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_waitpat)]);
    this.automatic_symbols.set(SYMBOLS.WAITFBW, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_waitfbw)]);
    this.automatic_symbols.set(SYMBOLS.WAITXMT, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_waitxmt)]);
    this.automatic_symbols.set(SYMBOLS.WAITXFI, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_waitxfi)]);
    this.automatic_symbols.set(SYMBOLS.WAITXRO, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_waitxro)]);
    this.automatic_symbols.set(SYMBOLS.WAITXRL, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_waitxrl)]);
    // 	sym	type_asm_inst,		ac_waitatn,	'WAITATN'	(declared as type_i_flex)

    this.automatic_symbols.set(SYMBOLS.ALLOWI, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_allowi)]);
    this.automatic_symbols.set(SYMBOLS.STALLI, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_stalli)]);

    this.automatic_symbols.set(SYMBOLS.TRGINT1, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_trgint1)]);
    this.automatic_symbols.set(SYMBOLS.TRGINT2, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_trgint2)]);
    this.automatic_symbols.set(SYMBOLS.TRGINT3, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_trgint3)]);

    this.automatic_symbols.set(SYMBOLS.NIXINT1, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_nixint1)]);
    this.automatic_symbols.set(SYMBOLS.NIXINT2, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_nixint2)]);
    this.automatic_symbols.set(SYMBOLS.NIXINT3, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_nixint3)]);

    this.automatic_symbols.set(SYMBOLS.SETINT1, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_setint1)]);
    this.automatic_symbols.set(SYMBOLS.SETINT2, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_setint2)]);
    this.automatic_symbols.set(SYMBOLS.SETINT3, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_setint3)]);

    this.automatic_symbols.set(SYMBOLS.SETQ, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_setq)]);
    this.automatic_symbols.set(SYMBOLS.SETQ2, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_setq2)]);

    this.automatic_symbols.set(SYMBOLS.PUSH, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_push)]);
    this.automatic_symbols.set(SYMBOLS.POP, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_pop)]);

    this.automatic_symbols.set(SYMBOLS.JMPREL, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_jmprel)]);
    this.automatic_symbols.set(SYMBOLS.SKIP, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_skip)]);
    this.automatic_symbols.set(SYMBOLS.SKIPF, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_skipf)]);
    this.automatic_symbols.set(SYMBOLS.EXECF, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_execf)]);

    this.automatic_symbols.set(SYMBOLS.GETPTR, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_getptr)]);
    this.automatic_symbols.set(SYMBOLS.GETBRK, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_getbrk)]);
    this.automatic_symbols.set(SYMBOLS.COGBRK, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_cogbrk)]);
    this.automatic_symbols.set(SYMBOLS.BRK, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_brk)]);

    this.automatic_symbols.set(SYMBOLS.SETLUTS, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_setluts)]);

    this.automatic_symbols.set(SYMBOLS.SETCY, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_setcy)]);
    this.automatic_symbols.set(SYMBOLS.SETCI, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_setci)]);
    this.automatic_symbols.set(SYMBOLS.SETCQ, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_setcq)]);
    this.automatic_symbols.set(SYMBOLS.SETCFRQ, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_setcfrq)]);
    this.automatic_symbols.set(SYMBOLS.SETCMOD, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_setcmod)]);

    this.automatic_symbols.set(SYMBOLS.SETPIV, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_setpiv)]);
    this.automatic_symbols.set(SYMBOLS.SETPIX, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_setpix)]);

    // 	sym	type_asm_inst,		ac_cogatn,	'COGATN'	(declared as type_i_flex)

    this.automatic_symbols.set(SYMBOLS.TESTP, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_testp)]);
    this.automatic_symbols.set(SYMBOLS.TESTPN, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_testpn)]);

    this.automatic_symbols.set(SYMBOLS.DIRL, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_dirl)]);
    this.automatic_symbols.set(SYMBOLS.DIRH, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_dirh)]);
    this.automatic_symbols.set(SYMBOLS.DIRC, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_dirc)]);
    this.automatic_symbols.set(SYMBOLS.DIRNC, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_dirnc)]);
    this.automatic_symbols.set(SYMBOLS.DIRZ, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_dirz)]);
    this.automatic_symbols.set(SYMBOLS.DIRNZ, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_dirnz)]);
    this.automatic_symbols.set(SYMBOLS.DIRRND, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_dirrnd)]);
    this.automatic_symbols.set(SYMBOLS.DIRNOT, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_dirnot)]);

    this.automatic_symbols.set(SYMBOLS.OUTL, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_outl)]);
    this.automatic_symbols.set(SYMBOLS.OUTH, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_outh)]);
    this.automatic_symbols.set(SYMBOLS.OUTC, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_outc)]);
    this.automatic_symbols.set(SYMBOLS.OUTNC, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_outnc)]);
    this.automatic_symbols.set(SYMBOLS.OUTZ, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_outz)]);
    this.automatic_symbols.set(SYMBOLS.OUTNZ, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_outnz)]);
    this.automatic_symbols.set(SYMBOLS.OUTRND, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_outrnd)]);
    this.automatic_symbols.set(SYMBOLS.OUTNOT, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_outnot)]);

    this.automatic_symbols.set(SYMBOLS.FLTL, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_fltl)]);
    this.automatic_symbols.set(SYMBOLS.FLTH, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_flth)]);
    this.automatic_symbols.set(SYMBOLS.FLTC, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_fltc)]);
    this.automatic_symbols.set(SYMBOLS.FLTNC, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_fltnc)]);
    this.automatic_symbols.set(SYMBOLS.FLTZ, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_fltz)]);
    this.automatic_symbols.set(SYMBOLS.FLTNZ, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_fltnz)]);
    this.automatic_symbols.set(SYMBOLS.FLTRND, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_fltrnd)]);
    this.automatic_symbols.set(SYMBOLS.FLTNOT, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_fltnot)]);

    this.automatic_symbols.set(SYMBOLS.DRVL, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_drvl)]);
    this.automatic_symbols.set(SYMBOLS.DRVH, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_drvh)]);
    this.automatic_symbols.set(SYMBOLS.DRVC, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_drvc)]);
    this.automatic_symbols.set(SYMBOLS.DRVNC, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_drvnc)]);
    this.automatic_symbols.set(SYMBOLS.DRVZ, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_drvz)]);
    this.automatic_symbols.set(SYMBOLS.DRVNZ, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_drvnz)]);
    this.automatic_symbols.set(SYMBOLS.DRVRND, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_drvrnd)]);
    this.automatic_symbols.set(SYMBOLS.DRVNOT, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_drvnot)]);

    this.automatic_symbols.set(SYMBOLS.SPLITB, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_splitb)]);
    this.automatic_symbols.set(SYMBOLS.MERGEB, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_mergeb)]);
    this.automatic_symbols.set(SYMBOLS.SPLITW, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_splitw)]);
    this.automatic_symbols.set(SYMBOLS.MERGEW, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_mergew)]);
    this.automatic_symbols.set(SYMBOLS.SEUSSF, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_seussf)]);
    this.automatic_symbols.set(SYMBOLS.SEUSSR, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_seussr)]);
    this.automatic_symbols.set(SYMBOLS.RGBSQZ, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_rgbsqz)]);
    this.automatic_symbols.set(SYMBOLS.RGBEXP, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_rgbexp)]);
    this.automatic_symbols.set(SYMBOLS.XORO32, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_xoro32)]);
    // 	sym	type_asm_inst,		ac_rev,		'REV'		(declared as type_op)
    this.automatic_symbols.set(SYMBOLS.RCZR, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_rczr)]);
    this.automatic_symbols.set(SYMBOLS.RCZL, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_rczl)]);
    this.automatic_symbols.set(SYMBOLS.WRC, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_wrc)]);
    this.automatic_symbols.set(SYMBOLS.WRNC, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_wrnc)]);
    this.automatic_symbols.set(SYMBOLS.WRZ, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_wrz)]);
    this.automatic_symbols.set(SYMBOLS.WRNZ, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_wrnz)]);
    this.automatic_symbols.set(SYMBOLS.MODCZ, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_modcz)]);
    this.automatic_symbols.set(SYMBOLS.MODC, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_modc)]);
    this.automatic_symbols.set(SYMBOLS.MODZ, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_modz)]);

    this.automatic_symbols.set(SYMBOLS.SETSCP, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_setscp)]);
    this.automatic_symbols.set(SYMBOLS.GETSCP, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_getscp)]);

    this.automatic_symbols.set(SYMBOLS.JMP, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_jmp)]);
    // 	sym	type_asm_inst,		ac_call,	'CALL'		(declared as type_i_flex)
    this.automatic_symbols.set(SYMBOLS.CALLA, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_calla)]);
    this.automatic_symbols.set(SYMBOLS.CALLB, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_callb)]);
    this.automatic_symbols.set(SYMBOLS.CALLD, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_calld)]);
    this.automatic_symbols.set(SYMBOLS.LOC, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_loc)]);

    this.automatic_symbols.set(SYMBOLS.AUGS, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_augs)]);
    this.automatic_symbols.set(SYMBOLS.AUGD, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_augd)]);

    this.automatic_symbols.set(SYMBOLS.PUSHA, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_pusha)]); // alias instructions
    this.automatic_symbols.set(SYMBOLS.PUSHB, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_pushb)]);
    this.automatic_symbols.set(SYMBOLS.POPA, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_popa)]);
    this.automatic_symbols.set(SYMBOLS.POPB, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_popb)]);

    this.automatic_symbols.set(SYMBOLS.RET, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_ret)]); // xlat instructions
    this.automatic_symbols.set(SYMBOLS.RETA, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_reta)]);
    this.automatic_symbols.set(SYMBOLS.RETB, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_retb)]);
    this.automatic_symbols.set(SYMBOLS.RETI0, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_reti0)]);
    this.automatic_symbols.set(SYMBOLS.RETI1, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_reti1)]);
    this.automatic_symbols.set(SYMBOLS.RETI2, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_reti2)]);
    this.automatic_symbols.set(SYMBOLS.RETI3, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_reti3)]);
    this.automatic_symbols.set(SYMBOLS.RESI0, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_resi0)]);
    this.automatic_symbols.set(SYMBOLS.RESI1, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_resi1)]);
    this.automatic_symbols.set(SYMBOLS.RESI2, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_resi2)]);
    this.automatic_symbols.set(SYMBOLS.RESI3, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_resi3)]);
    this.automatic_symbols.set(SYMBOLS.XSTOP, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_xstop)]);

    // 	sym	type_asm_inst,		ac_akpin,	'AKPIN'		(declared as type_i_flex)

    this.automatic_symbols.set(SYMBOLS.ASMCLK, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_asmclk)]);

    this.automatic_symbols.set(SYMBOLS.NOP, [eElementType.type_asm_inst, this.asmcodeValue(eAsmcode.ac_nop)]);

    this.automatic_symbols.set(SYMBOLS.WC, [eElementType.type_asm_effect, 0b0010]); // assembly effects
    this.automatic_symbols.set(SYMBOLS.WZ, [eElementType.type_asm_effect, 0b0001]);
    this.automatic_symbols.set(SYMBOLS.WCZ, [eElementType.type_asm_effect, 0b0011]);
    this.automatic_symbols.set(SYMBOLS.ANDC, [eElementType.type_asm_effect2, 0b0110]);
    this.automatic_symbols.set(SYMBOLS.ANDZ, [eElementType.type_asm_effect2, 0b0101]);
    this.automatic_symbols.set(SYMBOLS.ORC, [eElementType.type_asm_effect2, 0b1010]);
    this.automatic_symbols.set(SYMBOLS.ORZ, [eElementType.type_asm_effect2, 0b1001]);
    this.automatic_symbols.set(SYMBOLS.XORC, [eElementType.type_asm_effect2, 0b1110]);
    this.automatic_symbols.set(SYMBOLS.XORZ, [eElementType.type_asm_effect2, 0b1101]);

    this.automatic_symbols.set(SYMBOLS._CLR, [eElementType.type_con, eValueType.if_never]); // modcz values
    this.automatic_symbols.set(SYMBOLS._NC_AND_NZ, [eElementType.type_con, eValueType.if_nc_and_nz]);
    this.automatic_symbols.set(SYMBOLS._NZ_AND_NC, [eElementType.type_con, eValueType.if_nc_and_nz]);
    this.automatic_symbols.set(SYMBOLS._GT, [eElementType.type_con, eValueType.if_nc_and_nz]);
    this.automatic_symbols.set(SYMBOLS._NC_AND_Z, [eElementType.type_con, eValueType.if_nc_and_z]);
    this.automatic_symbols.set(SYMBOLS._Z_AND_NC, [eElementType.type_con, eValueType.if_nc_and_z]);
    this.automatic_symbols.set(SYMBOLS._NC, [eElementType.type_con, eValueType.if_nc]);
    this.automatic_symbols.set(SYMBOLS._GE, [eElementType.type_con, eValueType.if_nc]);
    this.automatic_symbols.set(SYMBOLS._C_AND_NZ, [eElementType.type_con, eValueType.if_c_and_nz]);
    this.automatic_symbols.set(SYMBOLS._NZ_AND_C, [eElementType.type_con, eValueType.if_c_and_nz]);
    this.automatic_symbols.set(SYMBOLS._NZ, [eElementType.type_con, eValueType.if_nz]);
    this.automatic_symbols.set(SYMBOLS._NE, [eElementType.type_con, eValueType.if_nz]);
    this.automatic_symbols.set(SYMBOLS._C_NE_Z, [eElementType.type_con, eValueType.if_c_ne_z]);
    this.automatic_symbols.set(SYMBOLS._Z_NE_C, [eElementType.type_con, eValueType.if_c_ne_z]);
    this.automatic_symbols.set(SYMBOLS._NC_OR_NZ, [eElementType.type_con, eValueType.if_nc_or_nz]);
    this.automatic_symbols.set(SYMBOLS._NZ_OR_NC, [eElementType.type_con, eValueType.if_nc_or_nz]);
    this.automatic_symbols.set(SYMBOLS._C_AND_Z, [eElementType.type_con, eValueType.if_c_and_z]);
    this.automatic_symbols.set(SYMBOLS._Z_AND_C, [eElementType.type_con, eValueType.if_c_and_z]);
    this.automatic_symbols.set(SYMBOLS._C_EQ_Z, [eElementType.type_con, eValueType.if_c_eq_z]);
    this.automatic_symbols.set(SYMBOLS._Z_EQ_C, [eElementType.type_con, eValueType.if_c_eq_z]);
    this.automatic_symbols.set(SYMBOLS._Z, [eElementType.type_con, eValueType.if_z]);
    this.automatic_symbols.set(SYMBOLS._E, [eElementType.type_con, eValueType.if_z]);
    this.automatic_symbols.set(SYMBOLS._NC_OR_Z, [eElementType.type_con, eValueType.if_nc_or_z]);
    this.automatic_symbols.set(SYMBOLS._Z_OR_NC, [eElementType.type_con, eValueType.if_nc_or_z]);
    this.automatic_symbols.set(SYMBOLS._C, [eElementType.type_con, eValueType.if_c]);
    this.automatic_symbols.set(SYMBOLS._LT, [eElementType.type_con, eValueType.if_c]);
    this.automatic_symbols.set(SYMBOLS._C_OR_NZ, [eElementType.type_con, eValueType.if_c_or_nz]);
    this.automatic_symbols.set(SYMBOLS._NZ_OR_C, [eElementType.type_con, eValueType.if_c_or_nz]);
    this.automatic_symbols.set(SYMBOLS._C_OR_Z, [eElementType.type_con, eValueType.if_c_or_z]);
    this.automatic_symbols.set(SYMBOLS._Z_OR_C, [eElementType.type_con, eValueType.if_c_or_z]);
    this.automatic_symbols.set(SYMBOLS._LE, [eElementType.type_con, eValueType.if_c_or_z]);
    this.automatic_symbols.set(SYMBOLS._SET, [eElementType.type_con, eValueType.if_always]);

    this.automatic_symbols.set(SYMBOLS.REG, [eElementType.type_reg, 0]); // reg

    this.automatic_symbols.set(SYMBOLS.PR0, [eElementType.type_register, eValueType.pasm_regs + 0]); // pasm regs
    this.automatic_symbols.set(SYMBOLS.PR1, [eElementType.type_register, eValueType.pasm_regs + 1]);
    this.automatic_symbols.set(SYMBOLS.PR2, [eElementType.type_register, eValueType.pasm_regs + 2]);
    this.automatic_symbols.set(SYMBOLS.PR3, [eElementType.type_register, eValueType.pasm_regs + 3]);
    this.automatic_symbols.set(SYMBOLS.PR4, [eElementType.type_register, eValueType.pasm_regs + 4]);
    this.automatic_symbols.set(SYMBOLS.PR5, [eElementType.type_register, eValueType.pasm_regs + 5]);
    this.automatic_symbols.set(SYMBOLS.PR6, [eElementType.type_register, eValueType.pasm_regs + 6]);
    this.automatic_symbols.set(SYMBOLS.PR7, [eElementType.type_register, eValueType.pasm_regs + 7]);

    this.automatic_symbols.set(SYMBOLS.IJMP3, [eElementType.type_register, 0x1f0]); // interrupt vectors
    this.automatic_symbols.set(SYMBOLS.IRET3, [eElementType.type_register, 0x1f1]);
    this.automatic_symbols.set(SYMBOLS.IJMP2, [eElementType.type_register, 0x1f2]);
    this.automatic_symbols.set(SYMBOLS.IRET2, [eElementType.type_register, 0x1f3]);
    this.automatic_symbols.set(SYMBOLS.IJMP1, [eElementType.type_register, 0x1f4]);
    this.automatic_symbols.set(SYMBOLS.IRET1, [eElementType.type_register, 0x1f5]);
    this.automatic_symbols.set(SYMBOLS.PA, [eElementType.type_register, 0x1f6]); // calld/loc targets
    this.automatic_symbols.set(SYMBOLS.PB, [eElementType.type_register, 0x1f7]);
    this.automatic_symbols.set(SYMBOLS.PTRA, [eElementType.type_register, 0x1f8]); // special function registers
    this.automatic_symbols.set(SYMBOLS.PTRB, [eElementType.type_register, 0x1f9]);
    this.automatic_symbols.set(SYMBOLS.DIRA, [eElementType.type_register, 0x1fa]);
    this.automatic_symbols.set(SYMBOLS.DIRB, [eElementType.type_register, 0x1fb]);
    this.automatic_symbols.set(SYMBOLS.OUTA, [eElementType.type_register, 0x1fc]);
    this.automatic_symbols.set(SYMBOLS.OUTB, [eElementType.type_register, 0x1fd]);
    this.automatic_symbols.set(SYMBOLS.INA, [eElementType.type_register, 0x1fe]);
    this.automatic_symbols.set(SYMBOLS.INB, [eElementType.type_register, 0x1ff]);

    this.automatic_symbols.set(SYMBOLS.CLKMODE, [eElementType.type_hub_long, 0x00040]); // spin permanent variables
    this.automatic_symbols.set(SYMBOLS.CLKFREQ, [eElementType.type_hub_long, 0x00044]);

    this.automatic_symbols.set(SYMBOLS.VARBASE, [eElementType.type_var_long, 0]);

    this.automatic_symbols.set(SYMBOLS.FALSE, [eElementType.type_con, 0]); // numeric constants
    this.automatic_symbols.set(SYMBOLS.TRUE, [eElementType.type_con, 0x0ffffffff]);
    this.automatic_symbols.set(SYMBOLS.NEGX, [eElementType.type_con, 0x80000000]);
    this.automatic_symbols.set(SYMBOLS.POSX, [eElementType.type_con, 0x7fffffff]);
    this.automatic_symbols.set(SYMBOLS.PI, [eElementType.type_con_float, 0x40490fdb]);

    this.automatic_symbols.set(SYMBOLS.COGEXEC, [eElementType.type_con, 0b000000]); // coginit constants
    this.automatic_symbols.set(SYMBOLS.HUBEXEC, [eElementType.type_con, 0b100000]);
    this.automatic_symbols.set(SYMBOLS.COGEXEC_NEW, [eElementType.type_con, 0b010000]);
    this.automatic_symbols.set(SYMBOLS.HUBEXEC_NEW, [eElementType.type_con, 0b110000]);
    this.automatic_symbols.set(SYMBOLS.COGEXEC_NEW_PAIR, [eElementType.type_con, 0b010001]);
    this.automatic_symbols.set(SYMBOLS.HUBEXEC_NEW_PAIR, [eElementType.type_con, 0b110001]);
    this.automatic_symbols.set(SYMBOLS.NEWCOG, [eElementType.type_con, 0b010000]); // cogspin constant

    this.automatic_symbols.set(SYMBOLS.P_TRUE_A, [eElementType.type_con, 0b00000000000000000000000000000000]); // smart pin constants
    this.automatic_symbols.set(SYMBOLS.P_INVERT_A, [eElementType.type_con, 0b10000000000000000000000000000000]);

    this.automatic_symbols.set(SYMBOLS.P_LOCAL_A, [eElementType.type_con, 0b0000000000000000000000000000000]);
    this.automatic_symbols.set(SYMBOLS.P_PLUS1_A, [eElementType.type_con, 0b0010000000000000000000000000000]);
    this.automatic_symbols.set(SYMBOLS.P_PLUS2_A, [eElementType.type_con, 0b0100000000000000000000000000000]);
    this.automatic_symbols.set(SYMBOLS.P_PLUS3_A, [eElementType.type_con, 0b0110000000000000000000000000000]);
    this.automatic_symbols.set(SYMBOLS.P_OUTBIT_A, [eElementType.type_con, 0b1000000000000000000000000000000]);
    this.automatic_symbols.set(SYMBOLS.P_MINUS3_A, [eElementType.type_con, 0b1010000000000000000000000000000]);
    this.automatic_symbols.set(SYMBOLS.P_MINUS2_A, [eElementType.type_con, 0b1100000000000000000000000000000]);
    this.automatic_symbols.set(SYMBOLS.P_MINUS1_A, [eElementType.type_con, 0b1110000000000000000000000000000]);

    this.automatic_symbols.set(SYMBOLS.P_TRUE_B, [eElementType.type_con, 0b0000000000000000000000000000]);
    this.automatic_symbols.set(SYMBOLS.P_INVERT_B, [eElementType.type_con, 0b1000000000000000000000000000]);

    this.automatic_symbols.set(SYMBOLS.P_LOCAL_B, [eElementType.type_con, 0b000000000000000000000000000]);
    this.automatic_symbols.set(SYMBOLS.P_PLUS1_B, [eElementType.type_con, 0b001000000000000000000000000]);
    this.automatic_symbols.set(SYMBOLS.P_PLUS2_B, [eElementType.type_con, 0b010000000000000000000000000]);
    this.automatic_symbols.set(SYMBOLS.P_PLUS3_B, [eElementType.type_con, 0b011000000000000000000000000]);
    this.automatic_symbols.set(SYMBOLS.P_OUTBIT_B, [eElementType.type_con, 0b100000000000000000000000000]);
    this.automatic_symbols.set(SYMBOLS.P_MINUS3_B, [eElementType.type_con, 0b101000000000000000000000000]);
    this.automatic_symbols.set(SYMBOLS.P_MINUS2_B, [eElementType.type_con, 0b110000000000000000000000000]);
    this.automatic_symbols.set(SYMBOLS.P_MINUS1_B, [eElementType.type_con, 0b111000000000000000000000000]);

    this.automatic_symbols.set(SYMBOLS.P_PASS_AB, [eElementType.type_con, 0b000000000000000000000000]);
    this.automatic_symbols.set(SYMBOLS.P_AND_AB, [eElementType.type_con, 0b001000000000000000000000]);
    this.automatic_symbols.set(SYMBOLS.P_OR_AB, [eElementType.type_con, 0b010000000000000000000000]);
    this.automatic_symbols.set(SYMBOLS.P_XOR_AB, [eElementType.type_con, 0b011000000000000000000000]);
    this.automatic_symbols.set(SYMBOLS.P_FILT0_AB, [eElementType.type_con, 0b100000000000000000000000]);
    this.automatic_symbols.set(SYMBOLS.P_FILT1_AB, [eElementType.type_con, 0b101000000000000000000000]);
    this.automatic_symbols.set(SYMBOLS.P_FILT2_AB, [eElementType.type_con, 0b110000000000000000000000]);
    this.automatic_symbols.set(SYMBOLS.P_FILT3_AB, [eElementType.type_con, 0b111000000000000000000000]);

    this.automatic_symbols.set(SYMBOLS.P_LOGIC_A, [eElementType.type_con, 0b000000000000000000000]);
    this.automatic_symbols.set(SYMBOLS.P_LOGIC_A_FB, [eElementType.type_con, 0b000100000000000000000]);
    this.automatic_symbols.set(SYMBOLS.P_LOGIC_B_FB, [eElementType.type_con, 0b001000000000000000000]);
    this.automatic_symbols.set(SYMBOLS.P_SCHMITT_A, [eElementType.type_con, 0b001100000000000000000]);
    this.automatic_symbols.set(SYMBOLS.P_SCHMITT_A_FB, [eElementType.type_con, 0b010000000000000000000]);
    this.automatic_symbols.set(SYMBOLS.P_SCHMITT_B_FB, [eElementType.type_con, 0b010100000000000000000]);
    this.automatic_symbols.set(SYMBOLS.P_COMPARE_AB, [eElementType.type_con, 0b011000000000000000000]);
    this.automatic_symbols.set(SYMBOLS.P_COMPARE_AB_FB, [eElementType.type_con, 0b011100000000000000000]);

    this.automatic_symbols.set(SYMBOLS.P_ADC_GIO, [eElementType.type_con, 0b100000000000000000000]);
    this.automatic_symbols.set(SYMBOLS.P_ADC_VIO, [eElementType.type_con, 0b100001000000000000000]);
    this.automatic_symbols.set(SYMBOLS.P_ADC_FLOAT, [eElementType.type_con, 0b100010000000000000000]);
    this.automatic_symbols.set(SYMBOLS.P_ADC_1X, [eElementType.type_con, 0b100011000000000000000]);
    this.automatic_symbols.set(SYMBOLS.P_ADC_3X, [eElementType.type_con, 0b100100000000000000000]);
    this.automatic_symbols.set(SYMBOLS.P_ADC_10X, [eElementType.type_con, 0b100101000000000000000]);
    this.automatic_symbols.set(SYMBOLS.P_ADC_30X, [eElementType.type_con, 0b100110000000000000000]);
    this.automatic_symbols.set(SYMBOLS.P_ADC_100X, [eElementType.type_con, 0b100111000000000000000]);

    this.automatic_symbols.set(SYMBOLS.P_DAC_990R_3V, [eElementType.type_con, 0b101000000000000000000]);
    this.automatic_symbols.set(SYMBOLS.P_DAC_600R_2V, [eElementType.type_con, 0b101010000000000000000]);
    this.automatic_symbols.set(SYMBOLS.P_DAC_124R_3V, [eElementType.type_con, 0b101100000000000000000]);
    this.automatic_symbols.set(SYMBOLS.P_DAC_75R_2V, [eElementType.type_con, 0b101110000000000000000]);

    this.automatic_symbols.set(SYMBOLS.P_LEVEL_A, [eElementType.type_con, 0b110000000000000000000]);
    this.automatic_symbols.set(SYMBOLS.P_LEVEL_A_FBN, [eElementType.type_con, 0b110100000000000000000]);
    this.automatic_symbols.set(SYMBOLS.P_LEVEL_B_FBP, [eElementType.type_con, 0b111000000000000000000]);
    this.automatic_symbols.set(SYMBOLS.P_LEVEL_B_FBN, [eElementType.type_con, 0b111100000000000000000]);

    this.automatic_symbols.set(SYMBOLS.P_ASYNC_IO, [eElementType.type_con, 0b00000000000000000]);
    this.automatic_symbols.set(SYMBOLS.P_SYNC_IO, [eElementType.type_con, 0b10000000000000000]);

    this.automatic_symbols.set(SYMBOLS.P_TRUE_IN, [eElementType.type_con, 0b0000000000000000]);
    this.automatic_symbols.set(SYMBOLS.P_INVERT_IN, [eElementType.type_con, 0b1000000000000000]);

    this.automatic_symbols.set(SYMBOLS.P_TRUE_OUTPUT, [eElementType.type_con, 0b000000000000000]); // TESTT change to P_TRUE_OUT
    this.automatic_symbols.set(SYMBOLS.P_TRUE_OUT, [eElementType.type_con, 0b000000000000000]);
    this.automatic_symbols.set(SYMBOLS.P_INVERT_OUTPUT, [eElementType.type_con, 0b100000000000000]); // TESTT change P_INVERT_OUT
    this.automatic_symbols.set(SYMBOLS.P_INVERT_OUT, [eElementType.type_con, 0b100000000000000]);

    this.automatic_symbols.set(SYMBOLS.P_HIGH_FAST, [eElementType.type_con, 0b00000000000000]);
    this.automatic_symbols.set(SYMBOLS.P_HIGH_1K5, [eElementType.type_con, 0b00100000000000]);
    this.automatic_symbols.set(SYMBOLS.P_HIGH_15K, [eElementType.type_con, 0b01000000000000]);
    this.automatic_symbols.set(SYMBOLS.P_HIGH_150K, [eElementType.type_con, 0b01100000000000]);
    this.automatic_symbols.set(SYMBOLS.P_HIGH_1MA, [eElementType.type_con, 0b10000000000000]);
    this.automatic_symbols.set(SYMBOLS.P_HIGH_100UA, [eElementType.type_con, 0b10100000000000]);
    this.automatic_symbols.set(SYMBOLS.P_HIGH_10UA, [eElementType.type_con, 0b11000000000000]);
    this.automatic_symbols.set(SYMBOLS.P_HIGH_FLOAT, [eElementType.type_con, 0b11100000000000]);

    this.automatic_symbols.set(SYMBOLS.P_LOW_FAST, [eElementType.type_con, 0b00000000000]);
    this.automatic_symbols.set(SYMBOLS.P_LOW_1K5, [eElementType.type_con, 0b00100000000]);
    this.automatic_symbols.set(SYMBOLS.P_LOW_15K, [eElementType.type_con, 0b01000000000]);
    this.automatic_symbols.set(SYMBOLS.P_LOW_150K, [eElementType.type_con, 0b01100000000]);
    this.automatic_symbols.set(SYMBOLS.P_LOW_1MA, [eElementType.type_con, 0b10000000000]);
    this.automatic_symbols.set(SYMBOLS.P_LOW_100UA, [eElementType.type_con, 0b10100000000]);
    this.automatic_symbols.set(SYMBOLS.P_LOW_10UA, [eElementType.type_con, 0b11000000000]);
    this.automatic_symbols.set(SYMBOLS.P_LOW_FLOAT, [eElementType.type_con, 0b11100000000]);

    this.automatic_symbols.set(SYMBOLS.P_TT_00, [eElementType.type_con, 0b00000000]);
    this.automatic_symbols.set(SYMBOLS.P_TT_01, [eElementType.type_con, 0b01000000]);
    this.automatic_symbols.set(SYMBOLS.P_TT_10, [eElementType.type_con, 0b10000000]);
    this.automatic_symbols.set(SYMBOLS.P_TT_11, [eElementType.type_con, 0b11000000]);
    this.automatic_symbols.set(SYMBOLS.P_OE, [eElementType.type_con, 0b01000000]);
    this.automatic_symbols.set(SYMBOLS.P_CHANNEL, [eElementType.type_con, 0b01000000]);
    this.automatic_symbols.set(SYMBOLS.P_BITDAC, [eElementType.type_con, 0b10000000]);

    this.automatic_symbols.set(SYMBOLS.P_NORMAL, [eElementType.type_con, 0b000000]);
    this.automatic_symbols.set(SYMBOLS.P_REPOSITORY, [eElementType.type_con, 0b000010]);
    this.automatic_symbols.set(SYMBOLS.P_DAC_NOISE, [eElementType.type_con, 0b000010]);
    this.automatic_symbols.set(SYMBOLS.P_DAC_DITHER_RND, [eElementType.type_con, 0b000100]);
    this.automatic_symbols.set(SYMBOLS.P_DAC_DITHER_PWM, [eElementType.type_con, 0b000110]);
    this.automatic_symbols.set(SYMBOLS.P_PULSE, [eElementType.type_con, 0b001000]);
    this.automatic_symbols.set(SYMBOLS.P_TRANSITION, [eElementType.type_con, 0b001010]);
    this.automatic_symbols.set(SYMBOLS.P_NCO_FREQ, [eElementType.type_con, 0b001100]);
    this.automatic_symbols.set(SYMBOLS.P_NCO_DUTY, [eElementType.type_con, 0b001110]);
    this.automatic_symbols.set(SYMBOLS.P_PWM_TRIANGLE, [eElementType.type_con, 0b010000]);
    this.automatic_symbols.set(SYMBOLS.P_PWM_SAWTOOTH, [eElementType.type_con, 0b010010]);
    this.automatic_symbols.set(SYMBOLS.P_PWM_SMPS, [eElementType.type_con, 0b010100]);
    this.automatic_symbols.set(SYMBOLS.P_QUADRATURE, [eElementType.type_con, 0b010110]);
    this.automatic_symbols.set(SYMBOLS.P_REG_UP, [eElementType.type_con, 0b011000]);
    this.automatic_symbols.set(SYMBOLS.P_REG_UP_DOWN, [eElementType.type_con, 0b011010]);
    this.automatic_symbols.set(SYMBOLS.P_COUNT_RISES, [eElementType.type_con, 0b011100]);
    this.automatic_symbols.set(SYMBOLS.P_COUNT_HIGHS, [eElementType.type_con, 0b011110]);
    this.automatic_symbols.set(SYMBOLS.P_STATE_TICKS, [eElementType.type_con, 0b100000]);
    this.automatic_symbols.set(SYMBOLS.P_HIGH_TICKS, [eElementType.type_con, 0b100010]);
    this.automatic_symbols.set(SYMBOLS.P_EVENTS_TICKS, [eElementType.type_con, 0b100100]);
    this.automatic_symbols.set(SYMBOLS.P_PERIODS_TICKS, [eElementType.type_con, 0b100110]);
    this.automatic_symbols.set(SYMBOLS.P_PERIODS_HIGHS, [eElementType.type_con, 0b101000]);
    this.automatic_symbols.set(SYMBOLS.P_COUNTER_TICKS, [eElementType.type_con, 0b101010]);
    this.automatic_symbols.set(SYMBOLS.P_COUNTER_HIGHS, [eElementType.type_con, 0b101100]);
    this.automatic_symbols.set(SYMBOLS.P_COUNTER_PERIODS, [eElementType.type_con, 0b101110]);
    this.automatic_symbols.set(SYMBOLS.P_ADC, [eElementType.type_con, 0b110000]);
    this.automatic_symbols.set(SYMBOLS.P_ADC_EXT, [eElementType.type_con, 0b110010]);
    this.automatic_symbols.set(SYMBOLS.P_ADC_SCOPE, [eElementType.type_con, 0b110100]);
    this.automatic_symbols.set(SYMBOLS.P_USB_PAIR, [eElementType.type_con, 0b110110]);
    this.automatic_symbols.set(SYMBOLS.P_SYNC_TX, [eElementType.type_con, 0b111000]);
    this.automatic_symbols.set(SYMBOLS.P_SYNC_RX, [eElementType.type_con, 0b111010]);
    this.automatic_symbols.set(SYMBOLS.P_ASYNC_TX, [eElementType.type_con, 0b111100]);
    this.automatic_symbols.set(SYMBOLS.P_ASYNC_RX, [eElementType.type_con, 0b111110]);

    this.automatic_symbols.set(SYMBOLS.X_IMM_32X1_LUT, [eElementType.type_con, 0x00000000]); // streamer constants
    this.automatic_symbols.set(SYMBOLS.X_IMM_16X2_LUT, [eElementType.type_con, 0x10000000]);
    this.automatic_symbols.set(SYMBOLS.X_IMM_8X4_LUT, [eElementType.type_con, 0x20000000]);
    this.automatic_symbols.set(SYMBOLS.X_IMM_4X8_LUT, [eElementType.type_con, 0x30000000]);

    this.automatic_symbols.set(SYMBOLS.X_IMM_32X1_1DAC1, [eElementType.type_con, 0x40000000]);
    this.automatic_symbols.set(SYMBOLS.X_IMM_16X2_2DAC1, [eElementType.type_con, 0x50000000]);
    this.automatic_symbols.set(SYMBOLS.X_IMM_16X2_1DAC2, [eElementType.type_con, 0x50020000]);
    this.automatic_symbols.set(SYMBOLS.X_IMM_8X4_4DAC1, [eElementType.type_con, 0x60000000]);
    this.automatic_symbols.set(SYMBOLS.X_IMM_8X4_2DAC2, [eElementType.type_con, 0x60020000]);
    this.automatic_symbols.set(SYMBOLS.X_IMM_8X4_1DAC4, [eElementType.type_con, 0x60040000]);
    this.automatic_symbols.set(SYMBOLS.X_IMM_4X8_4DAC2, [eElementType.type_con, 0x60060000]);
    this.automatic_symbols.set(SYMBOLS.X_IMM_4X8_2DAC4, [eElementType.type_con, 0x60070000]);
    this.automatic_symbols.set(SYMBOLS.X_IMM_4X8_1DAC8, [eElementType.type_con, 0x600e0000]);
    this.automatic_symbols.set(SYMBOLS.X_IMM_2X16_4DAC4, [eElementType.type_con, 0x600f0000]);
    this.automatic_symbols.set(SYMBOLS.X_IMM_2X16_2DAC8, [eElementType.type_con, 0x70000000]);
    this.automatic_symbols.set(SYMBOLS.X_IMM_1X32_4DAC8, [eElementType.type_con, 0x70010000]);

    this.automatic_symbols.set(SYMBOLS.X_RFLONG_32X1_LUT, [eElementType.type_con, 0x70020000]);
    this.automatic_symbols.set(SYMBOLS.X_RFLONG_16X2_LUT, [eElementType.type_con, 0x70040000]);
    this.automatic_symbols.set(SYMBOLS.X_RFLONG_8X4_LUT, [eElementType.type_con, 0x70060000]);
    this.automatic_symbols.set(SYMBOLS.X_RFLONG_4X8_LUT, [eElementType.type_con, 0x70080000]);

    this.automatic_symbols.set(SYMBOLS.X_RFBYTE_1P_1DAC1, [eElementType.type_con, 0x080000000]);
    this.automatic_symbols.set(SYMBOLS.X_RFBYTE_2P_2DAC1, [eElementType.type_con, 0x090000000]);
    this.automatic_symbols.set(SYMBOLS.X_RFBYTE_2P_1DAC2, [eElementType.type_con, 0x090020000]);
    this.automatic_symbols.set(SYMBOLS.X_RFBYTE_4P_4DAC1, [eElementType.type_con, 0x0a0000000]);
    this.automatic_symbols.set(SYMBOLS.X_RFBYTE_4P_2DAC2, [eElementType.type_con, 0x0a0020000]);
    this.automatic_symbols.set(SYMBOLS.X_RFBYTE_4P_1DAC4, [eElementType.type_con, 0x0a0040000]);
    this.automatic_symbols.set(SYMBOLS.X_RFBYTE_8P_4DAC2, [eElementType.type_con, 0x0a0060000]);
    this.automatic_symbols.set(SYMBOLS.X_RFBYTE_8P_2DAC4, [eElementType.type_con, 0x0a0070000]);
    this.automatic_symbols.set(SYMBOLS.X_RFBYTE_8P_1DAC8, [eElementType.type_con, 0x0a00e0000]);
    this.automatic_symbols.set(SYMBOLS.X_RFWORD_16P_4DAC4, [eElementType.type_con, 0x0a00f0000]);
    this.automatic_symbols.set(SYMBOLS.X_RFWORD_16P_2DAC8, [eElementType.type_con, 0x0b0000000]);
    this.automatic_symbols.set(SYMBOLS.X_RFLONG_32P_4DAC8, [eElementType.type_con, 0x0b0010000]);

    this.automatic_symbols.set(SYMBOLS.X_RFBYTE_LUMA8, [eElementType.type_con, 0x0b0020000]);
    this.automatic_symbols.set(SYMBOLS.X_RFBYTE_RGBI8, [eElementType.type_con, 0x0b0030000]);
    this.automatic_symbols.set(SYMBOLS.X_RFBYTE_RGB8, [eElementType.type_con, 0x0b0040000]);
    this.automatic_symbols.set(SYMBOLS.X_RFWORD_RGB16, [eElementType.type_con, 0x0b0050000]);
    this.automatic_symbols.set(SYMBOLS.X_RFLONG_RGB24, [eElementType.type_con, 0x0b0060000]);

    this.automatic_symbols.set(SYMBOLS.X_1P_1DAC1_WFBYTE, [eElementType.type_con, 0x0c0000000]);
    this.automatic_symbols.set(SYMBOLS.X_2P_2DAC1_WFBYTE, [eElementType.type_con, 0x0d0000000]);
    this.automatic_symbols.set(SYMBOLS.X_2P_1DAC2_WFBYTE, [eElementType.type_con, 0x0d0020000]);
    this.automatic_symbols.set(SYMBOLS.X_4P_4DAC1_WFBYTE, [eElementType.type_con, 0x0e0000000]);
    this.automatic_symbols.set(SYMBOLS.X_4P_2DAC2_WFBYTE, [eElementType.type_con, 0x0e0020000]);
    this.automatic_symbols.set(SYMBOLS.X_4P_1DAC4_WFBYTE, [eElementType.type_con, 0x0e0040000]);
    this.automatic_symbols.set(SYMBOLS.X_8P_4DAC2_WFBYTE, [eElementType.type_con, 0x0e0060000]);
    this.automatic_symbols.set(SYMBOLS.X_8P_2DAC4_WFBYTE, [eElementType.type_con, 0x0e0070000]);
    this.automatic_symbols.set(SYMBOLS.X_8P_1DAC8_WFBYTE, [eElementType.type_con, 0x0e00e0000]);
    this.automatic_symbols.set(SYMBOLS.X_16P_4DAC4_WFWORD, [eElementType.type_con, 0x0e00f0000]);
    this.automatic_symbols.set(SYMBOLS.X_16P_2DAC8_WFWORD, [eElementType.type_con, 0x0f0000000]);
    this.automatic_symbols.set(SYMBOLS.X_32P_4DAC8_WFLONG, [eElementType.type_con, 0x0f0010000]);

    this.automatic_symbols.set(SYMBOLS.X_1ADC8_0P_1DAC8_WFBYTE, [eElementType.type_con, 0x0f0020000]);
    this.automatic_symbols.set(SYMBOLS.X_1ADC8_8P_2DAC8_WFWORD, [eElementType.type_con, 0x0f0030000]);
    this.automatic_symbols.set(SYMBOLS.X_2ADC8_0P_2DAC8_WFWORD, [eElementType.type_con, 0x0f0040000]);
    this.automatic_symbols.set(SYMBOLS.X_2ADC8_16P_4DAC8_WFLONG, [eElementType.type_con, 0x0f0050000]);
    this.automatic_symbols.set(SYMBOLS.X_4ADC8_0P_4DAC8_WFLONG, [eElementType.type_con, 0x0f0060000]);

    this.automatic_symbols.set(SYMBOLS.X_DDS_GOERTZEL_SINC1, [eElementType.type_con, 0x0f0070000]);
    this.automatic_symbols.set(SYMBOLS.X_DDS_GOERTZEL_SINC2, [eElementType.type_con, 0x0f0870000]);

    this.automatic_symbols.set(SYMBOLS.X_DACS_OFF, [eElementType.type_con, 0x00000000]);
    this.automatic_symbols.set(SYMBOLS.X_DACS_0_0_0_0, [eElementType.type_con, 0x01000000]);
    this.automatic_symbols.set(SYMBOLS.X_DACS_X_X_0_0, [eElementType.type_con, 0x02000000]);
    this.automatic_symbols.set(SYMBOLS.X_DACS_0_0_X_X, [eElementType.type_con, 0x03000000]);
    this.automatic_symbols.set(SYMBOLS.X_DACS_X_X_X_0, [eElementType.type_con, 0x04000000]);
    this.automatic_symbols.set(SYMBOLS.X_DACS_X_X_0_X, [eElementType.type_con, 0x05000000]);
    this.automatic_symbols.set(SYMBOLS.X_DACS_X_0_X_X, [eElementType.type_con, 0x06000000]);
    this.automatic_symbols.set(SYMBOLS.X_DACS_0_X_X_X, [eElementType.type_con, 0x07000000]);
    this.automatic_symbols.set(SYMBOLS.X_DACS_0N0_0N0, [eElementType.type_con, 0x08000000]);
    this.automatic_symbols.set(SYMBOLS.X_DACS_X_X_0N0, [eElementType.type_con, 0x09000000]);
    this.automatic_symbols.set(SYMBOLS.X_DACS_0N0_X_X, [eElementType.type_con, 0x0a000000]);
    this.automatic_symbols.set(SYMBOLS.X_DACS_1_0_1_0, [eElementType.type_con, 0x0b000000]);
    this.automatic_symbols.set(SYMBOLS.X_DACS_X_X_1_0, [eElementType.type_con, 0x0c000000]);
    this.automatic_symbols.set(SYMBOLS.X_DACS_1_0_X_X, [eElementType.type_con, 0x0d000000]);
    this.automatic_symbols.set(SYMBOLS.X_DACS_1N1_0N0, [eElementType.type_con, 0x0e000000]);
    this.automatic_symbols.set(SYMBOLS.X_DACS_3_2_1_0, [eElementType.type_con, 0x0f000000]);

    this.automatic_symbols.set(SYMBOLS.X_PINS_OFF, [eElementType.type_con, 0x00000000]);
    this.automatic_symbols.set(SYMBOLS.X_PINS_ON, [eElementType.type_con, 0x00800000]);

    this.automatic_symbols.set(SYMBOLS.X_WRITE_OFF, [eElementType.type_con, 0x00000000]);
    this.automatic_symbols.set(SYMBOLS.X_WRITE_ON, [eElementType.type_con, 0x00800000]);

    this.automatic_symbols.set(SYMBOLS.X_ALT_OFF, [eElementType.type_con, 0x00000000]);
    this.automatic_symbols.set(SYMBOLS.X_ALT_ON, [eElementType.type_con, 0x00010000]);

    this.automatic_symbols.set(SYMBOLS.INT_OFF, [eElementType.type_con, 0]); // event/interrupt constants
    this.automatic_symbols.set(SYMBOLS.EVENT_INT, [eElementType.type_con, 0]);
    this.automatic_symbols.set(SYMBOLS.EVENT_CT1, [eElementType.type_con, 1]);
    this.automatic_symbols.set(SYMBOLS.EVENT_CT2, [eElementType.type_con, 2]);
    this.automatic_symbols.set(SYMBOLS.EVENT_CT3, [eElementType.type_con, 3]);
    this.automatic_symbols.set(SYMBOLS.EVENT_SE1, [eElementType.type_con, 4]);
    this.automatic_symbols.set(SYMBOLS.EVENT_SE2, [eElementType.type_con, 5]);
    this.automatic_symbols.set(SYMBOLS.EVENT_SE3, [eElementType.type_con, 6]);
    this.automatic_symbols.set(SYMBOLS.EVENT_SE4, [eElementType.type_con, 7]);
    this.automatic_symbols.set(SYMBOLS.EVENT_PAT, [eElementType.type_con, 8]);
    this.automatic_symbols.set(SYMBOLS.EVENT_FBW, [eElementType.type_con, 9]);
    this.automatic_symbols.set(SYMBOLS.EVENT_XMT, [eElementType.type_con, 10]);
    this.automatic_symbols.set(SYMBOLS.EVENT_XFI, [eElementType.type_con, 11]);
    this.automatic_symbols.set(SYMBOLS.EVENT_XRO, [eElementType.type_con, 12]);
    this.automatic_symbols.set(SYMBOLS.EVENT_XRL, [eElementType.type_con, 13]);
    this.automatic_symbols.set(SYMBOLS.EVENT_ATN, [eElementType.type_con, 14]);
    this.automatic_symbols.set(SYMBOLS.EVENT_QMT, [eElementType.type_con, 15]);
  }

  public operatorSymbol(possibleOperator: string): iSpinSymbol | undefined {
    //this.logMessage(`- operatorConvert(${line})`);
    let findResult: iSpinSymbol | undefined = undefined;
    let searchString: string = possibleOperator.substring(0, 3); // only 1st three chars
    if (searchString.length > 2) {
      //this.logMessage(`  --  searchString=[${searchString}]`);
      findResult = this.find_symbol_s3.find((symbol) => symbol.symbol === searchString);
    }
    if (!findResult && searchString.length > 1) {
      searchString = possibleOperator.substring(0, 2);
      //this.logMessage(`  --  searchString=[${searchString}]`);
      findResult = this.find_symbol_s2.find((symbol) => symbol.symbol === searchString);
    }
    if (!findResult && searchString.length > 0) {
      searchString = possibleOperator.substring(0, 1);
      //this.logMessage(`  --  searchString=[${searchString}]`);
      findResult = this.find_symbol_s1.find((symbol) => symbol.symbol === searchString);
    }
    return findResult;
  }

  private opcodeValue(opcodeId: eOpcode): number {
    // retrieve the computed value for a given asmcode id
    let returnValue: number = 0;
    if (this.opcodeValues.has(opcodeId)) {
      const tmpReturnValue = this.opcodeValues.get(opcodeId);
      if (tmpReturnValue) {
        returnValue = tmpReturnValue;
      }
    }
    return returnValue;
  }

  private asmcodeValue(asmcodeId: eAsmcode): number {
    // retrieve the computed value for a given asmcode id
    let returnValue: number = 0;
    if (this.asmcodeValues.has(asmcodeId)) {
      const tmpReturnValue = this.asmcodeValues.get(asmcodeId);
      if (tmpReturnValue) {
        returnValue = tmpReturnValue;
      }
    }
    return returnValue;
  }

  private flexValue(flexId: eFlexcode): number {
    // retrieve the computed value for a given flexcode id
    let returnValue: number = 0;
    if (this.flexcodeValues.has(flexId)) {
      const tmpReturnValue = this.flexcodeValues.get(flexId);
      if (tmpReturnValue) {
        returnValue = tmpReturnValue;
      }
    }
    return returnValue;
  }
}
// unofficial enum - internal use ONLY
enum eAsmcode {
  ac_ror,
  ac_rol,
  ac_shr,
  ac_shl,
  ac_rcr,
  ac_rcl,
  ac_sar,
  ac_sal,
  ac_add,
  ac_addx,
  ac_adds,
  ac_addsx,
  ac_sub,
  ac_subx,
  ac_subs,
  ac_subsx,
  ac_cmp,
  ac_cmpx,
  ac_cmps,
  ac_cmpsx,
  ac_cmpr,
  ac_cmpm,
  ac_subr,
  ac_cmpsub,
  ac_fge,
  ac_fle,
  ac_fges,
  ac_fles,
  ac_sumc,
  ac_sumnc,
  ac_sumz,
  ac_sumnz,
  ac_bitl,
  ac_bith,
  ac_bitc,
  ac_bitnc,
  ac_bitz,
  ac_bitnz,
  ac_bitrnd,
  ac_bitnot,
  ac_testb,
  ac_testbn,
  ac_and,
  ac_andn,
  ac_or,
  ac_xor,
  ac_muxc,
  ac_muxnc,
  ac_muxz,
  ac_muxnz,
  ac_mov,
  ac_not,
  ac_abs,
  ac_neg,
  ac_negc,
  ac_negnc,
  ac_negz,
  ac_negnz,
  ac_incmod,
  ac_decmod,
  ac_zerox,
  ac_signx,
  ac_encod,
  ac_ones,
  ac_test,
  ac_testn,
  ac_setnib,
  ac_getnib,
  ac_rolnib,
  ac_setbyte,
  ac_getbyte,
  ac_rolbyte,
  ac_setword,
  ac_getword,
  ac_rolword,
  ac_altsn,
  ac_altgn,
  ac_altsb,
  ac_altgb,
  ac_altsw,
  ac_altgw,
  ac_altr,
  ac_altd,
  ac_alts,
  ac_altb,
  ac_alti,
  ac_setr,
  ac_setd,
  ac_sets,
  ac_decod,
  ac_bmask,
  ac_crcbit,
  ac_crcnib,
  ac_muxnits,
  ac_muxnibs,
  ac_muxq,
  ac_movbyts,
  ac_mul,
  ac_muls,
  ac_sca,
  ac_scas,
  ac_addpix,
  ac_mulpix,
  ac_blnpix,
  ac_mixpix,
  ac_addct1,
  ac_addct2,
  ac_addct3,
  ac_wmlong,
  ac_rqpin,
  ac_rdpin,
  ac_rdlut,
  ac_rdbyte,
  ac_rdword,
  ac_rdlong,
  ac_callpa,
  ac_callpb,
  ac_djz,
  ac_djnz,
  ac_djf,
  ac_djnf,
  ac_ijz,
  ac_ijnz,
  ac_tjz,
  ac_tjnz,
  ac_tjf,
  ac_tjnf,
  ac_tjs,
  ac_tjns,
  ac_tjv,
  ac_jint,
  ac_jct1,
  ac_jct2,
  ac_jct3,
  ac_jse1,
  ac_jse2,
  ac_jse3,
  ac_jse4,
  ac_jpat,
  ac_jfbw,
  ac_jxmt,
  ac_jxfi,
  ac_jxro,
  ac_jxrl,
  ac_jatn,
  ac_jqmt,
  ac_jnint,
  ac_jnct1,
  ac_jnct2,
  ac_jnct3,
  ac_jnse1,
  ac_jnse2,
  ac_jnse3,
  ac_jnse4,
  ac_jnpat,
  ac_jnfbw,
  ac_jnxmt,
  ac_jnxfi,
  ac_jnxro,
  ac_jnxrl,
  ac_jnatn,
  ac_jnqmt,
  ac_setpat,
  ac_wrpin,
  ac_wxpin,
  ac_wypin,
  ac_wrlut,
  ac_wrbyte,
  ac_wrword,
  ac_wrlong,
  ac_rdfast,
  ac_wrfast,
  ac_fblock,
  ac_xinit,
  ac_xzero,
  ac_xcont,
  ac_rep,
  ac_coginit,
  ac_qmul,
  ac_qdiv,
  ac_qfrac,
  ac_qsqrt,
  ac_qrotate,
  ac_qvector,
  ac_hubset,
  ac_cogid,
  ac_cogstop,
  ac_locknew,
  ac_lockret,
  ac_locktry,
  ac_lockrel,
  ac_qlog,
  ac_qexp,
  ac_rfbyte,
  ac_rfword,
  ac_rflong,
  ac_rfvar,
  ac_rfvars,
  ac_wfbyte,
  ac_wfword,
  ac_wflong,
  ac_getqx,
  ac_getqy,
  ac_getct,
  ac_getrnd,
  ac_setdacs,
  ac_setxfrq,
  ac_getxacc,
  ac_waitx,
  ac_setse1,
  ac_setse2,
  ac_setse3,
  ac_setse4,
  ac_pollint,
  ac_pollct1,
  ac_pollct2,
  ac_pollct3,
  ac_pollse1,
  ac_pollse2,
  ac_pollse3,
  ac_pollse4,
  ac_pollpat,
  ac_pollfbw,
  ac_pollxmt,
  ac_pollxfi,
  ac_pollxro,
  ac_pollxrl,
  ac_pollatn,
  ac_pollqmt,
  ac_waitint,
  ac_waitct1,
  ac_waitct2,
  ac_waitct3,
  ac_waitse1,
  ac_waitse2,
  ac_waitse3,
  ac_waitse4,
  ac_waitpat,
  ac_waitfbw,
  ac_waitxmt,
  ac_waitxfi,
  ac_waitxro,
  ac_waitxrl,
  ac_waitatn,
  ac_allowi,
  ac_stalli,
  ac_trgint1,
  ac_trgint2,
  ac_trgint3,
  ac_nixint1,
  ac_nixint2,
  ac_nixint3,
  ac_setint1,
  ac_setint2,
  ac_setint3,
  ac_setq,
  ac_setq2,
  ac_push,
  ac_pop,
  ac_jmprel,
  ac_skip,
  ac_skipf,
  ac_execf,
  ac_getptr,
  ac_getbrk,
  ac_cogbrk,
  ac_brk,
  ac_setluts,
  ac_setcy,
  ac_setci,
  ac_setcq,
  ac_setcfrq,
  ac_setcmod,
  ac_setpiv,
  ac_setpix,
  ac_cogatn,
  ac_testp,
  ac_testpn,
  ac_dirl,
  ac_dirh,
  ac_dirc,
  ac_dirnc,
  ac_dirz,
  ac_dirnz,
  ac_dirrnd,
  ac_dirnot,
  ac_outl,
  ac_outh,
  ac_outc,
  ac_outnc,
  ac_outz,
  ac_outnz,
  ac_outrnd,
  ac_outnot,
  ac_fltl,
  ac_flth,
  ac_fltc,
  ac_fltnc,
  ac_fltz,
  ac_fltnz,
  ac_fltrnd,
  ac_fltnot,
  ac_drvl,
  ac_drvh,
  ac_drvc,
  ac_drvnc,
  ac_drvz,
  ac_drvnz,
  ac_drvrnd,
  ac_drvnot,
  ac_splitb,
  ac_mergeb,
  ac_splitw,
  ac_mergew,
  ac_seussf,
  ac_seussr,
  ac_rgbsqz,
  ac_rgbexp,
  ac_xoro32,
  ac_rev,
  ac_rczr,
  ac_rczl,
  ac_wrc,
  ac_wrnc,
  ac_wrz,
  ac_wrnz,
  ac_modcz,
  ac_modc,
  ac_modz,
  ac_setscp,
  ac_getscp,
  ac_jmp,
  ac_call,
  ac_calla,
  ac_callb,
  ac_calld,
  ac_loc,
  ac_augs,
  ac_augd,
  ac_pusha,
  ac_pushb,
  ac_popa,
  ac_popb,
  ac_ret,
  ac_reta,
  ac_retb,
  ac_reti0,
  ac_reti1,
  ac_reti2,
  ac_reti3,
  ac_resi0,
  ac_resi1,
  ac_resi2,
  ac_resi3,
  ac_xstop,
  ac_akpin,
  ac_asmclk,
  ac_nop,
  ac_debug
}

// unofficial enum - internal use ONLY
enum eFlexcode {
  fc_coginit,
  fc_coginit_push,
  fc_cogstop,
  fc_cogid,
  fc_cogchk,
  fc_getrnd,
  fc_getct,
  fc_pollct,
  fc_waitct,
  fc_pinwrite,
  fc_pinlow,
  fc_pinhigh,
  fc_pintoggle,
  fc_pinfloat,
  fc_pinread,
  fc_pinstart,
  fc_pinclear,
  fc_wrpin,
  fc_wxpin,
  fc_wypin,
  fc_akpin,
  fc_rdpin,
  fc_rqpin,
  fc_locknew,
  fc_lockret,
  fc_locktry,
  fc_lockrel,
  fc_lockchk,
  fc_cogatn,
  fc_pollatn,
  fc_waitatn,
  fc_hubset,
  fc_clkset,
  fc_regexec,
  fc_regload,
  fc_call,
  fc_getregs,
  fc_setregs,
  fc_bytemove,
  fc_bytefill,
  fc_wordmove,
  fc_wordfill,
  fc_longmove,
  fc_longfill,
  fc_strsize,
  fc_strcomp,
  fc_strcopy,
  fc_getcrc,
  fc_waitus,
  fc_waitms,
  fc_getms,
  fc_getsec,
  fc_muldiv64,
  fc_qsin,
  fc_qcos,
  fc_rotxy,
  fc_polxy,
  fc_xypol,
  fc_nan,
  fc_round,
  fc_trunc,
  fc_float
}

export enum eOpcode {
  oc_bitnot,
  oc_neg,
  oc_fneg,
  oc_abs,
  oc_fabs,
  oc_encod,
  oc_decod,
  oc_bmask,
  oc_ones,
  oc_sqrt,
  oc_fsqrt,
  oc_qlog,
  oc_qexp,
  oc_shr,
  oc_shl,
  oc_sar,
  oc_ror,
  oc_rol,
  oc_rev,
  oc_zerox,
  oc_signx,
  oc_bitand,
  oc_bitxor,
  oc_bitor,
  oc_mul,
  oc_fmul,
  oc_div,
  oc_fdiv,
  oc_divu,
  oc_rem,
  oc_remu,
  oc_sca,
  oc_scas,
  oc_frac,
  oc_add,
  oc_fadd,
  oc_sub,
  oc_fsub,
  oc_fge,
  oc_fle,
  oc_addbits,
  oc_addpins,
  oc_lt,
  oc_flt,
  oc_ltu,
  oc_lte,
  oc_flte,
  oc_lteu,
  oc_e,
  oc_fe,
  oc_ne,
  oc_fne,
  oc_gte,
  oc_fgte,
  oc_gteu,
  oc_gt,
  oc_fgt,
  oc_gtu,
  oc_ltegt,
  oc_lognot,
  oc_lognot_name,
  oc_logand,
  oc_logand_name,
  oc_logxor,
  oc_logxor_name,
  oc_logor,
  oc_logor_name,
  oc_ternary
}
