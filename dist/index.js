"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const downloader_1 = require("./downloader");
const url = process.argv[2];
(0, downloader_1.main)(url, true);
