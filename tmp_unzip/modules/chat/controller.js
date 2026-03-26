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
exports.sendMessage = exports.getMessages = exports.createConversation = exports.getConversations = void 0;
const service_1 = __importDefault(require("./service"));
const getConversations = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const conversations = yield service_1.default.getConversations(userId);
        res.json(conversations);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching conversations' });
    }
});
exports.getConversations = getConversations;
const createConversation = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { type, participantIds, name } = req.body;
        const creatorId = req.user.id;
        // Ensure creator is in participants
        if (!participantIds.includes(creatorId)) {
            participantIds.push(creatorId);
        }
        const conversation = yield service_1.default.createConversation(type, participantIds, name, creatorId);
        res.json(conversation);
    }
    catch (error) {
        console.error("Create Conversation Failed:", error);
        res.status(500).json({ message: `Error creating conversation: ${error.message}` });
    }
});
exports.createConversation = createConversation;
const getMessages = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { conversationId } = req.params;
        const messages = yield service_1.default.getMessages(conversationId);
        res.json(messages);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching messages' });
    }
});
exports.getMessages = getMessages;
const sendMessage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { conversationId, content, type, fileData } = req.body;
        const senderId = req.user.id;
        const message = yield service_1.default.sendMessage(senderId, conversationId, content, type, fileData);
        res.json(message);
    }
    catch (error) {
        res.status(500).json({ message: 'Error sending message' });
    }
});
exports.sendMessage = sendMessage;
