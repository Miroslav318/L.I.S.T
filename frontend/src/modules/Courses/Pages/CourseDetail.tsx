import { useParams, Outlet } from 'react-router-dom';
import { Box } from '@mui/material';
import React, { useState } from "react";
import Sidebar from "../../Application/components/Sidebar.tsx";

const courseSidebarItems = [
    { label: 'Kurzy', path: '/student' },
    { label: 'Popis', path: 'description' },
    { label: 'Úlohy', path: 'assignments' },
    { label: 'Prehľad', path: 'overview' },
    { label: 'Projekty', path: 'projects' },
    { label: 'Skupiny', path: 'groups' },
];
const drawerWidth = 240;
export default function CourseDetail() {
    const [isPermanent, setIsPermanent] = useState(false);
    const { id } = useParams();
    if (!id) return null;

    return (
        <Box sx={{ display: 'flex' }}>
            <Sidebar
                items={courseSidebarItems}
                basePath={`/student/courses/${id}/`}
                onModeChange={(permanent) => setIsPermanent(permanent)}
            />
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    p: 3,
                    ml: isPermanent ? `${drawerWidth}px` : 0,
                    transition: 'margin-left 0.3s',
                }}
            >
                <Outlet />
            </Box>
        </Box>
    );
}
