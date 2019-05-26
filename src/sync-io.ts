import fs, { PathLike } from 'fs';
import fpath from 'path';
import mock  from './mock-io';

let isMock = false;

const useMock = () => {
    isMock = true;
};

const read = (path: string) => {
    if (isMock) {
        return mock.read(path);
    }
    return fs.readFileSync(path);
};

const write = (path: string, data: Buffer | string) => {
    if (isMock) {
        return mock.write(path, data);
    }
    return fs.writeFileSync(path, data);
};

const append = (path: string, data: Buffer | string) => {
    if (isMock) {
        return mock.append(path, data);
    }
    return fs.appendFileSync(path, data);
};

const copy = (src: string, dest: string) => {
    if (isMock) {
        return mock.copy(src, dest);
    }
    return fs.copyFileSync(src, dest);
};

const exists = (path: string) => {
    if (isMock) {
        return mock.exists(path);
    }
    return fs.existsSync(path);
};

const makeDir = (path: string) => {
    if (isMock) {
        return mock.makeDir(path);
    }
    return fs.mkdirSync(path, { recursive: true });
};

const atime = (path: PathLike) => {
    if (isMock) {
        return new Date();
    }
    return fs.lstatSync(path).atime;
};

const mtime = (path: PathLike) => {
    if (isMock) {
        return new Date();
    }
    return fs.lstatSync(path).mtime;
};

const ctime = (path: PathLike) => {
    if (isMock) {
        return new Date();
    }
    return fs.lstatSync(path).ctime;
}

const btime = (path: PathLike) => {
    if (isMock) {
        return new Date();
    }
    return fs.lstatSync(path).birthtime;
};

const isDir = (path: string) => {
    if (isMock) {
        return mock.isDir(path);
    }
    return fs.lstatSync(path).isDirectory();
};

const isFile = (path: string) => {
    if (isMock) {
        return mock.isFile(path);
    }
    return fs.lstatSync(path).isFile();
};

const list = (path: string) => {
    if (isMock) {
        return mock.list(path);
    }
    return fs.readdirSync(path);
};

const path = (paths: string[]) => {
    if (isMock) {
        return mock.path(paths);
    }
    return fpath.join(...paths);
};

const resolve = (paths: string[]) => {
    if (isMock) {
        return mock.path(paths);
    }
    return fpath.resolve(...paths);
};

const remove = (path: PathLike) => {
    // TODO
};

const file = (paths: string[], mkdir: boolean = false) => {
    const path   = io.resolve(paths);
    const parent = io.resolve([path, '..']);
    if (dir([parent], mkdir)) {
        return path;
    }
};

const dir = (paths: string[], mkdir: boolean = false) => {
    const dirPath = io.resolve(paths);
    if (isMock) {
        if (mock.exists(dirPath)) {
            if (mock.isDir(dirPath)) {
                return dirPath;
            } else {
                throw new Error(`${dirPath} is nont a directory!`);
            }
        } 

        if (mkdir) {
            mock.makeDir(dirPath);
            return dirPath;
        }

        return;
    }

    if (exists(dirPath)) {
        if (isDir(dirPath)) {
            return dirPath;
        } else {
            throw new Error(`${dirPath} is nont a directory!`);
        }
    }

    if (mkdir) {
        io.makeDir(dirPath);
        return dirPath;
    }
};

const io = {
    useMock,
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
    resolve,
    remove,
    file,
    dir,
};

export default io;