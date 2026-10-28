import crypto from 'node:crypto';

/**
 * Generates a strong, unique random password satisfying all security requirements:
 * - Minimum 10 characters
 * - Uppercase letters
 * - Lowercase letters
 * - Numbers
 * - Special characters (!@#$%^&*)
 * Format example: CI#7kM!4xW8
 */
export function generateSecurePassword(length = 10) {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const symbols = '!@#$%^&*';
  const allChars = upper + lower + digits + symbols;

  const randomBytes = crypto.randomBytes(length);
  // Ensure at least one from each required character set
  let pass = [
    upper[randomBytes[0] % upper.length],
    lower[randomBytes[1] % lower.length],
    digits[randomBytes[2] % digits.length],
    symbols[randomBytes[3] % symbols.length],
  ];

  for (let i = 4; i < length; i++) {
    pass.push(allChars[randomBytes[i] % allChars.length]);
  }

  // Shuffle the characters
  pass = pass.sort(() => crypto.randomBytes(1)[0] - 128);
  return `CI#${pass.join('')}!`;
}

