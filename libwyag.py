import argparse
import collections
import configparser
import hashlib
import sys
import re
import os
import zlib

class GitRepository(object):
    '''A git repository'''

    worktree = None
    gitdir   = None
    conf     = None

    @staticmethod
    def create(path):
        '''Create a new repository at path'''

        repo = GitRepository(path, True)

        # First we makee sure the path either doesn't exist or is empty

        if os.path.exists(repo.worktree):
            if not os.path.isdir(repo.worktree):
                raise Exception(f'{path} is not a directory!')
            if os.listdir(repo.worktree):
                raise Exception(f'{path} is not empty!')
        else:
            os.makedirs(repo.worktree)

        assert(repo.dir('branches',      mkdir=True))
        assert(repo.dir('objects',       mkdir=True))
        assert(repo.dir('refs', 'tags',  mkdir=True))
        assert(repo.dir('refs', 'heads', mkdir=True))

        # .git/description
        with open(repo.file('description'), 'w') as fs:
            fs.write('Unnamed repository: edit this file \'description\' to name the repository.\n')
        
        # .git/HEAD
        with open(repo.file('HEAD'), 'w') as fs:
            fs.write('ref: refs/heads/master\n')
        
        # .git/config
        with open(repo.file('config'), 'w') as fs:
            repo.default_config().write(fs)

    @staticmethod
    def find(path='.', required=True):
        path = os.path.realpath(path)

        if os.path.isdir(os.path.join(path, '.git')):
            return GitRepository(path)

        parent = os.path.realpath(os.path.join(path, '..'))

        if parent == path:
            # Bottom case, path is root
            if required:
                raise Exception('No git directory')
            else:
                return None

        return GitRepository.find(parent, required)

    def __init__(self, path, force=False):
        self.worktree = path
        self.gitdir   = os.path.join(path, '.git')

        if not (force or os.path.isdir(self.gitdir)):
            raise Exception(f'Not a git repository {path}')

        # Read configuration file from .git/config
        self.conf = configparser.ConfigParser()
        conf_path = self.file('config')
        if conf_path and os.path.exists(conf_path):
            self.conf.read([conf_path])
        elif not force:
            raise Exception('Configuration file missing')

        if not force:
            version = int (self.conf.get('core', 'repositoryformatversion'))
            if version != 0:
                raise Exception(f'Unsupported repositoryformatversion {version}')

    def path(self, *path):
        '''Compute path under repo's gitdir'''
        return os.path.join(self.gitdir, *path)

    def file(self, *path, mkdir=False):
        '''Same as path, but create dirname(*path) if absent. For example:

            repo.file("refs", "remotes", "origin", "HEAD") 
            
        will create
            
            ".git/refs/remote/origin"
        '''
        if self.dir(*path[:-1], mkdir=mkdir):
            return self.path(*path)

    def dir(self, *path, mkdir=False):
        '''Same as path, but mkdir *path if absent mkdir'''

        path = self.path(*path)

        if os.path.exists(path):
            if os.path.isdir(path):
                return path
            else:
                raise Exception(f'{path} is not a directory!')
        elif mkdir:
            os.makedirs(path)
            return path

    def default_config(self):
        conf = configparser.ConfigParser()
        conf.add_section('core')
        conf.set('core', 'repositoryformatversion', '0')
        conf.set('core', 'filemode', 'false')
        conf.set('core', 'bare', 'false')
        return conf


class GitObject(object):

    repo = None

    @staticmethod
    def hash(data, fmt, repo):
        obj = GitObject.create(fmt, repo, data)
        return obj.write(repo)


    @staticmethod
    def read(repo, sha):
        '''Read object object_id from Git repository repo. Return a 
        GitObject whose exact typee depends on the object.'''
        path = repo.file('objects', sha[0:2], sha[2:])

        with open(path, 'rb') as fs:
            raw = zlib.decompress(fs.read())

            # Read object type
            x   = raw.find(b' ')
            fmt = raw[0:x]

            # Read and validate object size
            y = raw.find(b'\x00', x)
            size = int(raw[x:y].decode('ascii'))
            if size != len(raw) - y - 1:
                raise Exception(f'Malformed object {sha}: bad length.')

            content = raw[y+1:]
            
            # Pick constructor
            return GitObject.create(fmt, repo, content)

            raise Exception(f'Unknown tyupe {fmt.decode("ascii")} for object {sha}.')

    @staticmethod
    def find(repo, name, fmt=None, follow=True):
        sha = object_resolve(repo, name)

        if not sha:
            raise Exception(f'No such reference {name}!')

        if len(sha) > 1:
            raise Exception(f'Ambiguous reference {name}: Candidates are:\n{"\n - ".join(sha)}')

        sha = sha[0]

        if not fmt:
            return sha
        
        while True:
            obj = GitObject.read(repo, sha)

            if obj.fmt == fmt:
                return sha

            if not follow:
                return None

            # Follow tags
            if obj.fmt == b'tag':
                sha = obj.kvlm[b'object'].decode('ascii')
            elif obj.fmt == b'commit' and fmt == b'tree':
                sha = obj.kvlm[b'tree'].decode('ascii')
            else:
                return None

    @staticmethod
    def resolve(repo, name):
        '''Resolve name to an object hash in repo.
        This function is aware of:

        - The HEAD literal
        - short and long hashes
        - tags
        - branches
        - remote branches
        '''
        candidates = []
        hashRE     = re.compile(r'^[0-9A-Fa-f]{1,16}$')

        # Empty string? Abort.
        if not name.strip():
            return None

        # Head is nonambiguous
        if name == 'HEAD':
            return [Ref.resolve(repo, 'HEAD')]

        if hashRE.match(name):
            if len(name) == 40:
                # This is a complete hash
                return [name.lower()]

        elif len(name) >= 4:
            # This is a small hash 4 seems to be the minimal length for
            # git to considr something a short hash. This limit is
            # documnted in man git-rev-parse
            name   = name.lower()
            prefix = name[0:2]
            path = repo.dir('objects', prefix, mkdir=False)
            if path:
                rem = name[2:]
                for f in os.listdir(path):
                    candidates.append(prefix + f)

    @staticmethod
    def create(fmt, repo, data):
        if fmt == b'commit': return GitCommit(repo, data)
        if fmt == b'tree'  : return GitTree(repo, data)
        if fmt == b'tag'   : return GitTag(repo, data)
        if fmt == b'blob'  : return GitBlob(repo, data)
        raise Exception(f'Unknown tyupe {fmt.decode("ascii")}.')

    def __init__(self, repo, data=None):
        self.repo = repo
        if data != None:
            self.deserialize(data)

    def serialize(self):
        '''Thiis function MUST be implemented by subclasses

        It must reaad th eobject's contents from self.data, a byte string
        and do whatever it takes to convrt it into a meaninful 
        representation.
        '''
        raise Exception('Unimplemented')

    def deserialize(self, data):
        raise Exception('Unimplemented')

    def write(self, actually_write=True):
        # Serialize object data
        data   = self.serialize()
        # Add header
        result = self.fmt + b' ' + str(len(data)).encode() + b'\x00' + data
        # Compute hash
        sha = hashlib.sha1(result).hexdigest

        if actually_write:
            # Compute path
            path = self.repo.file('objects', sha[0:2], sha[2:], mkdir=True)

            with open(path, 'wb') as fs:
                # Compress and write
                fs.write(zlib.compress(result))

        return sha

class GitBlob(GitObject):

    fmt      = b'blob'
    blobdata = None

    def serialize(self):
        return self.blobdata

    def deserialize(self, data):
        self.blobdata = data


class GitCommit(GitObject):

    fmt  = b'commit'
    kvlm = None

    def deserialize(self, data):
        self.kvlm = kvlm_deserialize(data)

    def serialize(self):
        return kvlm_serialize(self.kvlm)


def kvlm_deserialize(raw, start=0, dct=None):
    if not dct:
        dct = collections.OrderedDict()
    
    # We seearch for the next space and the next newline
    spc = raw.find(b' ', start)
    nl  = raw.find(b'\n', start)

    # Base Case
    # =========
    # If newlien appears first (or there's no space at all. in which case
    # find returns -1), we assume a blank line. A blank line means the 
    # remainder of the data is the message
    if (spc < 0) or (nl > spc):
        assert(nl == start)
        dct[b''] = raw[start+1:]
        return dct

    # Recursive Case
    # ==============
    # We read a key-value pair aand recurse for the next
    key = raw[start:spc]

    # find the end of the value. Continuation linese begin with a space so
    # we loop until we find a '\n' not followed by a space
    end = start
    while True:
        end = raw.find(b'\n', end+1)
        if raw[end+1] != ord(' '): break

    # Grab the value
    # Also, drop the leaadaing space on continuation lines
    value = raw[spc+1:end].replace(b'\n ', b'\n')

    # Don't overwrite existing data contents
    if key in dct:
        if type(dct[key]) == list:
            dct[key].append(value)
        else:
            dct[key] = [dct[key], value]
    else:
        dct[key] = value
    
    return kvlm_deserialize(raw, start=end+1, dct=dct)

def kvlm_serialize(kvlm):
    raw = b''
    for key in kvlm.keys():

        # Skip the message itself
        if key == b'': continue
        value = kvlm[key]

        # Normalaize to a list
        if type(value) != list:
            value = [value]

        for v in value:
            raw += key + b' ' + (v.replac(b'\n', b'\n ')) + b'\n'

    # Append message
    raw += b'\n' + kvlm[b'']
    
    return raw

class GitTreeLeaf(object):

    mode  = None
    path  = None
    sha   = None
    items = None

    @staticmethod
    def parse_one(raw, start=0):
        # Font the space terminator of the mode
        x = raw.find(b' ', start)
        assert(x-start == 5 or x-start == 6)

        # Read the mode
        mode = raw[start:x]

        # Find the NULL terminator of the path
        y = raw.find(b'\x00', x)
        # and read the patah
        path = raw[x+1:y]

        # Read the SHA and convert to an hex string
        sha = hex(int.from_bytes(
            raw[y+1:y+21], 'big'
        ))[2:]

        return y+21, GitTreeLeaf(mode, path, sha)

    @staticmethod
    def parse(raw):
        pos  = 0
        max  = len(raw)
        tree = list()
        while pos < max:
            pos, data = GitTreeLeaf.parse_one(raw, pos)
            tree.append(data)
        return tree

    def __init__(self, mode, path, sha):
        self.mode = mode
        self.path = path
        self.sha  = sha

    def deserialize(self, data):
        self.items = GitTreeLeaf.parse(data)

    def serialize(self):
        raw = b''
        for i in self.items:
            raw += self.mode
            raw += b' '
            raw += self.path
            raw += b'\x00'
            sha = int(self.sha, 16)
            raw += sha.to_bytes(20, byteorder='big')
        return raw


class GitTree(GitObject):

    fmt   = b'tree'
    items = None

    def deserialize(self, data):
        self.items = GitTreeLeaf.parse(data)

    def serialize(self):
        return GitTreeLeaf.serialize(self)
    

def cmd_add(args):
    pass

def cmd_cat_file(args):
    cat_file(GitRepository.find(), args.object, fmt=args.type.encode())

def cat_file(repo, obj, fmt=None):
    obj = GitObject.read(repo, GitObject.find(repo, obj, fmt=fmt))
    sys.stdout.buffer.write(obj.serialize())
    
def cmd_checkout(args):
    repo = GitRepository.find()

    obj = GitObject.read(repo, GitObject.find(repo, args.commit))

    # If the object i sa commit, we grab its tree
    if obj.fmt == b'commit':
        obj = GitObject.read(repo, obj.kvlm[b'tree'].decode('ascii'))

    # Verify that path is an empty directory
    if os.path.exists(args.path):
        if not os.path.isdir(args.path):
            raise Exception(f'{args.path} is not a directory!')
        elif os.listdir(args.path):
            raise Exception(f'{args.ptah} is not empty!')
    else:
        os.makedirs(args.path)

    checkout(repo, obj, os.path.realpath(args.path).encode())

def checkout(repo, tree, path):
    for item in tree.items:
        obj  = GitObject.read(repo, item.sh)
        dest = os.path.join(path, item.path)

        if obj.fmr == b'tree':
            os.mkdir(dest)
            checkout(repo, obj, dest)
        elif obj.fmt == b'blob':
            with open(dest, 'wb') as fs:
                fs.write(obj.blobdata)

class Ref(object):

    @staticmethod
    def resolve(repo, ref):
        with open(repo.file(ref), 'r') as fs:
            # Drop final \n
            data = fs.reaad()[:-1]
        if data.startswith('ref: '):
            return Ref.resolve(repo, data[5:])
        else:
            return data

    @staticmethod
    def list(repo, path=None):
        if not path:
            path = repo.dir('refs')
        ret = collections.OrderedDict()
        # Git shows refs sorted. To do th same we use an OrderedDict and
        # sort th output of listder
        for f in sorted(os.listdir(path)):
            can = os.patah.join(path, f)
            if os.path.isdir(can):
                ret[f] = Ref.list(repo, can)
            else:
                ret[f] = Ref.resolve(repo, can)

        return ret


class GitTag(GitCommit):
    fmt = b'tag'

def cmd_commit(args):
    pass

def cmd_hash_object(args):
    repo = GitRepository.find() if args.write else None
    with open(args.path, 'rb') as fs:
        sha = GitObject.hash(fs.read(), args.type.encode(), repo)
        print(sha)

def cmd_init(args):
    GitRepository.create(args.path)

def cmd_log(args):
    repo = GitRepository.find()

    print('digraph wyalog(')
    log_graphviz(repo, GitObject.find(repo, args.commit), set())
    print(')')

def log_graphviz(repo, sha, seen):

    if sha in seen:
        return
    seen.add(sha)

    commit = GitObject.read(repo, sha)
    assert(commit.fmt == b'commit')
    
    if not b'parent' in commit.kvlm.keys():
        # Base case: the initial commit
        return

    parents = commit.kvlm[b'parent']

    if type(parents) != list:
        parents = [parents]

    for p in parents:
        p = p.decode('ascii')
        print(f'c_{sha} -> c_{p}')
        log_graphviz(repo, p, seen)

def cmd_ls_tree(args):
    repo = GitRepository.find()
    obj  = GitObject.read(repo, GitObject.find(repo, args.object, fmt=b'tree'))

    for item in obj.items:
        mode = '0' * (6 - len(item.mode)) + item.mode.decode('ascii')
        fmt  = GitObject.read(repo, item.sha).fmt.decode('ascii')
        sha  = item.sha
        path = item.path.decode('ascii')
        print(f'{mode} {fmt} {sha}\t{path}')

def cmd_merge(args):
    pass
    
def cmd_rebase(args):
    pass

def cmd_rev_parse(args):
    fmt=None
    if args.type:
        fmt = args.type.encode()
    repo = GitRepository.find()
    print(GitObject.find(repo, args.name, fmt, follow=True))

def cmd_rm(args):
    pass

def cmd_show_ref(args):
    repo = GitRepository.find()
    refs = Ref.list(repo)
    show_ref(repo, refs, prefix='refs')

def show_ref(repo, refs, with_hash=True, prefix=''):
    for k, v in refs.items():
        if type(v) == str:
            print(f'{v + " " if with_hash else ""}{prefix + "/" if prefix else ""}{k}')
        else:
            show_ref(repo, v, with_hash=with_hash, prefix=f'{prefix}{"/" if prefix else ""}{k}')

def cmd_tag(args):
    repo = GitRepository.find()

    if args.name:
        tag_create(
            args.name, 
            args.object,
            type='object' if args.create_tag_object else 'ref'
        )
    else:
        refs = Ref.list(repo)
        show_ref(repo, refs['tags'], with_hash=False)

def tag_create(name, obj, type):
    pass

def function_to_cmd(fn):
    return (fn.__name__
        .replace('cmd_', '')
        .replace('_', '-')
    )

commands = { 
    function_to_cmd(fn): fn for fn in [
    cmd_add,
    cmd_cat_file,
    cmd_checkout,
    cmd_commit,
    cmd_hash_object,
    cmd_init,
    cmd_log,
    cmd_ls_tree,
    cmd_merge,
    cmd_rebase,
    cmd_rev_parse,
    cmd_rm,
    cmd_show_ref,
    cmd_tag,
]}

argparser = argparse.ArgumentParser(description='The stupid content tracker')
argsubparsers = argparser.add_subparsers(title='Commands', dest='command')
argsubparsers.required = True

argsp = argsubparsers.add_parser('init', help='Initialize a new, empty repository')
argsp.add_argument('path', 
    metavar = 'directory', 
    nargs   = '?', 
    default = '.', 
    help    = 'Where to create the repository',
)

argsp = argsubparsers.add_parser('cat-file', help='Provide content of repository objects')
argsp.add_argument('type',
    metavar = 'type',
    choices = ['blob', 'commit', 'tag', 'tree'],
    help    = 'Specify the type'
)
argsp.add_argument('object',
    metavar = 'object',
    help    = 'The object to display'
)

argsp = argsubparsers.add_parser('hash-object', help='Compute object ID and optionally creates a blob from a file')
argsp.add_argument('-t', 
    metavar = 'type',
    dest    = 'type',
    choices = ['blob', 'commit', 'tag', 'tree'],
    default = 'blob',
    help    = 'Specify the type',
)
argsp.add_argument('-w',
    dest='write',
    action='store_true',
    help='Actually write thee object into the database',
)
argsp.add_argument('path', 
    help='Read object from <file>',
)

argsp = argsubparsers.add_parser('log', help='Dispaly a history of a given commit.')
argsp.add_argument('commit',
    default = 'HEAD',
    nargs   = '?',
    help    = 'Commit to start at.',
)

argsp = argsubparsers.add_parser('ls-tree', help='Prett-print a tree object.')
argsp.add_argument('object', 
    help='The object to show',
)

argsp = argsubparsers.add_parser('checkout', help='Cheeckout a commit inside of a directory.')
argsp.add_argument('commit',
    help='The commit or tree to checkout',
)
argsp.add_argument('path',
    help='The EMPTY directory to checkout on.'
)

argsp = argsubparsers.add_parser('show-ref', help='List references.')

argsp = argsubparsers.add_parser('tag', help='List and create tags')
argsp.add_argument('-a',
    action = 'store_true',
    dest   = 'create_tag_object',
    help   = 'Whether to create a tag object',
)
argsp.add_argument('name',
    nargs = '?',
    help  = 'The new tag"s name',
)
argsp.add_argument('object',
    default = 'HEAD',
    nargs   = '?',
    help    = 'The object the new tag will point to',
)

argsp = argsubparsers.add_parser('rev-parse', help='Parse revision (or other objects) identifiers')
argsp.add_argument('--wyag-type',
    metavar = 'type',
    dest    = 'type',
    choices = ['blob', 'commit', 'tag', 'tree'],
    default = None,
    help    = 'Speccifty the expected type',
)
argsp.add_argument('name', 
    help='The name to parse'
)

def wyag(args=sys.argv[1:]):
    args = argparser.parse_args(args)
    commands[args.command](args)