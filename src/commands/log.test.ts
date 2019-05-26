import io            from '../sync-io';
import mock          from '../mock-io';
import init          from './init';
import hashObject    from './hash-object';
import GitRepository from '../GitRepository';

import log, { prettyPrintLog }           from './log';
import GitObject, { formats, GitCommit } from '../GitObject';

io.useMock();

// Commit Tree 1
// -> a

const tree1_a = 
`author Tester <tester@email.com> 1527025044 +0000
committer Tester <tester@email.com> 1527025044 +0000

Commit message for a`;

// Commit Tree 2
// -> a -> b -> d
//           -> c

const tree2_a = (shab: string, shac: string) =>
`parent ${shab}
parent ${shac}
author Tester <tester@email.com> 1527025044 +0000
committer Tester <tester@email.com> 1527025044 +0000

Commit message for a`;

const tree2_b = (shad: string) =>
`parent ${shad}
author Tester <tester@email.com> 1527025044 +0000
committer Tester <tester@email.com> 1527025044 +0000

Commit message for b`;

const tree2_c = 
`author Tester <tester@email.com> 1527025044 +0000
committer Tester <tester@email.com> 1527025044 +0000

Commit message for c`;

const tree2_d =
`author Tester <tester@email.com> 1527025044 +0000
committer Tester <tester@email.com> 1527025044 +0000

Commit message for d`;

test('log for tree 1', () => {
    mock.setRoot(mock.EMPTY());
    init();
    const repo = GitRepository.find();
    io.write('tree1_a', tree1_a);
    const shaa = hashObject(repo, 'tree1_a', formats.COMMIT, true);
    const a = GitObject.read(repo, shaa);
    expect(log(repo, shaa)).toMatchObject([a]);
});

test('log for tree 2', () => {
    mock.setRoot(mock.EMPTY());
    init();
    const repo = GitRepository.find();
    io.write('tree2_d', tree2_d);
    const shad = hashObject(repo, 'tree2_d', formats.COMMIT, true);
    io.write('tree2_c', tree2_c);
    const shac = hashObject(repo, 'tree2_c', formats.COMMIT, true);
    io.write('tree2_b', tree2_b(shad));
    const shab = hashObject(repo, 'tree2_b', formats.COMMIT, true);
    io.write('tree2_a', tree2_a(shab, shac));
    const shaa = hashObject(repo, 'tree2_a', formats.COMMIT, true);
    const a = GitObject.read(repo, shaa) as GitCommit;
    const b = GitObject.read(repo, shab) as GitCommit;
    const c = GitObject.read(repo, shac) as GitCommit;
    const d = GitObject.read(repo, shad) as GitCommit;
    expect(a.serialize().toString()).toEqual(tree2_a(shab, shac));
    expect(b.serialize().toString()).toEqual(tree2_b(shad));
    expect(c.serialize().toString()).toEqual(tree2_c);
    expect(d.serialize().toString()).toEqual(tree2_d);
    expect(log(repo, shaa)).toMatchObject([a, b, d, c]);
});

test('prettyPrintLog', () => {
    mock.setRoot(mock.EMPTY());
    init();
    const repo = GitRepository.find();
    io.write('tree2_d', tree2_d);
    const shad = hashObject(repo, 'tree2_d', formats.COMMIT, true);
    io.write('tree2_c', tree2_c);
    const shac = hashObject(repo, 'tree2_c', formats.COMMIT, true);
    io.write('tree2_b', tree2_b(shad));
    const shab = hashObject(repo, 'tree2_b', formats.COMMIT, true);
    io.write('tree2_a', tree2_a(shab, shac));
    const shaa = hashObject(repo, 'tree2_a', formats.COMMIT, true);
    expect(prettyPrintLog(log(repo, shaa))).toEqual(
`parent bffac3a5f2bdc2ffedb3f7fab92f80d5545c5f43
parent 19eff1dd8100d3011a16c203ce3ba5f63dc47bd4
author Tester <tester@email.com> 1527025044 +0000
committer Tester <tester@email.com> 1527025044 +0000

Commit message for a

parent 414078757744ff65e667495b093a437d88c5743b
author Tester <tester@email.com> 1527025044 +0000
committer Tester <tester@email.com> 1527025044 +0000

Commit message for b

author Tester <tester@email.com> 1527025044 +0000
committer Tester <tester@email.com> 1527025044 +0000

Commit message for d

author Tester <tester@email.com> 1527025044 +0000
committer Tester <tester@email.com> 1527025044 +0000

Commit message for c`
    );
})