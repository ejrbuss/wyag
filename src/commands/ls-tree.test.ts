import lsTree from './ls-tree';
import io from '../sync-io';
import mock from '../mock-io';
import init from './init';
import hashObject from './hash-object';
import GitRepository from '../GitRepository';
import GitObject, { modes, GitTree } from '../GitObject';

io.useMock();

test('ls-tree', () => {
    mock.setRoot(mock.EMPTY());
    init();
    io.makeDir('sub');
    const repo = GitRepository.find();
    io.write('a', 'aaa');
    const shaa = hashObject(repo, 'a', undefined, true);
    io.write('b', 'bbb');
    const shab = hashObject(repo, 'b', undefined, true);
    io.write('sub/c', 'bbb');
    const shac = hashObject(repo, 'sub/c', undefined, true);
    io.write('sub/d', 'ddd');
    const shad = hashObject(repo, 'sub/d', undefined, true);
    const subtreeObject = new GitTree(repo);
    subtreeObject.leaves = [
        { mode: modes.blob, path: 'c', sha: shac }, 
        { mode: modes.blob, path: 'd', sha: shad },
    ];
    const shasubtree = subtreeObject.write();
    expect(lsTree(repo, shasubtree)).toEqual(
`100644 blob 01f02e32ce8a128dd7b1d16a45f2eff66ec23c2d\tc
100644 blob 69ec23d1a006975ab676e94ad2d8166405758314\td`
    );
    const treeObject = new GitTree(repo);
    treeObject.leaves = [
        { mode: modes.blob, path: 'a', sha: shaa },
        { mode: modes.blob, path: 'b', sha: shab },
        { mode: modes.directory, path: 'sub', sha: shasubtree }
    ];
    const shatree = treeObject.write();
    expect(lsTree(repo, shatree)).toEqual(
`100644 blob 7c4a013e52c76442ab80ee5572399a30373600a2\ta
100644 blob 01f02e32ce8a128dd7b1d16a45f2eff66ec23c2d\tb
040000 tree 51f49c6afa1ca514c028b79c95d9f8da9345e6e1\tsub`
    );
});