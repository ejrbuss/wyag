import ini from 'ini';
import io  from './sync-io';

export interface Conf { 
    [key: string]: any 
};

const DEFAULT_CONFIG = {
    core: {
        repositoryformatversion: 0,
        filemode: false,
        bare: false,
    },
};

export default class GitRepository {

    public worktree: string;
    public gitdir: string;
    public conf: Conf;

    public constructor(worktree: string, force: boolean = false) {

        this.worktree = worktree;
        this.gitdir   = io.resolve([worktree, '.git']);
        this.conf     = {};

        if (!(force || io.isDir(io.resolve([worktree, '.git'])))) {
            throw new Error(`${worktree} is not a Git repository!`);
        }

        // Read configuraation file
        if (!force) {
            try {
                this.conf = ini.parse(io.read(this.path(['config'])).toString());
                const version = this.conf.core.repositoryformatversion;
                if (version !== '0') {
                    throw new Error(`Unsupported repositoryformatversion ${version}!`);
                }

            } catch(err) {
                throw new Error('Configuration file missing!');
            }
        }
    }

    public path(paths: string[]) {
        return io.resolve([this.gitdir, ...paths]);
    }

    public file(paths: string[], mkdir: boolean = false) {
        return io.file([this.path(paths)], mkdir);
    }

    public dir(paths: string[], mkdir: boolean = false) {
        return io.dir([this.path(paths)], mkdir);
    }

    public static init(path: string) {
        const repo = new GitRepository(path, true);

        if (io.exists(repo.worktree)) {
            if (!io.isDir(repo.worktree)) {
                throw new Error(`${repo.worktree} is not a directory!`);
            }
            if (io.list(repo.worktree).includes('.git')) {
                throw new Error(`${repo.worktree} already contains a .git dirctory!`);
            }
        } else {
            io.makeDir(repo.worktree);
        }
        
        repo.dir(['branches'], true);
        repo.dir(['objects'], true);
        repo.dir(['refs', 'tags'], true);
        repo.dir(['refs', 'heads'], true);

        const pathHead   = repo.file(['HEAD']);
        const pathConfig = repo.file(['config']);
        if (pathHead) {
            io.write(pathHead, 'ref: refs/heads/master\n');
        }
        if (pathConfig) {
            io.write(pathConfig, ini.stringify(DEFAULT_CONFIG));
        }
        return repo;
    }

    public static find(child: string = '.'): GitRepository {
        child = io.resolve([child]);

        if (io.isDir(io.resolve([child, '.git']))) {
            return new GitRepository(child);            
        }
        const parent = io.resolve([child, '..']);

        if (parent === child) {
            throw new Error('Not a git repository (or any of the parent directories)!');
        }
        return GitRepository.find(parent);
    }

};