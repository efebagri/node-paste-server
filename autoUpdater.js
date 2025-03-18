const request = require("request");
const fs = require("fs-extra");
const path = require("path");
const unzipper = require("unzipper");

const PACKAGE_JSON_URL = "https://raw.githubusercontent.com/efebagri/node-paste-server/main/package.json";
const ZIP_URL = "https://github.com/efebagri/node-paste-server/archive/main.zip";
const DEV_PACKAGE_JSON_URL = "https://raw.githubusercontent.com/efebagri/node-paste-server/development/package.json";
const DEV_ZIP_URL = "https://github.com/efebagri/node-paste-server/archive/development.zip";

class AutoUpdater {

    constructor(currentVersion) {
        this.currentVersion = currentVersion;
        this.updateFileName = "PasteServer-update.zip";

        // Array of files to keep during update
        // You might want to move this to .env if it needs to be configurable
        this.keepFiles = [];
    }

    checkForUpdates(dev) {
        console.log(`Checking for ${dev ? "dev-" : ""}updates...`);
        return new Promise(resolve => {
            const packageJsonURL = dev ? DEV_PACKAGE_JSON_URL : PACKAGE_JSON_URL;

            request(packageJsonURL, {json: true}, (error, response, body) => {
                if (error) {
                    console.error("Error while checking for updates.", error);
                    resolve(false);
                    return;
                }

                const newestVersion = body.version;
                if (newestVersion !== this.currentVersion) {
                    console.log(`There's a newer ${dev ? "dev-" : ""}version of the PasteServer available (${newestVersion})!`);
                    console.log(`Execute 'installUpdate${dev ? " -dev" : ""}' to download it!`);
                    resolve(true);
                } else {
                    console.log("You are up to date!");
                    resolve(false);
                }
            });
        });
    }

    downloadUpdate(dev) {
        console.log(`Downloading ${dev ? "dev-" : ""}update...`);
        return new Promise(resolve => {
            if (!fs.existsSync(".update"))
                fs.mkdirSync(".update");

            const zipURL = dev ? DEV_ZIP_URL : ZIP_URL;

            request(zipURL).on("error", error => {
                console.error("Error while downloading update.", error);
                resolve(false);
            }).pipe(fs.createWriteStream(path.resolve(".update", this.updateFileName))).on("close", () => {
                console.log("Successfully downloaded update!");
                resolve(true);
            });
        });
    }

    installUpdate() {
        console.log("Installing update...");
        let contentFolderName = "";
        return new Promise(resolve => {
            fs.createReadStream(path.resolve(".update", this.updateFileName))
                .pipe(unzipper.Parse()).on("entry", entry => {
                const isDir = entry.type === "Directory";
                if (!contentFolderName && isDir)
                    contentFolderName = entry.path;
                const fileName = entry.path.replace(contentFolderName, "");
                if (fileName && !this.keepFiles.includes(fileName)) {
                    const filePath = path.resolve(fileName);
                    if (!fs.existsSync(filePath)) {
                        if (isDir)
                            fs.mkdirSync(filePath);
                        else
                            fs.writeFileSync(filePath, "");
                    }
                    if (!isDir) {
                        console.log(`Replacing ${fileName}.`);
                        entry.pipe(fs.createWriteStream(filePath));
                    }
                } else
                    entry.autodrain();
            }).on("error", error => {
                console.error("Error while installing update.", error);
                resolve();
            }).on("close", () => {
                console.log("Successfully installed update!");
                console.log("Stopping the PasteServer for the update to be usable...");
                process.exit();
            });
            fs.removeSync(".update");
        });
    }
}

module.exports = new AutoUpdater(require("./package.json").version);