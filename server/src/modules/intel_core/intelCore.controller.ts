import { Request, Response } from 'express';
import { IntelCoreService } from './intelCore.service';

export class IntelCoreController {
    /**
     * Fetch all AI thoughts and proposed actions
     */
    static async getIntelligenceStream(req: Request, res: Response) {
        try {
            const { clientId } = req.query;
            const data = await IntelCoreService.getPendingIntelligence(clientId as string);
            res.json(data);
        } catch (error: any) {
            res.status(500).json({ message: 'Failed to fetch AI stream', error: error.message });
        }
    }

    /**
     * Approve an AI Action for execution
     */
    static async approveAction(req: Request, res: Response) {
        try {
            const { actionId } = req.body;
            if (!actionId) return res.status(400).json({ message: 'Action ID required' });

            const result = await IntelCoreService.approveAction(actionId);
            res.json({ message: 'Action executed successfully', result });
        } catch (error: any) {
            res.status(500).json({ message: 'Action execution failed', error: error.message });
        }
    }

    /**
     * Dismiss/Ignore an AI Action
     */
    static async ignoreAction(req: Request, res: Response) {
        try {
            const { actionId } = req.body;
            if (!actionId) return res.status(400).json({ message: 'Action ID required' });

            const result = await IntelCoreService.ignoreAction(actionId);
            res.json({ message: 'Action dismissed', result });
        } catch (error: any) {
            res.status(500).json({ message: 'Failed to dismiss action', error: error.message });
        }
    }

    /**
     * Manually trigger a transformation/thought for testing (Developer Admin only)
     */
    static async triggerThought(req: Request, res: Response) {
        try {
            const { clientId, type, context, persona } = req.body;
            const thought = await IntelCoreService.formulateThought({
                clientId,
                type: type || 'TASK_OPTIMIZATION',
                context: context || 'Manual trigger for system evaluation.',
                persona: persona || 'DIRECTOR_OF_PERFORMANCE'
            });
            res.json({ message: 'AI Thought formulated', thought });
        } catch (error: any) {
            res.status(500).json({ message: 'AI Thinking failed', error: error.message });
        }
    }
}
