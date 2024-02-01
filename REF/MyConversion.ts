import { eElementType, eValueType } from './types';

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
  EVENT_QMT = 'EVENT_QMT',
}

class MyClass {
  private automatic_symbols = new Map<string, [eElementType, eValueType, SYMBOLS]>();

  constructor() {

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

    this.automatic_symbols.set(SYMBOLS.PR0, [eElementType.type_register, eValueType.pasm_regs+0]); // pasm regs
    this.automatic_symbols.set(SYMBOLS.PR1, [eElementType.type_register, eValueType.pasm_regs+1]);
    this.automatic_symbols.set(SYMBOLS.PR2, [eElementType.type_register, eValueType.pasm_regs+2]);
    this.automatic_symbols.set(SYMBOLS.PR3, [eElementType.type_register, eValueType.pasm_regs+3]);
    this.automatic_symbols.set(SYMBOLS.PR4, [eElementType.type_register, eValueType.pasm_regs+4]);
    this.automatic_symbols.set(SYMBOLS.PR5, [eElementType.type_register, eValueType.pasm_regs+5]);
    this.automatic_symbols.set(SYMBOLS.PR6, [eElementType.type_register, eValueType.pasm_regs+6]);
    this.automatic_symbols.set(SYMBOLS.PR7, [eElementType.type_register, eValueType.pasm_regs+7]);

    this.automatic_symbols.set(SYMBOLS.IJMP3, [eElementType.type_register, 0x1F0]); // interrupt vectors
    this.automatic_symbols.set(SYMBOLS.IRET3, [eElementType.type_register, 0x1F1]);
    this.automatic_symbols.set(SYMBOLS.IJMP2, [eElementType.type_register, 0x1F2]);
    this.automatic_symbols.set(SYMBOLS.IRET2, [eElementType.type_register, 0x1F3]);
    this.automatic_symbols.set(SYMBOLS.IJMP1, [eElementType.type_register, 0x1F4]);
    this.automatic_symbols.set(SYMBOLS.IRET1, [eElementType.type_register, 0x1F5]);
    this.automatic_symbols.set(SYMBOLS.PA, [eElementType.type_register, 0x1F6]); // calld/loc targets
    this.automatic_symbols.set(SYMBOLS.PB, [eElementType.type_register, 0x1F7]);
    this.automatic_symbols.set(SYMBOLS.PTRA, [eElementType.type_register, 0x1F8]); // special function registers
    this.automatic_symbols.set(SYMBOLS.PTRB, [eElementType.type_register, 0x1F9]);
    this.automatic_symbols.set(SYMBOLS.DIRA, [eElementType.type_register, 0x1FA]);
    this.automatic_symbols.set(SYMBOLS.DIRB, [eElementType.type_register, 0x1FB]);
    this.automatic_symbols.set(SYMBOLS.OUTA, [eElementType.type_register, 0x1FC]);
    this.automatic_symbols.set(SYMBOLS.OUTB, [eElementType.type_register, 0x1FD]);
    this.automatic_symbols.set(SYMBOLS.INA, [eElementType.type_register, 0x1FE]);
    this.automatic_symbols.set(SYMBOLS.INB, [eElementType.type_register, 0x1FF]);


    this.automatic_symbols.set(SYMBOLS.CLKMODE, [eElementType.type_hub_long, 0x00040]); // spin permanent variables
    this.automatic_symbols.set(SYMBOLS.CLKFREQ, [eElementType.type_hub_long, 0x00044]);

    this.automatic_symbols.set(SYMBOLS.VARBASE, [eElementType.type_var_long, 0]);


    this.automatic_symbols.set(SYMBOLS.FALSE, [eElementType.type_con, 0]); // numeric constants
    this.automatic_symbols.set(SYMBOLS.TRUE, [eElementType.type_con, 0x0FFFFFFFF]);
    this.automatic_symbols.set(SYMBOLS.NEGX, [eElementType.type_con, 0x80000000]);
    this.automatic_symbols.set(SYMBOLS.POSX, [eElementType.type_con, 0x7FFFFFFF]);
    this.automatic_symbols.set(SYMBOLS.PI, [eElementType.type_con_float, 0x40490FDB]);


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
    this.automatic_symbols.set(SYMBOLS.X_IMM_4X8_1DAC8, [eElementType.type_con, 0x600E0000]);
    this.automatic_symbols.set(SYMBOLS.X_IMM_2X16_4DAC4, [eElementType.type_con, 0x600F0000]);
    this.automatic_symbols.set(SYMBOLS.X_IMM_2X16_2DAC8, [eElementType.type_con, 0x70000000]);
    this.automatic_symbols.set(SYMBOLS.X_IMM_1X32_4DAC8, [eElementType.type_con, 0x70010000]);

    this.automatic_symbols.set(SYMBOLS.X_RFLONG_32X1_LUT, [eElementType.type_con, 0x70020000]);
    this.automatic_symbols.set(SYMBOLS.X_RFLONG_16X2_LUT, [eElementType.type_con, 0x70040000]);
    this.automatic_symbols.set(SYMBOLS.X_RFLONG_8X4_LUT, [eElementType.type_con, 0x70060000]);
    this.automatic_symbols.set(SYMBOLS.X_RFLONG_4X8_LUT, [eElementType.type_con, 0x70080000]);

    this.automatic_symbols.set(SYMBOLS.X_RFBYTE_1P_1DAC1, [eElementType.type_con, 0x080000000]);
    this.automatic_symbols.set(SYMBOLS.X_RFBYTE_2P_2DAC1, [eElementType.type_con, 0x090000000]);
    this.automatic_symbols.set(SYMBOLS.X_RFBYTE_2P_1DAC2, [eElementType.type_con, 0x090020000]);
    this.automatic_symbols.set(SYMBOLS.X_RFBYTE_4P_4DAC1, [eElementType.type_con, 0x0A0000000]);
    this.automatic_symbols.set(SYMBOLS.X_RFBYTE_4P_2DAC2, [eElementType.type_con, 0x0A0020000]);
    this.automatic_symbols.set(SYMBOLS.X_RFBYTE_4P_1DAC4, [eElementType.type_con, 0x0A0040000]);
    this.automatic_symbols.set(SYMBOLS.X_RFBYTE_8P_4DAC2, [eElementType.type_con, 0x0A0060000]);
    this.automatic_symbols.set(SYMBOLS.X_RFBYTE_8P_2DAC4, [eElementType.type_con, 0x0A0070000]);
    this.automatic_symbols.set(SYMBOLS.X_RFBYTE_8P_1DAC8, [eElementType.type_con, 0x0A00E0000]);
    this.automatic_symbols.set(SYMBOLS.X_RFWORD_16P_4DAC4, [eElementType.type_con, 0x0A00F0000]);
    this.automatic_symbols.set(SYMBOLS.X_RFWORD_16P_2DAC8, [eElementType.type_con, 0x0B0000000]);
    this.automatic_symbols.set(SYMBOLS.X_RFLONG_32P_4DAC8, [eElementType.type_con, 0x0B0010000]);

    this.automatic_symbols.set(SYMBOLS.X_RFBYTE_LUMA8, [eElementType.type_con, 0x0B0020000]);
    this.automatic_symbols.set(SYMBOLS.X_RFBYTE_RGBI8, [eElementType.type_con, 0x0B0030000]);
    this.automatic_symbols.set(SYMBOLS.X_RFBYTE_RGB8, [eElementType.type_con, 0x0B0040000]);
    this.automatic_symbols.set(SYMBOLS.X_RFWORD_RGB16, [eElementType.type_con, 0x0B0050000]);
    this.automatic_symbols.set(SYMBOLS.X_RFLONG_RGB24, [eElementType.type_con, 0x0B0060000]);

    this.automatic_symbols.set(SYMBOLS.X_1P_1DAC1_WFBYTE, [eElementType.type_con, 0x0C0000000]);
    this.automatic_symbols.set(SYMBOLS.X_2P_2DAC1_WFBYTE, [eElementType.type_con, 0x0D0000000]);
    this.automatic_symbols.set(SYMBOLS.X_2P_1DAC2_WFBYTE, [eElementType.type_con, 0x0D0020000]);
    this.automatic_symbols.set(SYMBOLS.X_4P_4DAC1_WFBYTE, [eElementType.type_con, 0x0E0000000]);
    this.automatic_symbols.set(SYMBOLS.X_4P_2DAC2_WFBYTE, [eElementType.type_con, 0x0E0020000]);
    this.automatic_symbols.set(SYMBOLS.X_4P_1DAC4_WFBYTE, [eElementType.type_con, 0x0E0040000]);
    this.automatic_symbols.set(SYMBOLS.X_8P_4DAC2_WFBYTE, [eElementType.type_con, 0x0E0060000]);
    this.automatic_symbols.set(SYMBOLS.X_8P_2DAC4_WFBYTE, [eElementType.type_con, 0x0E0070000]);
    this.automatic_symbols.set(SYMBOLS.X_8P_1DAC8_WFBYTE, [eElementType.type_con, 0x0E00E0000]);
    this.automatic_symbols.set(SYMBOLS.X_16P_4DAC4_WFWORD, [eElementType.type_con, 0x0E00F0000]);
    this.automatic_symbols.set(SYMBOLS.X_16P_2DAC8_WFWORD, [eElementType.type_con, 0x0F0000000]);
    this.automatic_symbols.set(SYMBOLS.X_32P_4DAC8_WFLONG, [eElementType.type_con, 0x0F0010000]);

    this.automatic_symbols.set(SYMBOLS.X_1ADC8_0P_1DAC8_WFBYTE, [eElementType.type_con, 0x0F0020000]);
    this.automatic_symbols.set(SYMBOLS.X_1ADC8_8P_2DAC8_WFWORD, [eElementType.type_con, 0x0F0030000]);
    this.automatic_symbols.set(SYMBOLS.X_2ADC8_0P_2DAC8_WFWORD, [eElementType.type_con, 0x0F0040000]);
    this.automatic_symbols.set(SYMBOLS.X_2ADC8_16P_4DAC8_WFLONG, [eElementType.type_con, 0x0F0050000]);
    this.automatic_symbols.set(SYMBOLS.X_4ADC8_0P_4DAC8_WFLONG, [eElementType.type_con, 0x0F0060000]);

    this.automatic_symbols.set(SYMBOLS.X_DDS_GOERTZEL_SINC1, [eElementType.type_con, 0x0F0070000]);
    this.automatic_symbols.set(SYMBOLS.X_DDS_GOERTZEL_SINC2, [eElementType.type_con, 0x0F0870000]);

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
    this.automatic_symbols.set(SYMBOLS.X_DACS_0N0_X_X, [eElementType.type_con, 0x0A000000]);
    this.automatic_symbols.set(SYMBOLS.X_DACS_1_0_1_0, [eElementType.type_con, 0x0B000000]);
    this.automatic_symbols.set(SYMBOLS.X_DACS_X_X_1_0, [eElementType.type_con, 0x0C000000]);
    this.automatic_symbols.set(SYMBOLS.X_DACS_1_0_X_X, [eElementType.type_con, 0x0D000000]);
    this.automatic_symbols.set(SYMBOLS.X_DACS_1N1_0N0, [eElementType.type_con, 0x0E000000]);
    this.automatic_symbols.set(SYMBOLS.X_DACS_3_2_1_0, [eElementType.type_con, 0x0F000000]);

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
}
