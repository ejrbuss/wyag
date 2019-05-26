import GitRepository from '../GitRepository';
import { GitRef }    from '../GitObject';

export default function updateRef(repo: GitRepository, refname: string, value: string) {
    // TODO Ref value resolution (short hash) and validation
    const ref = new GitRef(repo, refname);
    ref.data = value;
    ref.write();
}