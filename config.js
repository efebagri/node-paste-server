module.exports = {
    server: {
        port: 5000
    },
    autoUpdate: {
        enabled: false,
        packageJsonURL: "https://raw.githubusercontent.com/efebagri/node-paste-server/master/package.json",
        zipURL: "https://github.com/efebagri/node-paste-server/archive/master.zip",
        keepFiles: [],
        devPackageJsonURL: "https://raw.githubusercontent.com/efebagri/node-paste-server/development/package.json",
        devZipUrl: "https://github.com/efebagri/node-paste-server/archive/development.zip"
    },
    storage: {
        type: "file",
        host: "127.0.0.1",
        port: 8529,
        password: "",
        // only arangodb
        user: "root",
        database: "pasteServer",
        // only redis and arangodb
        documentExpireInMs: 3 * 24 * 60 * 60 * 1000,
        // only file
        path: "data"
    },
    createRateLimit: {
        timeInMs: 60 * 1000,
        maxRequestsPerTime: 15
    },
    document: {
        dataLimit: "2mb",
        maxLength: 400000
    },
    keyGenerator: {
        keyLength: 10,
        keyChars: "abcdefghijklmnopqrstivwxyz0123456789",
        withToUpperCase: true
    },
    ssl: {
        enabled: false,
        privkey: "/link/to/privkey.pem",
        fullchain: "/link/to/fullchain.pem"
    },
};