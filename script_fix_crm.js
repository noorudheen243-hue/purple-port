const fs = require('fs');
const path = require('path');

const filePath = path.join('f:', 'Antigravity', 'client', 'src', 'pages', 'crm', 'ClientCrmWorkspace.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Remove staffList fetch
content = content.replace(/\/\/ Fetch active staff list[\s\S]*?\}\);\n/, '');

// 2. Remove staffList props being passed
content = content.replace(/staffList=\{staffList\}/g, '');

// 3. In CrmLeadsTab props
content = content.replace(/staffList:\s*UserProfile\[\];\s*/g, '');
content = content.replace(/staffList,\s*/g, '');

// 4. Remove Agent Filters & Assign UI
// Filter Agent in Leads Tab
content = content.replace(/<div className="flex items-center gap-2">\s*<span className="text-xs font-bold text-slate-500 shrink-0">Filter Agent:<\/span>[\s\S]*?<\/Select>\s*<\/div>/g, '');

// Assign To in Create Lead Modal
content = content.replace(/<div className="space-y-1\.5">\s*<Label className="text-xs font-bold text-slate-600">Assign To.*<\/Label>[\s\S]*?<\/Select>\s*<\/div>/g, '');

// Assign Agent in Bulk Actions
content = content.replace(/<Select value=\{bulkAssignAgent\} onValueChange=\{setBulkAssignAgent\}>[\s\S]*?<\/Select>/g, '');

// Assigned Agent in Leads Table
content = content.replace(/const assigneeUser = staffList\.find[\s\S]*?\n\s*(?:\{assigneeUser && \([\s\S]*?Agent:\s*\{assigneeUser\.full_name\}[\s\S]*?\)\})/g, '');

// Assigned Agent in Edit Modal
content = content.replace(/<div className="space-y-1\.5">\s*<Label className="text-xs font-bold text-slate-600">Assign Agent<\/Label>[\s\S]*?<\/Select>\s*<\/div>/g, '');

// Writer in Notes
content = content.replace(/const writer = staffList\.find[\s\S]*?\n\s*<span className="font-bold text-slate-800">\{writer \? writer\.full_name : 'Unknown'\}<\/span>/g, '<span className="font-bold text-slate-800">User</span>');

// Assigned Agent in Pipeline Cards
content = content.replace(/const agent = staffList\.find[\s\S]*?\n\s*(?:\{agent && \([\s\S]*?Agent:\s*\{agent\.full_name\}[\s\S]*?\)\})/g, '');

// Assigned Agent in Follow-ups
content = content.replace(/const leadAgent = staffList\.find[\s\S]*?\n\s*(?:\{leadAgent && \([\s\S]*?Agent:\s*\{leadAgent\.full_name\}[\s\S]*?\)\})/g, '');

// 5. Replace CrmSettingsTab
const settingsTabRegex = /const CrmSettingsTab: React\.FC<\{ clientId: string(?:;\s*staffList:\s*UserProfile\[\])? \}> = \(\{ clientId(?:, staffList)? \}\) => \{[\s\S]*?\n\};\n/m;

const newSettingsTab = `const CrmSettingsTab: React.FC<{ clientId: string }> = ({ clientId }) => {
    const handleConnectMeta = () => {
        Swal.fire({
            icon: 'info',
            title: 'Meta Integration',
            text: 'Redirecting to Meta Ad Account authentication...',
            confirmButtonColor: '#4F46E5'
        });
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 border border-slate-200 bg-white rounded-2xl p-6 space-y-6">
                <div>
                    <h3 className="text-lg font-bold text-slate-800">Connect Meta Ad Account</h3>
                    <p className="text-xs text-slate-500 mt-1">Authenticate and connect your client's Meta Ad Account to sync campaigns and track ROAS.</p>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl">
                    <div>
                        <Label className="text-sm font-bold text-slate-800">Meta Facebook & Instagram Ads</Label>
                        <p className="text-xs text-slate-400">Not connected</p>
                    </div>
                    <Button 
                        onClick={handleConnectMeta}
                        className="bg-[#1877F2] hover:bg-[#1864D9] text-white font-bold rounded-lg text-xs"
                    >
                        Connect Meta Account
                    </Button>
                </div>
            </Card>

            <Card className="border border-slate-200 bg-white rounded-2xl p-6 space-y-4">
                <h4 className="text-sm font-bold text-slate-800">Pipeline Stages Customization</h4>
                <p className="text-xs text-slate-500">View and rearrange the active workflow columns for your sales pipeline board.</p>
                
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {CRM_STAGES.map((s, idx) => (
                        <div key={s} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-3">
                            <span className="text-slate-400 font-semibold w-4">{idx + 1}.</span>
                            <span>{s}</span>
                        </div>
                    ))}
                </div>
            </Card>
        </div>
    );
};
`;

content = content.replace(settingsTabRegex, newSettingsTab);

fs.writeFileSync(filePath, content);
console.log('Modifications completed.');
