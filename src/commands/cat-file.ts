import GitObject     from '../GitObject';
import GitRepository from '../GitRepository';

export default function catFile(repo: GitRepository, name: string, fmt?: Buffer) {
    const obj = GitObject.read(repo, GitObject.find(repo, name, fmt));
    return obj.serialize();
}