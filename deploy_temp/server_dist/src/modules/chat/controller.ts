import { Request, Response } from 'express';
import chatService from './service';

export const getConversations = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const conversations = await chatService.getConversations(userId);
        res.json(conversations);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching conversations' });
    }
};

export const createConversation = async (req: Request, res: Response) => {
    try {
        const { type, participantIds, name } = req.body;
        const creatorId = (req as any).user.id;

        // Ensure creator is in participants
        if (!participantIds.includes(creatorId)) {
            participantIds.push(creatorId);
        }

        const conversation = await chatService.createConversation(type, participantIds, name, creatorId);
        res.json(conversation);
    } catch (error: any) {
        console.error("Create Conversation Failed:", error);
        res.status(500).json({ message: `Error creating conversation: ${error.message}` });
    }
};

export const getMessages = async (req: Request, res: Response) => {
    try {
        const { conversationId } = req.params;
        const messages = await chatService.getMessages(conversationId);
        res.json(messages);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching messages' });
    }
};

export const sendMessage = async (req: Request, res: Response) => {
    try {
        const { conversationId, content, type, fileData } = req.body;
        const senderId = (req as any).user.id;

        const message = await chatService.sendMessage(senderId, conversationId, content, type, fileData);
        res.json(message);
    } catch (error) {
        res.status(500).json({ message: 'Error sending message' });
    }
};
