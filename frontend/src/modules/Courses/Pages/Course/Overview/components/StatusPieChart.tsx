import { Card, CardContent, Typography, Box, CircularProgress,Paper, Stack } from '@mui/material';
import { PieChart, Pie, Cell, Legend, ResponsiveContainer } from 'recharts';
import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import api from '../../../../../../services/api';

const statusLabels: Record<string, string> = {
    graded: 'Ohodnotené',
    submitted: 'Odovzdané',
    open: 'Otvorené',
    missing: 'Neodovzdané',
};

const statusColors: Record<string, string> = {
    graded: '#4caf50',
    submitted: '#2196f3',
    open: '#9c27b0',
    missing: '#f44336',
};

export default function StatusPieChart() {
    const { id } = useParams();
    const [loading, setLoading] = useState(true);
    const [assignments, setAssignments] = useState<any[]>([]);
    const [studentPoints, setStudentPoints] = useState<Record<number, number>>({});
    const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
    const [hoveredStatus, setHoveredStatus] = useState<string | null>(null);

    const navigate = useNavigate();

    useEffect(() => {
        if (!id) return;

        const fetchData = async () => {
            setLoading(true);
            try {
                const [assignmentsRes, pointsRes] = await Promise.all([
                    api.get(`/assignments/course/${id}`),
                    api.get(`/solutions/courses/${id}/student-points`)
                ]);

                setAssignments(assignmentsRes.data);
                const map: Record<number, number> = {};
                pointsRes.data.forEach((p: { assignmentId: number; points: number }) => {
                    map[p.assignmentId] = p.points;
                });
                setStudentPoints(map);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id]);

    const getAssignmentStatus = (assignmentId: number, deadlineStr: string | null): string => {
        const points = studentPoints[assignmentId];
        const hasSolution = assignmentId in studentPoints;
        const deadline = deadlineStr ? new Date(deadlineStr) : null;
        const now = new Date();

        if (points != null) return "graded";
        if (hasSolution) return "submitted";
        if (deadline && deadline < now) return "missing";
        return "open";
    };

    const statusCounts: Record<string, number> = {};
    assignments.forEach((a) => {
        const status = getAssignmentStatus(a.id, a.uploadEndTime);
        statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    const pieData = Object.entries(statusCounts)
        .map(([key, value]) => ({
            name: statusLabels[key] ?? key,
            value,
            key,
        }))
        .filter((item) => item.value > 0);

    const handleSegmentClick = (statusKey: string) => {
        setSelectedStatus((prev) => (prev === statusKey ? null : statusKey));
    };
    const visibleAssignments = selectedStatus
        ? assignments.filter((a) => getAssignmentStatus(a.id, a.uploadEndTime) === selectedStatus)
        : [];

    if (loading) {
        return <CircularProgress sx={{ m: 3 }} />;
    }

    return (
        <Card sx={{ flex: 1 }}>
            <CardContent>
                <Typography variant="subtitle1" color="primary" fontWeight="medium" gutterBottom>
                    Status tvojich zadaní
                </Typography>

                <Box width="100%" height={300}>
                    <ResponsiveContainer>
                        <PieChart>
                            <Pie
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={90}
                                paddingAngle={4}
                                dataKey="value"
                                label={({ value }) => value}
                                labelLine={false}
                                isAnimationActive={false}
                                onClick={(e: any) => handleSegmentClick(e.key)}
                                onMouseMove={(e: any) => setHoveredStatus(e?.activePayload?.[0]?.payload?.key ?? null)}
                                onMouseLeave={() => setHoveredStatus(null)}
                            >
                                {pieData.map((entry) => {
                                    const isActive = entry.key === hoveredStatus || entry.key === selectedStatus;
                                    return (
                                        <Cell
                                            key={entry.key}
                                            fill={statusColors[entry.key]}
                                            cursor="pointer"
                                            stroke={isActive ? '#000' : undefined}
                                            strokeWidth={isActive ? 2 : 0}
                                        />
                                    );
                                })}
                            </Pie>

                            <Legend layout="horizontal" verticalAlign="bottom" align="center" />
                        </PieChart>
                    </ResponsiveContainer>
                </Box>

                {selectedStatus && (
                    <Box mt={2}>
                        <Typography variant="subtitle2" gutterBottom>
                            Zadania so statusom <strong>{statusLabels[selectedStatus]}</strong>:
                        </Typography>

                        <Stack spacing={1}>
                            {visibleAssignments.map((a) => (
                                <Paper
                                    key={a.id}
                                    variant="outlined"
                                    onClick={() => navigate(`/student/courses/${id}/assignments/${a.id}/tasks`)}
                                    sx={{
                                        p: 1.5,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        backgroundColor: '#f9f9fc',
                                        borderLeft: `4px solid ${statusColors[selectedStatus]}`,
                                        cursor: 'pointer',
                                        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                                        '&:hover': {
                                            transform: 'translateY(-2px)',
                                            boxShadow: 3,
                                        },
                                    }}
                                >

                                <Typography variant="body1" fontWeight="bold">
                                        {a.name}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Deadline: {a.uploadEndTime ? new Date(a.uploadEndTime).toLocaleString() : '—'}
                                    </Typography>
                                    <Typography variant="body2">
                                        Body: {(studentPoints[a.id] ?? '–')} / {(a.pointsOverride ?? '–')}
                                    </Typography>
                                </Paper>
                            ))}
                        </Stack>
                    </Box>
                )}
            </CardContent>
        </Card>
    );
}
