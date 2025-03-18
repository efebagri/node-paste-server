const mysql = require('mysql2/promise');
const crypto = require('crypto');

class MySQLStorage {
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
        try {
            this.pool = mysql.createPool({
                host: process.env.DB_HOST,
                port: process.env.DB_PORT,
                user: process.env.DB_USERNAME,
                password: process.env.DB_PASSWORD,
                database: process.env.DB_DATABASE,
                waitForConnections: true,
                connectionLimit: 10,
                queueLimit: 0
            });

            const connection = await this.pool.getConnection();
            console.log('MySQL connection established successfully');

            await this.pool.execute(`
                CREATE TABLE IF NOT EXISTS paste_documents (
                                                               key_id VARCHAR(255) PRIMARY KEY,
                    delete_secret VARCHAR(255),
                    text LONGTEXT,
                    is_static BOOLEAN,
                    last_accessed_at TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    is_encrypted BOOLEAN DEFAULT FALSE
                    )
            `);

            await this.pool.execute(`
                CREATE INDEX IF NOT EXISTS idx_last_accessed
                    ON paste_documents(last_accessed_at)
            `);

            connection.release();
            console.log('MySQL tables prepared successfully');

        } catch (error) {
            console.error('MySQL Connection Error:', error);
            throw error;
        }
    }

    async save(key, deleteSecret, text, isStatic) {
        try {
            const processedText = this.encryptionEnabled ? this.encrypt(text) : text;

            const [result] = await this.pool.execute(
                'INSERT INTO paste_documents (key_id, delete_secret, text, is_static, last_accessed_at, is_encrypted) VALUES (?, ?, ?, ?, ?, ?)',
                [key, deleteSecret, processedText, isStatic ? 1 : 0, isStatic ? null : new Date(), this.encryptionEnabled]
            );
            return result.affectedRows === 1;
        } catch (error) {
            console.error('Failed to save document:', error);
            return false;
        }
    }

    async load(key) {
        try {
            const [rows] = await this.pool.execute(
                'SELECT * FROM paste_documents WHERE key_id = ?',
                [key]
            );

            if (rows.length === 0) return null;

            const document = rows[0];

            if (!document.is_static) {
                await this.pool.execute(
                    'UPDATE paste_documents SET last_accessed_at = ? WHERE key_id = ?',
                    [new Date(), key]
                );
            }

            // Versuche zu entschlüsseln wenn der Content verschlüsselt ist
            return document.is_encrypted ? this.decrypt(document.text) : document.text;
        } catch (error) {
            console.error('Failed to load document:', error);
            return null;
        }
    }

    async deleteBySecret(key, deleteSecret) {
        try {
            const [result] = await this.pool.execute(
                'DELETE FROM paste_documents WHERE key_id = ? AND delete_secret = ?',
                [key, deleteSecret]
            );
            return result.affectedRows === 1;
        } catch (error) {
            console.error('Failed to delete document:', error);
            return false;
        }
    }

    async delete(key) {
        try {
            const [result] = await this.pool.execute(
                'DELETE FROM paste_documents WHERE key_id = ?',
                [key]
            );
            return result.affectedRows === 1;
        } catch (error) {
            console.error('Failed to delete document:', error);
            return false;
        }
    }

    async cleanup() {
        if (this.pool) {
            try {
                await this.pool.end();
                console.log('MySQL connection closed');
            } catch (error) {
                console.error('Error closing MySQL connection:', error);
            }
        }
    }
}

module.exports = new MySQLStorage();