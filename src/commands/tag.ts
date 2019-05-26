import GitRepository from '../GitRepository';
import showRef, { lsRef } from './show-ref';
import io from '../sync-io';
import updateRef from './update-ref';

export default function tag(repo: GitRepository, name?: string, object: string = 'HEAD') {
    // TODO tag object resolution (for example HEAD -> commit hash)
    if (!name) {
        return showRef(repo, lsRef(repo, io.path(['refs', 'tags'])));
    }
    // TODO tag object options
    updateRef(repo, io.path(['refs', 'tags', name]), object);
    return '';
}