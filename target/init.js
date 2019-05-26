"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const GitRepository_1 = __importDefault(require("./GitRepository"));
function init(path = '.') {
    GitRepository_1.default.init(path);
}
exports.default = init;
;
