import GitRepository from '../GitRepository';

export default function init(path: string = '.'): GitRepository {
    return GitRepository.init(path);
}