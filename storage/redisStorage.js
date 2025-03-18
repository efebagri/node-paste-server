const Redis = require('redis');
const { promisify } = require('util');
const crypto = require('crypto');

class RedisStorage {
    constructor() {
        this.client = Redis.createClient({
            url: `redis://:${process.env.REDIS_PASSWORD}@${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`
        });

        this.client.on('error', (err) => {
            console.error('Redis Client Error:', err);
        });

        this.encryptionEnabled = process.env.STORAGE_ENCRYPTION === 'true';

        this.encryptionKey = process.env.STORAGE_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');

        if (this.encryptionEnabled) {
            console.log('Encryption initialized successfully');
        } else {
            console.log('Encryption disabled - but can still decrypt existing content');
        }
    }

    encrypt(text) {
        if (!this.encryptionEnabled) return text;

        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(this.encryptionKey, 'hex'), iv);

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
                Buffer.from(this.encryptionKey, 'hex'),
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
        try {
            await this.client.connect();
            console.log('Redis connection established successfully');
        } catch (error) {
            console.error('Failed to connect to Redis:', error);
            throw error;
        }
    }

    async save(key, deleteSecret, text, isStatic) {
        try {
            const processedText = this.encryptionEnabled ? this.encrypt(text) : text;

            const document = {
                deleteSecret,
                text: processedText,
                isStatic: isStatic ? '1' : '0',
                lastAccessedAt: isStatic ? '' : Date.now().toString(),
                isEncrypted: this.encryptionEnabled ? '1' : '0'
            };

            await this.client.hSet(key, 'deleteSecret', document.deleteSecret);
            await this.client.hSet(key, 'text', document.text);
            await this.client.hSet(key, 'isStatic', document.isStatic);
            await this.client.hSet(key, 'lastAccessedAt', document.lastAccessedAt);
            await this.client.hSet(key, 'isEncrypted', document.isEncrypted);

            if (!isStatic) {
                await this.client.expire(key, parseInt(process.env.DOCUMENT_EXPIRE_MS) / 1000);
            }

            return true;
        } catch (error) {
            console.error("Failed to save document:", error);
            return false;
        }
    }

    async load(key) {
        try {
            const document = await this.client.hGetAll(key);

            if (!document || Object.keys(document).length === 0) {
                return null;
            }

            if (document.isStatic !== '1') {
                const now = Date.now().toString();
                await this.client.hSet(key, 'lastAccessedAt', now);
                await this.client.expire(key, parseInt(process.env.DOCUMENT_EXPIRE_MS) / 1000);
            }

            return document.isEncrypted === '1' ? this.decrypt(document.text) : document.text;
        } catch (error) {
            console.error("Failed to load document:", error);
            return null;
        }
    }

    async deleteBySecret(key, deleteSecret) {
        try {
            const storedSecret = await this.client.hGet(key, 'deleteSecret');

            if (!storedSecret) {
                return false;
            }

            if (storedSecret === deleteSecret) {
                await this.client.del(key);
                return true;
            }

            return false;
        } catch (error) {
            console.error("Failed to delete document:", error);
            return false;
        }
    }

    async delete(key) {
        try {
            await this.client.del(key);
            return true;
        } catch (error) {
            console.error("Failed to delete key:", error);
            return false;
        }
    }

    async cleanup() {
        try {
            await this.client.quit();
            console.log('Redis connection closed');
        } catch (error) {
            console.error('Error during Redis cleanup:', error);
        }
    }
}

module.exports = new RedisStorage();