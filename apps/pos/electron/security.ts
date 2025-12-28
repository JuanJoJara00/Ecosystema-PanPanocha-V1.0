import { safeStorage, app } from 'electron';

export const SecurityManager = {
    /**
     * Encrypts a string using Electron's native safeStorage.
     * Returns a base64 encoded string.
     */
    encrypt: (plainText: string): string => {
        if (!safeStorage.isEncryptionAvailable()) {
            throw new Error("Encryption is not available on this system.");
        }
        const buffer = safeStorage.encryptString(plainText);
        return buffer.toString('base64');
    },

    /**
     * Decrypts a base64 encoded string using Electron's native safeStorage.
     */
    decrypt: (encryptedBase64: string): string => {
        if (!safeStorage.isEncryptionAvailable()) {
            throw new Error("Encryption is not available on this system.");
        }
        const buffer = Buffer.from(encryptedBase64, 'base64');
        return safeStorage.decryptString(buffer);
    },

    /**
     * Checks if encryption is available
     */
    isAvailable: (): boolean => {
        return safeStorage.isEncryptionAvailable();
    }
};
