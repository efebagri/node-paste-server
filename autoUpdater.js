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
            // Ensure update directory exists
            const updateDir = path.resolve(".update");
            if (!fs.existsSync(updateDir)) {
                fs.mkdirSync(updateDir);
            }

            const zipURL = dev ? DEV_ZIP_URL : ZIP_URL;
            const updatePath = path.resolve(updateDir, this.updateFileName);

            request(zipURL)
                .on("error", error => {
                    console.error("Error while downloading update.", error);
                    resolve(false);
                })
                .pipe(fs.createWriteStream(updatePath))
                .on("close", () => {
                    if (fs.existsSync(updatePath)) {
                        console.log("Successfully downloaded update!");
                        resolve(true);
                    } else {
                        console.error("Update file not created after download.");
                        resolve(false);
                    }
                });
        });
    }

    async installUpdate() {
        console.log("Installing update...");
        let contentFolderName = "";

        try {
            const updatePath = path.resolve(".update", this.updateFileName);

            if (!fs.existsSync(updatePath)) {
                console.error("Update file not found. Attempting to download...");
                const downloaded = await this.downloadUpdate(false);
                if (!downloaded) {
                    throw new Error("Failed to download update file");
                }
            }

            return new Promise((resolve) => {
                fs.createReadStream(updatePath)
                    .pipe(unzipper.Parse())
                    .on("entry", entry => {
                        try {
                            const isDir = entry.type === "Directory";
                            if (!contentFolderName && isDir) {
                                contentFolderName = entry.path;
                            }
                            const fileName = entry.path.replace(contentFolderName, "");

                            if (fileName && !this.keepFiles.includes(fileName)) {
                                const filePath = path.resolve(fileName);
                                const fileDir = path.dirname(filePath);

                                // Ensure directory exists
                                if (!fs.existsSync(fileDir)) {
                                    fs.mkdirSync(fileDir, { recursive: true });
                                }

                                if (isDir) {
                                    if (!fs.existsSync(filePath)) {
                                        fs.mkdirSync(filePath, { recursive: true });
                                    }
                                    entry.autodrain();
                                } else {
                                    console.log(`Replacing ${fileName}`);
                                    entry.pipe(fs.createWriteStream(filePath));
                                }
                            } else {
                                entry.autodrain();
                            }
                        } catch (error) {
                            console.error("Error processing entry:", error);
                            entry.autodrain();
                        }
                    })
                    .on("error", error => {
                        console.error("Error while installing update:", error);
                        // Try to clean up on error
                        try {
                            fs.removeSync(".update");
                        } catch (cleanupError) {
                            console.error("Error during cleanup:", cleanupError);
                        }
                        resolve(false);
                    })
                    .on("close", () => {
                        // Only cleanup after successful installation
                        try {
                            fs.removeSync(".update");
                            console.log("Successfully installed update!");
                            console.log("Stopping the PasteServer for the update to be usable...");
                            process.exit(0);
                        } catch (error) {
                            console.error("Error during cleanup:", error);
                            resolve(false);
                        }
                    });
            });
        } catch (error) {
            console.error("Installation failed:", error);
            // Final cleanup attempt
            try {
                fs.removeSync(".update");
            } catch (cleanupError) {
                console.error("Error during cleanup:", cleanupError);
            }
            throw error;
        }
    }
}

module.exports = new AutoUpdater(require("./package.json").version);