
import app from '../app';

function listRoutes(stack: any, prefix = '') {
    const routes: string[] = [];
    stack.forEach((middleware: any) => {
        if (middleware.route) {
            // Route middleware
            const methods = Object.keys(middleware.route.methods).join(',').toUpperCase();
            routes.push(`${methods} ${prefix}${middleware.route.path}`);
        } else if (middleware.name === 'router') {
            // Router middleware
            const newPrefix = prefix + (middleware.regexp.source
                .replace('^\\', '')
                .replace('\\/?(?=\\/|$)', '')
                .replace(/\\\//g, '/') || '');
            routes.push(...listRoutes(middleware.handle.stack, newPrefix));
        }
    });
    return routes;
}

const allRoutes = listRoutes(app._router.stack);
console.log('Registered Routes:');
allRoutes.forEach(r => console.log(r));

const plannerRoutes = allRoutes.filter(r => r.includes('planner'));
if (plannerRoutes.length > 0) {
    console.log('\nSUCCESS: Planner routes are registered.');
    plannerRoutes.forEach(r => console.log(r));
} else {
    console.log('\nFAILURE: Planner routes are NOT registered.');
}
