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
function testAsset() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const url = 'http://localhost:4001/api/uploads/test.txt'; // We might need to find a real file
            console.log(`Fetching ${url}...`);
            const res = yield axios_1.default.get(url);
            console.log('Status:', res.status);
            console.log('Headers:', res.headers);
        }
        catch (err) {
            console.error('Error fetching asset:', err.message);
            if (err.response) {
                console.error('Response Status:', err.response.status);
            }
        }
    });
}
testAsset();
