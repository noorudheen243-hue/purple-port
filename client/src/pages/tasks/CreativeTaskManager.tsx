import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { LayoutDashboard, ClipboardList, KanbanSquare, Calendar, BarChart3, FileText, PlusCircle, History } from 'lucide-react';
import { Link } from 'react-router-dom';

// Components
import TaskDashboard from './TaskDashboard';
import TaskList from './TaskList'; // Alias as TaskBoard in file, but imported as TaskList usually or renamed. 
// Note: In index.tsx it was imported as TaskList from '../tasks/TaskList', let's check export.
// It was export default TaskBoard in the file.
import MyTasks from './MyTasks';
import CalendarView from '../calendar/CalendarView';
import TeamPerformance from './TeamPerformance';
import TaskReports from './reports/index';
import TaskHistory from './TaskHistory';

import NewTaskModal from './TaskFormModal';

const CreativeTaskManager = () => {
    const [isTaskModalOpen, setIsTaskModalOpen] = React.useState(false);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <Tabs defaultValue="dashboard" className="w-full space-y-6">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="bg-muted/40 p-2 rounded-lg border overflow-x-auto w-full md:w-auto">
                            <TabsList className="bg-transparent gap-2 h-auto p-0 min-w-max justify-start">
                                <TabsTrigger
                                    value="dashboard"
                                    className="data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm px-4 py-2 rounded-md font-medium transition-all"
                                >
                                    <LayoutDashboard className="w-4 h-4 mr-2" />
                                    Dashboard
                                </TabsTrigger>
                                <TabsTrigger
                                    value="mytasks"
                                    className="data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm px-4 py-2 rounded-md font-medium transition-all"
                                >
                                    <ClipboardList className="w-4 h-4 mr-2" />
                                    My Tasks
                                </TabsTrigger>
                                <TabsTrigger
                                    value="board"
                                    className="data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm px-4 py-2 rounded-md font-medium transition-all"
                                >
                                    <KanbanSquare className="w-4 h-4 mr-2" />
                                    Task Board
                                </TabsTrigger>
                                <TabsTrigger
                                    value="calendar"
                                    className="data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm px-4 py-2 rounded-md font-medium transition-all"
                                >
                                    <Calendar className="w-4 h-4 mr-2" />
                                    Calendar
                                </TabsTrigger>
                                <TabsTrigger
                                    value="performance"
                                    className="data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm px-4 py-2 rounded-md font-medium transition-all"
                                >
                                    <BarChart3 className="w-4 h-4 mr-2" />
                                    Team Performance
                                </TabsTrigger>
                                <FileText className="w-4 h-4 mr-2" />
                                Reports
                            </TabsTrigger>
                            <TabsTrigger
                                value="history"
                                className="data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm px-4 py-2 rounded-md font-medium transition-all"
                            >
                                <History className="w-4 h-4 mr-2" />
                                History
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    {/* Usage of 'big purple colour' button as requested */}
                    <button
                        onClick={() => setIsTaskModalOpen(true)}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-purple-200 transition-all flex items-center gap-2 whitespace-nowrap active:scale-95"
                    >
                        <PlusCircle size={20} strokeWidth={2.5} />
                        Create New Task
                    </button>
            </div>

            <div className="bg-card rounded-lg border shadow-sm p-6 min-h-[500px]">
                <TabsContent value="dashboard" className="mt-0">
                    <TaskDashboard view="CREATIVE" />
                </TabsContent>
                <TabsContent value="mytasks" className="mt-0">
                    <MyTasks />
                </TabsContent>
                <TabsContent value="board" className="mt-0">
                    {/* Accessing TaskBoard from TaskList import */}
                    <TaskList />
                </TabsContent>
                <TabsContent value="calendar" className="mt-0">
                    <CalendarView />
                </TabsContent>
                <TabsContent value="performance" className="mt-0">
                    <TeamPerformance />
                </TabsContent>
                <TabsContent value="reports" className="mt-0">
                    <TaskReports />
                </TabsContent>
                <TabsContent value="history" className="mt-0">
                    <TaskHistory />
                </TabsContent>
            </div>
        </Tabs>
            </div >

    <NewTaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
    />
        </div >
    );
};

export default CreativeTaskManager;
