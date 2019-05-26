type MockNode = MockFile | MockDir;
type WeakMockNode = WeakMockFile | WeakMockDir;

interface MockFile {
    name: string;
    data: Buffer;
    parent: MockDir;
    children?: undefined;
}

interface WeakMockFile {
    name: string;
    data?: Buffer;
    parent?: WeakMockDir;
    children?: undefined;
}

interface MockDir {
    name: string;
    data?: undefined;
    parent?: MockDir;
    children: MockNode[];
}

interface WeakMockDir {
    name: string;
    data?: undefined;
    parent?: WeakMockDir;
    children: WeakMockNode[];
}

const EMPTY = (): MockDir => ({
    name: '/',
    children: [],
});

const BASEGIT= (): WeakMockNode => ({
    name: '.git',
    children: [{
        name: 'branches',
        children: [],
    }, {
        name: 'objects',
        children: [],
    }, {
        name: 'refs',
        children: [{
            name: 'tags',
            children: [],
        }, {
            name: 'heads',
            children: [],
        }],
    }, {
        name: 'HEAD',
        data: Buffer.from('ref: refs/heads/master\n'),
    }, {
        name: 'config',
        data: Buffer.from('[core]\nrepositoryformatversion=0\nfilemode=false\nbare=false\n'),
    }],
});

let root: MockDir = EMPTY();

const find = (path: string, makeDir: boolean = false, makeFile: boolean = false) => {
    path = mock.path([path]);
    if (path.startsWith('/')) {
        path = path.substr(1);
    }
    const segments = path
        .split('/')
        .filter(segment => segment !== '');
    return findNode(root, segments, makeDir, makeFile);
};

const findNode = (node: MockNode, segments: string[], makeDir: boolean, makeFile: boolean): MockNode | undefined => {
    if (segments.length === 0) {
        return node;
    }

    const [name] = segments;

    // Directory
    if (node.children) {
        for (const child of node.children) {
            if (child.name === name) {
                // Base Case
                if (segments.length === 1) {
                    return child;
                }
                // Recursive case
                return findNode(child, segments.slice(1), makeDir, makeFile);
            }
        }
        // Child not found

        // Base Case
        if (segments.length === 1) {
            if (makeFile) {
                const child = { name, parent: node, data: Buffer.from('') };
                node.children.push(child);
                return child;
            }
        }
        if (makeDir) {
            const child = { name, children: [] };
            node.children.push(child);
            return findNode(child, segments.slice(1), makeDir, makeFile);
        }
    }

};

const read = (path: string) => {
    const node = find(path);
    if (!node || !node.data) {
        throw new Error(`${path} is not a file!`);
    }
    return node.data;
};

const write = (path: string, data: Buffer | string) => {
    if (!(data instanceof Buffer)) {
        data = Buffer.from(data);
    }
    const node = find(path, false, true);
    if (!node || !node.data) {
        throw new Error(`${path} cannot be created!`);
    } 
    node.data = Buffer.from(data);
};

const append = (path: string, data: Buffer | string) => {
    if (!(data instanceof Buffer)) {
        data = Buffer.from(data);
    }
    const node = find(path, false, true);
    if (!node || !node.data) {
        throw new Error(`${path} cannot be created!`);        
    }
    node.data = Buffer.concat([node.data, Buffer.from(data)]);
};

const copy = (src: string, dest: string) => {
    const srcNode = find(src);
    if (!srcNode || !srcNode.data) {
        throw new Error(`${src} is not a file!`);
    }
    const destNode = find(dest, false, true);
    if (!destNode || !destNode.data) {
        throw new Error(`${dest} cannot be created!`);        
    }
    destNode.data = srcNode.data;
};

const exists = (path: string) => {
    return find(path) ? true : false;
};

const makeDir = (path: string) => {
    path = mock.path([path, 'NOT_A_FILE']);
    const node = find(path, true, true);
    if (node && node.data) {
        // Remove NOT_A_FILE
        node.parent.children.pop();
    }
};

const isDir = (path: string) => {
    const node = find(path);
    return (node && node.children) ? true : false;
};

const isFile = (path: string) => {
    const node = find(path);
    return (node && node.data) ? true : false;
};

const list = (path: string) => {
    const node = find(path);
    if (!node || !node.children) {
        throw new Error(`${path} is not a directory!`);
    }
    return node.children.map(child => child.name);
};

const path = (paths: string[]): string => {
    return paths.join('/')
        .replace(/\/\.\/|^\.\/|\/\.$|^\.$/g, '/')
        .replace(/\/\//g, '/')
        .replace(/[^/]*\/\.\./g, '')
        .replace(/\/\//g, '/');
};

const tree = (weakNode?: WeakMockNode, level: number = 0): string => {
    if (!weakNode) {
        weakNode = root;
    }
    let node = makeStrong(weakNode);
    if (node.children && node.children.length === 1 && node.children[0].children) {
        const [child] = node.children;
        return tree({ name: path([node.name, child.name]), children: child.children }, level);
    }
    let raw = '  '.repeat(level) + node.name;
    if (node.children) {
        raw += '\n';
        node.children.sort((a, b) => a.name.localeCompare(b.name)).forEach(node => {
            raw += tree(node, level + 1)
        });
    } else {
        raw += ' | ' + node.data.toString('utf-8').replace(/\n/g, '\\n') + '\n';
    }
    return raw;
};

const equal = (node1: MockNode, node2: MockNode): boolean => {
    return tree(node1) === tree(node2);
};

const check = (node: WeakMockNode) => {
    const strongNode = makeStrong(node);
    return equal(root, strongNode);
};

const setRoot = (node: WeakMockDir) => {
    root = makeStrong(node) as any;
};

const getRoot = () => {
    return root;
};

const makeStrong = (node: WeakMockNode, parent?: MockDir): MockNode => {
    if (node.children) {
        const newNode: MockNode = {
            name: node.name,
            parent: parent,
            children: [],
        };
        newNode.children = node.children.map(child => makeStrong(child, newNode));
        return newNode;
    } else {
        if (!parent && !node.parent) {
            throw new Error('Cannot make a parentless file strong!');
        }
        return {
            name: node.name,
            data: node.data || Buffer.from(''),
            parent: (parent || node.parent) as MockDir,
        }
    }
}

const mock = {
    EMPTY,
    BASEGIT,
    tree,
    read,
    write,
    append,
    copy,
    exists,
    makeDir,
    isDir,
    isFile,
    list,
    path,
    equal,
    check,
    setRoot,
};

export default mock;