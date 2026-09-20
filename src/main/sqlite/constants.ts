export const MAGIC_HEADER = Buffer.from("ADAUSQL1", "utf-8"); // 8 bytes
export const PBKDF2_ITERATIONS = 100_000;
export const KEY_LEN = 32; // 256 bits
export const SALT_LEN = 32; // 256 bits
export const IV_LEN = 12; // 96 bits for GCM
export const TAG_LEN = 16; // 128-bit auth tag
