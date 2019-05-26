import GitRepository from './GitRepository';
import sha1          from 'sha1';
import zlib          from 'zlib';
import io            from './sync-io';
import KVLM          from './KVLM';

export const formats = {
    BLOB:   Buffer.from('blob'),
    TREE:   Buffer.from('tree'),
    COMMIT: Buffer.from('commit'),
    TAG:    Buffer.from('tag'),
};

export const modes = {
    blob:       Buffer.from('100644'),
    executable: Buffer.from('100755'),
    directory:  Buffer.from('040000'),
    commit:     Buffer.from('160000'),
    symlink:    Buffer.from('120000'),
};

export default abstract class GitObject {

    public repo: GitRepository;
    public fmt: Buffer = Buffer.from('INVALID_BUFFER_FMT');;

    public constructor(repo: GitRepository, data?: Buffer) {
        this.repo = repo;
        if (data) {
            this.deserialize(data);
        }
    }

    public abstract serialize(): Buffer;
    public abstract deserialize(data: Buffer): void;

    public get sha() {
        return this.write(false);
    }

    public write(actuallyWrite: boolean = true) {
        const data = this.serialize();
        const raw  = Buffer.concat([
            this.fmt,                            // Object type
            Buffer.from(' '),                    // Space
            Buffer.from(data.length.toString()), // Object size
            Buffer.from('\0'),                   // Zero stop
            data,                                // Data
        ]);
        const sha = sha1(raw);
        if (actuallyWrite) {
            const path = this.repo.file(['objects', sha.slice(0, 2), sha.slice(2)], true);
            if (path) {
                io.write(path, zlib.deflateSync(raw));
            }
        }
        return sha;
    }

    public static init(data: Buffer, fmt: Buffer, repo: GitRepository) {
        // Return appropriate type
        if (formats.BLOB.compare(fmt) === 0) {
            return new GitBlob(repo, data);
        }
        if (formats.TREE.compare(fmt) === 0) { 
            return new GitTree(repo, data); 
        }
        if (formats.COMMIT.compare(fmt) === 0) { 
            return new GitCommit(repo, data); 
        }
        if (formats.TAG.compare(fmt) === 0) {
            return new GitTag(repo, data);
        }
        throw new Error(`Unknown type ${fmt}!`);
    }

    public static read(repo: GitRepository, sha: string): GitObject {

        const path = repo.file(['objects', sha.slice(0, 2), sha.slice(2)]);

        if (path) {
            const raw = zlib.inflateSync(io.read(path));

            // Read object type
            const x   = raw.indexOf(' ');
            const fmt = raw.slice(0, x);

            // Read and validate object size
            const y    = raw.indexOf('\0', x);
            const size = parseInt(raw.slice(x, y).toString(), 10);
            if (size !== raw.length - y - 1) {
                throw new Error(`Malformed object ${sha}: bad length`);
            }
            return GitObject.init(raw.slice(y + 1), fmt, repo);
        }
        throw new Error(`No object ${sha}!`);
        
    }

    public static find(repo: GitRepository, name: string, fmt?: Buffer, follow: boolean = true) {
        return name;
    }

}

export class GitBlob extends GitObject {

    public fmt = formats.BLOB;
    public blobData?: Buffer;

    public serialize() {
        if (this.blobData) {
            return this.blobData;
        }
        throw new Error('Cannot serialize a Blob with no data!');
    }

    public deserialize(data: Buffer) {
        this.blobData = data;
    }

}

export interface GitTreeLeaf {
    mode: Buffer;
    path: string;
    sha: string;
}

export class GitTree extends GitObject {

    public fmt = formats.TREE;
    public leaves?: GitTreeLeaf[];

    public serialize() {
        if (!this.leaves) {
            throw Error(`Cannot serialize a ${this.fmt.toString()} with no leaves!`);
        }
        let data = Buffer.from('');
        for (const leaf of this.leaves) {
            data = Buffer.concat([
                data,
                leaf.mode,
                Buffer.from(' '),
                Buffer.from(leaf.path),
                Buffer.from('\0'),
                Buffer.from(leaf.sha, 'hex'),
            ]);
        }
        return data;
    }

    public deserialize(data: Buffer) {
        const max: number = data.length;
        let position: number = 0;
        this.leaves = [];
        while (position < max) {
            const [newPos, leaf] = GitTree.parseLeaf(data, position);
            position = newPos;
            this.leaves.push(leaf);
        }
    }

    private static parseLeaf(data: Buffer, start: number = 0): [number, GitTreeLeaf] {
        // Find the mode
        const x = data.indexOf(' ', start);
        if (x - start !== 5 && x - start !== 6) {
            throw new Error('Malformed tree unknown mode!');
        }
        const mode = data.slice(start, x);

        // Find the null terminator for the path
        const y = data.indexOf('\0', x);
        const path = data.slice(x + 1, y).toString();

        // Reaad the sha
        const sha = data.slice(y +1, y + 21).toString('hex');
        return [y + 21, { mode, path, sha }];
    }

}

abstract class GitKVLMObject extends GitObject {

    private ctx?: Map<string, string[]>;
    protected validKeys?: Set<string>;

    public serialize() {
        if (this.ctx) {
            return Buffer.from(KVLM.stringify(this.ctx));
        }
        throw new Error(`Cannot serialize a ${this.fmt.toString()} with no data!`);
    }

    public deserialize(data: Buffer) {
        this.ctx = KVLM.parse(data);
        if (this.validKeys) {
            for (const key of this.ctx.keys()) {
                if (!this.validKeys.has(key)) {
                    throw new Error(`Invalid key ${key} for ${this.fmt.toString()}!`);
                }
            }
        }
    }

    protected getValues(key: string): string[] {
        if (!this.ctx) {
            throw new Error(`Cannot retrieve the ${key} of a ${this.fmt.toString()} that has not been deserialized! (ctx is not defined)`);
        }
        return this.ctx.get(key) || [];
    }

    protected getValue(key: string): string | undefined {
        return this.getValues(key)[0];
    }

}

export class GitCommit extends GitKVLMObject {

    public fmt = formats.COMMIT;

    // Valid commit keys
    protected validKeys = new Set([
        '',          // Commit message
        'tree',      // Commit tree
        'parent',    // Parent commit
        'author',    // Commit author
        'committer', // Commit committer
    ]);

    // Value accessors
    public get message(): string   { return this.getValue('') || ''; }
    public get author(): string    { return this.getValue('author') || ''; }
    public get committer(): string { return this.getValue('committer') || ''; }
    public get parents(): string[] { return this.getValues('parent'); }
    public get tree(): string | undefined { return this.getValue('tree'); }

}

export class GitTag extends GitKVLMObject {

    public fmt = formats.TAG;

    // Valid tag keys 
    protected validKeys = new Set([
        '',       // Tag message
        'object', // The tagged object sha
        'author', // The tag author
    ]);

    // Value accessors 
    public get message(): string { return this.getValue('') || ''; }
    public get author(): string  { return this.getValue('author') || ''; }
    public get object(): string | undefined { return this.getValue('object'); }
    
}

export class GitRef {

    public repo: GitRepository;
    public path: string;
    public data?: string;

    constructor(repo: GitRepository, path: string) {
        this.repo = repo;
        this.path = path;
    }

    public read() {
        this.data = io.read(this.repo.path([this.path])).toString();
    }

    public write() {
        if (!this.data) {
            throw new Error('Cannot write a dataless ref!');
        }
        const path = this.repo.file([this.path], true);
        if (!path) {
            throw new Error(`Could not create ref at ${this.path}!`);
        }
        io.write(path, this.data);
    }

    public resolve(): string {
        if (!this.data) {
            this.read();
            if (!this.data) {
                throw new Error('Cannot resolve a dataless ref!');
            }
        }
        if (this.data.startsWith('ref: ')) {
            return new GitRef(this.repo, this.data.slice(5)).resolve();
        }
        return this.data;
    }

}