import {
    Box,
    Container,
    Grid,
    TextField,
    Typography,
    InputAdornment,
    MenuItem,
    InputLabel,
    FormControl, Select
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CourseCard from '../Components/StudentCourseCard';
import React, {useEffect, useState} from "react";
import {Course} from "../Types/Course.ts";
import {Period} from "../../Periods/Types/Period.ts";
import EmptyState from "../../../shared/components/EmptyState.tsx";
import api from "../../../services/api.ts";
import { useNotification } from "../../../shared/components/NotificationContext.tsx";

type MyCourseInfo = {
    courseId: number;
    allowed: boolean;
    groupId?: number | null;
};

export default function StudentCourses() {
    const [selectedPeriod, setSelectedPeriod] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);
    const [periods, setPeriods] = useState<Period[]>([]);
    const [loadingPeriods, setLoadingPeriods] = useState(true);
    const [courses, setCourses] = useState<Course[]>([]);
    const [loadingCourses, setLoadingCourses] = useState(true);
    const { showNotification } = useNotification();

    useEffect(() => {
        const fetchPeriods = async () => {
            try {
                const response = await api.get<Period[]>('/Periods');
                setPeriods(response.data);
            } catch (error) {
                console.error("Chyba pri načítaní období:", error);
                showNotification("Nepodarilo sa načítať obdobia.", "error");
            } finally {
                setLoadingPeriods(false);
            }
        };
        fetchPeriods();
    }, []);

    useEffect(() => {
        const fetchCoursesAndOwnership = async () => {
            try {
                const [coursesRes, myCourseIdsRes] = await Promise.all([
                    api.get<Course[]>('/courses/student-visible'),
                    api.get<MyCourseInfo[]>('/participants/mine')
                ]);

                const myCourseInfos = myCourseIdsRes.data;
                const myCourseMap = new Map<number, boolean>();
                myCourseInfos.forEach(p => myCourseMap.set(p.courseId, p.allowed));

                const coursesWithOwnership = coursesRes.data.map(course => ({
                    ...course,
                    isMine: myCourseMap.has(course.id),
                    allowed: myCourseMap.get(course.id),
                }));
                console.table(coursesWithOwnership.map(c => ({
                    id: c.id,
                    name: c.name,
                    isMine: c.isMine,
                    allowed: c.allowed,
                })));


                setCourses(coursesWithOwnership);
            } catch (error) {
                console.error("Chyba pri načítaní kurzov alebo participantov", error);
            } finally {
                setLoadingCourses(false);
            }
        };

        fetchCoursesAndOwnership();
    }, []);


    React.useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, 300);

        return () => clearTimeout(handler);
    }, [searchTerm]);

    const filterCourses = (courses: Course[]) => {
        return courses.filter((course) => {
            const matchesPeriod = selectedPeriod === '' || course.periodName === selectedPeriod;
            const matchesSearch =
                course.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
                course.teacherName?.toLowerCase().includes(debouncedSearchTerm.toLowerCase());

            return matchesPeriod && matchesSearch;
        });
    };

    const filteredYourCourses = filterCourses(courses.filter((c) => c.isMine && c.allowed === true));
    const filteredOtherCourses = filterCourses(
        courses
            .filter((c) => !c.allowed || !c.isMine)
            .sort((a, b) => {
                const aPending = a.isMine && a.allowed === false ? 1 : 0;
                const bPending = b.isMine && b.allowed === false ? 1 : 0;
                return bPending - aPending;
            })
    );


    const handleJoinUpdate = (courseId: number) => {
        setCourses(prev =>
            prev.map(c =>
                c.id === courseId
                    ? { ...c, isMine: true, allowed: false }
                    : c
            )
        );
    };

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            {}
            <Box
                display="flex"
                justifyContent="center"
                alignItems={{ xs: 'stretch', sm: 'center' }}
                gap={2}
                mb={4}
                sx={{
                    flexDirection: { xs: 'column', sm: 'row' },
                }}
            >
                <TextField
                    placeholder="Vyhľadaj kurzy..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    variant="outlined"
                    fullWidth
                    sx={{
                        maxWidth: 600,
                        borderRadius: '50px',
                        backgroundColor: 'white',
                    }}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon />
                            </InputAdornment>
                        ),
                    }}
                />

                <FormControl sx={{ minWidth: 200 }} disabled={loadingPeriods}>
                    <InputLabel id="period-select-label">Obdobie</InputLabel>
                    <Select
                        labelId="period-select-label"
                        value={selectedPeriod}
                        label="Obdobie"
                        onChange={(e) => setSelectedPeriod(e.target.value)}
                    >
                        <MenuItem value="">Všetky obdobia</MenuItem>
                        {periods.map((period) => (
                            <MenuItem key={period.id} value={period.name}>
                                {period.name}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

            </Box>

            {}
            <Typography variant="h6" fontWeight="bold" gutterBottom>
                Tvoje kurzy
            </Typography>
            {filteredYourCourses.length > 0 ? (
                <Grid container spacing={3} mb={6}>
                    {filteredYourCourses.map((course) => (
                        <Grid item key={course.id}>
                            <CourseCard {...course} />
                        </Grid>
                    ))}
                </Grid>
            ) : (
                <EmptyState
                    message="Nemáš žiadne kurzy."
                    subtext="Pridaj sa k niektorému z dostupných kurzov nižšie."
                />
            )}


            {}
            <Typography variant="h6" fontWeight="bold" gutterBottom>
                Ostatné kurzy
            </Typography>
            {filteredOtherCourses.length > 0 ? (
                <Grid container spacing={3}>
                    {filteredOtherCourses.map((course) => (
                        <Grid item key={course.id}>
                            <CourseCard {...course} onJoined={handleJoinUpdate}/>
                        </Grid>
                    ))}
                </Grid>
            ) : (
                <EmptyState
                    message="Žiadne ďalšie kurzy nie sú dostupné."
                    subtext="Skús zmeniť filtre alebo sa spýtaj vyučujúceho."
                />
            )}
        </Container>
    );
}
