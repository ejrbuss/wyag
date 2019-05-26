import io   from '../sync-io';
import mock from '../mock-io';
import init from './init';

io.useMock();

test('init no directory', () => {
    mock.setRoot(mock.EMPTY());
    init('repository');
    expect(mock.tree({
        name: '/',
        children: [{
            name: 'repository',
            children: [ mock.BASEGIT() ],
        }],
    })).toEqual(mock.tree());
});

test('init empty directory', () => {
    mock.setRoot(mock.EMPTY());
    io.makeDir('repository');
    init('repository');
    expect(mock.tree({
        name: '/',
        children: [{
            name: 'repository',
            children: [ mock.BASEGIT() ],
        }],
    })).toEqual(mock.tree());
});

test('init non-empty directory', () => {
    mock.setRoot(mock.EMPTY());
    io.makeDir('repository');
    io.write('repository/example.txt', 'Hello, World');
    init('repository');
    expect(mock.tree({
        name: '/',
        children: [{
            name: 'repository',
            children: [ 
                mock.BASEGIT(),
                {
                    name: 'example.txt',
                    data: Buffer.from('Hello, World'),
                },
            ],
        }],
    })).toEqual(mock.tree());
});

test('init non-empty directory', () => {
    mock.setRoot(mock.EMPTY());
    io.makeDir('repository');
    io.makeDir('./repository/.git');
    io.write('repository/example.txt', 'Hello, World');
    expect(() => init('repository')).toThrow();
});