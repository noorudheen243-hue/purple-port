"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const controller_1 = require("./controller");
const middleware_1 = require("../auth/middleware");
const router = express_1.default.Router();
router.use(middleware_1.protect); // All client routes require login
// Client Credentials Management
router.post('/credentials/generate', (0, middleware_1.authorize)('ADMIN'), controller_1.generateCredentials);
router.get('/credentials', (0, middleware_1.authorize)('ADMIN'), controller_1.listCredentials);
router.put('/credentials/:id', (0, middleware_1.authorize)('ADMIN'), controller_1.updateCredentials);
router.get('/', controller_1.getClients);
router.get('/next-code', controller_1.getNextCode);
router.get('/:id', controller_1.getClientById);
// Only Admin, Managers, and Executives can modify clients
// Allow all internal staff to manage clients
router.post('/', (0, middleware_1.authorize)('ADMIN', 'MANAGER', 'DM_EXECUTIVE', 'WEB_SEO_EXECUTIVE', 'CREATIVE_DESIGNER', 'OPERATIONS_EXECUTIVE', 'MARKETING_EXEC'), controller_1.createClient);
router.patch('/:id', (0, middleware_1.authorize)('ADMIN', 'MANAGER', 'DM_EXECUTIVE', 'WEB_SEO_EXECUTIVE', 'CREATIVE_DESIGNER', 'OPERATIONS_EXECUTIVE', 'MARKETING_EXEC'), controller_1.updateClient);
router.delete('/:id', (0, middleware_1.authorize)('ADMIN', 'MANAGER', 'DM_EXECUTIVE', 'WEB_SEO_EXECUTIVE', 'CREATIVE_DESIGNER', 'OPERATIONS_EXECUTIVE', 'MARKETING_EXEC'), controller_1.deleteClient);
exports.default = router;
