import { Transform } from "stream";
import { applyStreamCipher, applyStreamCipherInPlace } from "../native_cipher";

export class CipherTransform extends Transform {
  private offset: number;

  constructor(startOffset: number) {
    super();
    this.offset = startOffset;
  }

  _transform(chunk: Buffer, _encoding: string, callback: () => void) {
    const masked = applyStreamCipher(chunk, this.offset);
    this.offset += chunk.length;
    this.push(masked);
    callback();
  }
}

export { applyStreamCipher, applyStreamCipherInPlace };
