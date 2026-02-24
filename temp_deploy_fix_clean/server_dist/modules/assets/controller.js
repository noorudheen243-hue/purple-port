"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteAsset = exports.approveAsset = exports.uploadAsset = void 0;
const assetService = __importStar(require("./service"));
const uploadAsset = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { task_id, original_name, file_url, file_type, size_bytes } = req.body;
        if (!task_id || !file_url) {
            return res.status(400).json({ message: 'Task ID and file URL are required' });
        }
        const asset = yield assetService.createAsset({
            original_name: original_name || 'unknown',
            file_url,
            file_type: file_type || 'application/octet-stream',
            size_bytes: size_bytes || 0,
            task_id,
            uploader_id: req.user.id
        });
        res.status(201).json(asset);
    }
    catch (error) {
        console.error('Asset creation error:', error);
        res.status(500).json({ message: error.message });
    }
});
exports.uploadAsset = uploadAsset;
const approveAsset = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { is_approved } = req.body;
        const asset = yield assetService.approveAsset(req.params.id, is_approved);
        res.json(asset);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.approveAsset = approveAsset;
const deleteAsset = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield assetService.deleteAsset(req.params.id);
        res.json({ message: 'Asset deleted' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.deleteAsset = deleteAsset;
