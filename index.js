(async () => {
    const launchMillis = Date.now();

    const express = require("express");
    const app = express();

    const serveStatic = require("serve-static");
    const bodyParser = require("body-parser");
    require('dotenv').config();
    const autoUpdater = require("./autoUpdater");

    console.log(`Starting PasteServer v${autoUpdater.currentVersion}...`);

    // update-check
    const updateAvailable = await autoUpdater.checkForUpdates();
    if (updateAvailable && process.env.AUTO_UPDATE_ENABLED === 'true') {
        if (await autoUpdater.downloadUpdate())
            await autoUpdater.installUpdate();
    }

    // connecting to the given database
    const database = process.env.DB_CONNECTION;
    let documentStorage;

    console.log(`Trying to use database '${database}'...`);

    try {
        // Dynamisch das passende Storage-Modul laden
        documentStorage =
            database === "file" ? require("./storage/fileStorage") :
                database === "arangodb" ? require("./storage/arangoStorage") :
                    database === "mysql" ? require("./storage/mysqlStorage") :
                        require("./storage/redisStorage");

        if (!documentStorage) throw new Error(`There is no support for '${database}'!`);

        // Prepare storage configuration
        const storageConfig = {
            type: process.env.DB_CONNECTION,
            host: process.env.DB_HOST,
            port: parseInt(process.env.DB_PORT),
            password: process.env.DB_PASSWORD,
            user: process.env.DB_USERNAME,
            database: process.env.DB_DATABASE,
            documentExpireInMs: parseInt(process.env.DOCUMENT_EXPIRE_MS),
            path: process.env.STORAGE_PATH,
            redis: {
                enabled: process.env.REDIS_ENABLED === 'true',
                host: process.env.REDIS_HOST,
                port: parseInt(process.env.REDIS_PORT),
                password: process.env.REDIS_PASSWORD,
                ttl: parseInt(process.env.REDIS_CACHE_TTL),
            }
        };

        // Vorbereiten der Verbindung
        await documentStorage.prepare(storageConfig);

        console.log(`${database.charAt(0).toUpperCase() + database.slice(1)} storage initialized successfully`);
    } catch (error) {
        console.error(`Failed to initialize '${database}' storage: ${error.message}`);

        // Fallback auf fileStorage
        console.log('Switching to fallback: File Storage...');
        const FileStorage = require('./storage/fileStorage');
        documentStorage = new FileStorage();

        const fallbackConfig = {
            path: process.env.STORAGE_PATH || './data', // Standardpfad, falls nicht gesetzt
        };

        await documentStorage.prepare(fallbackConfig);
    }

    // bodyParser to handle requests in json-format
    const jsonParser = bodyParser.json({
        limit: process.env.DOCUMENT_DATA_LIMIT,
        extended: true
    });

    app.use((request, response, next) =>
        request.path.toLowerCase() === "/documents" && request.method === "POST" ? next() : jsonParser(request, response, next));

    // setting route for the rest api
    app.use("/documents", (require("./routes/documents")(documentStorage)));
    // sending the static files on the root and when the url contains a key
    app.use(serveStatic(__dirname + "/static"));
    app.use("/:key", serveStatic(__dirname + "/static"));
    // else, redirecting to the root
    app.use((request, response) => response.redirect("/"));

    const PORT = parseInt(process.env.PORT);
    console.log(`Trying to bind on port ${PORT}...`);

    // ssl
    if (process.env.SSL_ENABLED === 'true') {
        const https = require('https');
        const fs = require('fs');

        const httpsServer = https.createServer({
            key: fs.readFileSync(process.env.SSL_PRIVKEY),
            cert: fs.readFileSync(process.env.SSL_FULLCHAIN),
        }, app);

        httpsServer.listen(PORT, () => {
            console.log(`Now listening on port ${PORT}.`);
        });
    } else {
        app.listen(PORT, console.log(`Now listening on port ${PORT}.`));
    }

    // commands
    const {CommandProvider, defaultCommand} = require("./commands/commands");

    const commandProvider = new CommandProvider(defaultCommand);
    commandProvider.registerCommands((require("./commands/documentCommands")(documentStorage)));
    commandProvider.registerCommands((require("./commands/updateCommands")(autoUpdater)));

    console.log(`Done (${Date.now() - launchMillis}ms). Execute '${defaultCommand.name}' for a list of all commands.`)
})();