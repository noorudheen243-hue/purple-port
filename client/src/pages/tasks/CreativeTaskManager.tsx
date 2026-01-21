import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { LayoutDashboard, ClipboardList, KanbanSquare, Calendar, BarChart3, FileText, PlusCircle } from 'lucide-react';
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

const CreativeTaskManager = () => {
    return (
        <Tabs defaultValue="dashboard" className="space-y-6">
            <div className="bg-muted/40 p-2 rounded-lg border overflow-x-auto">
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
                    <TabsTrigger
                        value="reports"
                        className="data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm px-4 py-2 rounded-md font-medium transition-all"
                    >
                        <FileText className="w-4 h-4 mr-2" />
                        Reports
                    </TabsTrigger>
                </TabsList>
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
            </div>
        </Tabs>
    );
};

export default CreativeTaskManager;
