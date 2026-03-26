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
const axios_1 = __importDefault(require("axios"));
const form_data_1 = __importDefault(require("form-data"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
function testUploadAndFetch() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // 0. Login
            console.log('0. Logging in...');
            const loginRes = yield axios_1.default.post('http://localhost:4001/api/auth/login', {
                email: 'admin@example.com',
                password: 'admin123'
            });
            const token = loginRes.data.token;
            console.log('Login Success. Token acquired.');
            // 1. Prepare File
            // Try multiple paths to find the image
            let filePath = path_1.default.join(process.cwd().replace('server', 'client'), 'public', 'qix_logo.png');
            if (!fs_1.default.existsSync(filePath)) {
                // Fallback for different CWD structure
                filePath = path_1.default.join(process.cwd(), '../client/public/qix_logo.png');
            }
            if (!fs_1.default.existsSync(filePath)) {
                console.error('Source file not found:', filePath);
                console.error('CWD:', process.cwd());
                // List dir to help debug
                const clientPublic = path_1.default.join(process.cwd(), '../client/public');
                if (fs_1.default.existsSync(clientPublic)) {
                    console.log(`Contents of ${clientPublic}:`, fs_1.default.readdirSync(clientPublic));
                }
                return;
            }
            const form = new form_data_1.default();
            form.append('file', fs_1.default.createReadStream(filePath));
            console.log('1. Uploading file...');
            const uploadRes = yield axios_1.default.post('http://localhost:4001/api/upload', form, {
                headers: Object.assign(Object.assign({}, form.getHeaders()), { 'Authorization': `Bearer ${token}` })
            });
            console.log('Upload Success:', uploadRes.status);
            console.log('Response:', uploadRes.data);
            const fileUrl = uploadRes.data.url; // /uploads/filename
            const fullUrl = `http://localhost:4001/api${fileUrl}`;
            console.log(`2. Fetching uploaded file from: ${fullUrl}`);
            const getRes = yield axios_1.default.get(fullUrl);
            console.log('Fetch Success:', getRes.status);
            if (getRes.headers['content-type']) {
                console.log('Content-Type:', getRes.headers['content-type']);
            }
            console.log('Verification: The system is working correctly for NEW uploads.');
        }
        catch (err) {
            console.error('Error:', err.message);
            if (err.response) {
                console.error('Response Status:', err.response.status);
                console.error('Response Data:', err.response.data);
            }
        }
    });
}
testUploadAndFetch();
