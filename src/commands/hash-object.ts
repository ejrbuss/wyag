import GitObject, { formats } from '../GitObject';
import GitRepository          from '../GitRepository';
import io                     from '../sync-io';

export default function hashObject(repo: GitRepository, path: string, fmt?: Buffer, write: boolean = false) {
    const obj = GitObject.init(io.read(path), fmt || formats.BLOB, repo);
    return obj.write(write);
}