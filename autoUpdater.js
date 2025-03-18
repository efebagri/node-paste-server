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
        this.keepFiles = [];
    }

    checkForUpdates(dev) {
        // console.log(`Checking for ${dev ? "dev-" : ""}updates...`);
        return new Promise(resolve => {
            const packageJsonURL = dev ? DEV_PACKAGE_JSON_URL : PACKAGE_JSON_URL;

            request(packageJsonURL, {json: true}, (error, response, body) => {
                if (error) {
                    console.error("Error while checking for updates.", error);
                    resolve(false);
                    return;
                }

                const newestVersion = body.version;
                const current = this.currentVersion.split('.').map(Number);
                const newest = newestVersion.split('.').map(Number);

                const needsUpdate = newest[0] > current[0] ||
                    (newest[0] === current[0] && newest[1] > current[1]) ||
                    (newest[0] === current[0] && newest[1] === current[1] && newest[2] > current[2]);

                if (needsUpdate) {
                    console.log(`There's a newer ${dev ? "dev-" : ""}version of the PasteServer available (${newestVersion})!`);
                    console.log(`Execute 'installUpdate${dev ? " -dev" : ""}' to download it!`);
                    resolve(true);
                } else {
                    // console.log("You are up to date!");
                    resolve(false);
                }
            });
        });
    }

    downloadUpdate(dev) {
        console.log(`Downloading ${dev ? "dev-" : ""}update...`);
        return new Promise(resolve => {
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

    async installUpdate(dev = false) {
        console.log("Installing update...");
        let contentFolderName = "";

        try {
            const updatePath = path.resolve(".update", this.updateFileName);

            if (!fs.existsSync(updatePath)) {
                console.log("Update file not found. Downloading...");
                const downloaded = await this.downloadUpdate(dev);
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

                                if (!fs.existsSync(fileDir)) {
                                    fs.mkdirSync(fileDir, { recursive: true });
                                }

                                if (isDir) {
                                    if (!fs.existsSync(filePath)) {
                                        fs.mkdirSync(filePath, { recursive: true });
                                    }
                                    entry.autodrain();
                                } else {
                                    entry.pipe(fs.createWriteStream(filePath));
                                }
                            } else {
                                entry.autodrain();
                            }
                        } catch (error) {
                            console.error("Error while processing:", error);
                            entry.autodrain();
                        }
                    })
                    .on("error", error => {
                        console.error("Installation failed:", error);
                        this.cleanup();
                        resolve({ success: false, error: "Installation failed" });
                    })
                    .on("close", () => {
                        console.log("Successfully installed update!");
                        this.cleanup();
                        resolve({ success: true });

                        setTimeout(() => {
                            console.log("Server is restarting...");
                            process.exit(0);
                        }, 1000);
                    });
            });
        } catch (error) {
            console.error("Update error:", error);
            this.cleanup();
            return { success: false, error: error.message };
        }
    }

    cleanup() {
        try {
            fs.removeSync(".update");
        } catch (error) {
            console.error("Cleanup error:", error);
        }
    }
}

module.exports = new AutoUpdater(require("./package.json").version);