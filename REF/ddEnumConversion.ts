// generated opcode table load

export enum eDdValues {


// 
// 
// ************************************************************************
// *  DEBUG Display Parser                        *
// ************************************************************************
// 
  dd_end = 0, // (0x00)   end of line	elements
  dd_dis = 1, // (0x01)   display type
  dd_nam = 2, // (0x02)   display name
  dd_key = 3, // (0x03)   display command
  dd_num = 4, // (0x04)   number, $num/%num/num
  dd_str = 5, // (0x05)   string, 'text'
  dd_unk = 6, // (0x06)   unknown symbol

  dd_dis_logic = 0, // (0x00)   LOGIC		displays
  dd_dis_scope = 1, // (0x01)   SCOPE
  dd_dis_scope_xy = 2, // (0x02)   SCOPE_XY
  dd_dis_fft = 3, // (0x03)   FFT
  dd_dis_spectro = 4, // (0x04)   SPECTRO
  dd_dis_plot = 5, // (0x05)   PLOT
  dd_dis_term = 6, // (0x06)   TERM
  dd_dis_bitmap = 7, // (0x07)   BITMAP
  dd_dis_midi = 8, // (0x08)   MIDI

  dd_key_black = 0, // (0x00)   BLACK		color group
  dd_key_white = 1, // (0x01)   WHITE
  dd_key_orange = 2, // (0x02)   ORANGE
  dd_key_blue = 3, // (0x03)   BLUE
  dd_key_green = 4, // (0x04)   GREEN
  dd_key_cyan = 5, // (0x05)   CYAN
  dd_key_red = 6, // (0x06)   RED
  dd_key_magenta = 7, // (0x07)   MAGENTA
  dd_key_yellow = 8, // (0x08)   YELLOW
  dd_key_gray = 9, // (0x09)   GRAY

  dd_key_lut1 = 10, // (0x0a)   LUT1		color-mode group
  dd_key_lut2 = 11, // (0x0b)   LUT2
  dd_key_lut4 = 12, // (0x0c)   LUT4
  dd_key_lut8 = 13, // (0x0d)   LUT8
  dd_key_luma8 = 14, // (0x0e)   LUMA8
  dd_key_luma8w = 15, // (0x0f)   LUMA8W
  dd_key_luma8x = 16, // (0x10)   LUMA8X
  dd_key_hsv8 = 17, // (0x11)   HSV8
  dd_key_hsv8w = 18, // (0x12)   HSV8W
  dd_key_hsv8x = 19, // (0x13)   HSV8X
  dd_key_rgbi8 = 20, // (0x14)   RGBI8
  dd_key_rgbi8w = 21, // (0x15)   RGBI8W
  dd_key_rgbi8x = 22, // (0x16)   RGBI8X
  dd_key_rgb8 = 23, // (0x17)   RGB8
  dd_key_hsv16 = 24, // (0x18)   HSV16
  dd_key_hsv16w = 25, // (0x19)   HSV16W
  dd_key_hsv16x = 26, // (0x1a)   HSV16X
  dd_key_rgb16 = 27, // (0x1b)   RGB16
  dd_key_rgb24 = 28, // (0x1c)   RGB24

  dd_key_longs_1bit = 29, // (0x1d)   LONGS_1BIT	pack-data group
  dd_key_longs_2bit = 30, // (0x1e)   LONGS_2BIT
  dd_key_longs_4bit = 31, // (0x1f)   LONGS_4BIT
  dd_key_longs_8bit = 32, // (0x20)   LONGS_8BIT
  dd_key_longs_16bit = 33, // (0x21)   LONGS_16BIT
  dd_key_words_1bit = 34, // (0x22)   WORDS_1BIT
  dd_key_words_2bit = 35, // (0x23)   WORDS_2BIT
  dd_key_words_4bit = 36, // (0x24)   WORDS_4BIT
  dd_key_words_8bit = 37, // (0x25)   WORDS_8BIT
  dd_key_bytes_1bit = 38, // (0x26)   BYTES_1BIT
  dd_key_bytes_2bit = 39, // (0x27)   BYTES_2BIT
  dd_key_bytes_4bit = 40, // (0x28)   BYTES_4BIT

  dd_key_alt = 41, // (0x29)   ALT		keywords
  dd_key_auto = 42, // (0x2a)   AUTO
  dd_key_backcolor = 43, // (0x2b)   BACKCOLOR
  dd_key_box = 44, // (0x2c)   BOX
  dd_key_cartesian = 45, // (0x2d)   CARTESIAN
  dd_key_channel = 46, // (0x2e)   CHANNEL
  dd_key_circle = 47, // (0x2f)   CIRCLE
  dd_key_clear = 48, // (0x30)   CLEAR
  dd_key_close = 49, // (0x31)   CLOSE
  dd_key_color = 50, // (0x32)   COLOR
  dd_key_depth = 51, // (0x33)   DEPTH
  dd_key_dot = 52, // (0x34)   DOT
  dd_key_dotsize = 53, // (0x35)   DOTSIZE
  dd_key_hidexy = 54, // (0x36)   HIDEXY
  dd_key_holdoff = 55, // (0x37)   HOLDOFF
  dd_key_line = 56, // (0x38)   LINE
  dd_key_linesize = 57, // (0x39)   LINESIZE
  dd_key_logscale = 58, // (0x3a)   LOGSCALE
  dd_key_lutcolors = 59, // (0x3b)   LUTCOLORS
  dd_key_mag = 60, // (0x3c)   MAG
  dd_key_obox = 61, // (0x3d)   OBOX
  dd_key_opacity = 62, // (0x3e)   OPACITY
  dd_key_origin = 63, // (0x3f)   ORIGIN
  dd_key_oval = 64, // (0x40)   OVAL
  dd_key_pc_key = 65, // (0x41)   PC_KEY
  dd_key_pc_mouse = 66, // (0x42)   PC_MOUSE
  dd_key_polar = 67, // (0x43)   POLAR
  dd_key_pos = 68, // (0x44)   POS
  dd_key_precise = 69, // (0x45)   PRECISE
  dd_key_range = 70, // (0x46)   RANGE
  dd_key_rate = 71, // (0x47)   RATE
  dd_key_samples = 72, // (0x48)   SAMPLES
  dd_key_save = 73, // (0x49)   SAVE
  dd_key_scroll = 74, // (0x4a)   SCROLL
  dd_key_set = 75, // (0x4b)   SET
  dd_key_signed = 76, // (0x4c)   SIGNED
  dd_key_size = 77, // (0x4d)   SIZE
  dd_key_spacing = 78, // (0x4e)   SPACING
  dd_key_sparse = 79, // (0x4f)   SPARSE
  dd_key_sprite = 80, // (0x50)   SPRITE
  dd_key_spritedef = 81, // (0x51)   SPRITEDEF
  dd_key_text = 82, // (0x52)   TEXT
  dd_key_textangle = 83, // (0x53)   TEXTANGLE
  dd_key_textsize = 84, // (0x54)   TEXTSIZE
  dd_key_textstyle = 85, // (0x55)   TEXTSTYLE
  dd_key_title = 86, // (0x56)   TITLE
  dd_key_trace = 87, // (0x57)   TRACE
  dd_key_trigger = 88, // (0x58)   TRIGGER
  dd_key_update = 89, // (0x59)   UPDATE
  dd_key_window = 90, // (0x5a)   WINDOW
}

