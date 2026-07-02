import { MetaLeadsService } from './server/src/modules/marketing-tasks/services/metaLeadsService';
const m = new MetaLeadsService();
m.syncLeads('1f4f0934-9915-4fd9-b085-87e71208cbe8', '616308347710249').then(console.log).catch(console.error);
