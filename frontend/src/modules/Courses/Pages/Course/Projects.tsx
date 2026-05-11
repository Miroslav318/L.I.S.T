import {
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Typography
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../../../services/api';
import EmptyState from '../../../../shared/components/EmptyState';
import { useNotification } from '../../../../shared/components/NotificationContext';
import { StudentProjectListItem } from '../../../Assignments/types/Project';

export default function Projects() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showNotification } = useNotification();
    const [projects, setProjects] = useState<StudentProjectListItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) return;
        setLoading(true);
        api
            .get<StudentProjectListItem[]>(`/projects/course/${id}`)
            .then((res) => setProjects(res.data))
            .catch((err) => {
                console.error(err);
                showNotification("Nepodarilo sa nacitat projekty.", "error");
            })
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" p={4}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box>
            <Typography variant="h5" fontWeight="bold" mb={2}>
                Projekty
            </Typography>
            {projects.length === 0 ? (
                <EmptyState message="V kurze zatial nie su dostupne projekty." />
            ) : (
                <Card>
                    <CardContent sx={{ p: 0 }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ backgroundColor: '#f0f4ff' }}>
                                    <TableCell>Nazov</TableCell>
                                    <TableCell>Zvolena tema</TableCell>
                                    <TableCell>Rieseni</TableCell>
                                    <TableCell>Ukoncenie / hodnotenie</TableCell>
                                    <TableCell align="right">Akcie</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {projects.map((project) => (
                                    <TableRow key={project.assignmentId} hover>
                                        <TableCell>{project.assignmentName}</TableCell>
                                        <TableCell>
                                            {project.selectedTaskName ?? (
                                                <Typography color="text.secondary" variant="body2">
                                                    Bez vyberu
                                                </Typography>
                                            )}
                                        </TableCell>
                                        <TableCell>{project.solutionCount}</TableCell>
                                        <TableCell>
                                            <Stack spacing={0.5}>
                                                <Typography variant="body2">
                                                    {project.uploadEndTime
                                                        ? new Date(project.uploadEndTime).toLocaleString()
                                                        : "Bez deadlinu"}
                                                </Typography>
                                                <Box>
                                                    {project.points != null ? (
                                                        <Chip
                                                            label={`${project.points} / ${project.maxPoints ?? "-"}`}
                                                            color="success"
                                                            size="small"
                                                        />
                                                    ) : project.canUpload ? (
                                                        <Chip label="Otvorene" color="primary" size="small" />
                                                    ) : (
                                                        <Chip label="Neohodnotene" size="small" />
                                                    )}
                                                </Box>
                                            </Stack>
                                        </TableCell>
                                        <TableCell align="right">
                                            <Button
                                                variant="outlined"
                                                size="small"
                                                onClick={() =>
                                                    navigate(`/student/courses/${id}/projects/${project.assignmentId}`)
                                                }
                                            >
                                                Otvorit
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}
        </Box>
    );
}
