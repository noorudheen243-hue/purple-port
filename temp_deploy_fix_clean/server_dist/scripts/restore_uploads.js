"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const SOURCE_DIR = path_1.default.join('f:', 'Antigravity', 'deploy_package', 'server', 'uploads');
const DEST_DIR = path_1.default.join(__dirname, '..', '..', 'uploads'); // f:\Antigravity\server\uploads
function restoreUploads() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log(`Source: ${SOURCE_DIR}`);
        console.log(`Dest: ${DEST_DIR}`);
        if (!fs_1.default.existsSync(SOURCE_DIR)) {
            console.error('Source directory does not exist!');
            return;
        }
        if (!fs_1.default.existsSync(DEST_DIR)) {
            console.log('Creating destination directory...');
            fs_1.default.mkdirSync(DEST_DIR, { recursive: true });
        }
        const files = fs_1.default.readdirSync(SOURCE_DIR);
        let count = 0;
        let skipped = 0;
        for (const file of files) {
            const srcFile = path_1.default.join(SOURCE_DIR, file);
            const destFile = path_1.default.join(DEST_DIR, file);
            if (fs_1.default.lstatSync(srcFile).isDirectory())
                continue;
            if (!fs_1.default.existsSync(destFile)) {
                fs_1.default.copyFileSync(srcFile, destFile);
                count++;
            }
            else {
                skipped++;
            }
        }
        console.log(`Restoration Complete.`);
        console.log(`- Copied: ${count} files`);
        console.log(`- Skipped: ${skipped} files (already existed)`);
    });
}
restoreUploads();
