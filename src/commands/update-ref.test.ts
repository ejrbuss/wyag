import io from '../sync-io';
import mock from '../mock-io';
import init from './init';
import updateRef from './update-ref';

io.useMock();

test('update-ref new ref', () => {
    mock.setRoot(mock.EMPTY());
    const repo = init();
    updateRef(repo, 'refs/tags/a', 'aaa');
    updateRef(repo, 'refs/tags/b', 'bbb');
    updateRef(repo, 'refs/heads/c', 'ccc');
    expect(io.read('.git/refs/tags/a').toString()).toEqual('aaa');
    expect(io.read('.git/refs/tags/b').toString()).toEqual('bbb');
    expect(io.read('.git/refs/heads/c').toString()).toEqual('ccc');
});

test('update-ref change ref', () => {
    mock.setRoot(mock.EMPTY());
    const repo = init();
    updateRef(repo, 'refs/tags/a', 'aaa');
    updateRef(repo, 'refs/tags/a', 'abc');
    expect(io.read('.git/refs/tags/a').toString()).toEqual('abc');
});

test('update-ref nested ref', () => {
    mock.setRoot(mock.EMPTY());
    const repo = init();
    updateRef(repo, 'refs/tags/a/b/c', 'ccc');
    expect(io.read('.git/refs/tags/a/b/c').toString()).toEqual('ccc');
});