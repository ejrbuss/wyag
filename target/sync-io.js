"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const read = (path) => {
    return fs_1.default.readFileSync(path);
};
const write = (path, data) => {
    return fs_1.default.writeFileSync(path, data);
};
const append = (path, data) => {
    return fs_1.default.appendFileSync(path, data);
};
const copy = (src, dest) => {
    return fs_1.default.copyFileSync(src, dest);
};
const exists = (path) => {
    return fs_1.default.existsSync(path);
};
const makeDir = (path) => {
    return fs_1.default.mkdirSync(path, { recursive: true });
};
const atime = (path) => {
    return fs_1.default.lstatSync(path).atime;
};
const mtime = (path) => {
    return fs_1.default.lstatSync(path).mtime;
};
const ctime = (path) => {
    return fs_1.default.lstatSync(path).ctime;
};
const btime = (path) => {
    return fs_1.default.lstatSync(path).birthtime;
};
const isDir = (path) => {
    return fs_1.default.lstatSync(path).isDirectory();
};
const isFile = (path) => {
    return fs_1.default.lstatSync(path).isFile();
};
const list = (path) => {
    return fs_1.default.readdirSync(path);
};
const path = (paths) => {
    return path_1.default.resolve(...paths);
};
const remove = (path) => {
    // TODO
};
const file = (paths, mkdir = false) => {
    if (dir(paths.slice(0, -1), mkdir)) {
        return path(paths);
    }
};
const dir = (paths, mkdir = false) => {
    const dirPath = path(paths);
    if (exists(dirPath)) {
        if (isDir(dirPath)) {
            return dirPath;
        }
        else {
            throw new Error(`${dirPath} is nont a directory!`);
        }
    }
    if (mkdir) {
        makeDir(dirPath);
        return dirPath;
    }
};
exports.default = {
    read,
    write,
    append,
    copy,
    exists,
    makeDir,
    atime,
    mtime,
    ctime,
    btime,
    isDir,
    isFile,
    list,
    path,
    remove,
    file,
    dir,
};
