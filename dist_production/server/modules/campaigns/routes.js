"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const controller_1 = require("./controller");
const middleware_1 = require("../auth/middleware");
const router = express_1.default.Router();
router.use(middleware_1.protect);
router.get('/', controller_1.getCampaigns);
router.get('/:id', controller_1.getCampaignById);
router.post('/', (0, middleware_1.authorize)('ADMIN', 'MANAGER', 'MARKETING_EXEC'), controller_1.createCampaign);
router.patch('/:id', (0, middleware_1.authorize)('ADMIN', 'MANAGER', 'MARKETING_EXEC'), controller_1.updateCampaign);
exports.default = router;
