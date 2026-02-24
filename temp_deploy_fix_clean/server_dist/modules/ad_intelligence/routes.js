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
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const middleware_1 = require("../auth/middleware");
const controller = __importStar(require("./controller"));
const router = (0, express_1.Router)();
router.use(middleware_1.protect);
// Trigger manual sync (Admin/Manager)
router.post('/sync', (0, middleware_1.authorize)('ADMIN', 'MANAGER'), controller.triggerSync);
// Meta OAuth
router.get('/meta-auth', controller.getMetaAuthUrl);
router.post('/meta-callback', controller.handleMetaCallback);
// Meta Account Management
router.get('/remote-accounts', (0, middleware_1.authorize)('ADMIN', 'MANAGER'), controller.listRemoteAdAccounts);
router.post('/link-account', (0, middleware_1.authorize)('ADMIN', 'MANAGER'), controller.linkAdAccount);
router.post('/sync-account/:accountId', (0, middleware_1.authorize)('ADMIN', 'MANAGER'), controller.syncAdAccount);
// Campaign Data
router.get('/campaigns/:adAccountId', (0, middleware_1.authorize)('ADMIN', 'MANAGER'), controller.getCampaigns);
// Get linked accounts for a client
router.get('/accounts/:clientId', controller.getLinkedAccounts);
// Get Performance Stats
router.get('/stats', controller.getStats);
exports.default = router;
