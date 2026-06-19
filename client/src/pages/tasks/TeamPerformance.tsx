
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { getAssetUrl } from '../../lib/utils';
import { Filter, Search, Calendar, AlertTriangle, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';

// --- Types ---
interface TeamMetric {
    id: string;
    name: string;
    role: string;
    designation: string;
    department: string;
    avatar: string | null;
    metrics: {
        total: number;
        completed: number;
        pending: number;
        review: number;
        rework: number;
        reworkRate: number;
        slaBreaches: number;
    };
    time: {
        estimated: number;
        actual: number;
    };
    taskTypes: Record<string, number>;
    productivityScore: number;
}

interface TeamPerformanceProps {
    defaultDept?: string;
}

const TeamPerformance = ({ defaultDept = 'ALL' }: TeamPerformanceProps) => {
    // --- State ---
    const [filterDept, setFilterDept] = useState(defaultDept);
    const [searchTerm, setSearchTerm] = useState('');
    
    const currentMonthIndex = useMemo(() => new Date().getMonth(), []);
    const [selectedMonth, setSelectedMonth] = useState<number>(currentMonthIndex);

    // --- Date Helper ---
    const getDates = () => {
        const now = new Date();
        const year = now.getFullYear();
        const start = new Date(year, selectedMonth, 1).toISOString();
        const end = new Date(year, selectedMonth + 1, 0, 23, 59, 59, 999).toISOString();
        return { start, end };
    };

    // --- Query ---
    const { data: performanceData, isLoading, error } = useQuery<TeamMetric[]>({
        queryKey: ['team-performance', filterDept, selectedMonth],
        queryFn: async () => {
            const params: any = {};
            if (filterDept !== 'ALL') params.department = filterDept;

            const { start, end } = getDates();
            if (start) params.startDate = start;
            if (end) params.endDate = end;

            return (await api.get('/analytics/team-performance', { params })).data;
        }
    });

    // --- Derived Data ---
    const filteredData = useMemo(() => {
        if (!performanceData) return [];
        return performanceData.filter(staff => {
            const matchesSearch = staff.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                staff.designation.toLowerCase().includes(searchTerm.toLowerCase());
            return matchesSearch;
        });
    }, [performanceData, searchTerm]);

    const handleCellClick = (staffId: string, staffName: string, group: string, type: string) => {
        const { start, end } = getDates();
        window.open(`/tasks/performance/details?assigneeId=${staffId}&staffName=${encodeURIComponent(staffName)}&group=${encodeURIComponent(group)}&type=${encodeURIComponent(type)}&startDate=${start}&endDate=${end}`, '_blank');
    };

    const getScoreColor = (score: number) => {
        if (score >= 80) return 'text-green-600';
        if (score >= 60) return 'text-yellow-600';
        return 'text-red-600';
    };

    const getReworkBadge = (rate: number, count: number) => {
        if (count === 0) return <span className="text-gray-400 text-xs">No Rework</span>;
        const color = rate > 10 ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700';
        return (
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 w-fit ${color}`}>
                <AlertCircle size={10} /> {count} ({rate}%)
            </span>
        );
    };

    if (error) return <div className="p-8 text-center text-red-500">Failed to load performance data.</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Team Performance Analytics</h2>
                    <p className="text-muted-foreground">Task-based performance insights and productivity scores.</p>
                </div>
                {/* Global Actions if needed */}
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center">
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                        <input
                            type="text"
                            placeholder="Search staff..."
                            className="w-full pl-10 pr-4 py-2 bg-background border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <Filter size={18} className="text-muted-foreground" />
                        <select
                            className="bg-background border rounded-md px-3 py-2 text-sm focus:outline-none w-full md:w-40"
                            value={filterDept}
                            onChange={(e) => setFilterDept(e.target.value)}
                        >
                            <option value="ALL">All Departments</option>
                            <option value="CREATIVE">Creative</option>
                            <option value="MARKETING">Marketing</option>
                            <option value="WEB">Web & SEO</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <Calendar size={18} className="text-muted-foreground" />
                        <select
                            className="bg-background border rounded-md px-3 py-2 text-sm focus:outline-none w-full md:w-40"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
                        >
                            <option value={0}>January</option>
                            <option value={1}>February</option>
                            <option value={2}>March</option>
                            <option value={3}>April</option>
                            <option value={4}>May</option>
                            <option value={5}>June</option>
                            <option value={6}>July</option>
                            <option value={7}>August</option>
                            <option value={8}>September</option>
                            <option value={9}>October</option>
                            <option value={10}>November</option>
                            <option value={11}>December</option>
                        </select>
                    </div>
                </CardContent>
            </Card>

            {/* Main Table */}
            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50/75 text-gray-500 font-medium border-b">
                            <tr>
                                <th rowSpan={2} className="px-4 py-3 pl-6 border-r text-left">Rank</th>
                                <th rowSpan={2} className="px-4 py-3 border-r text-left">Staff Name</th>
                                <th colSpan={4} className="px-4 py-2 text-center border-r bg-purple-50/50">Graphics Work (1pt)</th>
                                <th colSpan={4} className="px-4 py-2 text-center border-r bg-indigo-50/50">Branding Works (1pt)</th>
                                <th colSpan={9} className="px-4 py-2 text-center border-r bg-blue-50/50">Video Works (2pts)</th>
                                <th colSpan={11} className="px-4 py-2 text-center border-r bg-green-50/50">Printables (1pt)</th>
                                <th colSpan={3} className="px-4 py-2 text-center border-r bg-orange-50/50">Edu Project (2pts)</th>
                                <th rowSpan={2} className="px-4 py-3 text-center text-primary font-bold">Total Marks</th>
                            </tr>
                            <tr className="bg-gray-50/25 border-b text-[10px] uppercase tracking-wider">
                                {/* Graphics Work types */}
                                <th className="px-2 py-2 text-center font-semibold border-r">Poster</th>
                                <th className="px-2 py-2 text-center font-semibold border-r">Carousel</th>
                                <th className="px-2 py-2 text-center font-semibold border-r">Web Img</th>
                                <th className="px-2 py-2 text-center font-semibold border-r">Other</th>

                                {/* Branding Works types */}
                                <th className="px-2 py-2 text-center font-semibold border-r">Logo</th>
                                <th className="px-2 py-2 text-center font-semibold border-r">Book</th>
                                <th className="px-2 py-2 text-center font-semibold border-r">Mockups</th>
                                <th className="px-2 py-2 text-center font-semibold border-r">Other</th>

                                {/* Video Works types */}
                                <th className="px-2 py-2 text-center font-semibold border-r">AI Video</th>
                                <th className="px-2 py-2 text-center font-semibold border-r">Motion</th>
                                <th className="px-2 py-2 text-center font-semibold border-r">Logo Anim</th>
                                <th className="px-2 py-2 text-center font-semibold border-r">Corporate</th>
                                <th className="px-2 py-2 text-center font-semibold border-r">Reel Edit</th>
                                <th className="px-2 py-2 text-center font-semibold border-r">Podcast</th>
                                <th className="px-2 py-2 text-center font-semibold border-r">Testimonial</th>
                                <th className="px-2 py-2 text-center font-semibold border-r">Normal</th>
                                <th className="px-2 py-2 text-center font-semibold border-r">Other</th>

                                {/* Printables types */}
                                <th className="px-2 py-2 text-center font-semibold border-r">Brochure</th>
                                <th className="px-2 py-2 text-center font-semibold border-r">Flyer</th>
                                <th className="px-2 py-2 text-center font-semibold border-r">Flex</th>
                                <th className="px-2 py-2 text-center font-semibold border-r">Van Ad</th>
                                <th className="px-2 py-2 text-center font-semibold border-r">Biz Card</th>
                                <th className="px-2 py-2 text-center font-semibold border-r">Letterhead</th>
                                <th className="px-2 py-2 text-center font-semibold border-r">ID Card</th>
                                <th className="px-2 py-2 text-center font-semibold border-r">Corp Profile</th>
                                <th className="px-2 py-2 text-center font-semibold border-r">Catalogue</th>
                                <th className="px-2 py-2 text-center font-semibold border-r">Menu</th>
                                <th className="px-2 py-2 text-center font-semibold border-r">Other</th>

                                {/* Edu Project types */}
                                <th className="px-2 py-2 text-center font-semibold border-r">Animated</th>
                                <th className="px-2 py-2 text-center font-semibold border-r">Shoot</th>
                                <th className="px-2 py-2 text-center font-semibold border-r">Other</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {isLoading ? (
                                <tr><td colSpan={34} className="p-8 text-center text-muted-foreground">Loading analytics...</td></tr>
                            ) : filteredData.length === 0 ? (
                                <tr><td colSpan={34} className="p-8 text-center text-muted-foreground">No data found for selected filters.</td></tr>
                            ) : (
                                (() => {
                                    // 1. Map data to include the calculated marks
                                    const mappedData = filteredData.map(staff => {
                                        // Helper to get count of a specific key
                                        const getVal = (key: string) => staff.taskTypes[key] || 0;

                                        // Total group sums for marks calculation
                                        const graphicsWorkSum = getVal('Graphics Work');
                                        const brandingWorksSum = getVal('Branding Works');
                                        const videoWorksSum = getVal('Video Works');
                                        const printablesSum = getVal('Printables');
                                        const eduProjectSum = getVal('Edu Project');

                                        // 31 Specific columns (using compound key `${group}:${type}`)
                                        // 1. Graphics Work sub-types
                                        const posterDesign = getVal('Graphics Work:Poster Design');
                                        const carousels = getVal('Graphics Work:Carausals');
                                        const webImages = getVal('Graphics Work:Web Images');
                                        const graphicsOther = getVal('Graphics Work:other');

                                        // 2. Branding Works sub-types
                                        const logoDesign = getVal('Branding Works:Logo Design');
                                        const brandBook = getVal('Branding Works:Brand Book');
                                        const brandMockups = getVal('Branding Works:Brand Mockups');
                                        const brandingOther = getVal('Branding Works:other');

                                        // 3. Video Works sub-types
                                        const aiVideo = getVal('Video Works:Ai Generated Video');
                                        const motionGraphicVideo = getVal('Video Works:Motion Graphic Video');
                                        const logoAnimation = getVal('Video Works:Logo Animation');
                                        const corporateVideo = getVal('Video Works:Corporate Video');
                                        const reelEditing = getVal('Video Works:Reel Editing with Footages');
                                        const podcastVideo = getVal('Video Works:Podcast/interview Video');
                                        const testimonialVideo = getVal('Video Works:Testimonial Video');
                                        const normalVideo = getVal('Video Works:Normal Video Content');
                                        const videoOther = getVal('Video Works:other');

                                        // 4. Printables sub-types
                                        const brochure = getVal('Printables:Brochure');
                                        const flyer = getVal('Printables:Flyer');
                                        const flexDesign = getVal('Printables:Flex Design');
                                        const vanAdvertise = getVal('Printables:Van Advertise');
                                        const businessCard = getVal('Printables:Business Card');
                                        const letterHead = getVal('Printables:Letter Head');
                                        const idCardDesign = getVal('Printables:ID Card Design');
                                        const corporateProfile = getVal('Printables:Corporate Profile');
                                        const catalogue = getVal('Printables:Catalogue');
                                        const menuCard = getVal('Printables:Menu Card');
                                        const printablesOther = getVal('Printables:other');

                                        // 5. Edu Project sub-types
                                        const animatedVideos = getVal('Edu Project:Animated Videos');
                                        const shootVideos = getVal('Edu Project:Shoot Videos');
                                        const eduOther = getVal('Edu Project:other');

                                        // Calculate Total Marks based on the groups sum
                                        const totalMarks = (graphicsWorkSum * 1) + (brandingWorksSum * 1) + (videoWorksSum * 2) + (printablesSum * 1) + (eduProjectSum * 2);

                                        return {
                                            ...staff,
                                            posterDesign,
                                            carousels,
                                            webImages,
                                            graphicsOther,
                                            logoDesign,
                                            brandBook,
                                            brandMockups,
                                            brandingOther,
                                            aiVideo,
                                            motionGraphicVideo,
                                            logoAnimation,
                                            corporateVideo,
                                            reelEditing,
                                            podcastVideo,
                                            testimonialVideo,
                                            normalVideo,
                                            videoOther,
                                            brochure,
                                            flyer,
                                            flexDesign,
                                            vanAdvertise,
                                            businessCard,
                                            letterHead,
                                            idCardDesign,
                                            corporateProfile,
                                            catalogue,
                                            menuCard,
                                            printablesOther,
                                            animatedVideos,
                                            shootVideos,
                                            eduOther,
                                            totalMarks
                                        };
                                    });

                                    // 2. Sort by totalMarks descending
                                    const sortedData = mappedData.sort((a, b) => b.totalMarks - a.totalMarks);

                                    // 3. Render
                                    return sortedData.map((staff, index) => (
                                        <tr key={staff.id} className="hover:bg-gray-50/50 transition-colors">
                                            {/* Rank */}
                                            <td className="px-4 py-3 pl-6 font-bold text-gray-700">
                                                #{index + 1}
                                            </td>

                                            {/* Staff Info */}
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs overflow-hidden">
                                                        {staff.avatar ? (
                                                            <img src={getAssetUrl(staff.avatar)} alt={staff.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            staff.name.charAt(0)
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold text-gray-900">{staff.name}</div>
                                                        <div className="text-[10px] text-muted-foreground">{staff.designation}</div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Metrics Columns */}
                                            {/* Graphics Work */}
                                            <td className="px-2 py-3 text-center text-gray-600 border-r">
                                                {staff.posterDesign > 0 ? (
                                                    <button onClick={() => handleCellClick(staff.id, staff.name, 'Graphics Work', 'Poster Design')} className="text-primary hover:underline font-semibold">{staff.posterDesign}</button>
                                                ) : '-'}
                                            </td>
                                            <td className="px-2 py-3 text-center text-gray-600 border-r">
                                                {staff.carousels > 0 ? (
                                                    <button onClick={() => handleCellClick(staff.id, staff.name, 'Graphics Work', 'Carausals')} className="text-primary hover:underline font-semibold">{staff.carousels}</button>
                                                ) : '-'}
                                            </td>
                                            <td className="px-2 py-3 text-center text-gray-600 border-r">
                                                {staff.webImages > 0 ? (
                                                    <button onClick={() => handleCellClick(staff.id, staff.name, 'Graphics Work', 'Web Images')} className="text-primary hover:underline font-semibold">{staff.webImages}</button>
                                                ) : '-'}
                                            </td>
                                            <td className="px-2 py-3 text-center text-gray-600 border-r">
                                                {staff.graphicsOther > 0 ? (
                                                    <button onClick={() => handleCellClick(staff.id, staff.name, 'Graphics Work', 'other')} className="text-primary hover:underline font-semibold">{staff.graphicsOther}</button>
                                                ) : '-'}
                                            </td>

                                            {/* Branding Works */}
                                            <td className="px-2 py-3 text-center text-gray-600 border-r">
                                                {staff.logoDesign > 0 ? (
                                                    <button onClick={() => handleCellClick(staff.id, staff.name, 'Branding Works', 'Logo Design')} className="text-primary hover:underline font-semibold">{staff.logoDesign}</button>
                                                ) : '-'}
                                            </td>
                                            <td className="px-2 py-3 text-center text-gray-600 border-r">
                                                {staff.brandBook > 0 ? (
                                                    <button onClick={() => handleCellClick(staff.id, staff.name, 'Branding Works', 'Brand Book')} className="text-primary hover:underline font-semibold">{staff.brandBook}</button>
                                                ) : '-'}
                                            </td>
                                            <td className="px-2 py-3 text-center text-gray-600 border-r">
                                                {staff.brandMockups > 0 ? (
                                                    <button onClick={() => handleCellClick(staff.id, staff.name, 'Branding Works', 'Brand Mockups')} className="text-primary hover:underline font-semibold">{staff.brandMockups}</button>
                                                ) : '-'}
                                            </td>
                                            <td className="px-2 py-3 text-center text-gray-600 border-r">
                                                {staff.brandingOther > 0 ? (
                                                    <button onClick={() => handleCellClick(staff.id, staff.name, 'Branding Works', 'other')} className="text-primary hover:underline font-semibold">{staff.brandingOther}</button>
                                                ) : '-'}
                                            </td>

                                            {/* Video Works */}
                                            <td className="px-2 py-3 text-center text-gray-600 border-r">
                                                {staff.aiVideo > 0 ? (
                                                    <button onClick={() => handleCellClick(staff.id, staff.name, 'Video Works', 'Ai Generated Video')} className="text-primary hover:underline font-semibold">{staff.aiVideo}</button>
                                                ) : '-'}
                                            </td>
                                            <td className="px-2 py-3 text-center text-gray-600 border-r">
                                                {staff.motionGraphicVideo > 0 ? (
                                                    <button onClick={() => handleCellClick(staff.id, staff.name, 'Video Works', 'Motion Graphic Video')} className="text-primary hover:underline font-semibold">{staff.motionGraphicVideo}</button>
                                                ) : '-'}
                                            </td>
                                            <td className="px-2 py-3 text-center text-gray-600 border-r">
                                                {staff.logoAnimation > 0 ? (
                                                    <button onClick={() => handleCellClick(staff.id, staff.name, 'Video Works', 'Logo Animation')} className="text-primary hover:underline font-semibold">{staff.logoAnimation}</button>
                                                ) : '-'}
                                            </td>
                                            <td className="px-2 py-3 text-center text-gray-600 border-r">
                                                {staff.corporateVideo > 0 ? (
                                                    <button onClick={() => handleCellClick(staff.id, staff.name, 'Video Works', 'Corporate Video')} className="text-primary hover:underline font-semibold">{staff.corporateVideo}</button>
                                                ) : '-'}
                                            </td>
                                            <td className="px-2 py-3 text-center text-gray-600 border-r">
                                                {staff.reelEditing > 0 ? (
                                                    <button onClick={() => handleCellClick(staff.id, staff.name, 'Video Works', 'Reel Editing with Footages')} className="text-primary hover:underline font-semibold">{staff.reelEditing}</button>
                                                ) : '-'}
                                            </td>
                                            <td className="px-2 py-3 text-center text-gray-600 border-r">
                                                {staff.podcastVideo > 0 ? (
                                                    <button onClick={() => handleCellClick(staff.id, staff.name, 'Video Works', 'Podcast/interview Video')} className="text-primary hover:underline font-semibold">{staff.podcastVideo}</button>
                                                ) : '-'}
                                            </td>
                                            <td className="px-2 py-3 text-center text-gray-600 border-r">
                                                {staff.testimonialVideo > 0 ? (
                                                    <button onClick={() => handleCellClick(staff.id, staff.name, 'Video Works', 'Testimonial Video')} className="text-primary hover:underline font-semibold">{staff.testimonialVideo}</button>
                                                ) : '-'}
                                            </td>
                                            <td className="px-2 py-3 text-center text-gray-600 border-r">
                                                {staff.normalVideo > 0 ? (
                                                    <button onClick={() => handleCellClick(staff.id, staff.name, 'Video Works', 'Normal Video Content')} className="text-primary hover:underline font-semibold">{staff.normalVideo}</button>
                                                ) : '-'}
                                            </td>
                                            <td className="px-2 py-3 text-center text-gray-600 border-r">
                                                {staff.videoOther > 0 ? (
                                                    <button onClick={() => handleCellClick(staff.id, staff.name, 'Video Works', 'other')} className="text-primary hover:underline font-semibold">{staff.videoOther}</button>
                                                ) : '-'}
                                            </td>

                                            {/* Printables */}
                                            <td className="px-2 py-3 text-center text-gray-600 border-r">
                                                {staff.brochure > 0 ? (
                                                    <button onClick={() => handleCellClick(staff.id, staff.name, 'Printables', 'Brochure')} className="text-primary hover:underline font-semibold">{staff.brochure}</button>
                                                ) : '-'}
                                            </td>
                                            <td className="px-2 py-3 text-center text-gray-600 border-r">
                                                {staff.flyer > 0 ? (
                                                    <button onClick={() => handleCellClick(staff.id, staff.name, 'Printables', 'Flyer')} className="text-primary hover:underline font-semibold">{staff.flyer}</button>
                                                ) : '-'}
                                            </td>
                                            <td className="px-2 py-3 text-center text-gray-600 border-r">
                                                {staff.flexDesign > 0 ? (
                                                    <button onClick={() => handleCellClick(staff.id, staff.name, 'Printables', 'Flex Design')} className="text-primary hover:underline font-semibold">{staff.flexDesign}</button>
                                                ) : '-'}
                                            </td>
                                            <td className="px-2 py-3 text-center text-gray-600 border-r">
                                                {staff.vanAdvertise > 0 ? (
                                                    <button onClick={() => handleCellClick(staff.id, staff.name, 'Printables', 'Van Advertise')} className="text-primary hover:underline font-semibold">{staff.vanAdvertise}</button>
                                                ) : '-'}
                                            </td>
                                            <td className="px-2 py-3 text-center text-gray-600 border-r">
                                                {staff.businessCard > 0 ? (
                                                    <button onClick={() => handleCellClick(staff.id, staff.name, 'Printables', 'Business Card')} className="text-primary hover:underline font-semibold">{staff.businessCard}</button>
                                                ) : '-'}
                                            </td>
                                            <td className="px-2 py-3 text-center text-gray-600 border-r">
                                                {staff.letterHead > 0 ? (
                                                    <button onClick={() => handleCellClick(staff.id, staff.name, 'Printables', 'Letter Head')} className="text-primary hover:underline font-semibold">{staff.letterHead}</button>
                                                ) : '-'}
                                            </td>
                                            <td className="px-2 py-3 text-center text-gray-600 border-r">
                                                {staff.idCardDesign > 0 ? (
                                                    <button onClick={() => handleCellClick(staff.id, staff.name, 'Printables', 'ID Card Design')} className="text-primary hover:underline font-semibold">{staff.idCardDesign}</button>
                                                ) : '-'}
                                            </td>
                                            <td className="px-2 py-3 text-center text-gray-600 border-r">
                                                {staff.corporateProfile > 0 ? (
                                                    <button onClick={() => handleCellClick(staff.id, staff.name, 'Printables', 'Corporate Profile')} className="text-primary hover:underline font-semibold">{staff.corporateProfile}</button>
                                                ) : '-'}
                                            </td>
                                            <td className="px-2 py-3 text-center text-gray-600 border-r">
                                                {staff.catalogue > 0 ? (
                                                    <button onClick={() => handleCellClick(staff.id, staff.name, 'Printables', 'Catalogue')} className="text-primary hover:underline font-semibold">{staff.catalogue}</button>
                                                ) : '-'}
                                            </td>
                                            <td className="px-2 py-3 text-center text-gray-600 border-r">
                                                {staff.menuCard > 0 ? (
                                                    <button onClick={() => handleCellClick(staff.id, staff.name, 'Printables', 'Menu Card')} className="text-primary hover:underline font-semibold">{staff.menuCard}</button>
                                                ) : '-'}
                                            </td>
                                            <td className="px-2 py-3 text-center text-gray-600 border-r">
                                                {staff.printablesOther > 0 ? (
                                                    <button onClick={() => handleCellClick(staff.id, staff.name, 'Printables', 'other')} className="text-primary hover:underline font-semibold">{staff.printablesOther}</button>
                                                ) : '-'}
                                            </td>

                                            {/* Edu Project */}
                                            <td className="px-2 py-3 text-center text-gray-600 border-r">
                                                {staff.animatedVideos > 0 ? (
                                                    <button onClick={() => handleCellClick(staff.id, staff.name, 'Edu Project', 'Animated Videos')} className="text-primary hover:underline font-semibold">{staff.animatedVideos}</button>
                                                ) : '-'}
                                            </td>
                                            <td className="px-2 py-3 text-center text-gray-600 border-r">
                                                {staff.shootVideos > 0 ? (
                                                    <button onClick={() => handleCellClick(staff.id, staff.name, 'Edu Project', 'Shoot Videos')} className="text-primary hover:underline font-semibold">{staff.shootVideos}</button>
                                                ) : '-'}
                                            </td>
                                            <td className="px-2 py-3 text-center text-gray-600 border-r">
                                                {staff.eduOther > 0 ? (
                                                    <button onClick={() => handleCellClick(staff.id, staff.name, 'Edu Project', 'other')} className="text-primary hover:underline font-semibold">{staff.eduOther}</button>
                                                ) : '-'}
                                            </td>

                                            {/* Total Marks */}
                                            <td className="px-4 py-3 text-center">
                                                <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                                                    {staff.totalMarks}
                                                </span>
                                            </td>
                                        </tr>
                                    ));
                                })()
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

export default TeamPerformance;
