/** @format */
'use strict';

// src/classes/parseUtils.ts

// a collection of generally useful functions for parsing spin

import { eElementType, eValueType, eBlockType, eByteCode, eOperationType, eFlexcode } from './types';
import { Context } from '../utils/context';
import { hexByte, hexWord } from '../utils/formatUtils';

export interface iSpinSymbol {
  symbol: string;
  type: eElementType;
  value: number;
}

interface iKeyValuePair {
  name: string;
  value: eValueType | number;
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

enum SYMBOLS_V43 {
  LSTRING = 'LSTRING'
}

function setAsmcodeValue(v1: number, v2: number, v3: number): number {
  // calculate the actual asm code value from given parts
  //
  // macro		asmcode	symbol,v1,v2,v3
  // symbol		=	(v3 shl 11) + (v2 shl 9) + v1
  //         endm
  return (v3 << 11) + (v2 << 9) + v1;
}

function setFlexcodeValue(bytecode: number, params: number, results: number, pinfld: number, hubcode: number): number {
  // calculate the actual flexcode value from given parts
  //
  // macro		flexcode	symbol,bytecode,params,results,pinfld,hubcode
  // symbol		=		bytecode + (params shl 8) + (results shl 11) + (pinfld shl 14) + (hubcode shl 15)
  //         endm

  return bytecode + (params << 8) + (results << 11) + (pinfld << 14) + (hubcode << 15);
}

function setOpcodeValue(
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
  const newValue = v1 + (v2 << 8) + (v3 << 16) + (v4 << 24) + (v5 << 25) + (v6 << 26) + (v7 << 27) + (v8 << 28) + (v9 << 29) + (v10 << 30);
  return newValue;
}

interface iBaseSymbolInfo {
  type: eElementType;
  value: number;
}

export class SpinSymbolTables {
  private context: Context;
  private isLogging: boolean = false;
  private automatic_symbols = new Map<string, iBaseSymbolInfo>();
  private automatic_symbols_v43 = new Map<string, iBaseSymbolInfo>();
  private flexcodeValues = new Map<eFlexcode, number>();
  private asmcodeValues = new Map<eAsmcode, number>();
  private opcodeValues = new Map<eOpcode, number>();
  private byteCodeToFlexCodeMap = new Map<eByteCode, eFlexcode>();
  private find_symbol_s1: iSpinSymbol[] = [];
  private find_symbol_s2: iSpinSymbol[] = [];
  private find_symbol_s3: iSpinSymbol[] = [];

  private currSpinVersion: number = 0;

  public readonly ternaryPrecedence = 14;
  public readonly lowestPrecedence = this.ternaryPrecedence + 1;

  constructor(ctx: Context) {
    this.context = ctx;
    // generated opcode table load

    //		oc		op		prec	bytecode	ternary	binary	unary	assign	float	alias	hubcode
    this.opcodeValues.set(eOpcode.oc_bitnot, setOpcodeValue(eOperationType.op_bitnot, 0, eByteCode.bc_bitnot, 0, 0, 1, 1, 0, 0, 0)); //  !
    this.opcodeValues.set(eOpcode.oc_neg, setOpcodeValue(eOperationType.op_neg, 0, eByteCode.bc_neg, 0, 0, 1, 1, 1, 0, 0)); //  -	(uses op_sub sym)
    this.opcodeValues.set(eOpcode.oc_fneg, setOpcodeValue(eOperationType.op_fneg, 0, eByteCode.bc_fneg, 0, 0, 1, 0, 1, 0, 1)); //  -.	(uses op_fsub sym)
    this.opcodeValues.set(eOpcode.oc_abs, setOpcodeValue(eOperationType.op_abs, 0, eByteCode.bc_abs, 0, 0, 1, 1, 1, 0, 0)); //  ABS
    this.opcodeValues.set(eOpcode.oc_fabs, setOpcodeValue(eOperationType.op_fabs, 0, eByteCode.bc_fabs, 0, 0, 1, 0, 1, 0, 1)); //  FABS
    this.opcodeValues.set(eOpcode.oc_encod, setOpcodeValue(eOperationType.op_encod, 0, eByteCode.bc_encod, 0, 0, 1, 1, 0, 0, 0)); //  ENCOD
    this.opcodeValues.set(eOpcode.oc_decod, setOpcodeValue(eOperationType.op_decod, 0, eByteCode.bc_decod, 0, 0, 1, 1, 0, 0, 0)); //  DECOD
    this.opcodeValues.set(eOpcode.oc_bmask, setOpcodeValue(eOperationType.op_bmask, 0, eByteCode.bc_bmask, 0, 0, 1, 1, 0, 0, 0)); //  BMASK
    this.opcodeValues.set(eOpcode.oc_ones, setOpcodeValue(eOperationType.op_ones, 0, eByteCode.bc_ones, 0, 0, 1, 1, 0, 0, 0)); //  ONES
    this.opcodeValues.set(eOpcode.oc_sqrt, setOpcodeValue(eOperationType.op_sqrt, 0, eByteCode.bc_sqrt, 0, 0, 1, 1, 0, 0, 0)); //  SQRT
    this.opcodeValues.set(eOpcode.oc_fsqrt, setOpcodeValue(eOperationType.op_fsqrt, 0, eByteCode.bc_fsqrt, 0, 0, 1, 0, 1, 0, 1)); //  FSQRT
    this.opcodeValues.set(eOpcode.oc_qlog, setOpcodeValue(eOperationType.op_qlog, 0, eByteCode.bc_qlog, 0, 0, 1, 1, 0, 0, 0)); //  QLOG
    this.opcodeValues.set(eOpcode.oc_qexp, setOpcodeValue(eOperationType.op_qexp, 0, eByteCode.bc_qexp, 0, 0, 1, 1, 0, 0, 0)); //  QEXP
    this.opcodeValues.set(eOpcode.oc_shr, setOpcodeValue(eOperationType.op_shr, 1, eByteCode.bc_shr, 0, 1, 0, 1, 0, 0, 0)); //  >>
    this.opcodeValues.set(eOpcode.oc_shl, setOpcodeValue(eOperationType.op_shl, 1, eByteCode.bc_shl, 0, 1, 0, 1, 0, 0, 0)); //  <<
    this.opcodeValues.set(eOpcode.oc_sar, setOpcodeValue(eOperationType.op_sar, 1, eByteCode.bc_sar, 0, 1, 0, 1, 0, 0, 0)); //  SAR
    this.opcodeValues.set(eOpcode.oc_ror, setOpcodeValue(eOperationType.op_ror, 1, eByteCode.bc_ror, 0, 1, 0, 1, 0, 0, 0)); //  ROR
    this.opcodeValues.set(eOpcode.oc_rol, setOpcodeValue(eOperationType.op_rol, 1, eByteCode.bc_rol, 0, 1, 0, 1, 0, 0, 0)); //  ROL
    this.opcodeValues.set(eOpcode.oc_rev, setOpcodeValue(eOperationType.op_rev, 1, eByteCode.bc_rev, 0, 1, 0, 1, 0, 0, 0)); //  REV
    this.opcodeValues.set(eOpcode.oc_zerox, setOpcodeValue(eOperationType.op_zerox, 1, eByteCode.bc_zerox, 0, 1, 0, 1, 0, 0, 0)); //  ZEROX
    this.opcodeValues.set(eOpcode.oc_signx, setOpcodeValue(eOperationType.op_signx, 1, eByteCode.bc_signx, 0, 1, 0, 1, 0, 0, 0)); //  SIGNX
    this.opcodeValues.set(eOpcode.oc_bitand, setOpcodeValue(eOperationType.op_bitand, 2, eByteCode.bc_bitand, 0, 1, 0, 1, 0, 0, 0)); //  &
    this.opcodeValues.set(eOpcode.oc_bitxor, setOpcodeValue(eOperationType.op_bitxor, 3, eByteCode.bc_bitxor, 0, 1, 0, 1, 0, 0, 0)); //  ^
    this.opcodeValues.set(eOpcode.oc_bitor, setOpcodeValue(eOperationType.op_bitor, 4, eByteCode.bc_bitor, 0, 1, 0, 1, 0, 0, 0)); //  |
    this.opcodeValues.set(eOpcode.oc_mul, setOpcodeValue(eOperationType.op_mul, 5, eByteCode.bc_mul, 0, 1, 0, 1, 1, 0, 0)); //  *
    this.opcodeValues.set(eOpcode.oc_fmul, setOpcodeValue(eOperationType.op_fmul, 5, eByteCode.bc_fmul, 0, 1, 0, 0, 1, 0, 1)); //  *.
    this.opcodeValues.set(eOpcode.oc_div, setOpcodeValue(eOperationType.op_div, 5, eByteCode.bc_div, 0, 1, 0, 1, 1, 0, 0)); //  /
    this.opcodeValues.set(eOpcode.oc_fdiv, setOpcodeValue(eOperationType.op_fdiv, 5, eByteCode.bc_fdiv, 0, 1, 0, 0, 1, 0, 1)); //  /.
    this.opcodeValues.set(eOpcode.oc_divu, setOpcodeValue(eOperationType.op_divu, 5, eByteCode.bc_divu, 0, 1, 0, 1, 0, 0, 0)); //  +/
    this.opcodeValues.set(eOpcode.oc_rem, setOpcodeValue(eOperationType.op_rem, 5, eByteCode.bc_rem, 0, 1, 0, 1, 0, 0, 0)); //  //
    this.opcodeValues.set(eOpcode.oc_remu, setOpcodeValue(eOperationType.op_remu, 5, eByteCode.bc_remu, 0, 1, 0, 1, 0, 0, 0)); //  +//
    this.opcodeValues.set(eOpcode.oc_sca, setOpcodeValue(eOperationType.op_sca, 5, eByteCode.bc_sca, 0, 1, 0, 1, 0, 0, 0)); //  SCA
    this.opcodeValues.set(eOpcode.oc_scas, setOpcodeValue(eOperationType.op_scas, 5, eByteCode.bc_scas, 0, 1, 0, 1, 0, 0, 0)); //  SCAS
    this.opcodeValues.set(eOpcode.oc_frac, setOpcodeValue(eOperationType.op_frac, 5, eByteCode.bc_frac, 0, 1, 0, 1, 0, 0, 0)); //  FRAC
    this.opcodeValues.set(eOpcode.oc_add, setOpcodeValue(eOperationType.op_add, 6, eByteCode.bc_add, 0, 1, 0, 1, 1, 0, 0)); //  +
    this.opcodeValues.set(eOpcode.oc_fadd, setOpcodeValue(eOperationType.op_fadd, 6, eByteCode.bc_fadd, 0, 1, 0, 0, 1, 0, 1)); //  +.
    this.opcodeValues.set(eOpcode.oc_sub, setOpcodeValue(eOperationType.op_sub, 6, eByteCode.bc_sub, 0, 1, 0, 1, 1, 0, 0)); //  -
    this.opcodeValues.set(eOpcode.oc_fsub, setOpcodeValue(eOperationType.op_fsub, 6, eByteCode.bc_fsub, 0, 1, 0, 0, 1, 0, 1)); //  -.
    this.opcodeValues.set(eOpcode.oc_fge, setOpcodeValue(eOperationType.op_fge, 7, eByteCode.bc_fge, 0, 1, 0, 1, 1, 0, 0)); //  #>
    this.opcodeValues.set(eOpcode.oc_fle, setOpcodeValue(eOperationType.op_fle, 7, eByteCode.bc_fle, 0, 1, 0, 1, 1, 0, 0)); //  <#
    this.opcodeValues.set(eOpcode.oc_addbits, setOpcodeValue(eOperationType.op_addbits, 8, eByteCode.bc_addbits, 0, 1, 0, 1, 0, 0, 0)); //  ADDBITS
    this.opcodeValues.set(eOpcode.oc_addpins, setOpcodeValue(eOperationType.op_addpins, 8, eByteCode.bc_addpins, 0, 1, 0, 1, 0, 0, 0)); //  ADDPINS
    this.opcodeValues.set(eOpcode.oc_lt, setOpcodeValue(eOperationType.op_lt, 9, eByteCode.bc_lt, 0, 1, 0, 0, 1, 0, 0)); //  <
    this.opcodeValues.set(eOpcode.oc_flt, setOpcodeValue(eOperationType.op_flt, 9, eByteCode.bc_flt, 0, 1, 0, 0, 1, 0, 1)); //  <.
    this.opcodeValues.set(eOpcode.oc_ltu, setOpcodeValue(eOperationType.op_ltu, 9, eByteCode.bc_ltu, 0, 1, 0, 0, 0, 0, 0)); //  +<
    this.opcodeValues.set(eOpcode.oc_lte, setOpcodeValue(eOperationType.op_lte, 9, eByteCode.bc_lte, 0, 1, 0, 0, 1, 0, 0)); //  <=
    this.opcodeValues.set(eOpcode.oc_flte, setOpcodeValue(eOperationType.op_flte, 9, eByteCode.bc_flte, 0, 1, 0, 0, 1, 0, 1)); //  <=.
    this.opcodeValues.set(eOpcode.oc_lteu, setOpcodeValue(eOperationType.op_lteu, 9, eByteCode.bc_lteu, 0, 1, 0, 0, 0, 0, 0)); //  +<=
    this.opcodeValues.set(eOpcode.oc_e, setOpcodeValue(eOperationType.op_e, 9, eByteCode.bc_e, 0, 1, 0, 0, 1, 0, 0)); //  ==
    this.opcodeValues.set(eOpcode.oc_fe, setOpcodeValue(eOperationType.op_fe, 9, eByteCode.bc_fe, 0, 1, 0, 0, 1, 0, 1)); //  ==.
    this.opcodeValues.set(eOpcode.oc_ne, setOpcodeValue(eOperationType.op_ne, 9, eByteCode.bc_ne, 0, 1, 0, 0, 1, 0, 0)); //  <>
    this.opcodeValues.set(eOpcode.oc_fne, setOpcodeValue(eOperationType.op_fne, 9, eByteCode.bc_fne, 0, 1, 0, 0, 1, 0, 1)); //  <>.
    this.opcodeValues.set(eOpcode.oc_gte, setOpcodeValue(eOperationType.op_gte, 9, eByteCode.bc_gte, 0, 1, 0, 0, 1, 0, 0)); //  >=
    this.opcodeValues.set(eOpcode.oc_fgte, setOpcodeValue(eOperationType.op_fgte, 9, eByteCode.bc_fgte, 0, 1, 0, 0, 1, 0, 1)); //  >=.
    this.opcodeValues.set(eOpcode.oc_gteu, setOpcodeValue(eOperationType.op_gteu, 9, eByteCode.bc_gteu, 0, 1, 0, 0, 0, 0, 0)); //  +>=
    this.opcodeValues.set(eOpcode.oc_gt, setOpcodeValue(eOperationType.op_gt, 9, eByteCode.bc_gt, 0, 1, 0, 0, 1, 0, 0)); //  >
    this.opcodeValues.set(eOpcode.oc_fgt, setOpcodeValue(eOperationType.op_fgt, 9, eByteCode.bc_fgt, 0, 1, 0, 0, 1, 0, 1)); //  >.
    this.opcodeValues.set(eOpcode.oc_gtu, setOpcodeValue(eOperationType.op_gtu, 9, eByteCode.bc_gtu, 0, 1, 0, 0, 0, 0, 0)); //  +>
    this.opcodeValues.set(eOpcode.oc_ltegt, setOpcodeValue(eOperationType.op_ltegt, 9, eByteCode.bc_ltegt, 0, 1, 0, 0, 1, 0, 0)); //  <=>
    this.opcodeValues.set(eOpcode.oc_lognot, setOpcodeValue(eOperationType.op_lognot, 10, eByteCode.bc_lognot, 0, 0, 1, 1, 0, 1, 0)); //  !!
    this.opcodeValues.set(eOpcode.oc_lognot_name, setOpcodeValue(eOperationType.op_lognot, 10, eByteCode.bc_lognot, 0, 0, 1, 1, 0, 0, 0)); //  NOT
    this.opcodeValues.set(eOpcode.oc_logand, setOpcodeValue(eOperationType.op_logand, 11, eByteCode.bc_logand, 0, 1, 0, 1, 0, 1, 0)); //  &&
    this.opcodeValues.set(eOpcode.oc_logand_name, setOpcodeValue(eOperationType.op_logand, 11, eByteCode.bc_logand, 0, 1, 0, 1, 0, 0, 0)); //  AND
    this.opcodeValues.set(eOpcode.oc_logxor, setOpcodeValue(eOperationType.op_logxor, 12, eByteCode.bc_logxor, 0, 1, 0, 1, 0, 1, 0)); //  ^^
    this.opcodeValues.set(eOpcode.oc_logxor_name, setOpcodeValue(eOperationType.op_logxor, 12, eByteCode.bc_logxor, 0, 1, 0, 1, 0, 0, 0)); //  XOR
    this.opcodeValues.set(eOpcode.oc_logor, setOpcodeValue(eOperationType.op_logor, 13, eByteCode.bc_logor, 0, 1, 0, 1, 0, 1, 0)); //  ||
    this.opcodeValues.set(eOpcode.oc_logor_name, setOpcodeValue(eOperationType.op_logor, 13, eByteCode.bc_logor, 0, 1, 0, 1, 0, 0, 0)); //  OR
    this.opcodeValues.set(eOpcode.oc_ternary, setOpcodeValue(eOperationType.op_ternary, 14, 0, 1, 0, 0, 1, 0, 0, 0)); //  ?

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
      //		syms	'-',	type_op,	oc_neg		(uses oc_sub symbol)
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
      { symbol: '||', type: eElementType.type_op, value: this.opcodeValue(eOpcode.oc_logor) },
      //		syms	'-.',	type_op,	oc_fneg		(uses oc_fsub symbol)
      { symbol: '<.', type: eElementType.type_op, value: this.opcodeValue(eOpcode.oc_flt) },
      { symbol: '>.', type: eElementType.type_op, value: this.opcodeValue(eOpcode.oc_fgt) },
      { symbol: '+.', type: eElementType.type_op, value: this.opcodeValue(eOpcode.oc_fadd) },
      { symbol: '-.', type: eElementType.type_op, value: this.opcodeValue(eOpcode.oc_fsub) },
      { symbol: '*.', type: eElementType.type_op, value: this.opcodeValue(eOpcode.oc_fmul) },
      { symbol: '/.', type: eElementType.type_op, value: this.opcodeValue(eOpcode.oc_fdiv) }
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

    //
    // generated Assembly codes table load
    //		---------------------------------------------------------------------------------------
    this.asmcodeValues.set(eAsmcode.ac_ror, setAsmcodeValue(0b000000000, 0b11, eValueType.operand_ds)); // 	ROR	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_rol, setAsmcodeValue(0b000000100, 0b11, eValueType.operand_ds)); // 	ROL	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_shr, setAsmcodeValue(0b000001000, 0b11, eValueType.operand_ds)); // 	SHR	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_shl, setAsmcodeValue(0b000001100, 0b11, eValueType.operand_ds)); // 	SHL	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_rcr, setAsmcodeValue(0b000010000, 0b11, eValueType.operand_ds)); // 	RCR	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_rcl, setAsmcodeValue(0b000010100, 0b11, eValueType.operand_ds)); // 	RCL	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_sar, setAsmcodeValue(0b000011000, 0b11, eValueType.operand_ds)); // 	SAR	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_sal, setAsmcodeValue(0b000011100, 0b11, eValueType.operand_ds)); // 	SAL	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_add, setAsmcodeValue(0b000100000, 0b11, eValueType.operand_ds)); // 	ADD	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_addx, setAsmcodeValue(0b000100100, 0b11, eValueType.operand_ds)); // 	ADDX	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_adds, setAsmcodeValue(0b000101000, 0b11, eValueType.operand_ds)); // 	ADDS	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_addsx, setAsmcodeValue(0b000101100, 0b11, eValueType.operand_ds)); // 	ADDSX	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_sub, setAsmcodeValue(0b000110000, 0b11, eValueType.operand_ds)); // 	SUB	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_subx, setAsmcodeValue(0b000110100, 0b11, eValueType.operand_ds)); // 	SUBX	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_subs, setAsmcodeValue(0b000111000, 0b11, eValueType.operand_ds)); // 	SUBS	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_subsx, setAsmcodeValue(0b000111100, 0b11, eValueType.operand_ds)); // 	SUBSX	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_cmp, setAsmcodeValue(0b001000000, 0b11, eValueType.operand_ds)); // 	CMP	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_cmpx, setAsmcodeValue(0b001000100, 0b11, eValueType.operand_ds)); // 	CMPX	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_cmps, setAsmcodeValue(0b001001000, 0b11, eValueType.operand_ds)); // 	CMPS	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_cmpsx, setAsmcodeValue(0b001001100, 0b11, eValueType.operand_ds)); // 	CMPSX	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_cmpr, setAsmcodeValue(0b001010000, 0b11, eValueType.operand_ds)); // 	CMPR	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_cmpm, setAsmcodeValue(0b001010100, 0b11, eValueType.operand_ds)); // 	CMPM	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_subr, setAsmcodeValue(0b001011000, 0b11, eValueType.operand_ds)); // 	SUBR	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_cmpsub, setAsmcodeValue(0b001011100, 0b11, eValueType.operand_ds)); // 	CMPSUB	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_fge, setAsmcodeValue(0b001100000, 0b11, eValueType.operand_ds)); // 	FGE	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_fle, setAsmcodeValue(0b001100100, 0b11, eValueType.operand_ds)); // 	FLE	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_fges, setAsmcodeValue(0b001101000, 0b11, eValueType.operand_ds)); // 	FGES	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_fles, setAsmcodeValue(0b001101100, 0b11, eValueType.operand_ds)); // 	FLES	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_sumc, setAsmcodeValue(0b001110000, 0b11, eValueType.operand_ds)); // 	SUMC	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_sumnc, setAsmcodeValue(0b001110100, 0b11, eValueType.operand_ds)); // 	SUMNC	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_sumz, setAsmcodeValue(0b001111000, 0b11, eValueType.operand_ds)); // 	SUMZ	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_sumnz, setAsmcodeValue(0b001111100, 0b11, eValueType.operand_ds)); // 	SUMNZ	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_bitl, setAsmcodeValue(0b010000000, 0b00, eValueType.operand_bitx)); // 	BITL	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_bith, setAsmcodeValue(0b010000100, 0b00, eValueType.operand_bitx)); // 	BITH	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_bitc, setAsmcodeValue(0b010001000, 0b00, eValueType.operand_bitx)); // 	BITC	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_bitnc, setAsmcodeValue(0b010001100, 0b00, eValueType.operand_bitx)); // 	BITNC	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_bitz, setAsmcodeValue(0b010010000, 0b00, eValueType.operand_bitx)); // 	BITZ	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_bitnz, setAsmcodeValue(0b010010100, 0b00, eValueType.operand_bitx)); // 	BITNZ	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_bitrnd, setAsmcodeValue(0b010011000, 0b00, eValueType.operand_bitx)); // 	BITRND	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_bitnot, setAsmcodeValue(0b010011100, 0b00, eValueType.operand_bitx)); // 	BITNOT	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_testb, setAsmcodeValue(0b010000000, 0b00, eValueType.operand_testb)); // 	TESTB	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_testbn, setAsmcodeValue(0b010000100, 0b00, eValueType.operand_testb)); // 	TESTBN	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_and, setAsmcodeValue(0b010100000, 0b11, eValueType.operand_ds)); // 	AND	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_andn, setAsmcodeValue(0b010100100, 0b11, eValueType.operand_ds)); // 	ANDN	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_or, setAsmcodeValue(0b010101000, 0b11, eValueType.operand_ds)); // 	OR	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_xor, setAsmcodeValue(0b010101100, 0b11, eValueType.operand_ds)); // 	XOR	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_muxc, setAsmcodeValue(0b010110000, 0b11, eValueType.operand_ds)); // 	MUXC	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_muxnc, setAsmcodeValue(0b010110100, 0b11, eValueType.operand_ds)); // 	MUXNC	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_muxz, setAsmcodeValue(0b010111000, 0b11, eValueType.operand_ds)); // 	MUXZ	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_muxnz, setAsmcodeValue(0b010111100, 0b11, eValueType.operand_ds)); // 	MUXNZ	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_mov, setAsmcodeValue(0b011000000, 0b11, eValueType.operand_ds)); // 	MOV	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_not, setAsmcodeValue(0b011000100, 0b11, eValueType.operand_du)); // 	NOT	D{,S/#}
    this.asmcodeValues.set(eAsmcode.ac_abs, setAsmcodeValue(0b011001000, 0b11, eValueType.operand_du)); // 	ABS	D{,S/#}
    this.asmcodeValues.set(eAsmcode.ac_neg, setAsmcodeValue(0b011001100, 0b11, eValueType.operand_du)); // 	NEG	D{,S/#}
    this.asmcodeValues.set(eAsmcode.ac_negc, setAsmcodeValue(0b011010000, 0b11, eValueType.operand_du)); // 	NEGC	D{,S/#}
    this.asmcodeValues.set(eAsmcode.ac_negnc, setAsmcodeValue(0b011010100, 0b11, eValueType.operand_du)); // 	NEGNC	D{,S/#}
    this.asmcodeValues.set(eAsmcode.ac_negz, setAsmcodeValue(0b011011000, 0b11, eValueType.operand_du)); // 	NEGZ	D{,S/#}
    this.asmcodeValues.set(eAsmcode.ac_negnz, setAsmcodeValue(0b011011100, 0b11, eValueType.operand_du)); // 	NEGNZ	D{,S/#}
    this.asmcodeValues.set(eAsmcode.ac_incmod, setAsmcodeValue(0b011100000, 0b11, eValueType.operand_ds)); // 	INCMOD	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_decmod, setAsmcodeValue(0b011100100, 0b11, eValueType.operand_ds)); // 	DECMOD	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_zerox, setAsmcodeValue(0b011101000, 0b11, eValueType.operand_ds)); // 	ZEROX	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_signx, setAsmcodeValue(0b011101100, 0b11, eValueType.operand_ds)); // 	SIGNX	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_encod, setAsmcodeValue(0b011110000, 0b11, eValueType.operand_du)); // 	ENCOD	D{,S/#}
    this.asmcodeValues.set(eAsmcode.ac_ones, setAsmcodeValue(0b011110100, 0b11, eValueType.operand_du)); // 	ONES	D{,S/#}
    this.asmcodeValues.set(eAsmcode.ac_test, setAsmcodeValue(0b011111000, 0b11, eValueType.operand_du)); // 	TEST	D,{S/#}
    this.asmcodeValues.set(eAsmcode.ac_testn, setAsmcodeValue(0b011111100, 0b11, eValueType.operand_ds)); // 	TESTN	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_setnib, setAsmcodeValue(0b100000000, 0b00, eValueType.operand_ds3set)); // 	SETNIB	{D,}S/#{,#0..7}
    this.asmcodeValues.set(eAsmcode.ac_getnib, setAsmcodeValue(0b100001000, 0b00, eValueType.operand_ds3get)); // 	GETNIB	D{,S/#,#0..7}
    this.asmcodeValues.set(eAsmcode.ac_rolnib, setAsmcodeValue(0b100010000, 0b00, eValueType.operand_ds3get)); // 	ROLNIB	D{,S/#,#0..7}
    this.asmcodeValues.set(eAsmcode.ac_setbyte, setAsmcodeValue(0b100011000, 0b00, eValueType.operand_ds2set)); // 	SETBYTE	{D,}S/#{,#0..3}
    this.asmcodeValues.set(eAsmcode.ac_getbyte, setAsmcodeValue(0b100011100, 0b00, eValueType.operand_ds2get)); // 	GETBYTE	D{,S/#,#0..3}
    this.asmcodeValues.set(eAsmcode.ac_rolbyte, setAsmcodeValue(0b100100000, 0b00, eValueType.operand_ds2get)); // 	ROLBYTE	D{,S/#,#0..3}
    this.asmcodeValues.set(eAsmcode.ac_setword, setAsmcodeValue(0b100100100, 0b00, eValueType.operand_ds1set)); // 	SETWORD	{D,}S/#{,#0..1}
    this.asmcodeValues.set(eAsmcode.ac_getword, setAsmcodeValue(0b100100110, 0b00, eValueType.operand_ds1get)); // 	GETWORD	D{,S/#,#0..1}
    this.asmcodeValues.set(eAsmcode.ac_rolword, setAsmcodeValue(0b100101000, 0b00, eValueType.operand_ds1get)); // 	ROLWORD	D{,S/#,#0..1}
    this.asmcodeValues.set(eAsmcode.ac_altsn, setAsmcodeValue(0b100101010, 0b00, eValueType.operand_duiz)); // 	ALTSN	D{,S/#}
    this.asmcodeValues.set(eAsmcode.ac_altgn, setAsmcodeValue(0b100101011, 0b00, eValueType.operand_duiz)); // 	ALTGN	D{,S/#}
    this.asmcodeValues.set(eAsmcode.ac_altsb, setAsmcodeValue(0b100101100, 0b00, eValueType.operand_duiz)); // 	ALTSB	D{,S/#}
    this.asmcodeValues.set(eAsmcode.ac_altgb, setAsmcodeValue(0b100101101, 0b00, eValueType.operand_duiz)); // 	ALTGB	D{,S/#}
    this.asmcodeValues.set(eAsmcode.ac_altsw, setAsmcodeValue(0b100101110, 0b00, eValueType.operand_duiz)); // 	ALTSW	D{,S/#}
    this.asmcodeValues.set(eAsmcode.ac_altgw, setAsmcodeValue(0b100101111, 0b00, eValueType.operand_duiz)); // 	ALTGW	D{,S/#}
    this.asmcodeValues.set(eAsmcode.ac_altr, setAsmcodeValue(0b100110000, 0b00, eValueType.operand_duiz)); // 	ALTR	D{,S/#}
    this.asmcodeValues.set(eAsmcode.ac_altd, setAsmcodeValue(0b100110001, 0b00, eValueType.operand_duiz)); // 	ALTD	D{,S/#}
    this.asmcodeValues.set(eAsmcode.ac_alts, setAsmcodeValue(0b100110010, 0b00, eValueType.operand_duiz)); // 	ALTS	D{,S/#}
    this.asmcodeValues.set(eAsmcode.ac_altb, setAsmcodeValue(0b100110011, 0b00, eValueType.operand_duiz)); // 	ALTB	D{,S/#}
    this.asmcodeValues.set(eAsmcode.ac_alti, setAsmcodeValue(0b100110100, 0b00, eValueType.operand_duii)); // 	ALTI	D{,S/#}
    this.asmcodeValues.set(eAsmcode.ac_setr, setAsmcodeValue(0b100110101, 0b00, eValueType.operand_ds)); // 	SETR	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_setd, setAsmcodeValue(0b100110110, 0b00, eValueType.operand_ds)); // 	SETD	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_sets, setAsmcodeValue(0b100110111, 0b00, eValueType.operand_ds)); // 	SETS	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_decod, setAsmcodeValue(0b100111000, 0b00, eValueType.operand_du)); // 	DECOD	D{,S/#}
    this.asmcodeValues.set(eAsmcode.ac_bmask, setAsmcodeValue(0b100111001, 0b00, eValueType.operand_du)); // 	BMASK	D{,S/#}
    this.asmcodeValues.set(eAsmcode.ac_crcbit, setAsmcodeValue(0b100111010, 0b00, eValueType.operand_ds)); // 	CRCBIT	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_crcnib, setAsmcodeValue(0b100111011, 0b00, eValueType.operand_ds)); // 	CRCNIB	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_muxnits, setAsmcodeValue(0b100111100, 0b00, eValueType.operand_ds)); // 	MUXNITS	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_muxnibs, setAsmcodeValue(0b100111101, 0b00, eValueType.operand_ds)); // 	MUXNIBS	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_muxq, setAsmcodeValue(0b100111110, 0b00, eValueType.operand_ds)); // 	MUXQ	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_movbyts, setAsmcodeValue(0b100111111, 0b00, eValueType.operand_ds)); // 	MOVBYTS	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_mul, setAsmcodeValue(0b101000000, 0b01, eValueType.operand_ds)); // 	MUL	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_muls, setAsmcodeValue(0b101000010, 0b01, eValueType.operand_ds)); // 	MULS	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_sca, setAsmcodeValue(0b101000100, 0b01, eValueType.operand_ds)); // 	SCA	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_scas, setAsmcodeValue(0b101000110, 0b01, eValueType.operand_ds)); // 	SCAS	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_addpix, setAsmcodeValue(0b101001000, 0b00, eValueType.operand_ds)); // 	ADDPIX	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_mulpix, setAsmcodeValue(0b101001001, 0b00, eValueType.operand_ds)); // 	MULPIX	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_blnpix, setAsmcodeValue(0b101001010, 0b00, eValueType.operand_ds)); // 	BLNPIX	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_mixpix, setAsmcodeValue(0b101001011, 0b00, eValueType.operand_ds)); // 	MIXPIX	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_addct1, setAsmcodeValue(0b101001100, 0b00, eValueType.operand_ds)); // 	ADDCT1	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_addct2, setAsmcodeValue(0b101001101, 0b00, eValueType.operand_ds)); // 	ADDCT2	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_addct3, setAsmcodeValue(0b101001110, 0b00, eValueType.operand_ds)); // 	ADDCT3	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_wmlong, setAsmcodeValue(0b101001111, 0b00, eValueType.operand_dsp)); // 	WMLONG_	D,S/#/PTRx
    this.asmcodeValues.set(eAsmcode.ac_rqpin, setAsmcodeValue(0b101010000, 0b10, eValueType.operand_ds)); // 	RQPIN	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_rdpin, setAsmcodeValue(0b101010001, 0b10, eValueType.operand_ds)); // 	RDPIN	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_rdlut, setAsmcodeValue(0b101010100, 0b11, eValueType.operand_dsp)); // 	RDLUT	D,S/#/PTRx
    this.asmcodeValues.set(eAsmcode.ac_rdbyte, setAsmcodeValue(0b101011000, 0b11, eValueType.operand_dsp)); // 	RDBYTE	D,S/#/PTRx
    this.asmcodeValues.set(eAsmcode.ac_rdword, setAsmcodeValue(0b101011100, 0b11, eValueType.operand_dsp)); // 	RDWORD	D,S/#/PTRx
    this.asmcodeValues.set(eAsmcode.ac_rdlong, setAsmcodeValue(0b101100000, 0b11, eValueType.operand_dsp)); // 	RDLONG	D,S/#/PTRx
    this.asmcodeValues.set(eAsmcode.ac_callpa, setAsmcodeValue(0b101101000, 0b00, eValueType.operand_lsj)); // 	CALLPA	D/#,S/#
    this.asmcodeValues.set(eAsmcode.ac_callpb, setAsmcodeValue(0b101101010, 0b00, eValueType.operand_lsj)); // 	CALLPB	D/#,S/#
    this.asmcodeValues.set(eAsmcode.ac_djz, setAsmcodeValue(0b101101100, 0b00, eValueType.operand_dsj)); // 	DJZ	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_djnz, setAsmcodeValue(0b101101101, 0b00, eValueType.operand_dsj)); // 	DJNZ	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_djf, setAsmcodeValue(0b101101110, 0b00, eValueType.operand_dsj)); // 	DJF	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_djnf, setAsmcodeValue(0b101101111, 0b00, eValueType.operand_dsj)); // 	DJNF	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_ijz, setAsmcodeValue(0b101110000, 0b00, eValueType.operand_dsj)); // 	IJZ	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_ijnz, setAsmcodeValue(0b101110001, 0b00, eValueType.operand_dsj)); // 	IJNZ	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_tjz, setAsmcodeValue(0b101110010, 0b00, eValueType.operand_dsj)); // 	TJZ	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_tjnz, setAsmcodeValue(0b101110011, 0b00, eValueType.operand_dsj)); // 	TJNZ	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_tjf, setAsmcodeValue(0b101110100, 0b00, eValueType.operand_dsj)); // 	TJF	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_tjnf, setAsmcodeValue(0b101110101, 0b00, eValueType.operand_dsj)); // 	TJNF	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_tjs, setAsmcodeValue(0b101110110, 0b00, eValueType.operand_dsj)); // 	TJS	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_tjns, setAsmcodeValue(0b101110111, 0b00, eValueType.operand_dsj)); // 	TJNS	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_tjv, setAsmcodeValue(0b101111000, 0b00, eValueType.operand_dsj)); // 	TJV	D,S/#
    this.asmcodeValues.set(eAsmcode.ac_jint, setAsmcodeValue(0b000000000, 0b00, eValueType.operand_jpoll)); // 	JINT	S/#
    this.asmcodeValues.set(eAsmcode.ac_jct1, setAsmcodeValue(0b000000001, 0b00, eValueType.operand_jpoll)); // 	JCT1	S/#
    this.asmcodeValues.set(eAsmcode.ac_jct2, setAsmcodeValue(0b000000010, 0b00, eValueType.operand_jpoll)); // 	JCT2	S/#
    this.asmcodeValues.set(eAsmcode.ac_jct3, setAsmcodeValue(0b000000011, 0b00, eValueType.operand_jpoll)); // 	JCT3	S/#
    this.asmcodeValues.set(eAsmcode.ac_jse1, setAsmcodeValue(0b000000100, 0b00, eValueType.operand_jpoll)); // 	JSE1	S/#
    this.asmcodeValues.set(eAsmcode.ac_jse2, setAsmcodeValue(0b000000101, 0b00, eValueType.operand_jpoll)); // 	JSE2	S/#
    this.asmcodeValues.set(eAsmcode.ac_jse3, setAsmcodeValue(0b000000110, 0b00, eValueType.operand_jpoll)); // 	JSE3	S/#
    this.asmcodeValues.set(eAsmcode.ac_jse4, setAsmcodeValue(0b000000111, 0b00, eValueType.operand_jpoll)); // 	JSE4	S/#
    this.asmcodeValues.set(eAsmcode.ac_jpat, setAsmcodeValue(0b000001000, 0b00, eValueType.operand_jpoll)); // 	JPAT	S/#
    this.asmcodeValues.set(eAsmcode.ac_jfbw, setAsmcodeValue(0b000001001, 0b00, eValueType.operand_jpoll)); // 	JFBW	S/#
    this.asmcodeValues.set(eAsmcode.ac_jxmt, setAsmcodeValue(0b000001010, 0b00, eValueType.operand_jpoll)); // 	JXMT	S/#
    this.asmcodeValues.set(eAsmcode.ac_jxfi, setAsmcodeValue(0b000001011, 0b00, eValueType.operand_jpoll)); // 	JXFI	S/#
    this.asmcodeValues.set(eAsmcode.ac_jxro, setAsmcodeValue(0b000001100, 0b00, eValueType.operand_jpoll)); // 	JXRO	S/#
    this.asmcodeValues.set(eAsmcode.ac_jxrl, setAsmcodeValue(0b000001101, 0b00, eValueType.operand_jpoll)); // 	JXRL	S/#
    this.asmcodeValues.set(eAsmcode.ac_jatn, setAsmcodeValue(0b000001110, 0b00, eValueType.operand_jpoll)); // 	JATN	S/#
    this.asmcodeValues.set(eAsmcode.ac_jqmt, setAsmcodeValue(0b000001111, 0b00, eValueType.operand_jpoll)); // 	JQMT	S/#
    this.asmcodeValues.set(eAsmcode.ac_jnint, setAsmcodeValue(0b000010000, 0b00, eValueType.operand_jpoll)); // 	JNINT	S/#
    this.asmcodeValues.set(eAsmcode.ac_jnct1, setAsmcodeValue(0b000010001, 0b00, eValueType.operand_jpoll)); // 	JNCT1	S/#
    this.asmcodeValues.set(eAsmcode.ac_jnct2, setAsmcodeValue(0b000010010, 0b00, eValueType.operand_jpoll)); // 	JNCT2	S/#
    this.asmcodeValues.set(eAsmcode.ac_jnct3, setAsmcodeValue(0b000010011, 0b00, eValueType.operand_jpoll)); // 	JNCT3	S/#
    this.asmcodeValues.set(eAsmcode.ac_jnse1, setAsmcodeValue(0b000010100, 0b00, eValueType.operand_jpoll)); // 	JNSE1	S/#
    this.asmcodeValues.set(eAsmcode.ac_jnse2, setAsmcodeValue(0b000010101, 0b00, eValueType.operand_jpoll)); // 	JNSE2	S/#
    this.asmcodeValues.set(eAsmcode.ac_jnse3, setAsmcodeValue(0b000010110, 0b00, eValueType.operand_jpoll)); // 	JNSE3	S/#
    this.asmcodeValues.set(eAsmcode.ac_jnse4, setAsmcodeValue(0b000010111, 0b00, eValueType.operand_jpoll)); // 	JNSE4	S/#
    this.asmcodeValues.set(eAsmcode.ac_jnpat, setAsmcodeValue(0b000011000, 0b00, eValueType.operand_jpoll)); // 	JNPAT	S/#
    this.asmcodeValues.set(eAsmcode.ac_jnfbw, setAsmcodeValue(0b000011001, 0b00, eValueType.operand_jpoll)); // 	JNFBW	S/#
    this.asmcodeValues.set(eAsmcode.ac_jnxmt, setAsmcodeValue(0b000011010, 0b00, eValueType.operand_jpoll)); // 	JNXMT	S/#
    this.asmcodeValues.set(eAsmcode.ac_jnxfi, setAsmcodeValue(0b000011011, 0b00, eValueType.operand_jpoll)); // 	JNXFI	S/#
    this.asmcodeValues.set(eAsmcode.ac_jnxro, setAsmcodeValue(0b000011100, 0b00, eValueType.operand_jpoll)); // 	JNXRO	S/#
    this.asmcodeValues.set(eAsmcode.ac_jnxrl, setAsmcodeValue(0b000011101, 0b00, eValueType.operand_jpoll)); // 	JNXRL	S/#
    this.asmcodeValues.set(eAsmcode.ac_jnatn, setAsmcodeValue(0b000011110, 0b00, eValueType.operand_jpoll)); // 	JNATN	S/#
    this.asmcodeValues.set(eAsmcode.ac_jnqmt, setAsmcodeValue(0b000011111, 0b00, eValueType.operand_jpoll)); // 	JNQMT	S/#
    this.asmcodeValues.set(eAsmcode.ac_setpat, setAsmcodeValue(0b101111110, 0b00, eValueType.operand_ls)); // 	SETPAT	D/#,S/#
    this.asmcodeValues.set(eAsmcode.ac_wrpin, setAsmcodeValue(0b110000000, 0b00, eValueType.operand_ls)); // 	WRPIN	D/#,S/#
    this.asmcodeValues.set(eAsmcode.ac_wxpin, setAsmcodeValue(0b110000010, 0b00, eValueType.operand_ls)); // 	WXPIN	D/#,S/#
    this.asmcodeValues.set(eAsmcode.ac_wypin, setAsmcodeValue(0b110000100, 0b00, eValueType.operand_ls)); // 	WYPIN	D/#,S/#
    this.asmcodeValues.set(eAsmcode.ac_wrlut, setAsmcodeValue(0b110000110, 0b00, eValueType.operand_lsp)); // 	WRLUT	D/#,S/#/PTRx
    this.asmcodeValues.set(eAsmcode.ac_wrbyte, setAsmcodeValue(0b110001000, 0b00, eValueType.operand_lsp)); // 	WRBYTE	D/#,S/#/PTRx
    this.asmcodeValues.set(eAsmcode.ac_wrword, setAsmcodeValue(0b110001010, 0b00, eValueType.operand_lsp)); // 	WRWORD	D/#,S/#/PTRx
    this.asmcodeValues.set(eAsmcode.ac_wrlong, setAsmcodeValue(0b110001100, 0b00, eValueType.operand_lsp)); // 	WRLONG	D/#,S/#/PTRx
    this.asmcodeValues.set(eAsmcode.ac_rdfast, setAsmcodeValue(0b110001110, 0b00, eValueType.operand_ls)); // 	RDFAST	D/#,S/#
    this.asmcodeValues.set(eAsmcode.ac_wrfast, setAsmcodeValue(0b110010000, 0b00, eValueType.operand_ls)); // 	WRFAST	D/#,S/#
    this.asmcodeValues.set(eAsmcode.ac_fblock, setAsmcodeValue(0b110010010, 0b00, eValueType.operand_ls)); // 	FBLOCK	D/#,S/#
    this.asmcodeValues.set(eAsmcode.ac_xinit, setAsmcodeValue(0b110010100, 0b00, eValueType.operand_ls)); // 	XINIT	D/#,S/#
    this.asmcodeValues.set(eAsmcode.ac_xzero, setAsmcodeValue(0b110010110, 0b00, eValueType.operand_ls)); // 	XZERO	D/#,S/#
    this.asmcodeValues.set(eAsmcode.ac_xcont, setAsmcodeValue(0b110011000, 0b00, eValueType.operand_ls)); // 	XCONT	D/#,S/#
    this.asmcodeValues.set(eAsmcode.ac_rep, setAsmcodeValue(0b110011010, 0b00, eValueType.operand_rep)); // 	REP	D/#/@,S/#
    this.asmcodeValues.set(eAsmcode.ac_coginit, setAsmcodeValue(0b110011100, 0b10, eValueType.operand_ls)); // 	COGINIT	D/#,S/#
    this.asmcodeValues.set(eAsmcode.ac_qmul, setAsmcodeValue(0b110100000, 0b00, eValueType.operand_ls)); // 	QMUL	D/#,S/#
    this.asmcodeValues.set(eAsmcode.ac_qdiv, setAsmcodeValue(0b110100010, 0b00, eValueType.operand_ls)); // 	QDIV	D/#,S/#
    this.asmcodeValues.set(eAsmcode.ac_qfrac, setAsmcodeValue(0b110100100, 0b00, eValueType.operand_ls)); // 	QFRAC	D/#,S/#
    this.asmcodeValues.set(eAsmcode.ac_qsqrt, setAsmcodeValue(0b110100110, 0b00, eValueType.operand_ls)); // 	QSQRT	D/#,S/#
    this.asmcodeValues.set(eAsmcode.ac_qrotate, setAsmcodeValue(0b110101000, 0b00, eValueType.operand_ls)); // 	QROTATE	D/#,S/#
    this.asmcodeValues.set(eAsmcode.ac_qvector, setAsmcodeValue(0b110101010, 0b00, eValueType.operand_ls)); // 	QVECTOR	D/#,S/#
    this.asmcodeValues.set(eAsmcode.ac_hubset, setAsmcodeValue(0b000000000, 0b00, eValueType.operand_l)); // 	HUBSET	D/#
    this.asmcodeValues.set(eAsmcode.ac_cogid, setAsmcodeValue(0b000000001, 0b10, eValueType.operand_l)); // 	COGID	D/#
    this.asmcodeValues.set(eAsmcode.ac_cogstop, setAsmcodeValue(0b000000011, 0b00, eValueType.operand_l)); // 	COGSTOP	D/#
    this.asmcodeValues.set(eAsmcode.ac_locknew, setAsmcodeValue(0b000000100, 0b10, eValueType.operand_d)); // 	LOCKNEW	D
    this.asmcodeValues.set(eAsmcode.ac_lockret, setAsmcodeValue(0b000000101, 0b00, eValueType.operand_l)); // 	LOCKRET	D/#
    this.asmcodeValues.set(eAsmcode.ac_locktry, setAsmcodeValue(0b000000110, 0b10, eValueType.operand_l)); // 	LOCKTRY	D/#
    this.asmcodeValues.set(eAsmcode.ac_lockrel, setAsmcodeValue(0b000000111, 0b10, eValueType.operand_l)); // 	LOCKREL	D/#
    this.asmcodeValues.set(eAsmcode.ac_qlog, setAsmcodeValue(0b000001110, 0b00, eValueType.operand_l)); // 	QLOG	D/#
    this.asmcodeValues.set(eAsmcode.ac_qexp, setAsmcodeValue(0b000001111, 0b00, eValueType.operand_l)); // 	QEXP	D/#
    this.asmcodeValues.set(eAsmcode.ac_rfbyte, setAsmcodeValue(0b000010000, 0b11, eValueType.operand_d)); // 	RFBYTE	D
    this.asmcodeValues.set(eAsmcode.ac_rfword, setAsmcodeValue(0b000010001, 0b11, eValueType.operand_d)); // 	RFWORD	D
    this.asmcodeValues.set(eAsmcode.ac_rflong, setAsmcodeValue(0b000010010, 0b11, eValueType.operand_d)); // 	RFLONG	D
    this.asmcodeValues.set(eAsmcode.ac_rfvar, setAsmcodeValue(0b000010011, 0b11, eValueType.operand_d)); // 	RFVAR	D
    this.asmcodeValues.set(eAsmcode.ac_rfvars, setAsmcodeValue(0b000010100, 0b11, eValueType.operand_d)); // 	RFVARS	D
    this.asmcodeValues.set(eAsmcode.ac_wfbyte, setAsmcodeValue(0b000010101, 0b00, eValueType.operand_l)); // 	WFBYTE	D/#
    this.asmcodeValues.set(eAsmcode.ac_wfword, setAsmcodeValue(0b000010110, 0b00, eValueType.operand_l)); // 	WFWORD	D/#
    this.asmcodeValues.set(eAsmcode.ac_wflong, setAsmcodeValue(0b000010111, 0b00, eValueType.operand_l)); // 	WFLONG	D/#
    this.asmcodeValues.set(eAsmcode.ac_getqx, setAsmcodeValue(0b000011000, 0b11, eValueType.operand_d)); // 	GETQX	D
    this.asmcodeValues.set(eAsmcode.ac_getqy, setAsmcodeValue(0b000011001, 0b11, eValueType.operand_d)); // 	GETQY	D
    this.asmcodeValues.set(eAsmcode.ac_getct, setAsmcodeValue(0b000011010, 0b10, eValueType.operand_d)); // 	GETCT	D
    this.asmcodeValues.set(eAsmcode.ac_getrnd, setAsmcodeValue(0b000011011, 0b11, eValueType.operand_de)); // 	GETRND	D
    this.asmcodeValues.set(eAsmcode.ac_setdacs, setAsmcodeValue(0b000011100, 0b00, eValueType.operand_l)); // 	SETDACS	D/#
    this.asmcodeValues.set(eAsmcode.ac_setxfrq, setAsmcodeValue(0b000011101, 0b00, eValueType.operand_l)); // 	SETXFRQ	D/#
    this.asmcodeValues.set(eAsmcode.ac_getxacc, setAsmcodeValue(0b000011110, 0b00, eValueType.operand_d)); // 	GETXACC	D
    this.asmcodeValues.set(eAsmcode.ac_waitx, setAsmcodeValue(0b000011111, 0b11, eValueType.operand_l)); // 	WAITX	D/#
    this.asmcodeValues.set(eAsmcode.ac_setse1, setAsmcodeValue(0b000100000, 0b00, eValueType.operand_l)); // 	SETSE1	D/#
    this.asmcodeValues.set(eAsmcode.ac_setse2, setAsmcodeValue(0b000100001, 0b00, eValueType.operand_l)); // 	SETSE2	D/#
    this.asmcodeValues.set(eAsmcode.ac_setse3, setAsmcodeValue(0b000100010, 0b00, eValueType.operand_l)); // 	SETSE3	D/#
    this.asmcodeValues.set(eAsmcode.ac_setse4, setAsmcodeValue(0b000100011, 0b00, eValueType.operand_l)); // 	SETSE4	D/#
    this.asmcodeValues.set(eAsmcode.ac_pollint, setAsmcodeValue(0b000000000, 0b11, eValueType.operand_pollwait)); // 	POLLINT
    this.asmcodeValues.set(eAsmcode.ac_pollct1, setAsmcodeValue(0b000000001, 0b11, eValueType.operand_pollwait)); // 	POLLCT1
    this.asmcodeValues.set(eAsmcode.ac_pollct2, setAsmcodeValue(0b000000010, 0b11, eValueType.operand_pollwait)); // 	POLLCT2
    this.asmcodeValues.set(eAsmcode.ac_pollct3, setAsmcodeValue(0b000000011, 0b11, eValueType.operand_pollwait)); // 	POLLCT3
    this.asmcodeValues.set(eAsmcode.ac_pollse1, setAsmcodeValue(0b000000100, 0b11, eValueType.operand_pollwait)); // 	POLLSE1
    this.asmcodeValues.set(eAsmcode.ac_pollse2, setAsmcodeValue(0b000000101, 0b11, eValueType.operand_pollwait)); // 	POLLSE2
    this.asmcodeValues.set(eAsmcode.ac_pollse3, setAsmcodeValue(0b000000110, 0b11, eValueType.operand_pollwait)); // 	POLLSE3
    this.asmcodeValues.set(eAsmcode.ac_pollse4, setAsmcodeValue(0b000000111, 0b11, eValueType.operand_pollwait)); // 	POLLSE4
    this.asmcodeValues.set(eAsmcode.ac_pollpat, setAsmcodeValue(0b000001000, 0b11, eValueType.operand_pollwait)); // 	POLLPAT
    this.asmcodeValues.set(eAsmcode.ac_pollfbw, setAsmcodeValue(0b000001001, 0b11, eValueType.operand_pollwait)); // 	POLLFBW
    this.asmcodeValues.set(eAsmcode.ac_pollxmt, setAsmcodeValue(0b000001010, 0b11, eValueType.operand_pollwait)); // 	POLLXMT
    this.asmcodeValues.set(eAsmcode.ac_pollxfi, setAsmcodeValue(0b000001011, 0b11, eValueType.operand_pollwait)); // 	POLLXFI
    this.asmcodeValues.set(eAsmcode.ac_pollxro, setAsmcodeValue(0b000001100, 0b11, eValueType.operand_pollwait)); // 	POLLXRO
    this.asmcodeValues.set(eAsmcode.ac_pollxrl, setAsmcodeValue(0b000001101, 0b11, eValueType.operand_pollwait)); // 	POLLXRL
    this.asmcodeValues.set(eAsmcode.ac_pollatn, setAsmcodeValue(0b000001110, 0b11, eValueType.operand_pollwait)); // 	POLLATN
    this.asmcodeValues.set(eAsmcode.ac_pollqmt, setAsmcodeValue(0b000001111, 0b11, eValueType.operand_pollwait)); // 	POLLQMT
    this.asmcodeValues.set(eAsmcode.ac_waitint, setAsmcodeValue(0b000010000, 0b11, eValueType.operand_pollwait)); // 	WAITINT
    this.asmcodeValues.set(eAsmcode.ac_waitct1, setAsmcodeValue(0b000010001, 0b11, eValueType.operand_pollwait)); // 	WAITCT1
    this.asmcodeValues.set(eAsmcode.ac_waitct2, setAsmcodeValue(0b000010010, 0b11, eValueType.operand_pollwait)); // 	WAITCT2
    this.asmcodeValues.set(eAsmcode.ac_waitct3, setAsmcodeValue(0b000010011, 0b11, eValueType.operand_pollwait)); // 	WAITCT3
    this.asmcodeValues.set(eAsmcode.ac_waitse1, setAsmcodeValue(0b000010100, 0b11, eValueType.operand_pollwait)); // 	WAITSE1
    this.asmcodeValues.set(eAsmcode.ac_waitse2, setAsmcodeValue(0b000010101, 0b11, eValueType.operand_pollwait)); // 	WAITSE2
    this.asmcodeValues.set(eAsmcode.ac_waitse3, setAsmcodeValue(0b000010110, 0b11, eValueType.operand_pollwait)); // 	WAITSE3
    this.asmcodeValues.set(eAsmcode.ac_waitse4, setAsmcodeValue(0b000010111, 0b11, eValueType.operand_pollwait)); // 	WAITSE4
    this.asmcodeValues.set(eAsmcode.ac_waitpat, setAsmcodeValue(0b000011000, 0b11, eValueType.operand_pollwait)); // 	WAITPAT
    this.asmcodeValues.set(eAsmcode.ac_waitfbw, setAsmcodeValue(0b000011001, 0b11, eValueType.operand_pollwait)); // 	WAITFBW
    this.asmcodeValues.set(eAsmcode.ac_waitxmt, setAsmcodeValue(0b000011010, 0b11, eValueType.operand_pollwait)); // 	WAITXMT
    this.asmcodeValues.set(eAsmcode.ac_waitxfi, setAsmcodeValue(0b000011011, 0b11, eValueType.operand_pollwait)); // 	WAITXFI
    this.asmcodeValues.set(eAsmcode.ac_waitxro, setAsmcodeValue(0b000011100, 0b11, eValueType.operand_pollwait)); // 	WAITXRO
    this.asmcodeValues.set(eAsmcode.ac_waitxrl, setAsmcodeValue(0b000011101, 0b11, eValueType.operand_pollwait)); // 	WAITXRL
    this.asmcodeValues.set(eAsmcode.ac_waitatn, setAsmcodeValue(0b000011110, 0b11, eValueType.operand_pollwait)); // 	WAITATN
    this.asmcodeValues.set(eAsmcode.ac_allowi, setAsmcodeValue(0b000100000, 0b00, eValueType.operand_pollwait)); // 	ALLOWI
    this.asmcodeValues.set(eAsmcode.ac_stalli, setAsmcodeValue(0b000100001, 0b00, eValueType.operand_pollwait)); // 	STALLI
    this.asmcodeValues.set(eAsmcode.ac_trgint1, setAsmcodeValue(0b000100010, 0b00, eValueType.operand_pollwait)); // 	TRGINT1
    this.asmcodeValues.set(eAsmcode.ac_trgint2, setAsmcodeValue(0b000100011, 0b00, eValueType.operand_pollwait)); // 	TRGINT2
    this.asmcodeValues.set(eAsmcode.ac_trgint3, setAsmcodeValue(0b000100100, 0b00, eValueType.operand_pollwait)); // 	TRGINT3
    this.asmcodeValues.set(eAsmcode.ac_nixint1, setAsmcodeValue(0b000100101, 0b00, eValueType.operand_pollwait)); // 	NIXINT1
    this.asmcodeValues.set(eAsmcode.ac_nixint2, setAsmcodeValue(0b000100110, 0b00, eValueType.operand_pollwait)); // 	NIXINT2
    this.asmcodeValues.set(eAsmcode.ac_nixint3, setAsmcodeValue(0b000100111, 0b00, eValueType.operand_pollwait)); // 	NIXINT3
    this.asmcodeValues.set(eAsmcode.ac_setint1, setAsmcodeValue(0b000100101, 0b00, eValueType.operand_l)); // 	SETINT1	D/#
    this.asmcodeValues.set(eAsmcode.ac_setint2, setAsmcodeValue(0b000100110, 0b00, eValueType.operand_l)); // 	SETINT2	D/#
    this.asmcodeValues.set(eAsmcode.ac_setint3, setAsmcodeValue(0b000100111, 0b00, eValueType.operand_l)); // 	SETINT3	D/#
    this.asmcodeValues.set(eAsmcode.ac_setq, setAsmcodeValue(0b000101000, 0b00, eValueType.operand_l)); // 	SETQ	D/#
    this.asmcodeValues.set(eAsmcode.ac_setq2, setAsmcodeValue(0b000101001, 0b00, eValueType.operand_l)); // 	SETQ2	D/#
    this.asmcodeValues.set(eAsmcode.ac_push, setAsmcodeValue(0b000101010, 0b00, eValueType.operand_l)); // 	PUSH	D/#
    this.asmcodeValues.set(eAsmcode.ac_pop, setAsmcodeValue(0b000101011, 0b11, eValueType.operand_d)); // 	POP	D
    this.asmcodeValues.set(eAsmcode.ac_jmprel, setAsmcodeValue(0b000110000, 0b00, eValueType.operand_l)); // 	JMPREL	D/#
    this.asmcodeValues.set(eAsmcode.ac_skip, setAsmcodeValue(0b000110001, 0b00, eValueType.operand_l)); // 	SKIP	D/#
    this.asmcodeValues.set(eAsmcode.ac_skipf, setAsmcodeValue(0b000110010, 0b00, eValueType.operand_l)); // 	SKIPF	D/#
    this.asmcodeValues.set(eAsmcode.ac_execf, setAsmcodeValue(0b000110011, 0b00, eValueType.operand_l)); // 	EXECF	D/#
    this.asmcodeValues.set(eAsmcode.ac_getptr, setAsmcodeValue(0b000110100, 0b00, eValueType.operand_d)); // 	GETPTR	D
    this.asmcodeValues.set(eAsmcode.ac_getbrk, setAsmcodeValue(0b000110101, 0b11, eValueType.operand_getbrk)); // 	GETBRK	D
    this.asmcodeValues.set(eAsmcode.ac_cogbrk, setAsmcodeValue(0b000110101, 0b00, eValueType.operand_l)); // 	COGBRK	D/#
    this.asmcodeValues.set(eAsmcode.ac_brk, setAsmcodeValue(0b000110110, 0b00, eValueType.operand_l)); // 	BRK	D/#
    this.asmcodeValues.set(eAsmcode.ac_setluts, setAsmcodeValue(0b000110111, 0b00, eValueType.operand_l)); // 	SETLUTS	D/#
    this.asmcodeValues.set(eAsmcode.ac_setcy, setAsmcodeValue(0b000111000, 0b00, eValueType.operand_l)); // 	SETCY	D/#
    this.asmcodeValues.set(eAsmcode.ac_setci, setAsmcodeValue(0b000111001, 0b00, eValueType.operand_l)); // 	SETCI	D/#
    this.asmcodeValues.set(eAsmcode.ac_setcq, setAsmcodeValue(0b000111010, 0b00, eValueType.operand_l)); // 	SETCQ	D/#
    this.asmcodeValues.set(eAsmcode.ac_setcfrq, setAsmcodeValue(0b000111011, 0b00, eValueType.operand_l)); // 	SETCFRQ	D/#
    this.asmcodeValues.set(eAsmcode.ac_setcmod, setAsmcodeValue(0b000111100, 0b00, eValueType.operand_l)); // 	SETCMOD	D/#
    this.asmcodeValues.set(eAsmcode.ac_setpiv, setAsmcodeValue(0b000111101, 0b00, eValueType.operand_l)); // 	SETPIV	D/#
    this.asmcodeValues.set(eAsmcode.ac_setpix, setAsmcodeValue(0b000111110, 0b00, eValueType.operand_l)); // 	SETPIX	D/#
    this.asmcodeValues.set(eAsmcode.ac_cogatn, setAsmcodeValue(0b000111111, 0b00, eValueType.operand_l)); // 	COGATN	D/#
    this.asmcodeValues.set(eAsmcode.ac_testp, setAsmcodeValue(0b001000000, 0b00, eValueType.operand_testp)); // 	TESTP	D/#
    this.asmcodeValues.set(eAsmcode.ac_testpn, setAsmcodeValue(0b001000001, 0b00, eValueType.operand_testp)); // 	TESTPN	D/#
    this.asmcodeValues.set(eAsmcode.ac_dirl, setAsmcodeValue(0b001000000, 0b00, eValueType.operand_pinop)); // 	DIRL	D/#
    this.asmcodeValues.set(eAsmcode.ac_dirh, setAsmcodeValue(0b001000001, 0b00, eValueType.operand_pinop)); // 	DIRH	D/#
    this.asmcodeValues.set(eAsmcode.ac_dirc, setAsmcodeValue(0b001000010, 0b00, eValueType.operand_pinop)); // 	DIRC	D/#
    this.asmcodeValues.set(eAsmcode.ac_dirnc, setAsmcodeValue(0b001000011, 0b00, eValueType.operand_pinop)); // 	DIRNC	D/#
    this.asmcodeValues.set(eAsmcode.ac_dirz, setAsmcodeValue(0b001000100, 0b00, eValueType.operand_pinop)); // 	DIRZ	D/#
    this.asmcodeValues.set(eAsmcode.ac_dirnz, setAsmcodeValue(0b001000101, 0b00, eValueType.operand_pinop)); // 	DIRNZ	D/#
    this.asmcodeValues.set(eAsmcode.ac_dirrnd, setAsmcodeValue(0b001000110, 0b00, eValueType.operand_pinop)); // 	DIRRND	D/#
    this.asmcodeValues.set(eAsmcode.ac_dirnot, setAsmcodeValue(0b001000111, 0b00, eValueType.operand_pinop)); // 	DIRNOT	D/#
    this.asmcodeValues.set(eAsmcode.ac_outl, setAsmcodeValue(0b001001000, 0b00, eValueType.operand_pinop)); // 	OUTL	D/#
    this.asmcodeValues.set(eAsmcode.ac_outh, setAsmcodeValue(0b001001001, 0b00, eValueType.operand_pinop)); // 	OUTH	D/#
    this.asmcodeValues.set(eAsmcode.ac_outc, setAsmcodeValue(0b001001010, 0b00, eValueType.operand_pinop)); // 	OUTC	D/#
    this.asmcodeValues.set(eAsmcode.ac_outnc, setAsmcodeValue(0b001001011, 0b00, eValueType.operand_pinop)); // 	OUTNC	D/#
    this.asmcodeValues.set(eAsmcode.ac_outz, setAsmcodeValue(0b001001100, 0b00, eValueType.operand_pinop)); // 	OUTZ	D/#
    this.asmcodeValues.set(eAsmcode.ac_outnz, setAsmcodeValue(0b001001101, 0b00, eValueType.operand_pinop)); // 	OUTNZ	D/#
    this.asmcodeValues.set(eAsmcode.ac_outrnd, setAsmcodeValue(0b001001110, 0b00, eValueType.operand_pinop)); // 	OUTRND	D/#
    this.asmcodeValues.set(eAsmcode.ac_outnot, setAsmcodeValue(0b001001111, 0b00, eValueType.operand_pinop)); // 	OUTNOT	D/#
    this.asmcodeValues.set(eAsmcode.ac_fltl, setAsmcodeValue(0b001010000, 0b00, eValueType.operand_pinop)); // 	FLTL	D/#
    this.asmcodeValues.set(eAsmcode.ac_flth, setAsmcodeValue(0b001010001, 0b00, eValueType.operand_pinop)); // 	FLTH	D/#
    this.asmcodeValues.set(eAsmcode.ac_fltc, setAsmcodeValue(0b001010010, 0b00, eValueType.operand_pinop)); // 	FLTC	D/#
    this.asmcodeValues.set(eAsmcode.ac_fltnc, setAsmcodeValue(0b001010011, 0b00, eValueType.operand_pinop)); // 	FLTNC	D/#
    this.asmcodeValues.set(eAsmcode.ac_fltz, setAsmcodeValue(0b001010100, 0b00, eValueType.operand_pinop)); // 	FLTZ	D/#
    this.asmcodeValues.set(eAsmcode.ac_fltnz, setAsmcodeValue(0b001010101, 0b00, eValueType.operand_pinop)); // 	FLTNZ	D/#
    this.asmcodeValues.set(eAsmcode.ac_fltrnd, setAsmcodeValue(0b001010110, 0b00, eValueType.operand_pinop)); // 	FLTRND	D/#
    this.asmcodeValues.set(eAsmcode.ac_fltnot, setAsmcodeValue(0b001010111, 0b00, eValueType.operand_pinop)); // 	FLTNOT	D/#
    this.asmcodeValues.set(eAsmcode.ac_drvl, setAsmcodeValue(0b001011000, 0b00, eValueType.operand_pinop)); // 	DRVL	D/#
    this.asmcodeValues.set(eAsmcode.ac_drvh, setAsmcodeValue(0b001011001, 0b00, eValueType.operand_pinop)); // 	DRVH	D/#
    this.asmcodeValues.set(eAsmcode.ac_drvc, setAsmcodeValue(0b001011010, 0b00, eValueType.operand_pinop)); // 	DRVC	D/#
    this.asmcodeValues.set(eAsmcode.ac_drvnc, setAsmcodeValue(0b001011011, 0b00, eValueType.operand_pinop)); // 	DRVNC	D/#
    this.asmcodeValues.set(eAsmcode.ac_drvz, setAsmcodeValue(0b001011100, 0b00, eValueType.operand_pinop)); // 	DRVZ	D/#
    this.asmcodeValues.set(eAsmcode.ac_drvnz, setAsmcodeValue(0b001011101, 0b00, eValueType.operand_pinop)); // 	DRVNZ	D/#
    this.asmcodeValues.set(eAsmcode.ac_drvrnd, setAsmcodeValue(0b001011110, 0b00, eValueType.operand_pinop)); // 	DRVRND	D/#
    this.asmcodeValues.set(eAsmcode.ac_drvnot, setAsmcodeValue(0b001011111, 0b00, eValueType.operand_pinop)); // 	DRVNOT	D/#
    this.asmcodeValues.set(eAsmcode.ac_splitb, setAsmcodeValue(0b001100000, 0b00, eValueType.operand_d)); // 	SPLITB	D
    this.asmcodeValues.set(eAsmcode.ac_mergeb, setAsmcodeValue(0b001100001, 0b00, eValueType.operand_d)); // 	MERGEB	D
    this.asmcodeValues.set(eAsmcode.ac_splitw, setAsmcodeValue(0b001100010, 0b00, eValueType.operand_d)); // 	SPLITW	D
    this.asmcodeValues.set(eAsmcode.ac_mergew, setAsmcodeValue(0b001100011, 0b00, eValueType.operand_d)); // 	MERGEW	D
    this.asmcodeValues.set(eAsmcode.ac_seussf, setAsmcodeValue(0b001100100, 0b00, eValueType.operand_d)); // 	SEUSSF	D
    this.asmcodeValues.set(eAsmcode.ac_seussr, setAsmcodeValue(0b001100101, 0b00, eValueType.operand_d)); // 	SEUSSR	D
    this.asmcodeValues.set(eAsmcode.ac_rgbsqz, setAsmcodeValue(0b001100110, 0b00, eValueType.operand_d)); // 	RGBSQZ	D
    this.asmcodeValues.set(eAsmcode.ac_rgbexp, setAsmcodeValue(0b001100111, 0b00, eValueType.operand_d)); // 	RGBEXP	D
    this.asmcodeValues.set(eAsmcode.ac_xoro32, setAsmcodeValue(0b001101000, 0b00, eValueType.operand_d)); // 	XORO32	D
    this.asmcodeValues.set(eAsmcode.ac_rev, setAsmcodeValue(0b001101001, 0b00, eValueType.operand_d)); // 	REV	D
    this.asmcodeValues.set(eAsmcode.ac_rczr, setAsmcodeValue(0b001101010, 0b11, eValueType.operand_d)); // 	RCZR	D
    this.asmcodeValues.set(eAsmcode.ac_rczl, setAsmcodeValue(0b001101011, 0b11, eValueType.operand_d)); // 	RCZL	D
    this.asmcodeValues.set(eAsmcode.ac_wrc, setAsmcodeValue(0b001101100, 0b00, eValueType.operand_d)); // 	WRC	D
    this.asmcodeValues.set(eAsmcode.ac_wrnc, setAsmcodeValue(0b001101101, 0b00, eValueType.operand_d)); // 	WRNC	D
    this.asmcodeValues.set(eAsmcode.ac_wrz, setAsmcodeValue(0b001101110, 0b00, eValueType.operand_d)); // 	WRZ	D
    this.asmcodeValues.set(eAsmcode.ac_wrnz, setAsmcodeValue(0b001101111, 0b00, eValueType.operand_d)); // 	WRNZ	D
    this.asmcodeValues.set(eAsmcode.ac_modcz, setAsmcodeValue(0b001101111, 0b11, eValueType.operand_cz)); // 	MODCZ	c,z
    this.asmcodeValues.set(eAsmcode.ac_modc, setAsmcodeValue(0b001101111, 0b10, eValueType.operand_cz)); // 	MODC	c
    this.asmcodeValues.set(eAsmcode.ac_modz, setAsmcodeValue(0b001101111, 0b01, eValueType.operand_cz)); // 	MODZ	z
    this.asmcodeValues.set(eAsmcode.ac_setscp, setAsmcodeValue(0b001110000, 0b00, eValueType.operand_l)); // 	SETSCP	D/#
    this.asmcodeValues.set(eAsmcode.ac_getscp, setAsmcodeValue(0b001110001, 0b00, eValueType.operand_d)); // 	GETSCP	D
    this.asmcodeValues.set(eAsmcode.ac_jmp, setAsmcodeValue(0b110110000, 0b00, eValueType.operand_jmp)); // 	JMP	# <or> D
    this.asmcodeValues.set(eAsmcode.ac_call, setAsmcodeValue(0b110110100, 0b00, eValueType.operand_call)); // 	CALL	# <or> D
    this.asmcodeValues.set(eAsmcode.ac_calla, setAsmcodeValue(0b110111000, 0b00, eValueType.operand_call)); // 	CALLA	# <or> D
    this.asmcodeValues.set(eAsmcode.ac_callb, setAsmcodeValue(0b110111100, 0b00, eValueType.operand_call)); // 	CALLB	# <or> D
    this.asmcodeValues.set(eAsmcode.ac_calld, setAsmcodeValue(0b111000000, 0b00, eValueType.operand_calld)); // 	CALLD	reg,# / D,S
    this.asmcodeValues.set(eAsmcode.ac_loc, setAsmcodeValue(0b111010000, 0b00, eValueType.operand_loc)); // 	LOC	reg,#
    this.asmcodeValues.set(eAsmcode.ac_augs, setAsmcodeValue(0b111100000, 0b00, eValueType.operand_aug)); // 	AUGS	#
    this.asmcodeValues.set(eAsmcode.ac_augd, setAsmcodeValue(0b111110000, 0b00, eValueType.operand_aug)); // 	AUGD	#
    this.asmcodeValues.set(eAsmcode.ac_pusha, setAsmcodeValue(eValueType.pp_pusha, 0b00, eValueType.operand_pushpop)); // 	PUSHA	D/#	alias instr.
    this.asmcodeValues.set(eAsmcode.ac_pushb, setAsmcodeValue(eValueType.pp_pushb, 0b00, eValueType.operand_pushpop)); // 	PUSHB	D/#
    this.asmcodeValues.set(eAsmcode.ac_popa, setAsmcodeValue(eValueType.pp_popa, 0b11, eValueType.operand_pushpop)); // 	POPA	D
    this.asmcodeValues.set(eAsmcode.ac_popb, setAsmcodeValue(eValueType.pp_popb, 0b11, eValueType.operand_pushpop)); // 	POPB	D
    this.asmcodeValues.set(eAsmcode.ac_ret, setAsmcodeValue(0, 0b11, eValueType.operand_xlat)); // 	RET
    this.asmcodeValues.set(eAsmcode.ac_reta, setAsmcodeValue(1, 0b11, eValueType.operand_xlat)); // 	RETA
    this.asmcodeValues.set(eAsmcode.ac_retb, setAsmcodeValue(2, 0b11, eValueType.operand_xlat)); // 	RETB
    this.asmcodeValues.set(eAsmcode.ac_reti0, setAsmcodeValue(3, 0b00, eValueType.operand_xlat)); // 	RETI0
    this.asmcodeValues.set(eAsmcode.ac_reti1, setAsmcodeValue(4, 0b00, eValueType.operand_xlat)); // 	RETI1
    this.asmcodeValues.set(eAsmcode.ac_reti2, setAsmcodeValue(5, 0b00, eValueType.operand_xlat)); // 	RETI2
    this.asmcodeValues.set(eAsmcode.ac_reti3, setAsmcodeValue(6, 0b00, eValueType.operand_xlat)); // 	RETI3
    this.asmcodeValues.set(eAsmcode.ac_resi0, setAsmcodeValue(7, 0b00, eValueType.operand_xlat)); // 	RESI0
    this.asmcodeValues.set(eAsmcode.ac_resi1, setAsmcodeValue(8, 0b00, eValueType.operand_xlat)); // 	RESI1
    this.asmcodeValues.set(eAsmcode.ac_resi2, setAsmcodeValue(9, 0b00, eValueType.operand_xlat)); // 	RESI2
    this.asmcodeValues.set(eAsmcode.ac_resi3, setAsmcodeValue(10, 0b00, eValueType.operand_xlat)); // 	RESI3
    this.asmcodeValues.set(eAsmcode.ac_xstop, setAsmcodeValue(11, 0b00, eValueType.operand_xlat)); // 	XSTOP
    this.asmcodeValues.set(eAsmcode.ac_akpin, setAsmcodeValue(0, 0b00, eValueType.operand_akpin)); // 	AKPIN	S/#
    this.asmcodeValues.set(eAsmcode.ac_asmclk, setAsmcodeValue(0, 0b00, eValueType.operand_asmclk)); // 	ASMCLK
    this.asmcodeValues.set(eAsmcode.ac_nop, setAsmcodeValue(0b000000000, 0b00, eValueType.operand_nop)); // 	NOP
    this.asmcodeValues.set(eAsmcode.ac_debug, setAsmcodeValue(0b000110110, 0b00, eValueType.operand_debug)); // 	DEBUG()
    //
    // generated flexcode table load
    //
    //		flexcode	bytecode	params	results	pinfld	hubcode
    //		---------------------------------------------------------------------------------------
    this.flexcodeValues.set(eFlexcode.fc_coginit, setFlexcodeValue(eByteCode.bc_coginit, 3, 0, 0, 0)); // (also asm instr.)

    this.flexcodeValues.set(eFlexcode.fc_coginit_push, setFlexcodeValue(eByteCode.bc_coginit_push, 3, 1, 0, 0));
    this.flexcodeValues.set(eFlexcode.fc_cogstop, setFlexcodeValue(eByteCode.bc_cogstop, 1, 0, 0, 0)); // (also asm instr.)

    this.flexcodeValues.set(eFlexcode.fc_cogid, setFlexcodeValue(eByteCode.bc_cogid, 0, 1, 0, 0)); // (also asm instr.)

    this.flexcodeValues.set(eFlexcode.fc_cogchk, setFlexcodeValue(eByteCode.bc_cogchk, 1, 1, 0, 1));
    this.flexcodeValues.set(eFlexcode.fc_getrnd, setFlexcodeValue(eByteCode.bc_getrnd, 0, 1, 0, 0)); // (also asm instr.)

    this.flexcodeValues.set(eFlexcode.fc_getct, setFlexcodeValue(eByteCode.bc_getct, 0, 1, 0, 0)); // (also asm instr.)

    this.flexcodeValues.set(eFlexcode.fc_pollct, setFlexcodeValue(eByteCode.bc_pollct, 1, 1, 0, 0));
    this.flexcodeValues.set(eFlexcode.fc_waitct, setFlexcodeValue(eByteCode.bc_waitct, 1, 0, 0, 0));
    this.flexcodeValues.set(eFlexcode.fc_pinwrite, setFlexcodeValue(eByteCode.bc_pinwrite, 2, 0, 1, 0));
    this.flexcodeValues.set(eFlexcode.fc_pinlow, setFlexcodeValue(eByteCode.bc_pinlow, 1, 0, 1, 0));
    this.flexcodeValues.set(eFlexcode.fc_pinhigh, setFlexcodeValue(eByteCode.bc_pinhigh, 1, 0, 1, 0));
    this.flexcodeValues.set(eFlexcode.fc_pintoggle, setFlexcodeValue(eByteCode.bc_pintoggle, 1, 0, 1, 0));
    this.flexcodeValues.set(eFlexcode.fc_pinfloat, setFlexcodeValue(eByteCode.bc_pinfloat, 1, 0, 1, 0));
    this.flexcodeValues.set(eFlexcode.fc_pinread, setFlexcodeValue(eByteCode.bc_pinread, 1, 1, 1, 0));
    this.flexcodeValues.set(eFlexcode.fc_pinstart, setFlexcodeValue(eByteCode.bc_pinstart, 4, 0, 1, 0));
    this.flexcodeValues.set(eFlexcode.fc_pinclear, setFlexcodeValue(eByteCode.bc_pinclear, 1, 0, 1, 0));
    this.flexcodeValues.set(eFlexcode.fc_wrpin, setFlexcodeValue(eByteCode.bc_wrpin, 2, 0, 1, 0)); // (also asm instr.)

    this.flexcodeValues.set(eFlexcode.fc_wxpin, setFlexcodeValue(eByteCode.bc_wxpin, 2, 0, 1, 0)); // (also asm instr.)

    this.flexcodeValues.set(eFlexcode.fc_wypin, setFlexcodeValue(eByteCode.bc_wypin, 2, 0, 1, 0)); // (also asm instr.)

    this.flexcodeValues.set(eFlexcode.fc_akpin, setFlexcodeValue(eByteCode.bc_akpin, 1, 0, 1, 0)); // (also asm instr.)

    this.flexcodeValues.set(eFlexcode.fc_rdpin, setFlexcodeValue(eByteCode.bc_rdpin, 1, 1, 0, 0)); // (also asm instr.)

    this.flexcodeValues.set(eFlexcode.fc_rqpin, setFlexcodeValue(eByteCode.bc_rqpin, 1, 1, 0, 0)); // (also asm instr.)

    this.flexcodeValues.set(eFlexcode.fc_locknew, setFlexcodeValue(eByteCode.bc_locknew, 0, 1, 0, 0)); // (also asm instr.)

    this.flexcodeValues.set(eFlexcode.fc_lockret, setFlexcodeValue(eByteCode.bc_lockret, 1, 0, 0, 0)); // (also asm instr.)

    this.flexcodeValues.set(eFlexcode.fc_locktry, setFlexcodeValue(eByteCode.bc_locktry, 1, 1, 0, 0)); // (also asm instr.)

    this.flexcodeValues.set(eFlexcode.fc_lockrel, setFlexcodeValue(eByteCode.bc_lockrel, 1, 0, 0, 0)); // (also asm instr.)

    this.flexcodeValues.set(eFlexcode.fc_lockchk, setFlexcodeValue(eByteCode.bc_lockchk, 1, 1, 0, 0));
    this.flexcodeValues.set(eFlexcode.fc_cogatn, setFlexcodeValue(eByteCode.bc_cogatn, 1, 0, 0, 0)); // (also asm instr.)

    this.flexcodeValues.set(eFlexcode.fc_pollatn, setFlexcodeValue(eByteCode.bc_pollatn, 0, 1, 0, 0)); // (also asm instr.)

    this.flexcodeValues.set(eFlexcode.fc_waitatn, setFlexcodeValue(eByteCode.bc_waitatn, 0, 0, 0, 0)); // (also asm instr.)

    this.flexcodeValues.set(eFlexcode.fc_hubset, setFlexcodeValue(eByteCode.bc_hubset, 1, 0, 0, 1)); // (also asm instr.)

    this.flexcodeValues.set(eFlexcode.fc_clkset, setFlexcodeValue(eByteCode.bc_clkset, 2, 0, 0, 1));
    this.flexcodeValues.set(eFlexcode.fc_regexec, setFlexcodeValue(eByteCode.bc_regexec, 1, 0, 0, 1));
    this.flexcodeValues.set(eFlexcode.fc_regload, setFlexcodeValue(eByteCode.bc_regload, 1, 0, 0, 1));
    this.flexcodeValues.set(eFlexcode.fc_call, setFlexcodeValue(eByteCode.bc_call, 1, 0, 0, 1)); // (also asm instr.)

    this.flexcodeValues.set(eFlexcode.fc_getregs, setFlexcodeValue(eByteCode.bc_getregs, 3, 0, 0, 1));
    this.flexcodeValues.set(eFlexcode.fc_setregs, setFlexcodeValue(eByteCode.bc_setregs, 3, 0, 0, 1));
    this.flexcodeValues.set(eFlexcode.fc_bytemove, setFlexcodeValue(eByteCode.bc_bytemove, 3, 0, 0, 1));
    this.flexcodeValues.set(eFlexcode.fc_bytefill, setFlexcodeValue(eByteCode.bc_bytefill, 3, 0, 0, 1));
    this.flexcodeValues.set(eFlexcode.fc_wordmove, setFlexcodeValue(eByteCode.bc_wordmove, 3, 0, 0, 1));
    this.flexcodeValues.set(eFlexcode.fc_wordfill, setFlexcodeValue(eByteCode.bc_wordfill, 3, 0, 0, 1));
    this.flexcodeValues.set(eFlexcode.fc_longmove, setFlexcodeValue(eByteCode.bc_longmove, 3, 0, 0, 1));
    this.flexcodeValues.set(eFlexcode.fc_longfill, setFlexcodeValue(eByteCode.bc_longfill, 3, 0, 0, 1));
    this.flexcodeValues.set(eFlexcode.fc_strsize, setFlexcodeValue(eByteCode.bc_strsize, 1, 1, 0, 1));
    this.flexcodeValues.set(eFlexcode.fc_strcomp, setFlexcodeValue(eByteCode.bc_strcomp, 2, 1, 0, 1));
    this.flexcodeValues.set(eFlexcode.fc_strcopy, setFlexcodeValue(eByteCode.bc_strcopy, 3, 0, 0, 1));
    this.flexcodeValues.set(eFlexcode.fc_getcrc, setFlexcodeValue(eByteCode.bc_getcrc, 3, 1, 0, 1));
    this.flexcodeValues.set(eFlexcode.fc_waitus, setFlexcodeValue(eByteCode.bc_waitus, 1, 0, 0, 1));
    this.flexcodeValues.set(eFlexcode.fc_waitms, setFlexcodeValue(eByteCode.bc_waitms, 1, 0, 0, 1));
    this.flexcodeValues.set(eFlexcode.fc_getms, setFlexcodeValue(eByteCode.bc_getms, 0, 1, 0, 1));
    this.flexcodeValues.set(eFlexcode.fc_getsec, setFlexcodeValue(eByteCode.bc_getsec, 0, 1, 0, 1));
    this.flexcodeValues.set(eFlexcode.fc_muldiv64, setFlexcodeValue(eByteCode.bc_muldiv64, 3, 1, 0, 1));
    this.flexcodeValues.set(eFlexcode.fc_qsin, setFlexcodeValue(eByteCode.bc_qsin, 3, 1, 0, 1));
    this.flexcodeValues.set(eFlexcode.fc_qcos, setFlexcodeValue(eByteCode.bc_qcos, 3, 1, 0, 1));
    this.flexcodeValues.set(eFlexcode.fc_rotxy, setFlexcodeValue(eByteCode.bc_rotxy, 3, 2, 0, 1));
    this.flexcodeValues.set(eFlexcode.fc_polxy, setFlexcodeValue(eByteCode.bc_polxy, 2, 2, 0, 1));
    this.flexcodeValues.set(eFlexcode.fc_xypol, setFlexcodeValue(eByteCode.bc_xypol, 2, 2, 0, 1));
    this.flexcodeValues.set(eFlexcode.fc_nan, setFlexcodeValue(eByteCode.bc_nan, 1, 1, 0, 1));
    this.flexcodeValues.set(eFlexcode.fc_round, setFlexcodeValue(eByteCode.bc_round, 1, 1, 0, 1));
    this.flexcodeValues.set(eFlexcode.fc_trunc, setFlexcodeValue(eByteCode.bc_trunc, 1, 1, 0, 1));
    this.flexcodeValues.set(eFlexcode.fc_float, setFlexcodeValue(eByteCode.bc_float, 1, 1, 0, 1));

    //
    // generated Automatic symbols table load
    //
    //		---------------------------------------------------------------------------------------

    this.automatic_symbols.set(SYMBOLS.ABS, { type: eElementType.type_op, value: this.opcodeValue(eOpcode.oc_abs) }); // (also asm instr.)
    this.automatic_symbols.set(SYMBOLS.FABS, { type: eElementType.type_op, value: this.opcodeValue(eOpcode.oc_fabs) });
    this.automatic_symbols.set(SYMBOLS.ENCOD, { type: eElementType.type_op, value: this.opcodeValue(eOpcode.oc_encod) }); // (also asm instr.)
    this.automatic_symbols.set(SYMBOLS.DECOD, { type: eElementType.type_op, value: this.opcodeValue(eOpcode.oc_decod) }); // (also asm instr.)
    this.automatic_symbols.set(SYMBOLS.BMASK, { type: eElementType.type_op, value: this.opcodeValue(eOpcode.oc_bmask) }); // (also asm instr.)
    this.automatic_symbols.set(SYMBOLS.ONES, { type: eElementType.type_op, value: this.opcodeValue(eOpcode.oc_ones) }); // (also asm instr.)
    this.automatic_symbols.set(SYMBOLS.SQRT, { type: eElementType.type_op, value: this.opcodeValue(eOpcode.oc_sqrt) });
    this.automatic_symbols.set(SYMBOLS.FSQRT, { type: eElementType.type_op, value: this.opcodeValue(eOpcode.oc_fsqrt) });
    this.automatic_symbols.set(SYMBOLS.QLOG, { type: eElementType.type_op, value: this.opcodeValue(eOpcode.oc_qlog) }); // (also asm instr.)
    this.automatic_symbols.set(SYMBOLS.QEXP, { type: eElementType.type_op, value: this.opcodeValue(eOpcode.oc_qexp) }); // (also asm instr.)
    this.automatic_symbols.set(SYMBOLS.SAR, { type: eElementType.type_op, value: this.opcodeValue(eOpcode.oc_sar) }); // (also asm instr.)
    this.automatic_symbols.set(SYMBOLS.ROR, { type: eElementType.type_op, value: this.opcodeValue(eOpcode.oc_ror) }); // (also asm instr.)
    this.automatic_symbols.set(SYMBOLS.ROL, { type: eElementType.type_op, value: this.opcodeValue(eOpcode.oc_rol) }); // (also asm instr.)
    this.automatic_symbols.set(SYMBOLS.REV, { type: eElementType.type_op, value: this.opcodeValue(eOpcode.oc_rev) }); // (also asm instr.)
    this.automatic_symbols.set(SYMBOLS.ZEROX, { type: eElementType.type_op, value: this.opcodeValue(eOpcode.oc_zerox) }); // (also asm instr.)
    this.automatic_symbols.set(SYMBOLS.SIGNX, { type: eElementType.type_op, value: this.opcodeValue(eOpcode.oc_signx) }); // (also asm instr.)
    this.automatic_symbols.set(SYMBOLS.SCA, { type: eElementType.type_op, value: this.opcodeValue(eOpcode.oc_sca) }); // (also asm instr.)
    this.automatic_symbols.set(SYMBOLS.SCAS, { type: eElementType.type_op, value: this.opcodeValue(eOpcode.oc_scas) }); // (also asm instr.)
    this.automatic_symbols.set(SYMBOLS.FRAC, { type: eElementType.type_op, value: this.opcodeValue(eOpcode.oc_frac) });
    this.automatic_symbols.set(SYMBOLS.ADDBITS, { type: eElementType.type_op, value: this.opcodeValue(eOpcode.oc_addbits) });
    this.automatic_symbols.set(SYMBOLS.ADDPINS, { type: eElementType.type_op, value: this.opcodeValue(eOpcode.oc_addpins) });
    this.automatic_symbols.set(SYMBOLS.NOT, { type: eElementType.type_op, value: this.opcodeValue(eOpcode.oc_lognot_name) }); // (also asm instr.)
    this.automatic_symbols.set(SYMBOLS.AND, { type: eElementType.type_op, value: this.opcodeValue(eOpcode.oc_logand_name) }); // (also asm instr.)
    this.automatic_symbols.set(SYMBOLS.XOR, { type: eElementType.type_op, value: this.opcodeValue(eOpcode.oc_logxor_name) }); // (also asm instr.)
    this.automatic_symbols.set(SYMBOLS.OR, { type: eElementType.type_op, value: this.opcodeValue(eOpcode.oc_logor_name) }); // (also asm instr.)

    this.automatic_symbols.set(SYMBOLS.FLOAT, { type: eElementType.type_float, value: 0 }); // floating-point operators
    this.automatic_symbols.set(SYMBOLS.ROUND, { type: eElementType.type_round, value: 0 });
    this.automatic_symbols.set(SYMBOLS.TRUNC, { type: eElementType.type_trunc, value: 0 });

    this.automatic_symbols.set(SYMBOLS.STRING, { type: eElementType.type_constr, value: 0 }); // string expressions

    this.automatic_symbols.set(SYMBOLS.CON, { type: eElementType.type_block, value: eBlockType.block_con }); // block designators
    this.automatic_symbols.set(SYMBOLS.OBJ, { type: eElementType.type_block, value: eBlockType.block_obj });
    this.automatic_symbols.set(SYMBOLS.VAR, { type: eElementType.type_block, value: eBlockType.block_var });
    this.automatic_symbols.set(SYMBOLS.PUB, { type: eElementType.type_block, value: eBlockType.block_pub });
    this.automatic_symbols.set(SYMBOLS.PRI, { type: eElementType.type_block, value: eBlockType.block_pri });
    this.automatic_symbols.set(SYMBOLS.DAT, { type: eElementType.type_block, value: eBlockType.block_dat });

    this.automatic_symbols.set(SYMBOLS.FIELD, { type: eElementType.type_field, value: 0 }); // field

    this.automatic_symbols.set(SYMBOLS.BYTE, { type: eElementType.type_size, value: 0 }); // size
    this.automatic_symbols.set(SYMBOLS.WORD, { type: eElementType.type_size, value: 1 });
    this.automatic_symbols.set(SYMBOLS.LONG, { type: eElementType.type_size, value: 2 });

    this.automatic_symbols.set(SYMBOLS.BYTEFIT, { type: eElementType.type_size_fit, value: 0 }); // size fits
    this.automatic_symbols.set(SYMBOLS.WORDFIT, { type: eElementType.type_size_fit, value: 1 });

    this.automatic_symbols.set(SYMBOLS.FVAR, { type: eElementType.type_fvar, value: 0 }); // fvar
    this.automatic_symbols.set(SYMBOLS.FVARS, { type: eElementType.type_fvar, value: 1 });

    this.automatic_symbols.set(SYMBOLS.FILE, { type: eElementType.type_file, value: 0 }); // file-related

    this.automatic_symbols.set(SYMBOLS.IF, { type: eElementType.type_if, value: 0 }); // high-level structures
    this.automatic_symbols.set(SYMBOLS.IFNOT, { type: eElementType.type_ifnot, value: 0 });
    this.automatic_symbols.set(SYMBOLS.ELSEIF, { type: eElementType.type_elseif, value: 0 });
    this.automatic_symbols.set(SYMBOLS.ELSEIFNOT, { type: eElementType.type_elseifnot, value: 0 });
    this.automatic_symbols.set(SYMBOLS.ELSE, { type: eElementType.type_else, value: 0 });
    this.automatic_symbols.set(SYMBOLS.CASE, { type: eElementType.type_case, value: 0 });
    this.automatic_symbols.set(SYMBOLS.CASE_FAST, { type: eElementType.type_case_fast, value: 0 });
    this.automatic_symbols.set(SYMBOLS.OTHER, { type: eElementType.type_other, value: 0 });
    this.automatic_symbols.set(SYMBOLS.REPEAT, { type: eElementType.type_repeat, value: 0 });
    this.automatic_symbols.set(SYMBOLS.WHILE, { type: eElementType.type_while, value: 0 });
    this.automatic_symbols.set(SYMBOLS.UNTIL, { type: eElementType.type_until, value: 0 });
    this.automatic_symbols.set(SYMBOLS.FROM, { type: eElementType.type_from, value: 0 });
    this.automatic_symbols.set(SYMBOLS.TO, { type: eElementType.type_to, value: 0 });
    this.automatic_symbols.set(SYMBOLS.STEP, { type: eElementType.type_step, value: 0 });
    this.automatic_symbols.set(SYMBOLS.WITH, { type: eElementType.type_with, value: 0 });

    this.automatic_symbols.set(SYMBOLS.NEXT, { type: eElementType.type_i_next_quit, value: 0 }); // high-level instructions
    this.automatic_symbols.set(SYMBOLS.QUIT, { type: eElementType.type_i_next_quit, value: 1 });
    this.automatic_symbols.set(SYMBOLS.RETURN, { type: eElementType.type_i_return, value: 0 });
    this.automatic_symbols.set(SYMBOLS.ABORT, { type: eElementType.type_i_abort, value: 0 });
    this.automatic_symbols.set(SYMBOLS.LOOKUPZ, { type: eElementType.type_i_look, value: 0b00 });
    this.automatic_symbols.set(SYMBOLS.LOOKUP, { type: eElementType.type_i_look, value: 0b01 });
    this.automatic_symbols.set(SYMBOLS.LOOKDOWNZ, { type: eElementType.type_i_look, value: 0b10 });
    this.automatic_symbols.set(SYMBOLS.LOOKDOWN, { type: eElementType.type_i_look, value: 0b11 });
    this.automatic_symbols.set(SYMBOLS.COGSPIN, { type: eElementType.type_i_cogspin, value: 0 });
    this.automatic_symbols.set(SYMBOLS.RECV, { type: eElementType.type_recv, value: 0 });
    this.automatic_symbols.set(SYMBOLS.SEND, { type: eElementType.type_send, value: 0 });

    this.automatic_symbols.set(SYMBOLS.DEBUG, { type: eElementType.type_debug, value: 0 }); // debug

    this.automatic_symbols.set(SYMBOLS.DLY, { type: eElementType.type_debug_cmd, value: eValueType.dc_dly }); // debug commands
    this.automatic_symbols.set(SYMBOLS.PC_KEY, { type: eElementType.type_debug_cmd, value: eValueType.dc_pc_key });
    this.automatic_symbols.set(SYMBOLS.PC_MOUSE, { type: eElementType.type_debug_cmd, value: eValueType.dc_pc_mouse });

    this.automatic_symbols.set(SYMBOLS.ZSTR, { type: eElementType.type_debug_cmd, value: 0b00100100 });
    this.automatic_symbols.set(SYMBOLS.ZSTR_, { type: eElementType.type_debug_cmd, value: 0b00100110 });
    this.automatic_symbols.set(SYMBOLS.FDEC, { type: eElementType.type_debug_cmd, value: 0b00101100 });
    this.automatic_symbols.set(SYMBOLS.FDEC_, { type: eElementType.type_debug_cmd, value: 0b00101110 });
    this.automatic_symbols.set(SYMBOLS.FDEC_REG_ARRAY, { type: eElementType.type_debug_cmd, value: 0b00110000 });
    this.automatic_symbols.set(SYMBOLS.FDEC_REG_ARRAY_, { type: eElementType.type_debug_cmd, value: 0b00110010 });
    this.automatic_symbols.set(SYMBOLS.LSTR, { type: eElementType.type_debug_cmd, value: 0b00110100 });
    this.automatic_symbols.set(SYMBOLS.LSTR_, { type: eElementType.type_debug_cmd, value: 0b00110110 });
    this.automatic_symbols.set(SYMBOLS.FDEC_ARRAY, { type: eElementType.type_debug_cmd, value: 0b00111100 });
    this.automatic_symbols.set(SYMBOLS.FDEC_ARRAY_, { type: eElementType.type_debug_cmd, value: 0b00111110 });

    this.automatic_symbols.set(SYMBOLS.UDEC, { type: eElementType.type_debug_cmd, value: 0b01000000 });
    this.automatic_symbols.set(SYMBOLS.UDEC_, { type: eElementType.type_debug_cmd, value: 0b01000010 });
    this.automatic_symbols.set(SYMBOLS.UDEC_BYTE, { type: eElementType.type_debug_cmd, value: 0b01000100 });
    this.automatic_symbols.set(SYMBOLS.UDEC_BYTE_, { type: eElementType.type_debug_cmd, value: 0b01000110 });
    this.automatic_symbols.set(SYMBOLS.UDEC_WORD, { type: eElementType.type_debug_cmd, value: 0b01001000 });
    this.automatic_symbols.set(SYMBOLS.UDEC_WORD_, { type: eElementType.type_debug_cmd, value: 0b01001010 });
    this.automatic_symbols.set(SYMBOLS.UDEC_LONG, { type: eElementType.type_debug_cmd, value: 0b01001100 });
    this.automatic_symbols.set(SYMBOLS.UDEC_LONG_, { type: eElementType.type_debug_cmd, value: 0b01001110 });
    this.automatic_symbols.set(SYMBOLS.UDEC_REG_ARRAY, { type: eElementType.type_debug_cmd, value: 0b01010000 });
    this.automatic_symbols.set(SYMBOLS.UDEC_REG_ARRAY_, { type: eElementType.type_debug_cmd, value: 0b01010010 });
    this.automatic_symbols.set(SYMBOLS.UDEC_BYTE_ARRAY, { type: eElementType.type_debug_cmd, value: 0b01010100 });
    this.automatic_symbols.set(SYMBOLS.UDEC_BYTE_ARRAY_, { type: eElementType.type_debug_cmd, value: 0b01010110 });
    this.automatic_symbols.set(SYMBOLS.UDEC_WORD_ARRAY, { type: eElementType.type_debug_cmd, value: 0b01011000 });
    this.automatic_symbols.set(SYMBOLS.UDEC_WORD_ARRAY_, { type: eElementType.type_debug_cmd, value: 0b01011010 });
    this.automatic_symbols.set(SYMBOLS.UDEC_LONG_ARRAY, { type: eElementType.type_debug_cmd, value: 0b01011100 });
    this.automatic_symbols.set(SYMBOLS.UDEC_LONG_ARRAY_, { type: eElementType.type_debug_cmd, value: 0b01011110 });

    this.automatic_symbols.set(SYMBOLS.SDEC, { type: eElementType.type_debug_cmd, value: 0b01100000 });
    this.automatic_symbols.set(SYMBOLS.SDEC_, { type: eElementType.type_debug_cmd, value: 0b01100010 });
    this.automatic_symbols.set(SYMBOLS.SDEC_BYTE, { type: eElementType.type_debug_cmd, value: 0b01100100 });
    this.automatic_symbols.set(SYMBOLS.SDEC_BYTE_, { type: eElementType.type_debug_cmd, value: 0b01100110 });
    this.automatic_symbols.set(SYMBOLS.SDEC_WORD, { type: eElementType.type_debug_cmd, value: 0b01101000 });
    this.automatic_symbols.set(SYMBOLS.SDEC_WORD_, { type: eElementType.type_debug_cmd, value: 0b01101010 });
    this.automatic_symbols.set(SYMBOLS.SDEC_LONG, { type: eElementType.type_debug_cmd, value: 0b01101100 });
    this.automatic_symbols.set(SYMBOLS.SDEC_LONG_, { type: eElementType.type_debug_cmd, value: 0b01101110 });
    this.automatic_symbols.set(SYMBOLS.SDEC_REG_ARRAY, { type: eElementType.type_debug_cmd, value: 0b01110000 });
    this.automatic_symbols.set(SYMBOLS.SDEC_REG_ARRAY_, { type: eElementType.type_debug_cmd, value: 0b01110010 });
    this.automatic_symbols.set(SYMBOLS.SDEC_BYTE_ARRAY, { type: eElementType.type_debug_cmd, value: 0b01110100 });
    this.automatic_symbols.set(SYMBOLS.SDEC_BYTE_ARRAY_, { type: eElementType.type_debug_cmd, value: 0b01110110 });
    this.automatic_symbols.set(SYMBOLS.SDEC_WORD_ARRAY, { type: eElementType.type_debug_cmd, value: 0b01111000 });
    this.automatic_symbols.set(SYMBOLS.SDEC_WORD_ARRAY_, { type: eElementType.type_debug_cmd, value: 0b01111010 });
    this.automatic_symbols.set(SYMBOLS.SDEC_LONG_ARRAY, { type: eElementType.type_debug_cmd, value: 0b01111100 });
    this.automatic_symbols.set(SYMBOLS.SDEC_LONG_ARRAY_, { type: eElementType.type_debug_cmd, value: 0b01111110 });

    this.automatic_symbols.set(SYMBOLS.UHEX, { type: eElementType.type_debug_cmd, value: 0b10000000 });
    this.automatic_symbols.set(SYMBOLS.UHEX_, { type: eElementType.type_debug_cmd, value: 0b10000010 });
    this.automatic_symbols.set(SYMBOLS.UHEX_BYTE, { type: eElementType.type_debug_cmd, value: 0b10000100 });
    this.automatic_symbols.set(SYMBOLS.UHEX_BYTE_, { type: eElementType.type_debug_cmd, value: 0b10000110 });
    this.automatic_symbols.set(SYMBOLS.UHEX_WORD, { type: eElementType.type_debug_cmd, value: 0b10001000 });
    this.automatic_symbols.set(SYMBOLS.UHEX_WORD_, { type: eElementType.type_debug_cmd, value: 0b10001010 });
    this.automatic_symbols.set(SYMBOLS.UHEX_LONG, { type: eElementType.type_debug_cmd, value: 0b10001100 });
    this.automatic_symbols.set(SYMBOLS.UHEX_LONG_, { type: eElementType.type_debug_cmd, value: 0b10001110 });
    this.automatic_symbols.set(SYMBOLS.UHEX_REG_ARRAY, { type: eElementType.type_debug_cmd, value: 0b10010000 });
    this.automatic_symbols.set(SYMBOLS.UHEX_REG_ARRAY_, { type: eElementType.type_debug_cmd, value: 0b10010010 });
    this.automatic_symbols.set(SYMBOLS.UHEX_BYTE_ARRAY, { type: eElementType.type_debug_cmd, value: 0b10010100 });
    this.automatic_symbols.set(SYMBOLS.UHEX_BYTE_ARRAY_, { type: eElementType.type_debug_cmd, value: 0b10010110 });
    this.automatic_symbols.set(SYMBOLS.UHEX_WORD_ARRAY, { type: eElementType.type_debug_cmd, value: 0b10011000 });
    this.automatic_symbols.set(SYMBOLS.UHEX_WORD_ARRAY_, { type: eElementType.type_debug_cmd, value: 0b10011010 });
    this.automatic_symbols.set(SYMBOLS.UHEX_LONG_ARRAY, { type: eElementType.type_debug_cmd, value: 0b10011100 });
    this.automatic_symbols.set(SYMBOLS.UHEX_LONG_ARRAY_, { type: eElementType.type_debug_cmd, value: 0b10011110 });

    this.automatic_symbols.set(SYMBOLS.SHEX, { type: eElementType.type_debug_cmd, value: 0b10100000 });
    this.automatic_symbols.set(SYMBOLS.SHEX_, { type: eElementType.type_debug_cmd, value: 0b10100010 });
    this.automatic_symbols.set(SYMBOLS.SHEX_BYTE, { type: eElementType.type_debug_cmd, value: 0b10100100 });
    this.automatic_symbols.set(SYMBOLS.SHEX_BYTE_, { type: eElementType.type_debug_cmd, value: 0b10100110 });
    this.automatic_symbols.set(SYMBOLS.SHEX_WORD, { type: eElementType.type_debug_cmd, value: 0b10101000 });
    this.automatic_symbols.set(SYMBOLS.SHEX_WORD_, { type: eElementType.type_debug_cmd, value: 0b10101010 });
    this.automatic_symbols.set(SYMBOLS.SHEX_LONG, { type: eElementType.type_debug_cmd, value: 0b10101100 });
    this.automatic_symbols.set(SYMBOLS.SHEX_LONG_, { type: eElementType.type_debug_cmd, value: 0b10101110 });
    this.automatic_symbols.set(SYMBOLS.SHEX_REG_ARRAY, { type: eElementType.type_debug_cmd, value: 0b10110000 });
    this.automatic_symbols.set(SYMBOLS.SHEX_REG_ARRAY_, { type: eElementType.type_debug_cmd, value: 0b10110010 });
    this.automatic_symbols.set(SYMBOLS.SHEX_BYTE_ARRAY, { type: eElementType.type_debug_cmd, value: 0b10110100 });
    this.automatic_symbols.set(SYMBOLS.SHEX_BYTE_ARRAY_, { type: eElementType.type_debug_cmd, value: 0b10110110 });
    this.automatic_symbols.set(SYMBOLS.SHEX_WORD_ARRAY, { type: eElementType.type_debug_cmd, value: 0b10111000 });
    this.automatic_symbols.set(SYMBOLS.SHEX_WORD_ARRAY_, { type: eElementType.type_debug_cmd, value: 0b10111010 });
    this.automatic_symbols.set(SYMBOLS.SHEX_LONG_ARRAY, { type: eElementType.type_debug_cmd, value: 0b10111100 });
    this.automatic_symbols.set(SYMBOLS.SHEX_LONG_ARRAY_, { type: eElementType.type_debug_cmd, value: 0b10111110 });

    this.automatic_symbols.set(SYMBOLS.UBIN, { type: eElementType.type_debug_cmd, value: 0b11000000 });
    this.automatic_symbols.set(SYMBOLS.UBIN_, { type: eElementType.type_debug_cmd, value: 0b11000010 });
    this.automatic_symbols.set(SYMBOLS.UBIN_BYTE, { type: eElementType.type_debug_cmd, value: 0b11000100 });
    this.automatic_symbols.set(SYMBOLS.UBIN_BYTE_, { type: eElementType.type_debug_cmd, value: 0b11000110 });
    this.automatic_symbols.set(SYMBOLS.UBIN_WORD, { type: eElementType.type_debug_cmd, value: 0b11001000 });
    this.automatic_symbols.set(SYMBOLS.UBIN_WORD_, { type: eElementType.type_debug_cmd, value: 0b11001010 });
    this.automatic_symbols.set(SYMBOLS.UBIN_LONG, { type: eElementType.type_debug_cmd, value: 0b11001100 });
    this.automatic_symbols.set(SYMBOLS.UBIN_LONG_, { type: eElementType.type_debug_cmd, value: 0b11001110 });
    this.automatic_symbols.set(SYMBOLS.UBIN_REG_ARRAY, { type: eElementType.type_debug_cmd, value: 0b11010000 });
    this.automatic_symbols.set(SYMBOLS.UBIN_REG_ARRAY_, { type: eElementType.type_debug_cmd, value: 0b11010010 });
    this.automatic_symbols.set(SYMBOLS.UBIN_BYTE_ARRAY, { type: eElementType.type_debug_cmd, value: 0b11010100 });
    this.automatic_symbols.set(SYMBOLS.UBIN_BYTE_ARRAY_, { type: eElementType.type_debug_cmd, value: 0b11010110 });
    this.automatic_symbols.set(SYMBOLS.UBIN_WORD_ARRAY, { type: eElementType.type_debug_cmd, value: 0b11011000 });
    this.automatic_symbols.set(SYMBOLS.UBIN_WORD_ARRAY_, { type: eElementType.type_debug_cmd, value: 0b11011010 });
    this.automatic_symbols.set(SYMBOLS.UBIN_LONG_ARRAY, { type: eElementType.type_debug_cmd, value: 0b11011100 });
    this.automatic_symbols.set(SYMBOLS.UBIN_LONG_ARRAY_, { type: eElementType.type_debug_cmd, value: 0b11011110 });

    this.automatic_symbols.set(SYMBOLS.SBIN, { type: eElementType.type_debug_cmd, value: 0b11100000 });
    this.automatic_symbols.set(SYMBOLS.SBIN_, { type: eElementType.type_debug_cmd, value: 0b11100010 });
    this.automatic_symbols.set(SYMBOLS.SBIN_BYTE, { type: eElementType.type_debug_cmd, value: 0b11100100 });
    this.automatic_symbols.set(SYMBOLS.SBIN_BYTE_, { type: eElementType.type_debug_cmd, value: 0b11100110 });
    this.automatic_symbols.set(SYMBOLS.SBIN_WORD, { type: eElementType.type_debug_cmd, value: 0b11101000 });
    this.automatic_symbols.set(SYMBOLS.SBIN_WORD_, { type: eElementType.type_debug_cmd, value: 0b11101010 });
    this.automatic_symbols.set(SYMBOLS.SBIN_LONG, { type: eElementType.type_debug_cmd, value: 0b11101100 });
    this.automatic_symbols.set(SYMBOLS.SBIN_LONG_, { type: eElementType.type_debug_cmd, value: 0b11101110 });
    this.automatic_symbols.set(SYMBOLS.SBIN_REG_ARRAY, { type: eElementType.type_debug_cmd, value: 0b11110000 });
    this.automatic_symbols.set(SYMBOLS.SBIN_REG_ARRAY_, { type: eElementType.type_debug_cmd, value: 0b11110010 });
    this.automatic_symbols.set(SYMBOLS.SBIN_BYTE_ARRAY, { type: eElementType.type_debug_cmd, value: 0b11110100 });
    this.automatic_symbols.set(SYMBOLS.SBIN_BYTE_ARRAY_, { type: eElementType.type_debug_cmd, value: 0b11110110 });
    this.automatic_symbols.set(SYMBOLS.SBIN_WORD_ARRAY, { type: eElementType.type_debug_cmd, value: 0b11111000 });
    this.automatic_symbols.set(SYMBOLS.SBIN_WORD_ARRAY_, { type: eElementType.type_debug_cmd, value: 0b11111010 });
    this.automatic_symbols.set(SYMBOLS.SBIN_LONG_ARRAY, { type: eElementType.type_debug_cmd, value: 0b11111100 });
    this.automatic_symbols.set(SYMBOLS.SBIN_LONG_ARRAY_, { type: eElementType.type_debug_cmd, value: 0b11111110 });

    this.automatic_symbols.set(SYMBOLS.END, { type: eElementType.type_asm_end, value: 0 }); // misc
    this.automatic_symbols.set(SYMBOLS._, { type: eElementType.type_under, value: 0 });

    this.automatic_symbols.set(SYMBOLS.HUBSET, { type: eElementType.type_i_flex, value: this.flexValue(eFlexcode.fc_hubset) }); // (also asm instr.)

    this.automatic_symbols.set(SYMBOLS.COGINIT, { type: eElementType.type_i_flex, value: this.flexValue(eFlexcode.fc_coginit) }); // (also asm instr.)
    this.automatic_symbols.set(SYMBOLS.COGSTOP, { type: eElementType.type_i_flex, value: this.flexValue(eFlexcode.fc_cogstop) }); // (also asm instr.)
    this.automatic_symbols.set(SYMBOLS.COGID, { type: eElementType.type_i_flex, value: this.flexValue(eFlexcode.fc_cogid) }); // (also asm instr.)
    this.automatic_symbols.set(SYMBOLS.COGCHK, { type: eElementType.type_i_flex, value: this.flexValue(eFlexcode.fc_cogchk) });

    this.automatic_symbols.set(SYMBOLS.GETRND, { type: eElementType.type_i_flex, value: this.flexValue(eFlexcode.fc_getrnd) }); // (also asm instr.)
    this.automatic_symbols.set(SYMBOLS.GETCT, { type: eElementType.type_i_flex, value: this.flexValue(eFlexcode.fc_getct) }); // (also asm instr.)
    this.automatic_symbols.set(SYMBOLS.POLLCT, { type: eElementType.type_i_flex, value: this.flexValue(eFlexcode.fc_pollct) });
    this.automatic_symbols.set(SYMBOLS.WAITCT, { type: eElementType.type_i_flex, value: this.flexValue(eFlexcode.fc_waitct) });

    this.automatic_symbols.set(SYMBOLS.PINWRITE, { type: eElementType.type_i_flex, value: this.flexValue(eFlexcode.fc_pinwrite) });
    this.automatic_symbols.set(SYMBOLS.PINW, { type: eElementType.type_i_flex, value: this.flexValue(eFlexcode.fc_pinwrite) });
    this.automatic_symbols.set(SYMBOLS.PINLOW, { type: eElementType.type_i_flex, value: this.flexValue(eFlexcode.fc_pinlow) });
    this.automatic_symbols.set(SYMBOLS.PINL, { type: eElementType.type_i_flex, value: this.flexValue(eFlexcode.fc_pinlow) });
    this.automatic_symbols.set(SYMBOLS.PINHIGH, { type: eElementType.type_i_flex, value: this.flexValue(eFlexcode.fc_pinhigh) });
    this.automatic_symbols.set(SYMBOLS.PINH, { type: eElementType.type_i_flex, value: this.flexValue(eFlexcode.fc_pinhigh) });
    this.automatic_symbols.set(SYMBOLS.PINTOGGLE, { type: eElementType.type_i_flex, value: this.flexValue(eFlexcode.fc_pintoggle) });
    this.automatic_symbols.set(SYMBOLS.PINT, { type: eElementType.type_i_flex, value: this.flexValue(eFlexcode.fc_pintoggle) });
    this.automatic_symbols.set(SYMBOLS.PINFLOAT, { type: eElementType.type_i_flex, value: this.flexValue(eFlexcode.fc_pinfloat) });
    this.automatic_symbols.set(SYMBOLS.PINF, { type: eElementType.type_i_flex, value: this.flexValue(eFlexcode.fc_pinfloat) });
    this.automatic_symbols.set(SYMBOLS.PINREAD, { type: eElementType.type_i_flex, value: this.flexValue(eFlexcode.fc_pinread) });
    this.automatic_symbols.set(SYMBOLS.PINR, { type: eElementType.type_i_flex, value: this.flexValue(eFlexcode.fc_pinread) });

    this.automatic_symbols.set(SYMBOLS.PINSTART, { type: eElementType.type_i_flex, value: this.flexValue(eFlexcode.fc_pinstart) });
    this.automatic_symbols.set(SYMBOLS.PINCLEAR, { type: eElementType.type_i_flex, value: this.flexValue(eFlexcode.fc_pinclear) });

    this.automatic_symbols.set(SYMBOLS.WRPIN, { type: eElementType.type_i_flex, value: this.flexValue(eFlexcode.fc_wrpin) }); // (also asm instr.)
    this.automatic_symbols.set(SYMBOLS.WXPIN, { type: eElementType.type_i_flex, value: this.flexValue(eFlexcode.fc_wxpin) }); // (also asm instr.)
    this.automatic_symbols.set(SYMBOLS.WYPIN, { type: eElementType.type_i_flex, value: this.flexValue(eFlexcode.fc_wypin) }); // (also asm instr.)
    this.automatic_symbols.set(SYMBOLS.AKPIN, { type: eElementType.type_i_flex, value: this.flexValue(eFlexcode.fc_akpin) }); // (also asm instr.)
    this.automatic_symbols.set(SYMBOLS.RDPIN, { type: eElementType.type_i_flex, value: this.flexValue(eFlexcode.fc_rdpin) }); // (also asm instr.)
    this.automatic_symbols.set(SYMBOLS.RQPIN, { type: eElementType.type_i_flex, value: this.flexValue(eFlexcode.fc_rqpin) }); // (also asm instr.)

    this.automatic_symbols.set(SYMBOLS.ROTXY, { type: eElementType.type_i_flex, value: this.flexValue(eFlexcode.fc_rotxy) });
    this.automatic_symbols.set(SYMBOLS.POLXY, { type: eElementType.type_i_flex, value: this.flexValue(eFlexcode.fc_polxy) });
    this.automatic_symbols.set(SYMBOLS.XYPOL, { type: eElementType.type_i_flex, value: this.flexValue(eFlexcode.fc_xypol) });

    this.automatic_symbols.set(SYMBOLS.LOCKNEW, { type: eElementType.type_i_flex, value: this.flexValue(eFlexcode.fc_locknew) }); // (also asm instr.)
    this.automatic_symbols.set(SYMBOLS.LOCKRET, { type: eElementType.type_i_flex, value: this.flexValue(eFlexcode.fc_lockret) }); // (also asm instr.)
    this.automatic_symbols.set(SYMBOLS.LOCKTRY, { type: eElementType.type_i_flex, value: this.flexValue(eFlexcode.fc_locktry) }); // (also asm instr.)
    this.automatic_symbols.set(SYMBOLS.LOCKREL, { type: eElementType.type_i_flex, value: this.flexValue(eFlexcode.fc_lockrel) }); // (also asm instr.)
    this.automatic_symbols.set(SYMBOLS.LOCKCHK, { type: eElementType.type_i_flex, value: this.flexValue(eFlexcode.fc_lockchk) });

    this.automatic_symbols.set(SYMBOLS.COGATN, { type: eElementType.type_i_flex, value: this.flexValue(eFlexcode.fc_cogatn) }); // (also asm instr.)
    this.automatic_symbols.set(SYMBOLS.POLLATN, { type: eElementType.type_i_flex, value: this.flexValue(eFlexcode.fc_pollatn) }); // (also asm instr.)
    this.automatic_symbols.set(SYMBOLS.WAITATN, { type: eElementType.type_i_flex, value: this.flexValue(eFlexcode.fc_waitatn) }); // (also asm instr.)

    this.automatic_symbols.set(SYMBOLS.CLKSET, { type: eElementType.type_i_flex, value: this.flexValue(eFlexcode.fc_clkset) });
    this.automatic_symbols.set(SYMBOLS.REGEXEC, { type: eElementType.type_i_flex, value: this.flexValue(eFlexcode.fc_regexec) });
    this.automatic_symbols.set(SYMBOLS.REGLOAD, { type: eElementType.type_i_flex, value: this.flexValue(eFlexcode.fc_regload) });
    this.automatic_symbols.set(SYMBOLS.CALL, { type: eElementType.type_i_flex, value: this.flexValue(eFlexcode.fc_call) }); // (also asm instr.)
    this.automatic_symbols.set(SYMBOLS.GETREGS, { type: eElementType.type_i_flex, value: this.flexValue(eFlexcode.fc_getregs) });
    this.automatic_symbols.set(SYMBOLS.SETREGS, { type: eElementType.type_i_flex, value: this.flexValue(eFlexcode.fc_setregs) });

    this.automatic_symbols.set(SYMBOLS.BYTEMOVE, { type: eElementType.type_i_flex, value: this.flexValue(eFlexcode.fc_bytemove) });
    this.automatic_symbols.set(SYMBOLS.BYTEFILL, { type: eElementType.type_i_flex, value: this.flexValue(eFlexcode.fc_bytefill) });
    this.automatic_symbols.set(SYMBOLS.WORDMOVE, { type: eElementType.type_i_flex, value: this.flexValue(eFlexcode.fc_wordmove) });
    this.automatic_symbols.set(SYMBOLS.WORDFILL, { type: eElementType.type_i_flex, value: this.flexValue(eFlexcode.fc_wordfill) });
    this.automatic_symbols.set(SYMBOLS.LONGMOVE, { type: eElementType.type_i_flex, value: this.flexValue(eFlexcode.fc_longmove) });
    this.automatic_symbols.set(SYMBOLS.LONGFILL, { type: eElementType.type_i_flex, value: this.flexValue(eFlexcode.fc_longfill) });

    this.automatic_symbols.set(SYMBOLS.STRSIZE, { type: eElementType.type_i_flex, value: this.flexValue(eFlexcode.fc_strsize) });
    this.automatic_symbols.set(SYMBOLS.STRCOMP, { type: eElementType.type_i_flex, value: this.flexValue(eFlexcode.fc_strcomp) });
    this.automatic_symbols.set(SYMBOLS.STRCOPY, { type: eElementType.type_i_flex, value: this.flexValue(eFlexcode.fc_strcopy) });

    this.automatic_symbols.set(SYMBOLS.GETCRC, { type: eElementType.type_i_flex, value: this.flexValue(eFlexcode.fc_getcrc) });

    this.automatic_symbols.set(SYMBOLS.WAITUS, { type: eElementType.type_i_flex, value: this.flexValue(eFlexcode.fc_waitus) });
    this.automatic_symbols.set(SYMBOLS.WAITMS, { type: eElementType.type_i_flex, value: this.flexValue(eFlexcode.fc_waitms) });
    this.automatic_symbols.set(SYMBOLS.GETMS, { type: eElementType.type_i_flex, value: this.flexValue(eFlexcode.fc_getms) });
    this.automatic_symbols.set(SYMBOLS.GETSEC, { type: eElementType.type_i_flex, value: this.flexValue(eFlexcode.fc_getsec) });
    this.automatic_symbols.set(SYMBOLS.MULDIV64, { type: eElementType.type_i_flex, value: this.flexValue(eFlexcode.fc_muldiv64) });
    this.automatic_symbols.set(SYMBOLS.QSIN, { type: eElementType.type_i_flex, value: this.flexValue(eFlexcode.fc_qsin) });
    this.automatic_symbols.set(SYMBOLS.QCOS, { type: eElementType.type_i_flex, value: this.flexValue(eFlexcode.fc_qcos) });

    this.automatic_symbols.set(SYMBOLS.NAN, { type: eElementType.type_i_flex, value: this.flexValue(eFlexcode.fc_nan) });

    this.automatic_symbols.set(SYMBOLS.ORGH, { type: eElementType.type_asm_dir, value: eValueType.dir_orgh }); // assembly directives
    this.automatic_symbols.set(SYMBOLS.ALIGNW, { type: eElementType.type_asm_dir, value: eValueType.dir_alignw });
    this.automatic_symbols.set(SYMBOLS.ALIGNL, { type: eElementType.type_asm_dir, value: eValueType.dir_alignl });
    this.automatic_symbols.set(SYMBOLS.ORG, { type: eElementType.type_asm_dir, value: eValueType.dir_org });
    this.automatic_symbols.set(SYMBOLS.ORGF, { type: eElementType.type_asm_dir, value: eValueType.dir_orgf });
    this.automatic_symbols.set(SYMBOLS.RES, { type: eElementType.type_asm_dir, value: eValueType.dir_res });
    this.automatic_symbols.set(SYMBOLS.FIT, { type: eElementType.type_asm_dir, value: eValueType.dir_fit });

    this.automatic_symbols.set(SYMBOLS._RET_, { type: eElementType.type_asm_cond, value: eValueType.if_ret }); // assembly conditionals
    this.automatic_symbols.set(SYMBOLS.IF_NC_AND_NZ, { type: eElementType.type_asm_cond, value: eValueType.if_nc_and_nz });
    this.automatic_symbols.set(SYMBOLS.IF_NZ_AND_NC, { type: eElementType.type_asm_cond, value: eValueType.if_nc_and_nz });
    this.automatic_symbols.set(SYMBOLS.IF_GT, { type: eElementType.type_asm_cond, value: eValueType.if_nc_and_nz });
    this.automatic_symbols.set(SYMBOLS.IF_A, { type: eElementType.type_asm_cond, value: eValueType.if_nc_and_nz });
    this.automatic_symbols.set(SYMBOLS.IF_NC_AND_Z, { type: eElementType.type_asm_cond, value: eValueType.if_nc_and_z });
    this.automatic_symbols.set(SYMBOLS.IF_Z_AND_NC, { type: eElementType.type_asm_cond, value: eValueType.if_nc_and_z });
    this.automatic_symbols.set(SYMBOLS.IF_NC, { type: eElementType.type_asm_cond, value: eValueType.if_nc });
    this.automatic_symbols.set(SYMBOLS.IF_GE, { type: eElementType.type_asm_cond, value: eValueType.if_nc });
    this.automatic_symbols.set(SYMBOLS.IF_AE, { type: eElementType.type_asm_cond, value: eValueType.if_nc });
    this.automatic_symbols.set(SYMBOLS.IF_C_AND_NZ, { type: eElementType.type_asm_cond, value: eValueType.if_c_and_nz });
    this.automatic_symbols.set(SYMBOLS.IF_NZ_AND_C, { type: eElementType.type_asm_cond, value: eValueType.if_c_and_nz });
    this.automatic_symbols.set(SYMBOLS.IF_NZ, { type: eElementType.type_asm_cond, value: eValueType.if_nz });
    this.automatic_symbols.set(SYMBOLS.IF_NE, { type: eElementType.type_asm_cond, value: eValueType.if_nz });
    this.automatic_symbols.set(SYMBOLS.IF_C_NE_Z, { type: eElementType.type_asm_cond, value: eValueType.if_c_ne_z });
    this.automatic_symbols.set(SYMBOLS.IF_Z_NE_C, { type: eElementType.type_asm_cond, value: eValueType.if_c_ne_z });
    this.automatic_symbols.set(SYMBOLS.IF_NC_OR_NZ, { type: eElementType.type_asm_cond, value: eValueType.if_nc_or_nz });
    this.automatic_symbols.set(SYMBOLS.IF_NZ_OR_NC, { type: eElementType.type_asm_cond, value: eValueType.if_nc_or_nz });
    this.automatic_symbols.set(SYMBOLS.IF_C_AND_Z, { type: eElementType.type_asm_cond, value: eValueType.if_c_and_z });
    this.automatic_symbols.set(SYMBOLS.IF_Z_AND_C, { type: eElementType.type_asm_cond, value: eValueType.if_c_and_z });
    this.automatic_symbols.set(SYMBOLS.IF_C_EQ_Z, { type: eElementType.type_asm_cond, value: eValueType.if_c_eq_z });
    this.automatic_symbols.set(SYMBOLS.IF_Z_EQ_C, { type: eElementType.type_asm_cond, value: eValueType.if_c_eq_z });
    this.automatic_symbols.set(SYMBOLS.IF_Z, { type: eElementType.type_asm_cond, value: eValueType.if_z });
    this.automatic_symbols.set(SYMBOLS.IF_E, { type: eElementType.type_asm_cond, value: eValueType.if_z });
    this.automatic_symbols.set(SYMBOLS.IF_NC_OR_Z, { type: eElementType.type_asm_cond, value: eValueType.if_nc_or_z });
    this.automatic_symbols.set(SYMBOLS.IF_Z_OR_NC, { type: eElementType.type_asm_cond, value: eValueType.if_nc_or_z });
    this.automatic_symbols.set(SYMBOLS.IF_C, { type: eElementType.type_asm_cond, value: eValueType.if_c });
    this.automatic_symbols.set(SYMBOLS.IF_LT, { type: eElementType.type_asm_cond, value: eValueType.if_c });
    this.automatic_symbols.set(SYMBOLS.IF_B, { type: eElementType.type_asm_cond, value: eValueType.if_c });
    this.automatic_symbols.set(SYMBOLS.IF_C_OR_NZ, { type: eElementType.type_asm_cond, value: eValueType.if_c_or_nz });
    this.automatic_symbols.set(SYMBOLS.IF_NZ_OR_C, { type: eElementType.type_asm_cond, value: eValueType.if_c_or_nz });
    this.automatic_symbols.set(SYMBOLS.IF_C_OR_Z, { type: eElementType.type_asm_cond, value: eValueType.if_c_or_z });
    this.automatic_symbols.set(SYMBOLS.IF_Z_OR_C, { type: eElementType.type_asm_cond, value: eValueType.if_c_or_z });
    this.automatic_symbols.set(SYMBOLS.IF_LE, { type: eElementType.type_asm_cond, value: eValueType.if_c_or_z });
    this.automatic_symbols.set(SYMBOLS.IF_BE, { type: eElementType.type_asm_cond, value: eValueType.if_c_or_z });
    this.automatic_symbols.set(SYMBOLS.IF_ALWAYS, { type: eElementType.type_asm_cond, value: eValueType.if_always });

    this.automatic_symbols.set(SYMBOLS.IF_00, { type: eElementType.type_asm_cond, value: eValueType.if_nc_and_nz });
    this.automatic_symbols.set(SYMBOLS.IF_01, { type: eElementType.type_asm_cond, value: eValueType.if_nc_and_z });
    this.automatic_symbols.set(SYMBOLS.IF_10, { type: eElementType.type_asm_cond, value: eValueType.if_c_and_nz });
    this.automatic_symbols.set(SYMBOLS.IF_11, { type: eElementType.type_asm_cond, value: eValueType.if_c_and_z });
    this.automatic_symbols.set(SYMBOLS.IF_X0, { type: eElementType.type_asm_cond, value: eValueType.if_nz });
    this.automatic_symbols.set(SYMBOLS.IF_X1, { type: eElementType.type_asm_cond, value: eValueType.if_z });
    this.automatic_symbols.set(SYMBOLS.IF_0X, { type: eElementType.type_asm_cond, value: eValueType.if_nc });
    this.automatic_symbols.set(SYMBOLS.IF_1X, { type: eElementType.type_asm_cond, value: eValueType.if_c });
    this.automatic_symbols.set(SYMBOLS.IF_NOT_00, { type: eElementType.type_asm_cond, value: eValueType.if_c_or_z });
    this.automatic_symbols.set(SYMBOLS.IF_NOT_01, { type: eElementType.type_asm_cond, value: eValueType.if_c_or_nz });
    this.automatic_symbols.set(SYMBOLS.IF_NOT_10, { type: eElementType.type_asm_cond, value: eValueType.if_nc_or_z });
    this.automatic_symbols.set(SYMBOLS.IF_NOT_11, { type: eElementType.type_asm_cond, value: eValueType.if_nc_or_nz });
    this.automatic_symbols.set(SYMBOLS.IF_SAME, { type: eElementType.type_asm_cond, value: eValueType.if_c_eq_z });
    this.automatic_symbols.set(SYMBOLS.IF_DIFF, { type: eElementType.type_asm_cond, value: eValueType.if_c_ne_z });

    this.automatic_symbols.set(SYMBOLS.IF_0000, { type: eElementType.type_asm_cond, value: 0b0000 });
    this.automatic_symbols.set(SYMBOLS.IF_0001, { type: eElementType.type_asm_cond, value: 0b0001 });
    this.automatic_symbols.set(SYMBOLS.IF_0010, { type: eElementType.type_asm_cond, value: 0b0010 });
    this.automatic_symbols.set(SYMBOLS.IF_0011, { type: eElementType.type_asm_cond, value: 0b0011 });
    this.automatic_symbols.set(SYMBOLS.IF_0100, { type: eElementType.type_asm_cond, value: 0b0100 });
    this.automatic_symbols.set(SYMBOLS.IF_0101, { type: eElementType.type_asm_cond, value: 0b0101 });
    this.automatic_symbols.set(SYMBOLS.IF_0110, { type: eElementType.type_asm_cond, value: 0b0110 });
    this.automatic_symbols.set(SYMBOLS.IF_0111, { type: eElementType.type_asm_cond, value: 0b0111 });
    this.automatic_symbols.set(SYMBOLS.IF_1000, { type: eElementType.type_asm_cond, value: 0b1000 });
    this.automatic_symbols.set(SYMBOLS.IF_1001, { type: eElementType.type_asm_cond, value: 0b1001 });
    this.automatic_symbols.set(SYMBOLS.IF_1010, { type: eElementType.type_asm_cond, value: 0b1010 });
    this.automatic_symbols.set(SYMBOLS.IF_1011, { type: eElementType.type_asm_cond, value: 0b1011 });
    this.automatic_symbols.set(SYMBOLS.IF_1100, { type: eElementType.type_asm_cond, value: 0b1100 });
    this.automatic_symbols.set(SYMBOLS.IF_1101, { type: eElementType.type_asm_cond, value: 0b1101 });
    this.automatic_symbols.set(SYMBOLS.IF_1110, { type: eElementType.type_asm_cond, value: 0b1110 });
    this.automatic_symbols.set(SYMBOLS.IF_1111, { type: eElementType.type_asm_cond, value: 0b1111 });

    // assembly instructions

    // 	sym	type_asm_inst,		ac_ror,		'ROR'		(declared as type_op)
    // 	sym	type_asm_inst,		ac_rol,		'ROL'		(declared as type_op)
    this.automatic_symbols.set(SYMBOLS.SHR, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_shr) });
    this.automatic_symbols.set(SYMBOLS.SHL, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_shl) });
    this.automatic_symbols.set(SYMBOLS.RCR, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_rcr) });
    this.automatic_symbols.set(SYMBOLS.RCL, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_rcl) });
    // 	sym	type_asm_inst,		ac_sar,		'SAR'		(declared as type_op)
    this.automatic_symbols.set(SYMBOLS.SAL, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_sal) });

    this.automatic_symbols.set(SYMBOLS.ADD, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_add) });
    this.automatic_symbols.set(SYMBOLS.ADDX, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_addx) });
    this.automatic_symbols.set(SYMBOLS.ADDS, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_adds) });
    this.automatic_symbols.set(SYMBOLS.ADDSX, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_addsx) });

    this.automatic_symbols.set(SYMBOLS.SUB, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_sub) });
    this.automatic_symbols.set(SYMBOLS.SUBX, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_subx) });
    this.automatic_symbols.set(SYMBOLS.SUBS, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_subs) });
    this.automatic_symbols.set(SYMBOLS.SUBSX, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_subsx) });

    this.automatic_symbols.set(SYMBOLS.CMP, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_cmp) });
    this.automatic_symbols.set(SYMBOLS.CMPX, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_cmpx) });
    this.automatic_symbols.set(SYMBOLS.CMPS, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_cmps) });
    this.automatic_symbols.set(SYMBOLS.CMPSX, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_cmpsx) });

    this.automatic_symbols.set(SYMBOLS.CMPR, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_cmpr) });
    this.automatic_symbols.set(SYMBOLS.CMPM, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_cmpm) });
    this.automatic_symbols.set(SYMBOLS.SUBR, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_subr) });
    this.automatic_symbols.set(SYMBOLS.CMPSUB, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_cmpsub) });

    this.automatic_symbols.set(SYMBOLS.FGE, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_fge) });
    this.automatic_symbols.set(SYMBOLS.FLE, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_fle) });
    this.automatic_symbols.set(SYMBOLS.FGES, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_fges) });
    this.automatic_symbols.set(SYMBOLS.FLES, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_fles) });

    this.automatic_symbols.set(SYMBOLS.SUMC, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_sumc) });
    this.automatic_symbols.set(SYMBOLS.SUMNC, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_sumnc) });
    this.automatic_symbols.set(SYMBOLS.SUMZ, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_sumz) });
    this.automatic_symbols.set(SYMBOLS.SUMNZ, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_sumnz) });

    this.automatic_symbols.set(SYMBOLS.BITL, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_bitl) });
    this.automatic_symbols.set(SYMBOLS.BITH, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_bith) });
    this.automatic_symbols.set(SYMBOLS.BITC, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_bitc) });
    this.automatic_symbols.set(SYMBOLS.BITNC, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_bitnc) });
    this.automatic_symbols.set(SYMBOLS.BITZ, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_bitz) });
    this.automatic_symbols.set(SYMBOLS.BITNZ, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_bitnz) });
    this.automatic_symbols.set(SYMBOLS.BITRND, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_bitrnd) });
    this.automatic_symbols.set(SYMBOLS.BITNOT, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_bitnot) });

    this.automatic_symbols.set(SYMBOLS.TESTB, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_testb) });
    this.automatic_symbols.set(SYMBOLS.TESTBN, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_testbn) });

    // 	sym	type_asm_inst,		ac_and,		'AND'		(declared as type_op)
    this.automatic_symbols.set(SYMBOLS.ANDN, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_andn) });
    // 	sym	type_asm_inst,		ac_or,		'OR'		(declared as type_op)
    // 	sym	type_asm_inst,		ac_xor,		'XOR'		(declared as type_op)

    this.automatic_symbols.set(SYMBOLS.MUXC, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_muxc) });
    this.automatic_symbols.set(SYMBOLS.MUXNC, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_muxnc) });
    this.automatic_symbols.set(SYMBOLS.MUXZ, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_muxz) });
    this.automatic_symbols.set(SYMBOLS.MUXNZ, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_muxnz) });

    this.automatic_symbols.set(SYMBOLS.MOV, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_mov) });
    // 	sym	type_asm_inst,		ac_not,		'NOT'		(declared as type_op)
    // 	sym	type_asm_inst,		ac_abs,		'ABS'		(declared as type_op)
    this.automatic_symbols.set(SYMBOLS.NEG, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_neg) });

    this.automatic_symbols.set(SYMBOLS.NEGC, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_negc) });
    this.automatic_symbols.set(SYMBOLS.NEGNC, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_negnc) });
    this.automatic_symbols.set(SYMBOLS.NEGZ, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_negz) });
    this.automatic_symbols.set(SYMBOLS.NEGNZ, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_negnz) });

    this.automatic_symbols.set(SYMBOLS.INCMOD, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_incmod) });
    this.automatic_symbols.set(SYMBOLS.DECMOD, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_decmod) });
    // 	sym	type_asm_inst,		ac_zerox,	'ZEROX'		(declared as type_op)
    // 	sym	type_asm_inst,		ac_signx,	'SIGNX'		(declared as type_op)

    // 	sym	type_asm_inst,		ac_encod,	'ENCOD'		(declared as type_op)
    // 	sym	type_asm_inst,		ac_ones,	'ONES'		(declared as type_op)
    this.automatic_symbols.set(SYMBOLS.TEST, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_test) });
    this.automatic_symbols.set(SYMBOLS.TESTN, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_testn) });

    this.automatic_symbols.set(SYMBOLS.SETNIB, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_setnib) });
    this.automatic_symbols.set(SYMBOLS.GETNIB, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_getnib) });
    this.automatic_symbols.set(SYMBOLS.ROLNIB, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_rolnib) });

    this.automatic_symbols.set(SYMBOLS.SETBYTE, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_setbyte) });
    this.automatic_symbols.set(SYMBOLS.GETBYTE, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_getbyte) });
    this.automatic_symbols.set(SYMBOLS.ROLBYTE, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_rolbyte) });

    this.automatic_symbols.set(SYMBOLS.SETWORD, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_setword) });
    this.automatic_symbols.set(SYMBOLS.GETWORD, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_getword) });
    this.automatic_symbols.set(SYMBOLS.ROLWORD, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_rolword) });

    this.automatic_symbols.set(SYMBOLS.ALTSN, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_altsn) });
    this.automatic_symbols.set(SYMBOLS.ALTGN, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_altgn) });
    this.automatic_symbols.set(SYMBOLS.ALTSB, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_altsb) });
    this.automatic_symbols.set(SYMBOLS.ALTGB, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_altgb) });
    this.automatic_symbols.set(SYMBOLS.ALTSW, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_altsw) });
    this.automatic_symbols.set(SYMBOLS.ALTGW, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_altgw) });
    this.automatic_symbols.set(SYMBOLS.ALTR, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_altr) });
    this.automatic_symbols.set(SYMBOLS.ALTD, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_altd) });
    this.automatic_symbols.set(SYMBOLS.ALTS, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_alts) });
    this.automatic_symbols.set(SYMBOLS.ALTB, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_altb) });
    this.automatic_symbols.set(SYMBOLS.ALTI, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_alti) });
    this.automatic_symbols.set(SYMBOLS.SETR, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_setr) });
    this.automatic_symbols.set(SYMBOLS.SETD, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_setd) });
    this.automatic_symbols.set(SYMBOLS.SETS, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_sets) });
    // 	sym	type_asm_inst,		ac_decod,	'DECOD'		(declared as type_op)
    // 	sym	type_asm_inst,		ac_bmask,	'BMASK'		(declared as type_op)
    this.automatic_symbols.set(SYMBOLS.CRCBIT, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_crcbit) });
    this.automatic_symbols.set(SYMBOLS.CRCNIB, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_crcnib) });
    this.automatic_symbols.set(SYMBOLS.MUXNITS, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_muxnits) });
    this.automatic_symbols.set(SYMBOLS.MUXNIBS, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_muxnibs) });
    this.automatic_symbols.set(SYMBOLS.MUXQ, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_muxq) });
    this.automatic_symbols.set(SYMBOLS.MOVBYTS, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_movbyts) });

    this.automatic_symbols.set(SYMBOLS.MUL, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_mul) });
    this.automatic_symbols.set(SYMBOLS.MULS, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_muls) });
    // 	sym	type_asm_inst,		ac_sca,		'SCA'		(declared as type_op)
    // 	sym	type_asm_inst,		ac_scas,	'SCAS'		(declared as type_op)

    this.automatic_symbols.set(SYMBOLS.ADDPIX, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_addpix) });
    this.automatic_symbols.set(SYMBOLS.MULPIX, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_mulpix) });
    this.automatic_symbols.set(SYMBOLS.BLNPIX, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_blnpix) });
    this.automatic_symbols.set(SYMBOLS.MIXPIX, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_mixpix) });

    this.automatic_symbols.set(SYMBOLS.ADDCT1, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_addct1) });
    this.automatic_symbols.set(SYMBOLS.ADDCT2, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_addct2) });
    this.automatic_symbols.set(SYMBOLS.ADDCT3, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_addct3) });
    this.automatic_symbols.set(SYMBOLS.WMLONG, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_wmlong) });

    // 	sym	type_asm_inst,		ac_rqpin,	'RQPIN'		(declared as type_i_flex)
    // 	sym	type_asm_inst,		ac_rdpin,	'RDPIN'		(declared as type_i_flex)
    this.automatic_symbols.set(SYMBOLS.RDLUT, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_rdlut) });

    this.automatic_symbols.set(SYMBOLS.RDBYTE, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_rdbyte) });
    this.automatic_symbols.set(SYMBOLS.RDWORD, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_rdword) });
    this.automatic_symbols.set(SYMBOLS.RDLONG, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_rdlong) });

    this.automatic_symbols.set(SYMBOLS.CALLPA, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_callpa) });
    this.automatic_symbols.set(SYMBOLS.CALLPB, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_callpb) });

    this.automatic_symbols.set(SYMBOLS.DJZ, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_djz) });
    this.automatic_symbols.set(SYMBOLS.DJNZ, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_djnz) });
    this.automatic_symbols.set(SYMBOLS.DJF, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_djf) });
    this.automatic_symbols.set(SYMBOLS.DJNF, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_djnf) });

    this.automatic_symbols.set(SYMBOLS.IJZ, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_ijz) });
    this.automatic_symbols.set(SYMBOLS.IJNZ, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_ijnz) });

    this.automatic_symbols.set(SYMBOLS.TJZ, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_tjz) });
    this.automatic_symbols.set(SYMBOLS.TJNZ, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_tjnz) });
    this.automatic_symbols.set(SYMBOLS.TJF, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_tjf) });
    this.automatic_symbols.set(SYMBOLS.TJNF, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_tjnf) });
    this.automatic_symbols.set(SYMBOLS.TJS, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_tjs) });
    this.automatic_symbols.set(SYMBOLS.TJNS, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_tjns) });
    this.automatic_symbols.set(SYMBOLS.TJV, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_tjv) });

    this.automatic_symbols.set(SYMBOLS.JINT, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_jint) });
    this.automatic_symbols.set(SYMBOLS.JCT1, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_jct1) });
    this.automatic_symbols.set(SYMBOLS.JCT2, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_jct2) });
    this.automatic_symbols.set(SYMBOLS.JCT3, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_jct3) });
    this.automatic_symbols.set(SYMBOLS.JSE1, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_jse1) });
    this.automatic_symbols.set(SYMBOLS.JSE2, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_jse2) });
    this.automatic_symbols.set(SYMBOLS.JSE3, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_jse3) });
    this.automatic_symbols.set(SYMBOLS.JSE4, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_jse4) });
    this.automatic_symbols.set(SYMBOLS.JPAT, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_jpat) });
    this.automatic_symbols.set(SYMBOLS.JFBW, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_jfbw) });
    this.automatic_symbols.set(SYMBOLS.JXMT, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_jxmt) });
    this.automatic_symbols.set(SYMBOLS.JXFI, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_jxfi) });
    this.automatic_symbols.set(SYMBOLS.JXRO, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_jxro) });
    this.automatic_symbols.set(SYMBOLS.JXRL, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_jxrl) });
    this.automatic_symbols.set(SYMBOLS.JATN, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_jatn) });
    this.automatic_symbols.set(SYMBOLS.JQMT, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_jqmt) });

    this.automatic_symbols.set(SYMBOLS.JNINT, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_jnint) });
    this.automatic_symbols.set(SYMBOLS.JNCT1, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_jnct1) });
    this.automatic_symbols.set(SYMBOLS.JNCT2, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_jnct2) });
    this.automatic_symbols.set(SYMBOLS.JNCT3, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_jnct3) });
    this.automatic_symbols.set(SYMBOLS.JNSE1, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_jnse1) });
    this.automatic_symbols.set(SYMBOLS.JNSE2, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_jnse2) });
    this.automatic_symbols.set(SYMBOLS.JNSE3, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_jnse3) });
    this.automatic_symbols.set(SYMBOLS.JNSE4, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_jnse4) });
    this.automatic_symbols.set(SYMBOLS.JNPAT, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_jnpat) });
    this.automatic_symbols.set(SYMBOLS.JNFBW, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_jnfbw) });
    this.automatic_symbols.set(SYMBOLS.JNXMT, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_jnxmt) });
    this.automatic_symbols.set(SYMBOLS.JNXFI, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_jnxfi) });
    this.automatic_symbols.set(SYMBOLS.JNXRO, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_jnxro) });
    this.automatic_symbols.set(SYMBOLS.JNXRL, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_jnxrl) });
    this.automatic_symbols.set(SYMBOLS.JNATN, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_jnatn) });
    this.automatic_symbols.set(SYMBOLS.JNQMT, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_jnqmt) });

    // 	sym	type_asm_inst,		ac_empty,	'<empty>'
    // 	sym	type_asm_inst,		ac_empty,	'<empty>'
    this.automatic_symbols.set(SYMBOLS.SETPAT, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_setpat) });

    // 	sym	type_asm_inst,		ac_wrpin,	'WRPIN'		(declared as type_i_flex)
    // 	sym	type_asm_inst,		ac_wxpin,	'WXPIN'		(declared as type_i_flex)
    // 	sym	type_asm_inst,		ac_wypin,	'WYPIN'		(declared as type_i_flex)
    this.automatic_symbols.set(SYMBOLS.WRLUT, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_wrlut) });

    this.automatic_symbols.set(SYMBOLS.WRBYTE, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_wrbyte) });
    this.automatic_symbols.set(SYMBOLS.WRWORD, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_wrword) });
    this.automatic_symbols.set(SYMBOLS.WRLONG, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_wrlong) });

    this.automatic_symbols.set(SYMBOLS.RDFAST, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_rdfast) });
    this.automatic_symbols.set(SYMBOLS.WRFAST, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_wrfast) });
    this.automatic_symbols.set(SYMBOLS.FBLOCK, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_fblock) });

    this.automatic_symbols.set(SYMBOLS.XINIT, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_xinit) });
    this.automatic_symbols.set(SYMBOLS.XZERO, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_xzero) });
    this.automatic_symbols.set(SYMBOLS.XCONT, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_xcont) });

    this.automatic_symbols.set(SYMBOLS.REP, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_rep) });

    // 	sym	type_asm_inst,		ac_coginit,	'COGINIT'	(declared as type_i_flex)
    this.automatic_symbols.set(SYMBOLS.QMUL, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_qmul) });
    this.automatic_symbols.set(SYMBOLS.QDIV, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_qdiv) });
    this.automatic_symbols.set(SYMBOLS.QFRAC, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_qfrac) });
    this.automatic_symbols.set(SYMBOLS.QSQRT, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_qsqrt) });
    this.automatic_symbols.set(SYMBOLS.QROTATE, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_qrotate) });
    this.automatic_symbols.set(SYMBOLS.QVECTOR, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_qvector) });

    // 	sym	type_asm_inst,		ac_hubset,	'HUBSET'	(declared as type_i_flex)
    // 	sym	type_asm_inst,		ac_cogid,	'COGID'		(declared as type_i_flex)
    // 	sym	type_asm_inst,		ac_cogstop,	'COGSTOP'	(declared as type_i_flex)
    // 	sym	type_asm_inst,		ac_locknew,	'LOCKNEW'	(declared as type_i_flex)
    // 	sym	type_asm_inst,		ac_lockret,	'LOCKRET'	(declared as type_i_flex)
    // 	sym	type_asm_inst,		ac_locktry,	'LOCKTRY'	(declared as type_i_flex)
    // 	sym	type_asm_inst,		ac_lockrel,	'LOCKREL'	(declared as type_i_flex)
    // 	sym	type_asm_inst,		ac_qlog,	'QLOG'		(declared as type_op)
    // 	sym	type_asm_inst,		ac_qexp,	'QEXP'		(declared as type_op)

    this.automatic_symbols.set(SYMBOLS.RFBYTE, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_rfbyte) });
    this.automatic_symbols.set(SYMBOLS.RFWORD, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_rfword) });
    this.automatic_symbols.set(SYMBOLS.RFLONG, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_rflong) });
    this.automatic_symbols.set(SYMBOLS.RFVAR, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_rfvar) });
    this.automatic_symbols.set(SYMBOLS.RFVARS, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_rfvars) });

    this.automatic_symbols.set(SYMBOLS.WFBYTE, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_wfbyte) });
    this.automatic_symbols.set(SYMBOLS.WFWORD, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_wfword) });
    this.automatic_symbols.set(SYMBOLS.WFLONG, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_wflong) });

    this.automatic_symbols.set(SYMBOLS.GETQX, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_getqx) });
    this.automatic_symbols.set(SYMBOLS.GETQY, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_getqy) });

    // 	sym	type_asm_inst,		ac_getct,	'GETCT'		(declared as type_i_flex)
    // 	sym	type_asm_inst,		ac_getrnd,	'GETRND'	(declared as type_i_flex)

    this.automatic_symbols.set(SYMBOLS.SETDACS, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_setdacs) });
    this.automatic_symbols.set(SYMBOLS.SETXFRQ, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_setxfrq) });
    this.automatic_symbols.set(SYMBOLS.GETXACC, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_getxacc) });

    this.automatic_symbols.set(SYMBOLS.WAITX, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_waitx) });

    this.automatic_symbols.set(SYMBOLS.SETSE1, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_setse1) });
    this.automatic_symbols.set(SYMBOLS.SETSE2, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_setse2) });
    this.automatic_symbols.set(SYMBOLS.SETSE3, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_setse3) });
    this.automatic_symbols.set(SYMBOLS.SETSE4, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_setse4) });

    this.automatic_symbols.set(SYMBOLS.POLLINT, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_pollint) });
    this.automatic_symbols.set(SYMBOLS.POLLCT1, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_pollct1) });
    this.automatic_symbols.set(SYMBOLS.POLLCT2, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_pollct2) });
    this.automatic_symbols.set(SYMBOLS.POLLCT3, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_pollct3) });
    this.automatic_symbols.set(SYMBOLS.POLLSE1, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_pollse1) });
    this.automatic_symbols.set(SYMBOLS.POLLSE2, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_pollse2) });
    this.automatic_symbols.set(SYMBOLS.POLLSE3, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_pollse3) });
    this.automatic_symbols.set(SYMBOLS.POLLSE4, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_pollse4) });
    this.automatic_symbols.set(SYMBOLS.POLLPAT, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_pollpat) });
    this.automatic_symbols.set(SYMBOLS.POLLFBW, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_pollfbw) });
    this.automatic_symbols.set(SYMBOLS.POLLXMT, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_pollxmt) });
    this.automatic_symbols.set(SYMBOLS.POLLXFI, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_pollxfi) });
    this.automatic_symbols.set(SYMBOLS.POLLXRO, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_pollxro) });
    this.automatic_symbols.set(SYMBOLS.POLLXRL, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_pollxrl) });
    // 	sym	type_asm_inst,		ac_pollatn,	'POLLATN'	(declared as type_i_flex)
    this.automatic_symbols.set(SYMBOLS.POLLQMT, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_pollqmt) });

    this.automatic_symbols.set(SYMBOLS.WAITINT, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_waitint) });
    this.automatic_symbols.set(SYMBOLS.WAITCT1, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_waitct1) });
    this.automatic_symbols.set(SYMBOLS.WAITCT2, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_waitct2) });
    this.automatic_symbols.set(SYMBOLS.WAITCT3, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_waitct3) });
    this.automatic_symbols.set(SYMBOLS.WAITSE1, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_waitse1) });
    this.automatic_symbols.set(SYMBOLS.WAITSE2, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_waitse2) });
    this.automatic_symbols.set(SYMBOLS.WAITSE3, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_waitse3) });
    this.automatic_symbols.set(SYMBOLS.WAITSE4, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_waitse4) });
    this.automatic_symbols.set(SYMBOLS.WAITPAT, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_waitpat) });
    this.automatic_symbols.set(SYMBOLS.WAITFBW, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_waitfbw) });
    this.automatic_symbols.set(SYMBOLS.WAITXMT, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_waitxmt) });
    this.automatic_symbols.set(SYMBOLS.WAITXFI, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_waitxfi) });
    this.automatic_symbols.set(SYMBOLS.WAITXRO, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_waitxro) });
    this.automatic_symbols.set(SYMBOLS.WAITXRL, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_waitxrl) });
    // 	sym	type_asm_inst,		ac_waitatn,	'WAITATN'	(declared as type_i_flex)

    this.automatic_symbols.set(SYMBOLS.ALLOWI, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_allowi) });
    this.automatic_symbols.set(SYMBOLS.STALLI, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_stalli) });

    this.automatic_symbols.set(SYMBOLS.TRGINT1, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_trgint1) });
    this.automatic_symbols.set(SYMBOLS.TRGINT2, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_trgint2) });
    this.automatic_symbols.set(SYMBOLS.TRGINT3, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_trgint3) });

    this.automatic_symbols.set(SYMBOLS.NIXINT1, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_nixint1) });
    this.automatic_symbols.set(SYMBOLS.NIXINT2, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_nixint2) });
    this.automatic_symbols.set(SYMBOLS.NIXINT3, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_nixint3) });

    this.automatic_symbols.set(SYMBOLS.SETINT1, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_setint1) });
    this.automatic_symbols.set(SYMBOLS.SETINT2, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_setint2) });
    this.automatic_symbols.set(SYMBOLS.SETINT3, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_setint3) });

    this.automatic_symbols.set(SYMBOLS.SETQ, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_setq) });
    this.automatic_symbols.set(SYMBOLS.SETQ2, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_setq2) });

    this.automatic_symbols.set(SYMBOLS.PUSH, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_push) });
    this.automatic_symbols.set(SYMBOLS.POP, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_pop) });

    this.automatic_symbols.set(SYMBOLS.JMPREL, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_jmprel) });
    this.automatic_symbols.set(SYMBOLS.SKIP, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_skip) });
    this.automatic_symbols.set(SYMBOLS.SKIPF, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_skipf) });
    this.automatic_symbols.set(SYMBOLS.EXECF, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_execf) });

    this.automatic_symbols.set(SYMBOLS.GETPTR, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_getptr) });
    this.automatic_symbols.set(SYMBOLS.GETBRK, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_getbrk) });
    this.automatic_symbols.set(SYMBOLS.COGBRK, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_cogbrk) });
    this.automatic_symbols.set(SYMBOLS.BRK, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_brk) });

    this.automatic_symbols.set(SYMBOLS.SETLUTS, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_setluts) });

    this.automatic_symbols.set(SYMBOLS.SETCY, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_setcy) });
    this.automatic_symbols.set(SYMBOLS.SETCI, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_setci) });
    this.automatic_symbols.set(SYMBOLS.SETCQ, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_setcq) });
    this.automatic_symbols.set(SYMBOLS.SETCFRQ, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_setcfrq) });
    this.automatic_symbols.set(SYMBOLS.SETCMOD, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_setcmod) });

    this.automatic_symbols.set(SYMBOLS.SETPIV, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_setpiv) });
    this.automatic_symbols.set(SYMBOLS.SETPIX, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_setpix) });

    // 	sym	type_asm_inst,		ac_cogatn,	'COGATN'	(declared as type_i_flex)

    this.automatic_symbols.set(SYMBOLS.TESTP, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_testp) });
    this.automatic_symbols.set(SYMBOLS.TESTPN, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_testpn) });

    this.automatic_symbols.set(SYMBOLS.DIRL, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_dirl) });
    this.automatic_symbols.set(SYMBOLS.DIRH, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_dirh) });
    this.automatic_symbols.set(SYMBOLS.DIRC, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_dirc) });
    this.automatic_symbols.set(SYMBOLS.DIRNC, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_dirnc) });
    this.automatic_symbols.set(SYMBOLS.DIRZ, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_dirz) });
    this.automatic_symbols.set(SYMBOLS.DIRNZ, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_dirnz) });
    this.automatic_symbols.set(SYMBOLS.DIRRND, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_dirrnd) });
    this.automatic_symbols.set(SYMBOLS.DIRNOT, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_dirnot) });

    this.automatic_symbols.set(SYMBOLS.OUTL, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_outl) });
    this.automatic_symbols.set(SYMBOLS.OUTH, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_outh) });
    this.automatic_symbols.set(SYMBOLS.OUTC, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_outc) });
    this.automatic_symbols.set(SYMBOLS.OUTNC, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_outnc) });
    this.automatic_symbols.set(SYMBOLS.OUTZ, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_outz) });
    this.automatic_symbols.set(SYMBOLS.OUTNZ, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_outnz) });
    this.automatic_symbols.set(SYMBOLS.OUTRND, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_outrnd) });
    this.automatic_symbols.set(SYMBOLS.OUTNOT, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_outnot) });

    this.automatic_symbols.set(SYMBOLS.FLTL, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_fltl) });
    this.automatic_symbols.set(SYMBOLS.FLTH, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_flth) });
    this.automatic_symbols.set(SYMBOLS.FLTC, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_fltc) });
    this.automatic_symbols.set(SYMBOLS.FLTNC, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_fltnc) });
    this.automatic_symbols.set(SYMBOLS.FLTZ, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_fltz) });
    this.automatic_symbols.set(SYMBOLS.FLTNZ, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_fltnz) });
    this.automatic_symbols.set(SYMBOLS.FLTRND, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_fltrnd) });
    this.automatic_symbols.set(SYMBOLS.FLTNOT, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_fltnot) });

    this.automatic_symbols.set(SYMBOLS.DRVL, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_drvl) });
    this.automatic_symbols.set(SYMBOLS.DRVH, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_drvh) });
    this.automatic_symbols.set(SYMBOLS.DRVC, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_drvc) });
    this.automatic_symbols.set(SYMBOLS.DRVNC, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_drvnc) });
    this.automatic_symbols.set(SYMBOLS.DRVZ, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_drvz) });
    this.automatic_symbols.set(SYMBOLS.DRVNZ, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_drvnz) });
    this.automatic_symbols.set(SYMBOLS.DRVRND, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_drvrnd) });
    this.automatic_symbols.set(SYMBOLS.DRVNOT, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_drvnot) });

    this.automatic_symbols.set(SYMBOLS.SPLITB, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_splitb) });
    this.automatic_symbols.set(SYMBOLS.MERGEB, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_mergeb) });
    this.automatic_symbols.set(SYMBOLS.SPLITW, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_splitw) });
    this.automatic_symbols.set(SYMBOLS.MERGEW, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_mergew) });
    this.automatic_symbols.set(SYMBOLS.SEUSSF, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_seussf) });
    this.automatic_symbols.set(SYMBOLS.SEUSSR, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_seussr) });
    this.automatic_symbols.set(SYMBOLS.RGBSQZ, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_rgbsqz) });
    this.automatic_symbols.set(SYMBOLS.RGBEXP, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_rgbexp) });
    this.automatic_symbols.set(SYMBOLS.XORO32, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_xoro32) });
    // 	sym	type_asm_inst,		ac_rev,		'REV'		(declared as type_op)
    this.automatic_symbols.set(SYMBOLS.RCZR, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_rczr) });
    this.automatic_symbols.set(SYMBOLS.RCZL, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_rczl) });
    this.automatic_symbols.set(SYMBOLS.WRC, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_wrc) });
    this.automatic_symbols.set(SYMBOLS.WRNC, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_wrnc) });
    this.automatic_symbols.set(SYMBOLS.WRZ, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_wrz) });
    this.automatic_symbols.set(SYMBOLS.WRNZ, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_wrnz) });
    this.automatic_symbols.set(SYMBOLS.MODCZ, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_modcz) });
    this.automatic_symbols.set(SYMBOLS.MODC, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_modc) });
    this.automatic_symbols.set(SYMBOLS.MODZ, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_modz) });

    this.automatic_symbols.set(SYMBOLS.SETSCP, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_setscp) });
    this.automatic_symbols.set(SYMBOLS.GETSCP, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_getscp) });

    this.automatic_symbols.set(SYMBOLS.JMP, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_jmp) });
    // 	sym	type_asm_inst,		ac_call,	'CALL'		(declared as type_i_flex)
    this.automatic_symbols.set(SYMBOLS.CALLA, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_calla) });
    this.automatic_symbols.set(SYMBOLS.CALLB, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_callb) });
    this.automatic_symbols.set(SYMBOLS.CALLD, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_calld) });
    this.automatic_symbols.set(SYMBOLS.LOC, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_loc) });

    this.automatic_symbols.set(SYMBOLS.AUGS, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_augs) });
    this.automatic_symbols.set(SYMBOLS.AUGD, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_augd) });

    this.automatic_symbols.set(SYMBOLS.PUSHA, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_pusha) }); // alias instru.
    this.automatic_symbols.set(SYMBOLS.PUSHB, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_pushb) });
    this.automatic_symbols.set(SYMBOLS.POPA, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_popa) });
    this.automatic_symbols.set(SYMBOLS.POPB, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_popb) });

    this.automatic_symbols.set(SYMBOLS.RET, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_ret) }); // xlat instru.
    this.automatic_symbols.set(SYMBOLS.RETA, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_reta) });
    this.automatic_symbols.set(SYMBOLS.RETB, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_retb) });
    this.automatic_symbols.set(SYMBOLS.RETI0, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_reti0) });
    this.automatic_symbols.set(SYMBOLS.RETI1, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_reti1) });
    this.automatic_symbols.set(SYMBOLS.RETI2, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_reti2) });
    this.automatic_symbols.set(SYMBOLS.RETI3, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_reti3) });
    this.automatic_symbols.set(SYMBOLS.RESI0, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_resi0) });
    this.automatic_symbols.set(SYMBOLS.RESI1, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_resi1) });
    this.automatic_symbols.set(SYMBOLS.RESI2, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_resi2) });
    this.automatic_symbols.set(SYMBOLS.RESI3, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_resi3) });
    this.automatic_symbols.set(SYMBOLS.XSTOP, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_xstop) });

    // 	sym	type_asm_inst,		ac_akpin,	'AKPIN'		(declared as type_i_flex)

    this.automatic_symbols.set(SYMBOLS.ASMCLK, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_asmclk) });

    this.automatic_symbols.set(SYMBOLS.NOP, { type: eElementType.type_asm_inst, value: this.asmcodeValue(eAsmcode.ac_nop) });

    this.automatic_symbols.set(SYMBOLS.WC, { type: eElementType.type_asm_effect, value: 0b0010 }); // assembly effects
    this.automatic_symbols.set(SYMBOLS.WZ, { type: eElementType.type_asm_effect, value: 0b0001 });
    this.automatic_symbols.set(SYMBOLS.WCZ, { type: eElementType.type_asm_effect, value: 0b0011 });
    this.automatic_symbols.set(SYMBOLS.ANDC, { type: eElementType.type_asm_effect2, value: 0b0110 });
    this.automatic_symbols.set(SYMBOLS.ANDZ, { type: eElementType.type_asm_effect2, value: 0b0101 });
    this.automatic_symbols.set(SYMBOLS.ORC, { type: eElementType.type_asm_effect2, value: 0b1010 });
    this.automatic_symbols.set(SYMBOLS.ORZ, { type: eElementType.type_asm_effect2, value: 0b1001 });
    this.automatic_symbols.set(SYMBOLS.XORC, { type: eElementType.type_asm_effect2, value: 0b1110 });
    this.automatic_symbols.set(SYMBOLS.XORZ, { type: eElementType.type_asm_effect2, value: 0b1101 });

    this.automatic_symbols.set(SYMBOLS._CLR, { type: eElementType.type_con, value: eValueType.if_ret }); // modcz values
    this.automatic_symbols.set(SYMBOLS._NC_AND_NZ, { type: eElementType.type_con, value: eValueType.if_nc_and_nz });
    this.automatic_symbols.set(SYMBOLS._NZ_AND_NC, { type: eElementType.type_con, value: eValueType.if_nc_and_nz });
    this.automatic_symbols.set(SYMBOLS._GT, { type: eElementType.type_con, value: eValueType.if_nc_and_nz });
    this.automatic_symbols.set(SYMBOLS._NC_AND_Z, { type: eElementType.type_con, value: eValueType.if_nc_and_z });
    this.automatic_symbols.set(SYMBOLS._Z_AND_NC, { type: eElementType.type_con, value: eValueType.if_nc_and_z });
    this.automatic_symbols.set(SYMBOLS._NC, { type: eElementType.type_con, value: eValueType.if_nc });
    this.automatic_symbols.set(SYMBOLS._GE, { type: eElementType.type_con, value: eValueType.if_nc });
    this.automatic_symbols.set(SYMBOLS._C_AND_NZ, { type: eElementType.type_con, value: eValueType.if_c_and_nz });
    this.automatic_symbols.set(SYMBOLS._NZ_AND_C, { type: eElementType.type_con, value: eValueType.if_c_and_nz });
    this.automatic_symbols.set(SYMBOLS._NZ, { type: eElementType.type_con, value: eValueType.if_nz });
    this.automatic_symbols.set(SYMBOLS._NE, { type: eElementType.type_con, value: eValueType.if_nz });
    this.automatic_symbols.set(SYMBOLS._C_NE_Z, { type: eElementType.type_con, value: eValueType.if_c_ne_z });
    this.automatic_symbols.set(SYMBOLS._Z_NE_C, { type: eElementType.type_con, value: eValueType.if_c_ne_z });
    this.automatic_symbols.set(SYMBOLS._NC_OR_NZ, { type: eElementType.type_con, value: eValueType.if_nc_or_nz });
    this.automatic_symbols.set(SYMBOLS._NZ_OR_NC, { type: eElementType.type_con, value: eValueType.if_nc_or_nz });
    this.automatic_symbols.set(SYMBOLS._C_AND_Z, { type: eElementType.type_con, value: eValueType.if_c_and_z });
    this.automatic_symbols.set(SYMBOLS._Z_AND_C, { type: eElementType.type_con, value: eValueType.if_c_and_z });
    this.automatic_symbols.set(SYMBOLS._C_EQ_Z, { type: eElementType.type_con, value: eValueType.if_c_eq_z });
    this.automatic_symbols.set(SYMBOLS._Z_EQ_C, { type: eElementType.type_con, value: eValueType.if_c_eq_z });
    this.automatic_symbols.set(SYMBOLS._Z, { type: eElementType.type_con, value: eValueType.if_z });
    this.automatic_symbols.set(SYMBOLS._E, { type: eElementType.type_con, value: eValueType.if_z });
    this.automatic_symbols.set(SYMBOLS._NC_OR_Z, { type: eElementType.type_con, value: eValueType.if_nc_or_z });
    this.automatic_symbols.set(SYMBOLS._Z_OR_NC, { type: eElementType.type_con, value: eValueType.if_nc_or_z });
    this.automatic_symbols.set(SYMBOLS._C, { type: eElementType.type_con, value: eValueType.if_c });
    this.automatic_symbols.set(SYMBOLS._LT, { type: eElementType.type_con, value: eValueType.if_c });
    this.automatic_symbols.set(SYMBOLS._C_OR_NZ, { type: eElementType.type_con, value: eValueType.if_c_or_nz });
    this.automatic_symbols.set(SYMBOLS._NZ_OR_C, { type: eElementType.type_con, value: eValueType.if_c_or_nz });
    this.automatic_symbols.set(SYMBOLS._C_OR_Z, { type: eElementType.type_con, value: eValueType.if_c_or_z });
    this.automatic_symbols.set(SYMBOLS._Z_OR_C, { type: eElementType.type_con, value: eValueType.if_c_or_z });
    this.automatic_symbols.set(SYMBOLS._LE, { type: eElementType.type_con, value: eValueType.if_c_or_z });
    this.automatic_symbols.set(SYMBOLS._SET, { type: eElementType.type_con, value: eValueType.if_always });

    this.automatic_symbols.set(SYMBOLS.REG, { type: eElementType.type_reg, value: 0 }); // reg

    this.automatic_symbols.set(SYMBOLS.PR0, { type: eElementType.type_register, value: eValueType.pasm_regs + 0 }); // pasm regs
    this.automatic_symbols.set(SYMBOLS.PR1, { type: eElementType.type_register, value: eValueType.pasm_regs + 1 });
    this.automatic_symbols.set(SYMBOLS.PR2, { type: eElementType.type_register, value: eValueType.pasm_regs + 2 });
    this.automatic_symbols.set(SYMBOLS.PR3, { type: eElementType.type_register, value: eValueType.pasm_regs + 3 });
    this.automatic_symbols.set(SYMBOLS.PR4, { type: eElementType.type_register, value: eValueType.pasm_regs + 4 });
    this.automatic_symbols.set(SYMBOLS.PR5, { type: eElementType.type_register, value: eValueType.pasm_regs + 5 });
    this.automatic_symbols.set(SYMBOLS.PR6, { type: eElementType.type_register, value: eValueType.pasm_regs + 6 });
    this.automatic_symbols.set(SYMBOLS.PR7, { type: eElementType.type_register, value: eValueType.pasm_regs + 7 });

    this.automatic_symbols.set(SYMBOLS.IJMP3, { type: eElementType.type_register, value: 0x1f0 }); // interrupt vectors
    this.automatic_symbols.set(SYMBOLS.IRET3, { type: eElementType.type_register, value: 0x1f1 });
    this.automatic_symbols.set(SYMBOLS.IJMP2, { type: eElementType.type_register, value: 0x1f2 });
    this.automatic_symbols.set(SYMBOLS.IRET2, { type: eElementType.type_register, value: 0x1f3 });
    this.automatic_symbols.set(SYMBOLS.IJMP1, { type: eElementType.type_register, value: 0x1f4 });
    this.automatic_symbols.set(SYMBOLS.IRET1, { type: eElementType.type_register, value: 0x1f5 });
    this.automatic_symbols.set(SYMBOLS.PA, { type: eElementType.type_register, value: 0x1f6 }); // calld/loc targets
    this.automatic_symbols.set(SYMBOLS.PB, { type: eElementType.type_register, value: 0x1f7 });
    this.automatic_symbols.set(SYMBOLS.PTRA, { type: eElementType.type_register, value: 0x1f8 }); // special function registers
    this.automatic_symbols.set(SYMBOLS.PTRB, { type: eElementType.type_register, value: 0x1f9 });
    this.automatic_symbols.set(SYMBOLS.DIRA, { type: eElementType.type_register, value: 0x1fa });
    this.automatic_symbols.set(SYMBOLS.DIRB, { type: eElementType.type_register, value: 0x1fb });
    this.automatic_symbols.set(SYMBOLS.OUTA, { type: eElementType.type_register, value: 0x1fc });
    this.automatic_symbols.set(SYMBOLS.OUTB, { type: eElementType.type_register, value: 0x1fd });
    this.automatic_symbols.set(SYMBOLS.INA, { type: eElementType.type_register, value: 0x1fe });
    this.automatic_symbols.set(SYMBOLS.INB, { type: eElementType.type_register, value: 0x1ff });

    this.automatic_symbols.set(SYMBOLS.CLKMODE, { type: eElementType.type_hub_long, value: 0x00040 }); // spin permanent variables
    this.automatic_symbols.set(SYMBOLS.CLKFREQ, { type: eElementType.type_hub_long, value: 0x00044 });

    this.automatic_symbols.set(SYMBOLS.VARBASE, { type: eElementType.type_var_long, value: 0 });

    this.automatic_symbols.set(SYMBOLS.FALSE, { type: eElementType.type_con, value: 0 }); // numeric constants
    this.automatic_symbols.set(SYMBOLS.TRUE, { type: eElementType.type_con, value: 0x0ffffffff });
    this.automatic_symbols.set(SYMBOLS.NEGX, { type: eElementType.type_con, value: 0x80000000 });
    this.automatic_symbols.set(SYMBOLS.POSX, { type: eElementType.type_con, value: 0x7fffffff });
    this.automatic_symbols.set(SYMBOLS.PI, { type: eElementType.type_con_float, value: 0x40490fdb });

    this.automatic_symbols.set(SYMBOLS.COGEXEC, { type: eElementType.type_con, value: 0b000000 }); // coginit constants
    this.automatic_symbols.set(SYMBOLS.HUBEXEC, { type: eElementType.type_con, value: 0b100000 });
    this.automatic_symbols.set(SYMBOLS.COGEXEC_NEW, { type: eElementType.type_con, value: 0b010000 });
    this.automatic_symbols.set(SYMBOLS.HUBEXEC_NEW, { type: eElementType.type_con, value: 0b110000 });
    this.automatic_symbols.set(SYMBOLS.COGEXEC_NEW_PAIR, { type: eElementType.type_con, value: 0b010001 });
    this.automatic_symbols.set(SYMBOLS.HUBEXEC_NEW_PAIR, { type: eElementType.type_con, value: 0b110001 });
    this.automatic_symbols.set(SYMBOLS.NEWCOG, { type: eElementType.type_con, value: 0b010000 }); // cogspin constant

    this.automatic_symbols.set(SYMBOLS.P_TRUE_A, { type: eElementType.type_con, value: 0b00000000000000000000000000000000 }); // smart pin constants
    this.automatic_symbols.set(SYMBOLS.P_INVERT_A, { type: eElementType.type_con, value: 0b10000000000000000000000000000000 });

    this.automatic_symbols.set(SYMBOLS.P_LOCAL_A, { type: eElementType.type_con, value: 0b0000000000000000000000000000000 });
    this.automatic_symbols.set(SYMBOLS.P_PLUS1_A, { type: eElementType.type_con, value: 0b0010000000000000000000000000000 });
    this.automatic_symbols.set(SYMBOLS.P_PLUS2_A, { type: eElementType.type_con, value: 0b0100000000000000000000000000000 });
    this.automatic_symbols.set(SYMBOLS.P_PLUS3_A, { type: eElementType.type_con, value: 0b0110000000000000000000000000000 });
    this.automatic_symbols.set(SYMBOLS.P_OUTBIT_A, { type: eElementType.type_con, value: 0b1000000000000000000000000000000 });
    this.automatic_symbols.set(SYMBOLS.P_MINUS3_A, { type: eElementType.type_con, value: 0b1010000000000000000000000000000 });
    this.automatic_symbols.set(SYMBOLS.P_MINUS2_A, { type: eElementType.type_con, value: 0b1100000000000000000000000000000 });
    this.automatic_symbols.set(SYMBOLS.P_MINUS1_A, { type: eElementType.type_con, value: 0b1110000000000000000000000000000 });

    this.automatic_symbols.set(SYMBOLS.P_TRUE_B, { type: eElementType.type_con, value: 0b0000000000000000000000000000 });
    this.automatic_symbols.set(SYMBOLS.P_INVERT_B, { type: eElementType.type_con, value: 0b1000000000000000000000000000 });

    this.automatic_symbols.set(SYMBOLS.P_LOCAL_B, { type: eElementType.type_con, value: 0b000000000000000000000000000 });
    this.automatic_symbols.set(SYMBOLS.P_PLUS1_B, { type: eElementType.type_con, value: 0b001000000000000000000000000 });
    this.automatic_symbols.set(SYMBOLS.P_PLUS2_B, { type: eElementType.type_con, value: 0b010000000000000000000000000 });
    this.automatic_symbols.set(SYMBOLS.P_PLUS3_B, { type: eElementType.type_con, value: 0b011000000000000000000000000 });
    this.automatic_symbols.set(SYMBOLS.P_OUTBIT_B, { type: eElementType.type_con, value: 0b100000000000000000000000000 });
    this.automatic_symbols.set(SYMBOLS.P_MINUS3_B, { type: eElementType.type_con, value: 0b101000000000000000000000000 });
    this.automatic_symbols.set(SYMBOLS.P_MINUS2_B, { type: eElementType.type_con, value: 0b110000000000000000000000000 });
    this.automatic_symbols.set(SYMBOLS.P_MINUS1_B, { type: eElementType.type_con, value: 0b111000000000000000000000000 });

    this.automatic_symbols.set(SYMBOLS.P_PASS_AB, { type: eElementType.type_con, value: 0b000000000000000000000000 });
    this.automatic_symbols.set(SYMBOLS.P_AND_AB, { type: eElementType.type_con, value: 0b001000000000000000000000 });
    this.automatic_symbols.set(SYMBOLS.P_OR_AB, { type: eElementType.type_con, value: 0b010000000000000000000000 });
    this.automatic_symbols.set(SYMBOLS.P_XOR_AB, { type: eElementType.type_con, value: 0b011000000000000000000000 });
    this.automatic_symbols.set(SYMBOLS.P_FILT0_AB, { type: eElementType.type_con, value: 0b100000000000000000000000 });
    this.automatic_symbols.set(SYMBOLS.P_FILT1_AB, { type: eElementType.type_con, value: 0b101000000000000000000000 });
    this.automatic_symbols.set(SYMBOLS.P_FILT2_AB, { type: eElementType.type_con, value: 0b110000000000000000000000 });
    this.automatic_symbols.set(SYMBOLS.P_FILT3_AB, { type: eElementType.type_con, value: 0b111000000000000000000000 });

    this.automatic_symbols.set(SYMBOLS.P_LOGIC_A, { type: eElementType.type_con, value: 0b000000000000000000000 });
    this.automatic_symbols.set(SYMBOLS.P_LOGIC_A_FB, { type: eElementType.type_con, value: 0b000100000000000000000 });
    this.automatic_symbols.set(SYMBOLS.P_LOGIC_B_FB, { type: eElementType.type_con, value: 0b001000000000000000000 });
    this.automatic_symbols.set(SYMBOLS.P_SCHMITT_A, { type: eElementType.type_con, value: 0b001100000000000000000 });
    this.automatic_symbols.set(SYMBOLS.P_SCHMITT_A_FB, { type: eElementType.type_con, value: 0b010000000000000000000 });
    this.automatic_symbols.set(SYMBOLS.P_SCHMITT_B_FB, { type: eElementType.type_con, value: 0b010100000000000000000 });
    this.automatic_symbols.set(SYMBOLS.P_COMPARE_AB, { type: eElementType.type_con, value: 0b011000000000000000000 });
    this.automatic_symbols.set(SYMBOLS.P_COMPARE_AB_FB, { type: eElementType.type_con, value: 0b011100000000000000000 });

    this.automatic_symbols.set(SYMBOLS.P_ADC_GIO, { type: eElementType.type_con, value: 0b100000000000000000000 });
    this.automatic_symbols.set(SYMBOLS.P_ADC_VIO, { type: eElementType.type_con, value: 0b100001000000000000000 });
    this.automatic_symbols.set(SYMBOLS.P_ADC_FLOAT, { type: eElementType.type_con, value: 0b100010000000000000000 });
    this.automatic_symbols.set(SYMBOLS.P_ADC_1X, { type: eElementType.type_con, value: 0b100011000000000000000 });
    this.automatic_symbols.set(SYMBOLS.P_ADC_3X, { type: eElementType.type_con, value: 0b100100000000000000000 });
    this.automatic_symbols.set(SYMBOLS.P_ADC_10X, { type: eElementType.type_con, value: 0b100101000000000000000 });
    this.automatic_symbols.set(SYMBOLS.P_ADC_30X, { type: eElementType.type_con, value: 0b100110000000000000000 });
    this.automatic_symbols.set(SYMBOLS.P_ADC_100X, { type: eElementType.type_con, value: 0b100111000000000000000 });

    this.automatic_symbols.set(SYMBOLS.P_DAC_990R_3V, { type: eElementType.type_con, value: 0b101000000000000000000 });
    this.automatic_symbols.set(SYMBOLS.P_DAC_600R_2V, { type: eElementType.type_con, value: 0b101010000000000000000 });
    this.automatic_symbols.set(SYMBOLS.P_DAC_124R_3V, { type: eElementType.type_con, value: 0b101100000000000000000 });
    this.automatic_symbols.set(SYMBOLS.P_DAC_75R_2V, { type: eElementType.type_con, value: 0b101110000000000000000 });

    this.automatic_symbols.set(SYMBOLS.P_LEVEL_A, { type: eElementType.type_con, value: 0b110000000000000000000 });
    this.automatic_symbols.set(SYMBOLS.P_LEVEL_A_FBN, { type: eElementType.type_con, value: 0b110100000000000000000 });
    this.automatic_symbols.set(SYMBOLS.P_LEVEL_B_FBP, { type: eElementType.type_con, value: 0b111000000000000000000 });
    this.automatic_symbols.set(SYMBOLS.P_LEVEL_B_FBN, { type: eElementType.type_con, value: 0b111100000000000000000 });

    this.automatic_symbols.set(SYMBOLS.P_ASYNC_IO, { type: eElementType.type_con, value: 0b00000000000000000 });
    this.automatic_symbols.set(SYMBOLS.P_SYNC_IO, { type: eElementType.type_con, value: 0b10000000000000000 });

    this.automatic_symbols.set(SYMBOLS.P_TRUE_IN, { type: eElementType.type_con, value: 0b0000000000000000 });
    this.automatic_symbols.set(SYMBOLS.P_INVERT_IN, { type: eElementType.type_con, value: 0b1000000000000000 });

    this.automatic_symbols.set(SYMBOLS.P_TRUE_OUTPUT, { type: eElementType.type_con, value: 0b000000000000000 }); // Added P_TRUE_OUT
    this.automatic_symbols.set(SYMBOLS.P_TRUE_OUT, { type: eElementType.type_con, value: 0b000000000000000 });
    this.automatic_symbols.set(SYMBOLS.P_INVERT_OUTPUT, { type: eElementType.type_con, value: 0b100000000000000 }); // Added P_INVERT_OUT
    this.automatic_symbols.set(SYMBOLS.P_INVERT_OUT, { type: eElementType.type_con, value: 0b100000000000000 });

    this.automatic_symbols.set(SYMBOLS.P_HIGH_FAST, { type: eElementType.type_con, value: 0b00000000000000 });
    this.automatic_symbols.set(SYMBOLS.P_HIGH_1K5, { type: eElementType.type_con, value: 0b00100000000000 });
    this.automatic_symbols.set(SYMBOLS.P_HIGH_15K, { type: eElementType.type_con, value: 0b01000000000000 });
    this.automatic_symbols.set(SYMBOLS.P_HIGH_150K, { type: eElementType.type_con, value: 0b01100000000000 });
    this.automatic_symbols.set(SYMBOLS.P_HIGH_1MA, { type: eElementType.type_con, value: 0b10000000000000 });
    this.automatic_symbols.set(SYMBOLS.P_HIGH_100UA, { type: eElementType.type_con, value: 0b10100000000000 });
    this.automatic_symbols.set(SYMBOLS.P_HIGH_10UA, { type: eElementType.type_con, value: 0b11000000000000 });
    this.automatic_symbols.set(SYMBOLS.P_HIGH_FLOAT, { type: eElementType.type_con, value: 0b11100000000000 });

    this.automatic_symbols.set(SYMBOLS.P_LOW_FAST, { type: eElementType.type_con, value: 0b00000000000 });
    this.automatic_symbols.set(SYMBOLS.P_LOW_1K5, { type: eElementType.type_con, value: 0b00100000000 });
    this.automatic_symbols.set(SYMBOLS.P_LOW_15K, { type: eElementType.type_con, value: 0b01000000000 });
    this.automatic_symbols.set(SYMBOLS.P_LOW_150K, { type: eElementType.type_con, value: 0b01100000000 });
    this.automatic_symbols.set(SYMBOLS.P_LOW_1MA, { type: eElementType.type_con, value: 0b10000000000 });
    this.automatic_symbols.set(SYMBOLS.P_LOW_100UA, { type: eElementType.type_con, value: 0b10100000000 });
    this.automatic_symbols.set(SYMBOLS.P_LOW_10UA, { type: eElementType.type_con, value: 0b11000000000 });
    this.automatic_symbols.set(SYMBOLS.P_LOW_FLOAT, { type: eElementType.type_con, value: 0b11100000000 });

    this.automatic_symbols.set(SYMBOLS.P_TT_00, { type: eElementType.type_con, value: 0b00000000 });
    this.automatic_symbols.set(SYMBOLS.P_TT_01, { type: eElementType.type_con, value: 0b01000000 });
    this.automatic_symbols.set(SYMBOLS.P_TT_10, { type: eElementType.type_con, value: 0b10000000 });
    this.automatic_symbols.set(SYMBOLS.P_TT_11, { type: eElementType.type_con, value: 0b11000000 });
    this.automatic_symbols.set(SYMBOLS.P_OE, { type: eElementType.type_con, value: 0b01000000 });
    this.automatic_symbols.set(SYMBOLS.P_CHANNEL, { type: eElementType.type_con, value: 0b01000000 });
    this.automatic_symbols.set(SYMBOLS.P_BITDAC, { type: eElementType.type_con, value: 0b10000000 });

    this.automatic_symbols.set(SYMBOLS.P_NORMAL, { type: eElementType.type_con, value: 0b000000 });
    this.automatic_symbols.set(SYMBOLS.P_REPOSITORY, { type: eElementType.type_con, value: 0b000010 });
    this.automatic_symbols.set(SYMBOLS.P_DAC_NOISE, { type: eElementType.type_con, value: 0b000010 });
    this.automatic_symbols.set(SYMBOLS.P_DAC_DITHER_RND, { type: eElementType.type_con, value: 0b000100 });
    this.automatic_symbols.set(SYMBOLS.P_DAC_DITHER_PWM, { type: eElementType.type_con, value: 0b000110 });
    this.automatic_symbols.set(SYMBOLS.P_PULSE, { type: eElementType.type_con, value: 0b001000 });
    this.automatic_symbols.set(SYMBOLS.P_TRANSITION, { type: eElementType.type_con, value: 0b001010 });
    this.automatic_symbols.set(SYMBOLS.P_NCO_FREQ, { type: eElementType.type_con, value: 0b001100 });
    this.automatic_symbols.set(SYMBOLS.P_NCO_DUTY, { type: eElementType.type_con, value: 0b001110 });
    this.automatic_symbols.set(SYMBOLS.P_PWM_TRIANGLE, { type: eElementType.type_con, value: 0b010000 });
    this.automatic_symbols.set(SYMBOLS.P_PWM_SAWTOOTH, { type: eElementType.type_con, value: 0b010010 });
    this.automatic_symbols.set(SYMBOLS.P_PWM_SMPS, { type: eElementType.type_con, value: 0b010100 });
    this.automatic_symbols.set(SYMBOLS.P_QUADRATURE, { type: eElementType.type_con, value: 0b010110 });
    this.automatic_symbols.set(SYMBOLS.P_REG_UP, { type: eElementType.type_con, value: 0b011000 });
    this.automatic_symbols.set(SYMBOLS.P_REG_UP_DOWN, { type: eElementType.type_con, value: 0b011010 });
    this.automatic_symbols.set(SYMBOLS.P_COUNT_RISES, { type: eElementType.type_con, value: 0b011100 });
    this.automatic_symbols.set(SYMBOLS.P_COUNT_HIGHS, { type: eElementType.type_con, value: 0b011110 });
    this.automatic_symbols.set(SYMBOLS.P_STATE_TICKS, { type: eElementType.type_con, value: 0b100000 });
    this.automatic_symbols.set(SYMBOLS.P_HIGH_TICKS, { type: eElementType.type_con, value: 0b100010 });
    this.automatic_symbols.set(SYMBOLS.P_EVENTS_TICKS, { type: eElementType.type_con, value: 0b100100 });
    this.automatic_symbols.set(SYMBOLS.P_PERIODS_TICKS, { type: eElementType.type_con, value: 0b100110 });
    this.automatic_symbols.set(SYMBOLS.P_PERIODS_HIGHS, { type: eElementType.type_con, value: 0b101000 });
    this.automatic_symbols.set(SYMBOLS.P_COUNTER_TICKS, { type: eElementType.type_con, value: 0b101010 });
    this.automatic_symbols.set(SYMBOLS.P_COUNTER_HIGHS, { type: eElementType.type_con, value: 0b101100 });
    this.automatic_symbols.set(SYMBOLS.P_COUNTER_PERIODS, { type: eElementType.type_con, value: 0b101110 });
    this.automatic_symbols.set(SYMBOLS.P_ADC, { type: eElementType.type_con, value: 0b110000 });
    this.automatic_symbols.set(SYMBOLS.P_ADC_EXT, { type: eElementType.type_con, value: 0b110010 });
    this.automatic_symbols.set(SYMBOLS.P_ADC_SCOPE, { type: eElementType.type_con, value: 0b110100 });
    this.automatic_symbols.set(SYMBOLS.P_USB_PAIR, { type: eElementType.type_con, value: 0b110110 });
    this.automatic_symbols.set(SYMBOLS.P_SYNC_TX, { type: eElementType.type_con, value: 0b111000 });
    this.automatic_symbols.set(SYMBOLS.P_SYNC_RX, { type: eElementType.type_con, value: 0b111010 });
    this.automatic_symbols.set(SYMBOLS.P_ASYNC_TX, { type: eElementType.type_con, value: 0b111100 });
    this.automatic_symbols.set(SYMBOLS.P_ASYNC_RX, { type: eElementType.type_con, value: 0b111110 });

    this.automatic_symbols.set(SYMBOLS.X_IMM_32X1_LUT, { type: eElementType.type_con, value: 0x00000000 }); // streamer constants
    this.automatic_symbols.set(SYMBOLS.X_IMM_16X2_LUT, { type: eElementType.type_con, value: 0x10000000 });
    this.automatic_symbols.set(SYMBOLS.X_IMM_8X4_LUT, { type: eElementType.type_con, value: 0x20000000 });
    this.automatic_symbols.set(SYMBOLS.X_IMM_4X8_LUT, { type: eElementType.type_con, value: 0x30000000 });

    this.automatic_symbols.set(SYMBOLS.X_IMM_32X1_1DAC1, { type: eElementType.type_con, value: 0x40000000 });
    this.automatic_symbols.set(SYMBOLS.X_IMM_16X2_2DAC1, { type: eElementType.type_con, value: 0x50000000 });
    this.automatic_symbols.set(SYMBOLS.X_IMM_16X2_1DAC2, { type: eElementType.type_con, value: 0x50020000 });
    this.automatic_symbols.set(SYMBOLS.X_IMM_8X4_4DAC1, { type: eElementType.type_con, value: 0x60000000 });
    this.automatic_symbols.set(SYMBOLS.X_IMM_8X4_2DAC2, { type: eElementType.type_con, value: 0x60020000 });
    this.automatic_symbols.set(SYMBOLS.X_IMM_8X4_1DAC4, { type: eElementType.type_con, value: 0x60040000 });
    this.automatic_symbols.set(SYMBOLS.X_IMM_4X8_4DAC2, { type: eElementType.type_con, value: 0x60060000 });
    this.automatic_symbols.set(SYMBOLS.X_IMM_4X8_2DAC4, { type: eElementType.type_con, value: 0x60070000 });
    this.automatic_symbols.set(SYMBOLS.X_IMM_4X8_1DAC8, { type: eElementType.type_con, value: 0x600e0000 });
    this.automatic_symbols.set(SYMBOLS.X_IMM_2X16_4DAC4, { type: eElementType.type_con, value: 0x600f0000 });
    this.automatic_symbols.set(SYMBOLS.X_IMM_2X16_2DAC8, { type: eElementType.type_con, value: 0x70000000 });
    this.automatic_symbols.set(SYMBOLS.X_IMM_1X32_4DAC8, { type: eElementType.type_con, value: 0x70010000 });

    this.automatic_symbols.set(SYMBOLS.X_RFLONG_32X1_LUT, { type: eElementType.type_con, value: 0x70020000 });
    this.automatic_symbols.set(SYMBOLS.X_RFLONG_16X2_LUT, { type: eElementType.type_con, value: 0x70040000 });
    this.automatic_symbols.set(SYMBOLS.X_RFLONG_8X4_LUT, { type: eElementType.type_con, value: 0x70060000 });
    this.automatic_symbols.set(SYMBOLS.X_RFLONG_4X8_LUT, { type: eElementType.type_con, value: 0x70080000 });

    this.automatic_symbols.set(SYMBOLS.X_RFBYTE_1P_1DAC1, { type: eElementType.type_con, value: 0x080000000 });
    this.automatic_symbols.set(SYMBOLS.X_RFBYTE_2P_2DAC1, { type: eElementType.type_con, value: 0x090000000 });
    this.automatic_symbols.set(SYMBOLS.X_RFBYTE_2P_1DAC2, { type: eElementType.type_con, value: 0x090020000 });
    this.automatic_symbols.set(SYMBOLS.X_RFBYTE_4P_4DAC1, { type: eElementType.type_con, value: 0x0a0000000 });
    this.automatic_symbols.set(SYMBOLS.X_RFBYTE_4P_2DAC2, { type: eElementType.type_con, value: 0x0a0020000 });
    this.automatic_symbols.set(SYMBOLS.X_RFBYTE_4P_1DAC4, { type: eElementType.type_con, value: 0x0a0040000 });
    this.automatic_symbols.set(SYMBOLS.X_RFBYTE_8P_4DAC2, { type: eElementType.type_con, value: 0x0a0060000 });
    this.automatic_symbols.set(SYMBOLS.X_RFBYTE_8P_2DAC4, { type: eElementType.type_con, value: 0x0a0070000 });
    this.automatic_symbols.set(SYMBOLS.X_RFBYTE_8P_1DAC8, { type: eElementType.type_con, value: 0x0a00e0000 });
    this.automatic_symbols.set(SYMBOLS.X_RFWORD_16P_4DAC4, { type: eElementType.type_con, value: 0x0a00f0000 });
    this.automatic_symbols.set(SYMBOLS.X_RFWORD_16P_2DAC8, { type: eElementType.type_con, value: 0x0b0000000 });
    this.automatic_symbols.set(SYMBOLS.X_RFLONG_32P_4DAC8, { type: eElementType.type_con, value: 0x0b0010000 });

    this.automatic_symbols.set(SYMBOLS.X_RFBYTE_LUMA8, { type: eElementType.type_con, value: 0x0b0020000 });
    this.automatic_symbols.set(SYMBOLS.X_RFBYTE_RGBI8, { type: eElementType.type_con, value: 0x0b0030000 });
    this.automatic_symbols.set(SYMBOLS.X_RFBYTE_RGB8, { type: eElementType.type_con, value: 0x0b0040000 });
    this.automatic_symbols.set(SYMBOLS.X_RFWORD_RGB16, { type: eElementType.type_con, value: 0x0b0050000 });
    this.automatic_symbols.set(SYMBOLS.X_RFLONG_RGB24, { type: eElementType.type_con, value: 0x0b0060000 });

    this.automatic_symbols.set(SYMBOLS.X_1P_1DAC1_WFBYTE, { type: eElementType.type_con, value: 0x0c0000000 });
    this.automatic_symbols.set(SYMBOLS.X_2P_2DAC1_WFBYTE, { type: eElementType.type_con, value: 0x0d0000000 });
    this.automatic_symbols.set(SYMBOLS.X_2P_1DAC2_WFBYTE, { type: eElementType.type_con, value: 0x0d0020000 });
    this.automatic_symbols.set(SYMBOLS.X_4P_4DAC1_WFBYTE, { type: eElementType.type_con, value: 0x0e0000000 });
    this.automatic_symbols.set(SYMBOLS.X_4P_2DAC2_WFBYTE, { type: eElementType.type_con, value: 0x0e0020000 });
    this.automatic_symbols.set(SYMBOLS.X_4P_1DAC4_WFBYTE, { type: eElementType.type_con, value: 0x0e0040000 });
    this.automatic_symbols.set(SYMBOLS.X_8P_4DAC2_WFBYTE, { type: eElementType.type_con, value: 0x0e0060000 });
    this.automatic_symbols.set(SYMBOLS.X_8P_2DAC4_WFBYTE, { type: eElementType.type_con, value: 0x0e0070000 });
    this.automatic_symbols.set(SYMBOLS.X_8P_1DAC8_WFBYTE, { type: eElementType.type_con, value: 0x0e00e0000 });
    this.automatic_symbols.set(SYMBOLS.X_16P_4DAC4_WFWORD, { type: eElementType.type_con, value: 0x0e00f0000 });
    this.automatic_symbols.set(SYMBOLS.X_16P_2DAC8_WFWORD, { type: eElementType.type_con, value: 0x0f0000000 });
    this.automatic_symbols.set(SYMBOLS.X_32P_4DAC8_WFLONG, { type: eElementType.type_con, value: 0x0f0010000 });

    this.automatic_symbols.set(SYMBOLS.X_1ADC8_0P_1DAC8_WFBYTE, { type: eElementType.type_con, value: 0x0f0020000 });
    this.automatic_symbols.set(SYMBOLS.X_1ADC8_8P_2DAC8_WFWORD, { type: eElementType.type_con, value: 0x0f0030000 });
    this.automatic_symbols.set(SYMBOLS.X_2ADC8_0P_2DAC8_WFWORD, { type: eElementType.type_con, value: 0x0f0040000 });
    this.automatic_symbols.set(SYMBOLS.X_2ADC8_16P_4DAC8_WFLONG, { type: eElementType.type_con, value: 0x0f0050000 });
    this.automatic_symbols.set(SYMBOLS.X_4ADC8_0P_4DAC8_WFLONG, { type: eElementType.type_con, value: 0x0f0060000 });

    this.automatic_symbols.set(SYMBOLS.X_DDS_GOERTZEL_SINC1, { type: eElementType.type_con, value: 0x0f0070000 });
    this.automatic_symbols.set(SYMBOLS.X_DDS_GOERTZEL_SINC2, { type: eElementType.type_con, value: 0x0f0870000 });

    this.automatic_symbols.set(SYMBOLS.X_DACS_OFF, { type: eElementType.type_con, value: 0x00000000 });
    this.automatic_symbols.set(SYMBOLS.X_DACS_0_0_0_0, { type: eElementType.type_con, value: 0x01000000 });
    this.automatic_symbols.set(SYMBOLS.X_DACS_X_X_0_0, { type: eElementType.type_con, value: 0x02000000 });
    this.automatic_symbols.set(SYMBOLS.X_DACS_0_0_X_X, { type: eElementType.type_con, value: 0x03000000 });
    this.automatic_symbols.set(SYMBOLS.X_DACS_X_X_X_0, { type: eElementType.type_con, value: 0x04000000 });
    this.automatic_symbols.set(SYMBOLS.X_DACS_X_X_0_X, { type: eElementType.type_con, value: 0x05000000 });
    this.automatic_symbols.set(SYMBOLS.X_DACS_X_0_X_X, { type: eElementType.type_con, value: 0x06000000 });
    this.automatic_symbols.set(SYMBOLS.X_DACS_0_X_X_X, { type: eElementType.type_con, value: 0x07000000 });
    this.automatic_symbols.set(SYMBOLS.X_DACS_0N0_0N0, { type: eElementType.type_con, value: 0x08000000 });
    this.automatic_symbols.set(SYMBOLS.X_DACS_X_X_0N0, { type: eElementType.type_con, value: 0x09000000 });
    this.automatic_symbols.set(SYMBOLS.X_DACS_0N0_X_X, { type: eElementType.type_con, value: 0x0a000000 });
    this.automatic_symbols.set(SYMBOLS.X_DACS_1_0_1_0, { type: eElementType.type_con, value: 0x0b000000 });
    this.automatic_symbols.set(SYMBOLS.X_DACS_X_X_1_0, { type: eElementType.type_con, value: 0x0c000000 });
    this.automatic_symbols.set(SYMBOLS.X_DACS_1_0_X_X, { type: eElementType.type_con, value: 0x0d000000 });
    this.automatic_symbols.set(SYMBOLS.X_DACS_1N1_0N0, { type: eElementType.type_con, value: 0x0e000000 });
    this.automatic_symbols.set(SYMBOLS.X_DACS_3_2_1_0, { type: eElementType.type_con, value: 0x0f000000 });

    this.automatic_symbols.set(SYMBOLS.X_PINS_OFF, { type: eElementType.type_con, value: 0x00000000 });
    this.automatic_symbols.set(SYMBOLS.X_PINS_ON, { type: eElementType.type_con, value: 0x00800000 });

    this.automatic_symbols.set(SYMBOLS.X_WRITE_OFF, { type: eElementType.type_con, value: 0x00000000 });
    this.automatic_symbols.set(SYMBOLS.X_WRITE_ON, { type: eElementType.type_con, value: 0x00800000 });

    this.automatic_symbols.set(SYMBOLS.X_ALT_OFF, { type: eElementType.type_con, value: 0x00000000 });
    this.automatic_symbols.set(SYMBOLS.X_ALT_ON, { type: eElementType.type_con, value: 0x00010000 });

    this.automatic_symbols.set(SYMBOLS.INT_OFF, { type: eElementType.type_con, value: 0 }); // event/interrupt constants
    this.automatic_symbols.set(SYMBOLS.EVENT_INT, { type: eElementType.type_con, value: 0 });
    this.automatic_symbols.set(SYMBOLS.EVENT_CT1, { type: eElementType.type_con, value: 1 });
    this.automatic_symbols.set(SYMBOLS.EVENT_CT2, { type: eElementType.type_con, value: 2 });
    this.automatic_symbols.set(SYMBOLS.EVENT_CT3, { type: eElementType.type_con, value: 3 });
    this.automatic_symbols.set(SYMBOLS.EVENT_SE1, { type: eElementType.type_con, value: 4 });
    this.automatic_symbols.set(SYMBOLS.EVENT_SE2, { type: eElementType.type_con, value: 5 });
    this.automatic_symbols.set(SYMBOLS.EVENT_SE3, { type: eElementType.type_con, value: 6 });
    this.automatic_symbols.set(SYMBOLS.EVENT_SE4, { type: eElementType.type_con, value: 7 });
    this.automatic_symbols.set(SYMBOLS.EVENT_PAT, { type: eElementType.type_con, value: 8 });
    this.automatic_symbols.set(SYMBOLS.EVENT_FBW, { type: eElementType.type_con, value: 9 });
    this.automatic_symbols.set(SYMBOLS.EVENT_XMT, { type: eElementType.type_con, value: 10 });
    this.automatic_symbols.set(SYMBOLS.EVENT_XFI, { type: eElementType.type_con, value: 11 });
    this.automatic_symbols.set(SYMBOLS.EVENT_XRO, { type: eElementType.type_con, value: 12 });
    this.automatic_symbols.set(SYMBOLS.EVENT_XRL, { type: eElementType.type_con, value: 13 });
    this.automatic_symbols.set(SYMBOLS.EVENT_ATN, { type: eElementType.type_con, value: 14 });
    this.automatic_symbols.set(SYMBOLS.EVENT_QMT, { type: eElementType.type_con, value: 15 });

    //
    // HAND generated Automatic symbols table load v43
    // ---------------------------------------------------------------------------------------
    this.automatic_symbols_v43.set(SYMBOLS_V43.LSTRING, { type: eElementType.type_conlstr, value: 0 });

    // Populate the reverse map
    for (const [fcValue, value] of this.flexcodeValues) {
      const bcValue: number = value & 0xff;
      this.byteCodeToFlexCodeMap.set(bcValue, fcValue);
    }
  }

  // Function to get fc_ value from bc_ value
  public getFlexcodeFromBytecode(bcValue: eByteCode): eFlexcode {
    this.logMessage(`* getFlexcodeFromBytecode(bc_=(${eByteCode[bcValue]}(${bcValue},${hexByte(bcValue, '0x')})`);
    let foundFlexCode: eFlexcode = 0;
    if (this.byteCodeToFlexCodeMap.has(bcValue)) {
      const tmpFlexCode: number | undefined = this.byteCodeToFlexCodeMap.get(bcValue);
      // AUGH!!! 0 value fails `if(tmpFlexCode)`!! -> converted to check explicitly for undefined!
      if (tmpFlexCode !== undefined) {
        foundFlexCode = tmpFlexCode;
      } else {
        //this.dumpFlexCodeMap();
        // [error_INTERNAL]
        throw new Error(`[INTERNAL] failed to located fc_ value for bc_ (${bcValue})[${eByteCode[bcValue]}]`);
      }
    }
    return foundFlexCode;
  }

  private dumpFlexCodeMap() {
    let tbleIdx: number = 0;
    for (const [bcValue, fcValue] of this.byteCodeToFlexCodeMap) {
      const fullFlexValue: number | undefined = this.flexcodeValues.get(fcValue);
      const flexValueInterp = fullFlexValue ? hexWord(fullFlexValue, '0x') : '??---??';
      this.logMessage(
        `- [${tbleIdx++}] fc=(${fcValue}, ${hexByte(fcValue, '0x')}), bc=(${bcValue}, ${hexByte(bcValue, '0x')}), [${eFlexcode[fcValue]}]=(${flexValueInterp})`
      );
    }
  }

  public enableLogging(enable: boolean = true) {
    // can pass false to disable
    this.isLogging = enable;
  }

  private logMessage(message: string): void {
    if (this.isLogging) {
      this.context.logger.logMessage(message);
    }
  }

  public setLangaugeVersion(currVersion: number) {
    this.logMessage(`- setLangaugeVersion() (${this.currSpinVersion}) -> (${currVersion})`);
    this.currSpinVersion = currVersion;
  }

  public builtInSymbol(symbolName: string): iSpinSymbol | undefined {
    let findResult: iSpinSymbol | undefined = undefined;

    if (this.currSpinVersion >= 43) {
      if (this.automatic_symbols_v43.has(symbolName)) {
        const symbolInfo: iBaseSymbolInfo | undefined = this.automatic_symbols_v43.get(symbolName);
        if (symbolInfo !== undefined) {
          this.logMessage(`- builtInSymbolV43(${symbolName}) = (${symbolInfo.value})`);
          findResult = { symbol: symbolName, type: symbolInfo.type, value: symbolInfo.value };
        }
      }
    }

    //const desiredName: string = symbolName.toUpperCase(); // the caller has already done this
    if (findResult === undefined && this.automatic_symbols.has(symbolName)) {
      const symbolInfo: iBaseSymbolInfo | undefined = this.automatic_symbols.get(symbolName);
      if (symbolInfo !== undefined) {
        this.logMessage(`- builtInSymbol(${symbolName}) = (${symbolInfo.value})`);
        findResult = { symbol: symbolName, type: symbolInfo.type, value: symbolInfo.value };
      }
    }
    return findResult;
  }

  public operatorSymbol(possibleOperator: string): iSpinSymbol | undefined {
    this.logMessage(`- Utils operatorSymbol(${possibleOperator})`);
    let findResult: iSpinSymbol | undefined = undefined;
    let searchString: string = possibleOperator.substring(0, 3); // only 1st three chars
    if (searchString.length > 2) {
      this.logMessage(`  --  searchString=[${searchString}]`);
      findResult = this.find_symbol_s3.find((symbol) => symbol.symbol === searchString);
    }
    if (findResult === undefined && searchString.length > 1) {
      searchString = possibleOperator.substring(0, 2);
      this.logMessage(`  --  searchString=[${searchString}]`);
      findResult = this.find_symbol_s2.find((symbol) => symbol.symbol === searchString);
    }
    if (findResult === undefined && searchString.length > 0) {
      searchString = possibleOperator.substring(0, 1);
      this.logMessage(`  --  searchString=[${searchString}]`);
      findResult = this.find_symbol_s1.find((symbol) => symbol.symbol === searchString);
    }
    return findResult;
  }

  public regressionInternalTableValuePairString(): string[] {
    const resultStrings: string[] = [];
    let kvPairs: iKeyValuePair[] = [];
    let stringList: string[] = [];
    //
    // now display our tables in this order
    // TABLE: ac_
    stringList = this.regressionAcValuePairStrings();
    this.addStringArPairsToResultStrings(stringList, resultStrings);
    // TABLE: bc_
    kvPairs = this.regressionFilterAndGetValue('bc_');
    this.addPairsToResultStrings(kvPairs, resultStrings);
    // TABLE: block_
    kvPairs = this.regressionFilterAndGetValue('block_');
    this.addPairsToResultStrings(kvPairs, resultStrings);
    // TABLE: dc_
    kvPairs = this.regressionFilterAndGetValue('dc_');
    this.addPairsToResultStrings(kvPairs, resultStrings);
    // TABLE: dd_
    kvPairs = this.regressionFilterAndGetValue('dd_');
    this.addPairsToResultStrings(kvPairs, resultStrings);
    // TABLE: dir_
    kvPairs = this.regressionFilterAndGetValue('dir_');
    this.addPairsToResultStrings(kvPairs, resultStrings);
    // TABLE: disop_
    kvPairs = this.regressionFilterAndGetValue('disop_');
    this.addPairsToResultStrings(kvPairs, resultStrings);
    // TABLE: fc_
    stringList = this.regressionFcValuePairStrings();
    this.addStringArPairsToResultStrings(stringList, resultStrings);
    // TABLE: if_
    kvPairs = this.regressionFilterAndGetValue('if_');
    this.addPairsToResultStrings(kvPairs, resultStrings);
    // TABLE: info_
    kvPairs = this.regressionFilterAndGetValue('info_');
    this.addPairsToResultStrings(kvPairs, resultStrings);
    // TABLE: oc_
    stringList = this.regressionOpValuePairStrings();
    this.addStringArPairsToResultStrings(stringList, resultStrings);
    // TABLE: op_
    kvPairs = this.regressionFilterAndGetValue('op_');
    this.addPairsToResultStrings(kvPairs, resultStrings);
    // TABLE: operand_
    kvPairs = this.regressionFilterAndGetValue('operand_');
    this.addPairsToResultStrings(kvPairs, resultStrings);
    // TABLE: pp_
    kvPairs = this.regressionFilterAndGetValue('pp_');
    this.addPairsToResultStrings(kvPairs, resultStrings);
    // TABLE: type_
    kvPairs = this.regressionFilterAndGetValue('type_');
    this.addPairsToResultStrings(kvPairs, resultStrings);
    // TABLE: unused1
    // TABLE: unused2
    return resultStrings;
  }

  private addPairsToResultStrings(pairs: iKeyValuePair[], resultStrings: string[]): void {
    for (const element of pairs) {
      const keyValuePair: string = this.regressionString(element.name, element.value);
      resultStrings.push(keyValuePair);
    }
    resultStrings.push('');
  }

  private addStringArPairsToResultStrings(pairs: string[], resultStrings: string[]): void {
    for (const keyValuePair of pairs) {
      resultStrings.push(keyValuePair);
    }
    resultStrings.push('');
  }

  public regressionAcValuePairStrings(): string[] {
    const resultStrings: string[] = [];
    const ac_keys: string[] = Object.keys(eAsmcode)
      .filter((key) => isNaN(Number(key)))
      .sort();
    for (const stringKey of ac_keys) {
      const enumKey = eAsmcode[stringKey as keyof typeof eAsmcode];
      const value: number | undefined = this.asmcodeValues.get(enumKey);
      //this.logMessage(`- got ${enumKey} = ${value}`);
      if (value) {
        resultStrings.push(this.regressionString(stringKey, value));
        //this.logMessage(`- returning [${newPair}]`);
      }
    }

    return resultStrings;
  }

  public regressionFcValuePairStrings(): string[] {
    const resultStrings: string[] = [];
    const ac_keys: string[] = Object.keys(eFlexcode)
      .filter((key) => isNaN(Number(key)))
      .sort();
    for (const stringKey of ac_keys) {
      const enumKey = eFlexcode[stringKey as keyof typeof eFlexcode];
      const value: number | undefined = this.flexcodeValues.get(enumKey);
      //this.logMessage(`- got ${enumKey} = ${value}`);
      if (value !== undefined) {
        resultStrings.push(this.regressionString(stringKey, value));
        //this.logMessage(`- returning [${newPair}]`);
      }
    }

    return resultStrings;
  }

  public regressionOpValuePairStrings(): string[] {
    const resultStrings: string[] = [];
    const ac_keys: string[] = Object.keys(eOpcode)
      .filter((key) => isNaN(Number(key)))
      .sort();
    for (const stringKey of ac_keys) {
      const enumKey = eOpcode[stringKey as keyof typeof eOpcode];
      const value: number | undefined = this.opcodeValues.get(enumKey);
      //this.logMessage(`- got ${enumKey} = ${value}`);
      if (value) {
        resultStrings.push(this.regressionString(stringKey, value));
        //this.logMessage(`- returning [${newPair}]`);
      }
    }
    return resultStrings;
  }

  private regressionFilterAndGetValue(prefix: string): iKeyValuePair[] {
    const result: iKeyValuePair[] = [];
    if (prefix == 'type_') {
      for (const key in eElementType) {
        if (Object.prototype.hasOwnProperty.call(eElementType, key) && key.startsWith(prefix)) {
          result.push({ name: key, value: eElementType[key as keyof typeof eElementType] });
        }
      }
    } else if (prefix == 'op_') {
      for (const key in eOperationType) {
        if (Object.prototype.hasOwnProperty.call(eOperationType, key) && key.startsWith(prefix)) {
          result.push({ name: key, value: eOperationType[key as keyof typeof eOperationType] });
        }
      }
    } else if (prefix == 'bc_') {
      for (const key in eByteCode) {
        if (Object.prototype.hasOwnProperty.call(eByteCode, key) && key.startsWith(prefix)) {
          result.push({ name: key, value: eByteCode[key as keyof typeof eByteCode] });
        }
      }
    } else {
      for (const key in eValueType) {
        if (Object.prototype.hasOwnProperty.call(eValueType, key) && key.startsWith(prefix)) {
          result.push({ name: key, value: eValueType[key as keyof typeof eValueType] });
        }
      }
    }
    result.sort((a, b) => a.name.localeCompare(b.name));
    return result;
  }

  private regressionString(name: string, value: number): string {
    const newPair: string = `${name}  0x${value.toString(16).toUpperCase().padStart(8, '0')}`;
    return newPair;
  }

  public opcodeValue(opcodeId: eOpcode): number {
    // retrieve the computed value for a given asmcode id
    let returnValue: number = 0;
    if (this.opcodeValues.has(opcodeId)) {
      const tmpReturnValue = this.opcodeValues.get(opcodeId);
      if (tmpReturnValue) {
        this.logMessage(`  --  opcodeValue(${opcodeId}) tmpReturnValue=[${tmpReturnValue}]`);
        returnValue = tmpReturnValue;
      }
    }
    return returnValue;
  }

  public asmcodeValue(asmcodeId: eAsmcode): number {
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

  public flexValue(flexId: eFlexcode): number {
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
export enum eAsmcode {
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
