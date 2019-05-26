import program       from 'commander';
import GitRepository from './GitRepository';
import init          from './commands/init';
import catFile       from './commands/cat-file';
import hashObject    from './commands/hash-object';
import lsTree        from './commands/ls-tree';
import updateRef     from './commands/update-ref';
import tag           from './commands/tag';

import log, { prettyPrintLog } from './commands/log';
import showRef, { lsRef }     from './commands/show-ref';

const VERSION = '0.0.1';

program
    .version(VERSION);

// Getting and Creating Projects
program
    .command('init [path]')
    .description('Initialize a new, empty repository')
    .action((path) => 
        init(path)
    );

// Basic Snapshotting
program
    .command('add')
    .action(() => {});
program
    .command('commit')
    .action(() => {});
program
    .command('rm')
    .action(() => {});

// Branching and Merging
program
    .command('branch')
    .action(() => {});
program
    .command('checkout')
    .action(() => {});
program
    .command('merge')
    .action(() => {});
program
    .command('log [commit]')
    .action((commit) => 
        console.log(prettyPrintLog(log(GitRepository.find(), commit)))
    );

program
    .command('tag [name] [object]')
    .action((name, object) => 
        console.log(tag(GitRepository.find(), name, object))
    );

// Plumbing Commands
program
    .command('cat-file <object>')
    .option('-t --type [type]', 'specify the type')
    .action((object, cmd) => 
        process.stdout.write(catFile(GitRepository.find(), object, Buffer.from(cmd.type)))
    );
program
    .command('hash-object <path>')
    .option('-t --type [type]', 'specify the type')
    .option('-w --wrtie', 'actually write the object into the database')
    .action((path, cmd) => 
        console.log(hashObject(GitRepository.find(), path, cmd.type, cmd.write))
    );
program
    .command('write-tree')
    .action(() => {});
program
    .command('ls-tree <tree>')
    .action((tree) => 
        console.log(lsTree(GitRepository.find(), tree))
    );
program
    .command('rev-parse')
    .action(() => {});
program
    .command('update-ref <path> <object>')
    .action((path, object) => updateRef(GitRepository.find(), path, object));
program
    .command('show-ref [path]')
    .action((path) => {
        const repo = GitRepository.find();
        if (path) {
            console.log(showRef(repo, lsRef(repo, path)));
        } else {
            console.log(showRef(repo));
        }
    });

program.parse(process.argv);