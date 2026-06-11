/**
 * A standard, self-contained SHA-256 hashing function in pure JavaScript/TypeScript.
 * This allows us to securely hash user passwords offline without relying on external native binaries.
 */
export function sha256(ascii: string): string {
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }

  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  const lengthProperty = 'length';
  let i, j; // Used as a loop index
  let result = '';

  const words: number[] = [];
  const asciiLength = ascii[lengthProperty];
  
  const hash: number[] = [];
  const k: number[] = [];
  
  const primeCounter = (candidate: number) => {
    for (let i = 2; i * i <= candidate; i++) {
      if (candidate % i === 0) return false;
    }
    return true;
  };

  let candidate = 2;
  let primeCount = 0;
  while (primeCount < 64) {
    if (primeCounter(candidate)) {
      if (primeCount < 8) {
        hash[primeCount] = (mathPow(candidate, 0.5) * maxWord) | 0;
      }
      k[primeCount] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
      primeCount++;
    }
    candidate++;
  }

  let str = ascii + '\x80';
  while ((str[lengthProperty] as any) % 64 - 56) {
    str += '\x00';
  }

  for (i = 0; i < str[lengthProperty]; i++) {
    const charCode = str.charCodeAt(i);
    if (charCode >> 8) return ''; // Only support ASCII
    words[i >> 2] |= charCode << (((3 - i) % 4) * 8);
  }

  words[words[lengthProperty]] = (asciiLength * 8) / maxWord | 0;
  words[words[lengthProperty]] = (asciiLength * 8) | 0;

  for (j = 0; j < words[lengthProperty]; ) {
    const w = words.slice(j, (j += 16));
    const oldHash = hash.slice(0);

    for (i = 0; i < 64; i++) {
      const wItem = w[i];
      // Expand the first 16 words into the remaining 48 words of the block
      const wI =
        i < 16
          ? wItem
          : (w[i] =
              (rightRotate(w[i - 2], 17) ^ rightRotate(w[i - 2], 19) ^ (w[i - 2] >>> 10)) +
              w[i - 7] +
              (rightRotate(w[i - 15], 7) ^ rightRotate(w[i - 15], 18) ^ (w[i - 15] >>> 3)) +
              w[i - 16] | 0);

      const s0 = rightRotate(oldHash[0], 2) ^ rightRotate(oldHash[0], 13) ^ rightRotate(oldHash[0], 22);
      const maj = (oldHash[0] & oldHash[1]) ^ (oldHash[0] & oldHash[2]) ^ (oldHash[1] & oldHash[2]);
      const t2 = s0 + maj;
      const s1 = rightRotate(oldHash[4], 6) ^ rightRotate(oldHash[4], 11) ^ rightRotate(oldHash[4], 25);
      const ch = (oldHash[4] & oldHash[5]) ^ (~oldHash[4] & oldHash[6]);
      const t1 = oldHash[7] + s1 + ch + k[i] + wI;

      oldHash[7] = oldHash[6];
      oldHash[6] = oldHash[5];
      oldHash[5] = oldHash[4];
      oldHash[4] = (oldHash[3] + t1) | 0;
      oldHash[3] = oldHash[2];
      oldHash[2] = oldHash[1];
      oldHash[1] = oldHash[0];
      oldHash[0] = (t1 + t2) | 0;
    }

    for (i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }

  for (i = 0; i < 8; i++) {
    for (j = 3; j >= 0; j--) {
      const byte = (hash[i] >> (j * 8)) & 255;
      result += (byte < 16 ? '0' : '') + byte.toString(16);
    }
  }
  return result;
}

/**
 * Encrypt/hash a password with a fixed salt to prevent simple rainbow table attacks on the local database.
 */
export function hashPassword(password: string): string {
  const salt = 'income_expense_tracker_salt_value_2026';
  return sha256(password + salt);
}

/**
 * Generate a cryptographically secure-ish random token offline.
 */
export function generateToken(): string {
  const rand = Math.random().toString(36).substring(2) + Date.now().toString();
  return sha256(rand);
}
