"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
const node_fs_1 = __importDefault(require("node:fs"));
const sharp_1 = __importDefault(require("sharp"));
const node_https_1 = __importDefault(require("node:https"));
const ytdl_core_1 = __importDefault(require("@distube/ytdl-core"));
const converter_1 = require("./converter");
const pattern = /[<>:"\/\\|?*\x00-\x1F]/gm;
function download(url) {
    return new Promise((resolve, reject) => {
        let request = node_https_1.default.get(url, (response) => {
            let chunks = [];
            response.on('data', (data) => chunks.push(data));
            response.once('end', () => {
                resolve(Buffer.concat(chunks));
            });
            response.once('error', reject);
        });
        request.once('error', reject);
        request.end();
    });
}
function processThumbnail(url) {
    return new Promise((resolve, reject) => {
        download(url)
            .then((data) => {
            (0, sharp_1.default)(data).metadata()
                .then((metadata) => {
                let width = metadata.width;
                let height = metadata.height;
                let size = Math.min(width, height);
                let left = (width - size) / 2;
                let top = (height - size) / 2;
                (0, sharp_1.default)(data)
                    .extract({ top, left, width: size, height: size })
                    .toBuffer()
                    .then(resolve)
                    .catch(reject);
            })
                .catch(reject);
        })
            .catch(reject);
    });
}
function main(url, shouldSave) {
    return new Promise((resolve, reject) => {
        ytdl_core_1.default.getInfo(url)
            .then((info) => {
            if (info.videoDetails.category !== "Music") {
                console.log("[ERR!] Essa ferramenta foi criada para baixar apenas músicas.");
                console.log("[ERR!] O link que você informou não leva a uma música!");
                console.log("[WARN] Observe que nos serviços do YouTube, existem vídeos e músicas, e são dois itens completamente diferentes!");
                return;
            }
            let audioFormats = info.formats.filter((format) => format.hasAudio && !format.hasVideo);
            let bestFormat = audioFormats.reduce((previous, current) => (current.audioBitrate > previous.audioBitrate) ? current : previous);
            let author = info.videoDetails.author.name.replace(" - Topic", "");
            let name = `${author} - ${info.videoDetails.title}`.replace(pattern, "_");
            let thumbnail = info.videoDetails.thumbnails.pop();
            let extension = thumbnail.url.includes('.webp') ? 'webp' : 'jpg';
            Promise.all([
                new Promise((resolve, reject) => {
                    (0, ytdl_core_1.default)(url, { format: bestFormat })
                        .pipe(node_fs_1.default.createWriteStream(`${name}.${bestFormat.container}`))
                        .on('close', () => {
                        console.log("[INFO] A música foi salva!");
                        resolve();
                    });
                }),
                processThumbnail(thumbnail.url)
                    .then((data) => {
                    node_fs_1.default.writeFile(`${name}.${extension}`, data, (err) => {
                        if (err) {
                            console.error(err);
                            return;
                        }
                        console.log("[INFO] A capa da música foi salva!");
                    });
                })
            ])
                .then(() => {
                (0, converter_1.convert)({
                    coverPath: `${name}.${extension}`,
                    fileInputPath: `${name}.${bestFormat.container}`,
                    fileOutputPath: `${name}.m4a`
                })
                    .then(() => {
                    console.log("[INFO] Download concluído!");
                    node_fs_1.default.unlink(`${name}.${extension}`, (err) => {
                        if (err)
                            console.log(`[WARN] Falha ao excluir os resíduos da capa: ${err.message}`);
                    });
                    node_fs_1.default.unlink(`${name}.${bestFormat.container}`, (err) => {
                        if (err)
                            console.log(`[WARN] Falha ao excluir os resíduos do formato de áudio original: ${err.message}`);
                    });
                    if (!shouldSave) {
                        node_fs_1.default.readFile(`${name}.m4a`, (err, data) => {
                            if (err) {
                                reject(err);
                                return;
                            }
                            node_fs_1.default.unlink(`${name}.m4a`, (err) => {
                                if (err)
                                    console.error(err);
                                resolve(data);
                            });
                        });
                    }
                })
                    .catch((err) => {
                    console.log("[INFO] Falha ao converter sua música!");
                    console.error(err);
                });
            })
                .catch((err) => {
                console.error(err);
            });
        })
            .catch((err) => {
            console.error(err);
        });
    });
}
