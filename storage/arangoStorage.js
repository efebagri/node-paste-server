const { Database } = require("arangojs");
const Redis = require('redis');
const { promisify } = require('util');

class ArangoStorage {
    async prepare() {
        // ArangoDB Konfiguration
        let database = new Database({
            url: `http://${process.env.DB_HOST}:${process.env.DB_PORT}`,
            databaseName: process.env.DB_DATABASE,
            auth: {
                username: process.env.DB_USERNAME,
                password: process.env.DB_PASSWORD
            }
        });

        // Redis Konfiguration
        if (process.env.REDIS_ENABLED === 'true') {
            this.redis = Redis.createClient({
                host: process.env.REDIS_HOST,
                port: process.env.REDIS_PORT,
                password: process.env.REDIS_PASSWORD
            });

            this.redisGet = promisify(this.redis.get).bind(this.redis);
            this.redisSet = promisify(this.redis.set).bind(this.redis);
            this.redisDel = promisify(this.redis.del).bind(this.redis);

            this.redis.on('error', (err) => {
                console.error('Redis error:', err);
            });
        }

        try {
            if (!await database.exists()) {
                database = await database.createDatabase(process.env.DB_DATABASE);
            }

            const collection = database.collection("pasteDocuments");

            if (!await collection.exists()) {
                await collection.create();
            }
            this.collection = collection;

            const indexName = "ttl";

            const index = Array.from(await collection.indexes()).find(index => index.name === indexName);
            if (index) {
                const documentExpireSeconds = parseInt(process.env.DOCUMENT_EXPIRE_MS) / 1000;
                if (index.expireAfter !== documentExpireSeconds) {
                    await collection.dropIndex(index.name);
                } else {
                    return;
                }
            }

            await collection.ensureIndex({
                name: indexName,
                type: "ttl",
                fields: ["lastAccessedAt"],
                expireAfter: parseInt(process.env.DOCUMENT_EXPIRE_MS) / 1000,
            });
        } catch (error) {
            console.error("Failed to prepare arangodb storage.", error);
        }
    }

    async save(key, deleteSecret, text, isStatic) {
        try {
            const document = {
                _key: key,
                deleteSecret,
                text,
                isStatic
            };

            if (!isStatic) {
                document.lastAccessedAt = Date.now() / 1000;
            }

            await this.collection.save(document);

            // Cache in Redis wenn aktiviert
            if (this.redis) {
                await this.redisSet(
                    `paste:${key}`,
                    JSON.stringify(document),
                    'EX',
                    process.env.REDIS_CACHE_TTL || 3600
                );
            }

            return true;
        } catch (error) {
            console.error("Failed to save document.", error);
            return false;
        }
    }

    async load(key) {
        try {
            // Versuche zuerst aus Redis zu laden wenn aktiviert
            if (this.redis) {
                const cachedData = await this.redisGet(`paste:${key}`);
                if (cachedData) {
                    const document = JSON.parse(cachedData);
                    return document.text;
                }
            }

            if (!await this.collection.documentExists(key))
                return null;

            const document = await this.collection.document(key);

            if (!document.isStatic) {
                document.lastAccessedAt = Date.now() / 1000;
                await this.collection.replace(document._key, document);
            }

            // Cache aktualisieren wenn Redis aktiviert ist
            if (this.redis) {
                await this.redisSet(
                    `paste:${key}`,
                    JSON.stringify(document),
                    'EX',
                    process.env.REDIS_CACHE_TTL || 3600
                );
            }

            return document.text;
        } catch (error) {
            console.error("Failed to load document.", error);
            return null;
        }
    }

    async deleteBySecret(key, deleteSecret) {
        try {
            if (!await this.collection.documentExists(key))
                return false;

            const document = await this.collection.document(key);
            if (document.deleteSecret === deleteSecret) {
                await this.collection.remove(key);
                // Aus Redis Cache löschen wenn aktiviert
                if (this.redis) {
                    await this.redisDel(`paste:${key}`);
                }
                return true;
            }
        } catch (error) {
            console.error("Failed to delete document.", error);
        }
        return false;
    }

    async delete(key) {
        try {
            if (!await this.collection.documentExists(key))
                return false;

            await this.collection.remove(key);
            // Aus Redis Cache löschen wenn aktiviert
            if (this.redis) {
                await this.redisDel(`paste:${key}`);
            }
            return true;
        } catch (error) {
            return false;
        }
    }

    // Cleanup Methode für sauberes Beenden
    async cleanup() {
        if (this.redis) {
            this.redis.quit();
        }
    }
}

module.exports = new ArangoStorage();