const fs = require("fs");
const crypto = require("crypto");

class FileStorage {
    constructor() {
        this.encryptionEnabled = process.env.STORAGE_ENCRYPTION === 'true';

        if (process.env.STORAGE_ENCRYPTION_KEY) {
            this.encryptionKey = Buffer.from(process.env.STORAGE_ENCRYPTION_KEY, 'hex');
        } else {
            this.encryptionKey = crypto.randomBytes(32);
        }

        if (this.encryptionKey.length !== 32) {
            throw new Error('Encryption key must be exactly 32 bytes (256 bits)');
        }

        if (this.encryptionEnabled) {
            console.log('Encryption initialized successfully');
        } else {
            console.log('Encryption disabled - but can still decrypt existing content');
        }
    }

    encrypt(text) {
        if (!this.encryptionEnabled) return text;

        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);

        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        const authTag = cipher.getAuthTag();

        return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    }

    decrypt(encryptedData) {
        try {
            if (!encryptedData.includes(':')) {
                return encryptedData;
            }

            const [ivHex, authTagHex, encryptedText] = encryptedData.split(':');

            const decipher = crypto.createDecipheriv(
                'aes-256-gcm',
                this.encryptionKey,
                Buffer.from(ivHex, 'hex')
            );

            decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));

            let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
            decrypted += decipher.final('utf8');

            return decrypted;
        } catch (error) {
            console.error('Decryption failed:', error);
            return encryptedData;
        }
    }

    async prepare() {
        this.path = process.env.STORAGE_PATH;
        if (!fs.existsSync(this.path)) {
            fs.mkdir(this.path, error => {
                if (error) {
                    console.error("Failed to mkdir folder.", error);
                }
            });
        }
        console.log('Local File Storage successfully');
    }

    hashKey(key) {
        return crypto.createHash("sha256").update(key).digest("hex");
    }

    save(key, deleteSecret, text, isStatic) {
        key = this.hashKey(key);
        const processedText = this.encrypt(text);

        const self = this;
        return new Promise(resolve => {
            fs.writeFile(self.path + "/" + key,
                JSON.stringify({
                    deleteSecret,
                    text: processedText,
                    isStatic,
                    isEncrypted: this.encryptionEnabled
                }), error => {
                    if (error) {
                        console.error("Failed to save document.", error);
                        resolve(false);
                    } else {
                        resolve(true);
                    }
                }
            );
        });
    }

    load(key) {
        key = this.hashKey(key);

        const self = this;
        return new Promise(resolve => {
            const documentPath = self.path + "/" + key;
            if (fs.existsSync(documentPath)) {
                fs.readFile(documentPath, (error, data) => {
                    if (error) {
                        console.error("Failed to load document.", error);
                        resolve(null);
                    } else {
                        try {
                            const document = JSON.parse(data.toString("utf8"));
                            const text = document.isEncrypted ? this.decrypt(document.text) : document.text;
                            resolve(text);
                        } catch (error) {
                            console.error("Failed to load document.", error);
                            resolve(null);
                        }
                    }
                });
            } else {
                resolve(null);
            }
        });
    }

    deleteBySecret(key, deleteSecret) {
        key = this.hashKey(key);

        const self = this;
        return new Promise(resolve => {
            const documentPath = self.path + "/" + key;
            if (fs.existsSync(documentPath)) {
                fs.readFile(documentPath, (error, data) => {
                    if (error) {
                        console.error("Failed to load document.", error);
                        resolve(false);
                    } else {
                        try {
                            const document = JSON.parse(data.toString("utf8"));
                            if (document.deleteSecret === deleteSecret) {
                                fs.unlink(documentPath, unlinkError => {
                                    if (unlinkError) {
                                        console.error("Failed to delete document.", unlinkError);
                                        resolve(false);
                                    } else {
                                        resolve(true);
                                    }
                                });
                            } else {
                                resolve(false);
                            }
                        } catch (error) {
                            console.error("Failed to delete document.", error);
                            resolve(false);
                        }
                    }
                });
            } else {
                resolve(false);
            }
        });
    }

    delete(key) {
        key = this.hashKey(key);

        const self = this;
        return new Promise(resolve => {
            const documentPath = self.path + "/" + key;
            if (fs.existsSync(documentPath)) {
                fs.unlink(documentPath, unlinkError => {
                    if (unlinkError) {
                        console.error("Failed to delete document.", unlinkError);
                        resolve(false);
                    } else {
                        resolve(true);
                    }
                });
            } else {
                resolve(false);
            }
        });
    }
}

module.exports = FileStorage;