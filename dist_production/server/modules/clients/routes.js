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
router.get('/', controller_1.getClients);
router.get('/:id', controller_1.getClientById);
// Only Admin and Managers can modify clients
router.post('/', (0, middleware_1.authorize)('ADMIN', 'MANAGER'), controller_1.createClient);
router.patch('/:id', (0, middleware_1.authorize)('ADMIN', 'MANAGER'), controller_1.updateClient);
router.delete('/:id', (0, middleware_1.authorize)('ADMIN', 'MANAGER'), controller_1.deleteClient); // New Route
exports.default = router;
