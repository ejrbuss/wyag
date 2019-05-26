import io from '../sync-io';
import mock from '../mock-io';
import init from './init';
import updateRef from './update-ref';
import showRef from './show-ref';

io.useMock();

test('show-refs', () => {
    mock.setRoot(mock.EMPTY());
    const repo = init();
    updateRef(repo, 'refs/tags/a', 'aaa');
    updateRef(repo, 'refs/tags/b', 'bbb');
    updateRef(repo, 'refs/tags/c/d', 'ddd');
    updateRef(repo, 'refs/tags/c/e', 'eee');
    updateRef(repo, 'refs/tags/f', 'fff');
    expect(showRef(repo)).toEqual(
`aaa refs/tags/a
bbb refs/tags/b
ddd refs/tags/c/d
eee refs/tags/c/e
fff refs/tags/f`
    );
});