import GitRepository from '../GitRepository';
import hashObject    from './hash-object';
import catFile       from './cat-file';
import mock          from '../mock-io';
import io            from '../sync-io';
import init          from './init';

io.useMock();

test('cat-file nofile', () => {
    mock.setRoot(mock.EMPTY());
    init();
    const repo = GitRepository.find();
    expect(() => catFile(repo, 'asdf')).toThrow();
});

test('cat-file blob', () => {
    const buffer = Buffer.from('Hello, World!\nBeautiful day today!')
    mock.setRoot(mock.EMPTY());
    init();
    io.write('example.txt', buffer);
    const repo = GitRepository.find();
    const sha  = hashObject(repo, 'example.txt', undefined, true);
    expect(buffer.compare(catFile(repo, sha))).toEqual(0);
});