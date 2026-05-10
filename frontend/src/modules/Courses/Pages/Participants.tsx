import {
    Box,
    Container,
    Typography,
    Card,
    CardContent,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    IconButton,
    CircularProgress,
    TextField,
    TableFooter,
    TablePagination,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Button,
    Checkbox,
    FormControlLabel
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import ClearIcon from '@mui/icons-material/Clear';
import { useEffect, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import api from '../../../services/api.ts';
import { useNotification } from '../../../shared/components/NotificationContext';
import type { CourseGroup } from '../Types/CourseGroup';

interface Participant {
    userId: number;
    userName: string;
    email: string;
    allowed: boolean;
    groupId: number | null;
    groupName: string | null;
}

export default function Participants() {
    const { id } = useParams();
    const location = useLocation();
    const courseName = location.state?.courseName ?? '';
    const periodName = location.state?.periodName ?? '';
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [groups, setGroups] = useState<CourseGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const { showNotification } = useNotification();
    const [manualEmail, setManualEmail] = useState('');
    const [manualGroupId, setManualGroupId] = useState<number | null>(null);
    const [manualAllowed, setManualAllowed] = useState(true);

    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);

    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(15);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
        }, 250);

        return () => clearTimeout(handler);
    }, [searchQuery]);

    useEffect(() => {
        const fetchParticipants = async () => {
            try {
                const [participantsRes, groupsRes] = await Promise.all([
                    api.get<Participant[]>(`/participants/course/${id}`),
                    api.get<CourseGroup[]>(`/groups/course/${id}`)
                ]);
                const sorted = [...participantsRes.data].sort((a, b) => Number(a.allowed) - Number(b.allowed));
                setParticipants(sorted);
                setGroups(groupsRes.data);
            } catch (err) {
                console.error(err);
                showNotification("Nepodarilo sa načítať účastníkov.", "error");
            } finally {
                setLoading(false);
            }
        };

        fetchParticipants();
    }, [id]);

    const approveParticipant = async (userId: number) => {
        try {
            await api.patch('/participants/approve', {
                courseId: Number(id),
                userId
            });
            setParticipants(prev =>
                prev.map(p => p.userId === userId ? { ...p, allowed: true } : p)
            );
            showNotification("Účastník bol potvrdený.", "success");
        } catch (err: any) {
            const msg = err.response?.data ?? "Nepodarilo sa potvrdiť účastníka.";
            showNotification(msg, "error");
        }
    };

    const removeParticipant = async (userId: number) => {
        try {
            await api.delete(`/participants/remove`, {
                params: {
                    courseId: Number(id),
                    userId
                }
            });
            setParticipants(prev => prev.filter(p => p.userId !== userId));
            showNotification("Účastník bol odstránený.", "success");
        } catch (err) {
            console.error(err);
            showNotification("Nepodarilo sa odstrániť účastníka.", "error");
        }
    };

    const assignGroup = async (userId: number, groupId: number | null) => {
        try {
            const res = await api.patch('/participants/group', {
                courseId: Number(id),
                userId,
                groupId
            });

            setParticipants(prev =>
                prev.map(p =>
                    p.userId === userId
                        ? { ...p, groupId: res.data.groupId ?? null, groupName: res.data.groupName ?? null }
                        : p
                )
            );
            showNotification("Skupina bola nastavena.", "success");
        } catch (err: any) {
            const msg = err.response?.data ?? "Nepodarilo sa nastavit skupinu.";
            showNotification(msg, "error");
        }
    };

    const addParticipantManually = async () => {
        if (!manualEmail.trim()) {
            showNotification("Zadaj email studenta.", "error");
            return;
        }

        try {
            const res = await api.post('/participants/manual', {
                courseId: Number(id),
                email: manualEmail.trim(),
                groupId: manualGroupId,
                allowed: manualAllowed
            });

            setParticipants(prev => [...prev, res.data]);
            setManualEmail('');
            setManualGroupId(null);
            setManualAllowed(true);
            showNotification("Student bol pridany do kurzu.", "success");
        } catch (err: any) {
            const msg = err.response?.data ?? "Nepodarilo sa pridat studenta do kurzu.";
            showNotification(msg, "error");
        }
    };

    const filteredParticipants = participants.filter(p =>
        p.userName.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
    );

    const paginatedParticipants = filteredParticipants.slice(
        page * rowsPerPage,
        page * rowsPerPage + rowsPerPage
    );

    return (
        <Container maxWidth="lg" sx={{ mt: 5 }}>
            <Typography variant="h4" gutterBottom>
                Účastníci kurzu – {courseName} ({periodName})
            </Typography>

            <Card>
                <CardContent>
                    <Box sx={{ mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                        <TextField
                            label="Email studenta"
                            size="small"
                            value={manualEmail}
                            onChange={e => setManualEmail(e.target.value)}
                            sx={{ minWidth: 260 }}
                        />
                        <FormControl size="small" sx={{ minWidth: 180 }}>
                            <InputLabel id="manual-group-select">Skupina</InputLabel>
                            <Select
                                labelId="manual-group-select"
                                label="Skupina"
                                value={manualGroupId?.toString() ?? ""}
                                onChange={(e) => setManualGroupId(e.target.value ? Number(e.target.value) : null)}
                            >
                                <MenuItem value="">Bez skupiny</MenuItem>
                                {groups.map(group => (
                                    <MenuItem key={group.id} value={group.id.toString()}>
                                        {group.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={manualAllowed}
                                    onChange={(e) => setManualAllowed(e.target.checked)}
                                />
                            }
                            label="Schvaleny"
                        />
                        <Button variant="contained" onClick={addParticipantManually}>
                            Pridat studenta
                        </Button>
                    </Box>

                    <Box sx={{ mb: 2 }}>
                        <TextField
                            fullWidth
                            label="Vyhľadaj podľa mena"
                            variant="outlined"
                            size="small"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </Box>

                    {loading ? (
                        <CircularProgress />
                    ) : (
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Meno</TableCell>
                                    <TableCell>Email</TableCell>
                                    <TableCell>Skupina</TableCell>
                                    <TableCell>Stav</TableCell>
                                    <TableCell align="right">Akcie</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {paginatedParticipants.map(p => (
                                    <TableRow key={p.userId}>
                                        <TableCell>{p.userName}</TableCell>
                                        <TableCell>{p.email}</TableCell>
                                        <TableCell>
                                            <FormControl size="small" sx={{ minWidth: 160 }}>
                                                <InputLabel id={`group-select-${p.userId}`}>Skupina</InputLabel>
                                                <Select
                                                    labelId={`group-select-${p.userId}`}
                                                    label="Skupina"
                                                    value={p.groupId?.toString() ?? ""}
                                                    onChange={(e) =>
                                                        assignGroup(
                                                            p.userId,
                                                            e.target.value ? Number(e.target.value) : null
                                                        )
                                                    }
                                                >
                                                    <MenuItem value="">Bez skupiny</MenuItem>
                                                    {groups.map(group => (
                                                        <MenuItem key={group.id} value={group.id.toString()}>
                                                            {group.name}
                                                        </MenuItem>
                                                    ))}
                                                </Select>
                                            </FormControl>
                                        </TableCell>
                                        <TableCell>
                                            {p.allowed ? 'Potvrdený' : 'Čaká na schválenie'}
                                        </TableCell>
                                        <TableCell align="right">
                                            <Box>
                                                {!p.allowed && (
                                                    <IconButton onClick={() => approveParticipant(p.userId)}>
                                                        <CheckIcon color="success" />
                                                    </IconButton>
                                                )}
                                                <IconButton onClick={() => removeParticipant(p.userId)}>
                                                    <ClearIcon color="error" />
                                                </IconButton>
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                            <TableFooter>
                                <TableRow>
                                    <TablePagination
                                        count={filteredParticipants.length}
                                        page={page}
                                        onPageChange={(_e, newPage) => setPage(newPage)}
                                        rowsPerPage={rowsPerPage}
                                        onRowsPerPageChange={(e) => {
                                            setRowsPerPage(parseInt(e.target.value, 10));
                                            setPage(0);
                                        }}
                                        rowsPerPageOptions={[5, 15, 25]}
                                        labelRowsPerPage="Účastníkov na stránku:"
                                    />
                                </TableRow>
                            </TableFooter>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </Container>
    );
}
