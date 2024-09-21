import fs from "node:fs";
import sharp from "sharp";
import https from "node:https";
import ytdl from "@distube/ytdl-core";

import { convert } from "./converter";
const pattern = /[<>:"\/\\|?*\x00-\x1F]/gm;

function download(url: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        let request = https.get(url, (response) => {
            let chunks: Uint8Array[] = [];

            response.on('data', (data) => chunks.push(data as Uint8Array));
            response.once('end', () => {
                resolve(Buffer.concat(chunks));
            });

            response.once('error', reject);
        });

        request.once('error', reject);
        request.end();
    });
}

function processThumbnail(url: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        download(url)
            .then((data) => {
                sharp(data).metadata()
                    .then((metadata) => {
                        let width = metadata.width!;
                        let height = metadata.height!;
                        let size = Math.min(width, height);

                        let left = (width - size) / 2;
                        let top = (height - size) / 2;

                        sharp(data)
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

export function main(url: string, shouldSave: boolean): Promise<Buffer | undefined> {
    return new Promise((resolve, reject) => {
        ytdl.getInfo(url)
            .then((info) => {
                if(info.videoDetails.category !== "Music") {
                    console.log("[ERR!] Essa ferramenta foi criada para baixar apenas músicas.");
                    console.log("[ERR!] O link que você informou não leva a uma música!");
                    console.log("[WARN] Observe que nos serviços do YouTube, existem vídeos e músicas, e são dois itens completamente diferentes!");
                    return;
                }

                let audioFormats = info.formats.filter((format) => format.hasAudio && !format.hasVideo);
                let bestFormat = audioFormats.reduce((previous, current) => (current.audioBitrate! > previous.audioBitrate!) ? current : previous)

                let author = info.videoDetails.author.name.replace(" - Topic", "");
                let name = `${author} - ${info.videoDetails.title}`.replace(pattern, "_");

                let thumbnail = info.videoDetails.thumbnails.pop()!;
                let extension = thumbnail.url.includes('.webp') ? 'webp' : 'jpg';

                Promise.all([
                    new Promise((resolve, reject) => {
                        ytdl(url, {format: bestFormat})
                            .pipe(fs.createWriteStream(`${name}.${bestFormat.container}`))
                            .on('close', () => {
                                console.log("[INFO] A música foi salva!");
                                resolve();
                            });
                    }) as Promise<void>,
                    processThumbnail(thumbnail.url)
                        .then((data) => {
                            fs.writeFile(`${name}.${extension}`, data, (err) => {
                                if(err) {
                                    console.error(err);
                                    return;
                                }

                                console.log("[INFO] A capa da música foi salva!");
                            });
                        })
                ])
                    .then(() => {
                        convert({
                            coverPath: `${name}.${extension}`,
                            fileInputPath: `${name}.${bestFormat.container}`,
                            fileOutputPath: `${name}.m4a`
                        })
                            .then(() => {
                                console.log("[INFO] Download concluído!");

                                fs.unlink(`${name}.${extension}`, (err) => {
                                    if(err) console.log(`[WARN] Falha ao excluir os resíduos da capa: ${err.message}`);
                                });

                                fs.unlink(`${name}.${bestFormat.container}`, (err) => {
                                    if(err) console.log(`[WARN] Falha ao excluir os resíduos do formato de áudio original: ${err.message}`);
                                });

                                if(!shouldSave) {
                                    fs.readFile(`${name}.m4a`, (err, data) => {
                                        if(err) {
                                            reject(err);
                                            return;
                                        }

                                        fs.unlink(`${name}.m4a`, (err) => {
                                            if(err) console.error(err);
                                            resolve(data);
                                        });
                                    })
                                }
                            })
                            .catch((err) => {
                                console.log("[INFO] Falha ao converter sua música!");
                                console.error(err);
                            })
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