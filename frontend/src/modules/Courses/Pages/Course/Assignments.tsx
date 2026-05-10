import {
    Box,
    Card,
    CardContent,
    Typography,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    Chip,
    Button,
    Stack,
    CircularProgress,
    Checkbox,
    FormControlLabel,
} from '@mui/material';
import { useState, useEffect } from "react";
import api from "../../../../services/api";
import { useNotification } from "../../../../shared/components/NotificationContext.tsx";
import { useNavigate, useParams } from "react-router-dom";

type AssignmentStatus = 'graded' | 'submitted' | 'open' | 'missing';

const statusLabels: Record<AssignmentStatus, string> = {
    graded: 'Ohodnotené',
    submitted: 'Odovzdané',
    open: 'Otvorené',
    missing: 'Neodovzdané',
};
const getStatusChip = (status: string) => {
    const colorMap = {
        graded: 'success',
        submitted: 'info',
        open: 'secondary',
        missing: 'error',
    } as const;
    const color = status in colorMap ? colorMap[status as AssignmentStatus] : 'default';

    return (
        <Chip
            label={status in statusLabels ? statusLabels[status as AssignmentStatus] : status}
            color={color}
            size="small"
        />
    );
};

const getDeadlineColor = (deadline: Date) => {
    const now = new Date();
    const diffMs = deadline.getTime() - now.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (diffDays < 0) return 'text.secondary';
    if (diffDays < 2) return 'error.main';
    if (diffDays < 7) return 'warning.main';
    return 'primary.main';
};

export default function Assignments() {
    const { id } = useParams();
    const { showNotification } = useNotification();
    const [assignments, setAssignments] = useState<any[]>([]);
    const [statusFilter, setStatusFilter] = useState<string | 'all'>('all');
    const [loading, setLoading] = useState(true);
    const [visibleTypes, setVisibleTypes] = useState<Record<string, boolean>>({});
    const navigate = useNavigate();

    const [studentPoints, setStudentPoints] = useState<Record<number, number>>({});

    const getAssignmentStatus = (
        assignmentId: number,
        deadlineStr: string | null,
    ): string => {
        const points = studentPoints[assignmentId];
        const hasSolution = assignmentId in studentPoints;
        const deadline = deadlineStr ? new Date(deadlineStr) : null;
        const now = new Date();

        if (points != null) return "graded";
        if (hasSolution) return "submitted";


        if (deadline && deadline < now) {
            return "missing";
        }

        return "open";
    };


    useEffect(() => {
        const fetchAssignments = async () => {
            try {
                const response = await api.get(`/assignments/course/${id}`);
                setAssignments(response.data);

                // Inicializujeme viditeľnosť pre každý typ úloh (všetko na true)
                const typesMap: Record<string, boolean> = {};
                response.data.forEach((a: any) => {
                    typesMap[a.taskSetTypeIdentifier] = true;
                });
                setVisibleTypes(typesMap);
            } catch (error) {
                console.error(error);
                showNotification("Nepodarilo sa načítať zadania", "error");
            } finally {
                setLoading(false);
            }
        };
        fetchAssignments();
    }, [id]);

    useEffect(() => {
        if (!id) return;
        api
            .get(`/solutions/courses/${id}/student-points`)
            .then((res) => {
                const map: Record<number, number> = {};
                res.data.forEach((p: { assignmentId: number; points: number }) => {
                    map[p.assignmentId] = p.points;
                });
                setStudentPoints(map);
            })
            .catch((err) => {
                console.error(err);
                showNotification("Nepodarilo sa načítať získané body", "error");
            });
    }, [id]);


    const filteredAssignments = statusFilter === 'all'
        ? assignments
        : assignments.filter((a) => {
            const status = getAssignmentStatus(a.id, a.uploadEndTime);
            return status === statusFilter;
        });


    const assignmentTypes = Array.from(
        new Map(
            assignments.map((a) => [a.taskSetTypeIdentifier, a.taskSetTypeName])
        ).entries()
    ).map(([typeId, label]) => ({ id: typeId, label }));

    if (loading) {
        return <CircularProgress sx={{ mt: 4 }} />;
    }

    const toggleVisibility = (typeId: string) => {
        setVisibleTypes(prev => ({
            ...prev,
            [typeId]: !prev[typeId],
        }));
    };

    return (
        <Box>
            <Typography variant="h5" sx={{ mb: 0 }} fontWeight="bold" gutterBottom>
                Zadania
            </Typography>

            <Box
                sx={{
                    backgroundColor: '#f0f4ff',
                    p: 2,
                    borderRadius: 2,
                    mb: 1,
                }}
            >
                <Typography variant="body1" fontWeight="medium" gutterBottom>
                    Filtrovať podľa stavu:
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                    <Button
                        variant={statusFilter === 'all' ? 'contained' : 'outlined'}
                        size="small"
                        onClick={() => setStatusFilter('all')}
                    >
                        Všetky
                    </Button>
                    {Object.entries(statusLabels).map(([key, label]) => (
                        <Button
                            key={key}
                            variant={statusFilter === key ? 'contained' : 'outlined'}
                            size="small"
                            onClick={() => setStatusFilter(key)}
                        >
                            {label}
                        </Button>
                    ))}
                </Stack>
            </Box>

            {assignmentTypes.map((type) => {
                const assignmentsOfType = filteredAssignments.filter(
                    (a) => a.taskSetTypeIdentifier === type.id
                );

                if (assignmentsOfType.length === 0) return null;

                const totalPoints = assignmentsOfType.reduce(
                    (sum, a) => sum + (studentPoints[a.id] ?? 0),
                    0
                );

                const maxPoints = assignmentsOfType.reduce(
                    (sum, a) => sum + (a.pointsOverride ?? 0),
                    0
                );

                return (
                    <Box key={type.id} mb={1}>
                        <Box display="flex" alignItems="center" mb={0.5}>
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        size="small"
                                        checked={!!visibleTypes[type.id]}
                                        onChange={() => toggleVisibility(type.id)}
                                    />
                                }
                                label={
                                    <Typography variant="subtitle1" fontWeight="bold" color="primary">
                                        {type.label}
                                    </Typography>
                                }
                                sx={{ mr: 'auto', userSelect: 'none', '& .MuiFormControlLabel-label': { flexGrow: 1 } }}
                            />
                            <Typography variant="body2" color="text.secondary">
                                {totalPoints} / {maxPoints} points
                            </Typography>
                        </Box>

                        {visibleTypes[type.id] && (
                            <Card>
                                <CardContent sx={{ p: 0 }}>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow sx={{ backgroundColor: '#f0f4ff' }}>
                                                <TableCell sx={{ py: 0.5 }}>Zadanie</TableCell>
                                                <TableCell sx={{ py: 0.5 }}>Deadline</TableCell>
                                                <TableCell sx={{ py: 0.5 }}>Body</TableCell>
                                                <TableCell sx={{ py: 0.5 }}>Status</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {assignmentsOfType.map((a) => {
                                                const deadline = a.uploadEndTime ? new Date(a.uploadEndTime) : null;

                                                return (
                                                    <TableRow
                                                        key={a.id}
                                                        hover
                                                        sx={{ cursor: 'pointer', '& td': { py: 0.5 } }}
                                                        onClick={() =>
                                                            navigate(`/student/courses/${id}/assignments/${a.id}/tasks`)
                                                        }
                                                    >
                                                        <TableCell>{a.name}</TableCell>
                                                        <TableCell sx={{ color: deadline ? getDeadlineColor(deadline) : undefined }}>
                                                            {deadline ? deadline.toLocaleString() : '—'}
                                                        </TableCell>
                                                        <TableCell>
                                                            {(studentPoints[a.id] ?? '–')} / {(a.pointsOverride ?? '–')}
                                                        </TableCell>
                                                        <TableCell>
                                                            {getStatusChip(getAssignmentStatus(a.id, a.uploadEndTime))}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        )}
                    </Box>
                );
            })}
        </Box>
    );
}
