import io   from './sync-io';
import mock from './mock-io';

io.useMock();

test('read', () => {
    const buffer = Buffer.from('Hello, World');
    mock.setRoot({
        name: '/',
        children: [{
            name: 'example.txt',
            data: buffer,
        }],
    });
    const readBuffer = io.read('example.txt')
    expect(buffer.compare(readBuffer)).toEqual(0);
});

test('write', () => {
    mock.setRoot({ name: '/', children: [] });
    const buffer = Buffer.from('Hello, World');
    io.write('example.txt', buffer);
    expect(mock.check({
        name: '/',
        children: [{
            name: 'example.txt',
            data: buffer,
        }],
    })).toBeTruthy();
});

test('append', () => {
    const buffer = Buffer.from('Hello');
    mock.setRoot({
        name: '/',
        children: [{
            name: 'example.txt',
            data: buffer,
        }],
    });
    io.append('example.txt', ', World');
    expect(mock.check({
        name: '/',
        children: [{
            name: 'example.txt',
            data: Buffer.from('Hello, World'),
        }],
    })).toEqual(true);

});

test('copy', () => {
    const buffer = Buffer.from('Hello, World');
    mock.setRoot({
        name: '/',
        children: [{
            name: 'example.txt',
            data: buffer,
        }],
    });
    io.copy('example.txt', '/example (copy).txt');
    expect(io.read('./example (copy).txt').compare(buffer)).toEqual(0);
});

test('exists', () => {
    mock.setRoot({
        name: '/',
        children: [{
            name: 'sub',
            children: [{
                name: 'example.txt'
            }]
        }],
    });
    expect(io.exists('.')).toEqual(true);
    expect(io.exists('/')).toEqual(true);
    expect(io.exists('sub')).toEqual(true);
    expect(io.exists('/sub')).toEqual(true);
    expect(io.exists('./sub')).toEqual(true);
    expect(io.exists('sub/example.txt')).toEqual(true);
    expect(io.exists('/sub/example.txt')).toEqual(true);
    expect(io.exists('./sub/example.txt')).toEqual(true);
    expect(io.exists('/subs')).toEqual(false);
    expect(io.exists('/subs/example.txt')).toEqual(false);
});

test('makeDir', () => {
    mock.setRoot({ name: '/', children: [] });
    io.makeDir('/a/b/c');
    expect(mock.check({
        name: '/',
        children: [{
            name: 'a',
            children: [{
                name: 'b',
                children: [{
                    name: 'c',
                    children: [],
                }]
            }]
        }]
    })).toEqual(true);
});

test('isDir', () => {
    mock.setRoot({
        name: '/',
        children: [{
            name: 'a',
            children: [{
                name: 'b',
                children: [{
                    name: 'c',
                    children: [{ 
                        name: 'd',
                    }, {
                        name: 'e',
                    }],
                }, {
                    name: 'f',
                }]
            }]
        }]
    });
    expect(io.isDir('/')).toEqual(true);
    expect(io.isDir('/a')).toEqual(true);
    expect(io.isDir('/a/b/')).toEqual(true);
    expect(io.isDir('/a/b/c')).toEqual(true);
    expect(io.isDir('/dir/a/')).toEqual(false);
    expect(io.isDir('/a/b/c/d')).toEqual(false);
    expect(io.isDir('/a/b/c/e')).toEqual(false);
    expect(io.isDir('/a/b/f')).toEqual(false);
});

test('isFile', () => {
    mock.setRoot({
        name: '/',
        children: [{
            name: 'a',
            children: [{
                name: 'b',
                children: [{
                    name: 'c',
                    children: [{ 
                        name: 'd',
                    }, {
                        name: 'e',
                    }],
                }, {
                    name: 'f',
                }]
            }]
        }]
    });
    expect(io.isFile('/')).toEqual(false);
    expect(io.isFile('/a')).toEqual(false);
    expect(io.isFile('/a/b/')).toEqual(false);
    expect(io.isFile('/a/b/c')).toEqual(false);
    expect(io.isFile('/dir/a/')).toEqual(false);
    expect(io.isFile('/a/b/c/d')).toEqual(true);
    expect(io.isFile('/a/b/c/e')).toEqual(true);
    expect(io.isFile('/a/b/f')).toEqual(true);
});

test('list', () => {
    mock.setRoot({
        name: '/',
        children: [{
            name: 'a',
            children: [{
                name: 'b',
                children: [{
                    name: 'c',
                    children: [{ 
                        name: 'd',
                    }, {
                        name: 'e',
                    }],
                }, {
                    name: 'f',
                }]
            }]
        }]
    });
    expect(io.list('/')).toMatchObject(['a']);
    expect(io.list('/a/b')).toMatchObject(['c', 'f']);
    expect(io.list('/a/b/c')).toMatchObject(['d', 'e']);
    expect(() => io.list('dir/a')).toThrow();
});

test('path', () => {
    expect(/\/?a\/b\/c/.test(io.path(['a', 'b', 'c']))).toEqual(true);
    expect(/\/?a\/b\/?/.test(io.path(['a', 'b', 'c', '..', '.']))).toEqual(true);
});