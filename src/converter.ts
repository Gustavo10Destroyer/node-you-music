import ffmpeg from "fluent-ffmpeg";

interface ConvertOptions {
    coverPath: string;
    fileInputPath: string;
    fileOutputPath: string;
}

export function convert(options: ConvertOptions): Promise<void> {
    return new Promise((resolve, reject) => {
        ffmpeg(options.fileInputPath)
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