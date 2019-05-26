import GitRepository            from '../GitRepository';
import GitObject, { GitCommit } from '../GitObject';

export default function log(repo: GitRepository, commit: string = 'HEAD') {

    const queue: string[]      = [GitObject.find(repo, commit)];
    const log: GitCommit[]     = [];
    const visited: Set<string> = new Set();
    
    while (queue.length > 0) {

        const sha = queue.pop();
        if (!sha || visited.has(sha)) {
            continue;
        }
        visited.add(sha);
        
        // Read and validate commit
        const commit = GitObject.read(repo, sha);
        if (!(commit instanceof GitCommit)) {
            throw new Error(`Malformed commit, invalid type: ${commit.fmt}`);
        }

        // Add to log
        log.push(commit);

        // Push parents in reverse order so that the first parent will be 
        // at the top of the queue
        queue.push(...([...commit.parents].reverse()));
    }
    return log;
}

export function prettyPrintLog(log: GitCommit[]) {
    return log.map(commit => commit.serialize()).join('\n\n');
}