import GitRepository from '../GitRepository';
import GitObject, { GitTree } from '../GitObject';

export default function lsTree(repo: GitRepository, tree: string): string {
    const object = GitObject.read(repo, GitObject.find(repo, tree));
    if (!(object instanceof GitTree) || !object.leaves) {
        throw new Error(`${tree} is not a tree!`);
    }
    return object.leaves.map(leaf => {
        const mode = '0'.repeat(6 - leaf.mode.length) + leaf.mode.toString();
        const type = GitObject.read(repo, leaf.sha).fmt.toString();
        const sha  = leaf.sha;
        const path = leaf.path;
        return `${mode} ${type} ${sha}\t${path}`;
    }).join('\n');
}
