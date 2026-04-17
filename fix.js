const fs = require('fs');
let content = fs.readFileSync('f:/Antigravity/server/src/modules/client_portal/tracking.controller.ts', 'utf8');

content = content.replace(/date: date \? new Date\(date\) : undefined\s*\} as any\s*\}\);\s*res\.json\(log\);/, 
`date: date ? new Date(date) : undefined
            } as any
        });
        await prisma.task.create({ data: { title: 'Created Google Ads Data: ' + (campaign_name || 'Generic'), description: 'New Google Ads metrics saved.', status: 'COMPLETED', priority: 'MEDIUM', department: 'DIGITAL_MARKETING', client_id: client_id, assignee_id: user.id, assigned_by_id: user.id, reporter_id: user.id, completed_date: new Date() } });
        res.json(log);`);

content = content.replace(/date: date \? new Date\(date\) : undefined\s*\}\s*\}\);\s*res\.json\(log\);/, 
`date: date ? new Date(date) : undefined
            }
        });
        await prisma.task.create({ data: { title: 'Updated Google Ads Data', description: 'Google Ads metrics updated.', status: 'COMPLETED', priority: 'MEDIUM', department: 'DIGITAL_MARKETING', client_id: log.client_id, assignee_id: user.id, assigned_by_id: user.id, reporter_id: user.id, completed_date: new Date() } });
        res.json(log);`);

content = content.replace(/organic_traffic: parseInt\(organic_traffic \|\| 0\),\s*summary\s*\}\s*\}\);\s*res\.json\(log\);/, 
`organic_traffic: parseInt(organic_traffic || 0),
                summary
            }
        });
        await prisma.task.create({ data: { title: 'Saved SEO Report', description: 'SEO report metrics saved.', status: 'COMPLETED', priority: 'MEDIUM', department: 'DIGITAL_MARKETING', client_id: typeof client_id !== 'undefined' ? client_id : log.client_id, assignee_id: user.id, assigned_by_id: user.id, reporter_id: user.id, completed_date: new Date() } });
        res.json(log);`);

content = content.replace(/organic_traffic: parseInt\(organic_traffic \|\| 0\),\s*summary\s*\}\s*\}\);\s*res\.json\(log\);/, 
`organic_traffic: parseInt(organic_traffic || 0),
                summary
            }
        });
        await prisma.task.create({ data: { title: 'Updated SEO Report', description: 'SEO report metrics updated.', status: 'COMPLETED', priority: 'MEDIUM', department: 'DIGITAL_MARKETING', client_id: typeof client_id !== 'undefined' ? client_id : log.client_id, assignee_id: user.id, assigned_by_id: user.id, reporter_id: user.id, completed_date: new Date() } });
        res.json(log);`);

// Since I want to add it for web content too:
content = content.replace(/live_url\s*\}\s*\}\);\s*res\.json\(project\);/,
`live_url
            }
        });
        await prisma.task.create({ data: { title: 'Saved Web Project: ' + project_name, description: 'Web dev project updated.', status: 'COMPLETED', priority: 'MEDIUM', department: 'DIGITAL_MARKETING', client_id: client_id, assignee_id: user.id, assigned_by_id: user.id, reporter_id: user.id, completed_date: new Date() } });
        res.json(project);`);

content = content.replace(/\.\.\.data,\s*user_id: user\.id\s*\}\s*\}\);\s*res\.json\(project\);/,
`...data,
                user_id: user.id
            }
        });
        await prisma.task.create({ data: { title: 'Updated Web Project', description: 'Web dev project updated.', status: 'COMPLETED', priority: 'MEDIUM', department: 'DIGITAL_MARKETING', client_id: project.client_id, assignee_id: user.id, assigned_by_id: user.id, reporter_id: user.id, completed_date: new Date() } });
        res.json(project);`);

content = content.replace(/feedback: notes\s*\}\s*\}\);\s*res\.status\(201\)\.json\(deliverable\);/,
`feedback: notes
            }
        });
        await prisma.task.create({ data: { title: 'Created Deliverable: ' + title, description: 'Content deliverable created.', status: 'COMPLETED', priority: 'MEDIUM', department: 'DIGITAL_MARKETING', client_id: client_id, assignee_id: user.id, assigned_by_id: user.id, reporter_id: user.id, completed_date: new Date() } });
        res.status(201).json(deliverable);`);

content = content.replace(/title\s*\}\s*\}\);\s*res\.json\(deliverable\);/,
`title
            }
        });
        await prisma.task.create({ data: { title: 'Updated Deliverable: ' + title, description: 'Content deliverable updated.', status: 'COMPLETED', priority: 'MEDIUM', department: 'DIGITAL_MARKETING', client_id: deliverable.client_id, assignee_id: user.id, assigned_by_id: user.id, reporter_id: user.id, completed_date: new Date() } });
        res.json(deliverable);`);

fs.writeFileSync('f:/Antigravity/server/src/modules/client_portal/tracking.controller.ts', content);
console.log('done!');
