
import { Request, Response } from 'express';
import { deployToVPS } from './service';
import { ROLES } from '../auth/roles';

export const triggerDeployment = async (req: Request, res: Response) => {
    try {
        // Double check authorized role just in case middleware fails (Defense in Depth)
        if (req.user?.role !== ROLES.DEVELOPER_ADMIN) {
            return res.status(403).json({ message: 'Unauthorized: Only Developer Admin can deploy updates.' });
        }

        console.log(`User ${req.user.id} (${req.user.role}) initiated deployment.`);

        // Determine if we should wait or return immediately. 
        // Deployment might take time (npm install, build). 
        // For better UX, we await it but ensure client has a long timeout or handle async.
        // Given it's an admin feature, awaiting is cleaner for immediate feedback 
        // unless it takes > 30s (likely will).

        // However, standard request timeout might kill it. 
        // Ensure we handle this.

        const result = await deployToVPS();

        if (result.success) {
            res.status(200).json({
                message: 'Deployment successful.',
                logs: result.logs
            });
        } else {
            res.status(500).json({
                message: 'Deployment failed.',
                logs: result.logs,
                error: result.error
            });
        }
    } catch (error: any) {
        console.error('Deployment Controller Error:', error);
        res.status(500).json({ message: 'Internal Server Error during deployment.', error: error.message });
    }
};
