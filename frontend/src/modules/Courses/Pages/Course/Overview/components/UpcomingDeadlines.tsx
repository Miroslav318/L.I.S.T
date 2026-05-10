import { useEffect, useState } from 'react';
import {
    Box,
    Typography,
    Card,
    CardContent,
    CircularProgress,
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../../../../../services/api';
import { getTypeColor } from './ColorHelper.ts';

export default function UpcomingDeadlines() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [deadlines, setDeadlines] = useState<any[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await api.get(`/assignments/course/${id}`);
                const now = new Date();

                const upcoming = res.data
                    .filter((a: any) => a.uploadEndTime && new Date(a.uploadEndTime) > now && a.published)
                    .sort((a: any, b: any) => new Date(a.uploadEndTime).getTime() - new Date(b.uploadEndTime).getTime())
                    .slice(0, 7);

                setDeadlines(upcoming);
            } catch (err) {
                console.error("Nepodarilo sa načítať deadliny", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id]);

    const getDaysLeftText = (end: string) => {
        const diff = (new Date(end).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
        return `o ${Math.ceil(diff)} dní`;
    };

    return (
        <Card     sx={{
            flex: 1,
            height: 380,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
        }}>
            <CardContent
                sx={{
                    flex: 1,
                    overflowY: 'auto',
                    pr: { xs: 2, md: 5 },
                }}
            >
                <Typography variant="subtitle1" color="primary" fontWeight="medium" gutterBottom>
                    Prichádzajúce Deadliny
                </Typography>

                {loading ? (
                    <Box py={2} textAlign="center">
                        <CircularProgress size={20} />
                    </Box>
                ) : deadlines.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                        Žiadne nadchádzajúce deadliny.
                    </Typography>
                ) : (
                    deadlines.map((item, index) => {
                        const typeId = item.taskSetTypeIdentifier;
                        const color = getTypeColor(typeId);

                        return (
                            <Box
                                key={`${item.id}-${index}`}
                                onClick={() => navigate(`/student/courses/${id}/assignments/${item.id}/tasks`)}
                                sx={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    py: 1,
                                    px: 1,
                                    borderRadius: 1,
                                    cursor: 'pointer',
                                    borderBottom: '1px solid #f0f0f0',
                                    transition: 'background-color 0.2s, box-shadow 0.2s',
                                    '&:hover': {
                                        backgroundColor: '#f9f9ff',
                                        boxShadow: `inset 3px 0 0 ${color}`,
                                    },
                                }}
                            >
                                <Box>
                                    <Typography variant="body2" fontWeight="medium">
                                        {item.name}
                                    </Typography>
                                    <Typography variant="caption" color="error">
                                        {getDaysLeftText(item.uploadEndTime)}
                                    </Typography>
                                </Box>
                                <Typography variant="body2" fontWeight="medium" color="text.secondary">
                                    {item.pointsOverride ?? '–'} bodov
                                </Typography>
                            </Box>
                        );
                    })
                )}
            </CardContent>
        </Card>
    );
}
