"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = __importDefault(require("commander"));
const init_1 = __importDefault(require("./init"));
const VERSION = '0.0.1';
commander_1.default
    .version(VERSION)
    .option('-C, --ChangeDir <path>', 'run as if wyag was started at <path>');
// Getting and Creating Projects
commander_1.default
    .command('init [path]')
    .description('Initialize a new, empty repository')
    .action((path) => init_1.default(path));
// Basic Snapshotting
commander_1.default
    .command('add')
    .action(() => { });
commander_1.default
    .command('commit')
    .action(() => { });
commander_1.default
    .command('rm')
    .action(() => { });
// Branching and Merging
commander_1.default
    .command('branch')
    .action(() => { });
commander_1.default
    .command('checkout')
    .action(() => { });
commander_1.default
    .command('merge')
    .action(() => { });
commander_1.default
    .command('log')
    .action(() => { });
commander_1.default
    .command('tag')
    .action(() => { });
// Plumbing Commands
commander_1.default
    .command('cat-file')
    .action(() => { });
commander_1.default
    .command('hash-object')
    .action(() => { });
commander_1.default
    .command('ls-tree')
    .action(() => { });
commander_1.default
    .command('rev-parse')
    .action(() => { });
commander_1.default
    .command('show-ref')
    .action(() => { });
commander_1.default.parse(process.argv);
