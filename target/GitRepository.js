"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ini_1 = __importDefault(require("ini"));
const sync_io_1 = __importDefault(require("./sync-io"));
;
const DEFAULT_CONFIG = {
    core: {
        repositoryformatversion: 0,
        filemode: false,
        bare: false,
    },
};
class GitRepository {
    constructor(worktree, force = false) {
        this.worktree = worktree;
        this.gitdir = sync_io_1.default.path([worktree, '.git']);
        this.conf = {};
        if (!(force || sync_io_1.default.isDir(sync_io_1.default.path([worktree, '.git'])))) {
            throw new Error(`${worktree} is not a Git repository!`);
        }
        // Read configuraation file
        if (!force) {
            try {
                this.conf = ini_1.default.parse(this.path(['config']));
                const version = this.conf.core.repositoryformatversion;
                if (version !== 0) {
                    throw new Error(`Unsupported repositoryformatversion ${version}!`);
                }
            }
            catch (_a) {
                throw new Error('Configurration file missing!');
            }
        }
    }
    path(paths) {
        return sync_io_1.default.path([this.gitdir, ...paths]);
    }
    file(paths, mkdir = false) {
        return sync_io_1.default.file([this.path(paths)], mkdir);
    }
    dir(paths, mkdir = false) {
        return sync_io_1.default.dir([this.path(paths)], mkdir);
    }
    static init(path) {
        const repo = new GitRepository(path, true);
        if (sync_io_1.default.exists(repo.worktree)) {
            if (!sync_io_1.default.isDir(repo.worktree)) {
                throw new Error(`${repo.worktree} is not a directory!`);
            }
            if (!sync_io_1.default.list(repo.worktree).includes('.git')) {
                throw new Error(`${repo.worktree} contains a .git dirctory!`);
            }
        }
        else {
            sync_io_1.default.makeDir(repo.worktree);
        }
        repo.dir(['branches'], true);
        repo.dir(['objcts'], true);
        repo.dir(['refs', 'tags'], true);
        repo.dir(['refs', 'heads'], true);
        const pathHead = repo.file(['HEAD']);
        const pathConfig = repo.file(['config']);
        if (pathHead) {
            sync_io_1.default.write(pathHead, 'ref: refs/heads/master\n');
        }
        if (pathConfig) {
            sync_io_1.default.write(pathConfig, ini_1.default.stringify(DEFAULT_CONFIG));
        }
        return repo;
    }
    static find(child = '.') {
        child = sync_io_1.default.path([child]);
        if (sync_io_1.default.isDir(sync_io_1.default.path([child, '.git']))) {
            return new GitRepository(child);
        }
        const parent = sync_io_1.default.path([child, '..']);
        if (parent === child) {
            return;
        }
        return GitRepository.find(parent);
    }
}
exports.default = GitRepository;
;
