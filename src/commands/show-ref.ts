import GitRepository from '../GitRepository';
import { GitRef } from '../GitObject';
import io from '../sync-io';

export default function showRef(repo: GitRepository, refs: GitRef[] = lsRef(repo), withHash: boolean = true): string {
    return refs.map(ref => {
        const hash = withHash ? (ref.resolve() + ' ') : '';
        return `${hash}${ref.path}`;
    }).join('\n');
}

export function lsRef(repo: GitRepository, repoPath: string = 'refs'): GitRef[] {
    return io.list(repo.path([repoPath])).sort().reduce((refs, name) => {
        const refPath = io.path([repoPath, name]);
        if (io.isDir(repo.path([refPath]))) {
            refs.push(...lsRef(repo, refPath));
        } else {
            refs.push(new GitRef(repo, refPath));
        }
        return refs;
    }, [] as GitRef[]);
}