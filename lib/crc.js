// js/lib

/*! crc32.js (C) 2014-present SheetJS -- http://sheetjs.com */
/* vim: set ts=2: */
var CRC32 = {};
CRC32.version = "1.2.3";
/*::
type CRC32Type = number;
type ABuf = Array<number> | Buffer | Uint8Array;
type CRC32TableType = Array<number> | Int32Array;
*/
/*global Int32Array */

// Genera una tabla de CRC32 con signo
function signed_crc_table() /*:CRC32TableType*/ {
  var c = 0,
    table /*:Array<number>*/ = new Array(256); 

  // Llena la tabla de CRC32
  for (var n = 0; n != 256; ++n) {
    c = n;
    // Realiza una serie de operaciones bitwise para generar los valores de la tabla
    c = c & 1 ? -306674912 ^ (c >>> 1) : c >>> 1;
    c = c & 1 ? -306674912 ^ (c >>> 1) : c >>> 1;
    c = c & 1 ? -306674912 ^ (c >>> 1) : c >>> 1;
    c = c & 1 ? -306674912 ^ (c >>> 1) : c >>> 1;
    c = c & 1 ? -306674912 ^ (c >>> 1) : c >>> 1;
    c = c & 1 ? -306674912 ^ (c >>> 1) : c >>> 1;
    c = c & 1 ? -306674912 ^ (c >>> 1) : c >>> 1;
    c = c & 1 ? -306674912 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }

  // Si el tipo Int32Array está disponible, convierte la tabla en un Int32Array para mejor rendimiento
  return typeof Int32Array !== "undefined" ? new Int32Array(table) : table;
}

var T0 = signed_crc_table(); // Genera la tabla de CRC32 y la almacena en T0

// Genera tablas "slice by 16" a partir de la tabla de CRC32 para acelerar el cálculo
function slice_by_16_tables(T) {
  var c = 0,
    v = 0,
    n = 0,
    table /*:Array<number>*/ =
      typeof Int32Array !== "undefined"
        ? new Int32Array(4096)
        : new Array(4096);  // Crea una tabla de 4096 elementos

  // Copia la tabla original en la primera porción de la nueva tabla
  for (n = 0; n != 256; ++n) table[n] = T[n];
  
  // Llena el resto de la tabla realizando operaciones bitwise
  for (n = 0; n != 256; ++n) {
    v = T[n];
    for (c = 256 + n; c < 4096; c += 256)
      v = table[c] = (v >>> 8) ^ T[v & 0xff];
  }
  
  // Divide la tabla en 16 sub-tablas y las devuelve en un array
  var out = [];
  for (n = 1; n != 16; ++n)
    out[n - 1] =
      typeof Int32Array !== "undefined"
        ? table.subarray(n * 256, n * 256 + 256)
        : table.slice(n * 256, n * 256 + 256);
  return out;
}

var TT = slice_by_16_tables(T0); // Genera las tablas "slice by 16" y las almacena en TT
// Asigna las sub-tablas a variables para su uso en los cálculos de CRC32
var T1 = TT[0],
  T2 = TT[1],
  T3 = TT[2],
  T4 = TT[3],
  T5 = TT[4];
var T6 = TT[5],
  T7 = TT[6],
  T8 = TT[7],
  T9 = TT[8],
  Ta = TT[9];
var Tb = TT[10],
  Tc = TT[11],
  Td = TT[12],
  Te = TT[13],
  Tf = TT[14];

// Función para calcular CRC32 de una cadena en formato binario
function crc32_bstr(bstr /*:string*/, seed /*:?CRC32Type*/) /*:CRC32Type*/ {
  var C = seed /*:: ? 0 : 0 */ ^ -1;
  for (var i = 0, L = bstr.length; i < L; )
    C = (C >>> 8) ^ T0[(C ^ bstr.charCodeAt(i++)) & 0xff];
  return ~C;
}

// Función para calcular CRC32 de un buffer
function crc32_buf(B /*:ABuf*/, seed /*:?CRC32Type*/) /*:CRC32Type*/ {
  var C = seed /*:: ? 0 : 0 */ ^ -1,
    L = B.length - 15,
    i = 0;
  // Procesa los bytes en bloques de 16 utilizando las tablas "slice by 16" para mayor eficiencia
  for (; i < L; )
    C =
      Tf[B[i++] ^ (C & 255)] ^
      Te[B[i++] ^ ((C >> 8) & 255)] ^
      Td[B[i++] ^ ((C >> 16) & 255)] ^
      Tc[B[i++] ^ (C >>> 24)] ^
      Tb[B[i++]] ^
      Ta[B[i++]] ^
      T9[B[i++]] ^
      T8[B[i++]] ^
      T7[B[i++]] ^
      T6[B[i++]] ^
      T5[B[i++]] ^
      T4[B[i++]] ^
      T3[B[i++]] ^
      T2[B[i++]] ^
      T1[B[i++]] ^
      T0[B[i++]];
  L += 15;
  // Procesa los bytes restantes
  while (i < L) C = (C >>> 8) ^ T0[(C ^ B[i++]) & 0xff];
  return ~C;
}

// Función para calcular CRC32 de una cadena
function crc32_str(str /*:string*/, seed /*:?CRC32Type*/) /*:CRC32Type*/ {
  var C = seed /*:: ? 0 : 0 */ ^ -1;
  for (var i = 0, L = str.length, c = 0, d = 0; i < L; ) {
    c = str.charCodeAt(i++);
    if (c < 0x80) {  // Procesa caracteres ASCII
      C = (C >>> 8) ^ T0[(C ^ c) & 0xff];
    } else if (c < 0x800) {  // Procesa caracteres UTF-8 de dos bytes
      C = (C >>> 8) ^ T0[(C ^ (192 | ((c >> 6) & 31))) & 0xff];
      C = (C >>> 8) ^ T0[(C ^ (128 | (c & 63))) & 0xff];
    } else if (c >= 0xd800 && c < 0xe000) {  // Procesa pares sustitutos para caracteres Unicode
      c = (c & 1023) + 64;
      d = str.charCodeAt(i++) & 1023;
      C = (C >>> 8) ^ T0[(C ^ (240 | ((c >> 8) & 7))) & 0xff];
      C = (C >>> 8) ^ T0[(C ^ (128 | ((c >> 2) & 63))) & 0xff];
      C = (C >>> 8) ^ T0[(C ^ (128 | ((d >> 6) & 15) | ((c & 3) << 4))) & 0xff];
      C = (C >>> 8) ^ T0[(C ^ (128 | (d & 63))) & 0xff];
    } else {  // Procesa caracteres UTF-8 de tres bytes
      C = (C >>> 8) ^ T0[(C ^ (224 | ((c >> 12) & 15))) & 0xff];
      C = (C >>> 8) ^ T0[(C ^ (128 | ((c >> 6) & 63))) & 0xff];
      C = (C >>> 8) ^ T0[(C ^ (128 | (c & 63))) & 0xff];
    }
  }
  return ~C;
}

// Exporta las funciones y datos relevantes
export const version = CRC32.version;  // Exporta la versión del CRC32
export const table = T0;  // Exporta la tabla CRC32
export const bstr = crc32_bstr;  // Exporta la función para calcular CRC32 de cadenas en formato binario
export const buf = crc32_buf;  // Exporta la función para calcular CRC32 de buffers
export const str = crc32_str;  // Exporta la función para calcular CRC32 de cadenas de texto
