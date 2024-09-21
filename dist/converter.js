"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.convert = convert;
const fluent_ffmpeg_1 = __importDefault(require("fluent-ffmpeg"));
function convert(options) {
    return new Promise((resolve, reject) => {
        (0, fluent_ffmpeg_1.default)(options.fileInputPath)
            .audioCodec('aac')
            .audioBitrate('128k')
            .outputOptions('-metadata:s:v', 'title="Album cover"')
            .outputOptions('-metadata:s:v', 'comment="Cover (front)"')
            .outputOptions('-map', '0:a')
            .outputOptions('-map', '1:v')
            .input(options.coverPath)
            .output(options.fileOutputPath)
            .on('end', () => resolve())
            .on('error', reject)
            .run();
    });
}
