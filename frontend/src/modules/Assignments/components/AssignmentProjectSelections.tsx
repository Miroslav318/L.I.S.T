import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import api from "../../../services/api";
import { useNotification } from "../../../shared/components/NotificationContext";
import { TeacherProjectSelections } from "../types/Project";

type Props = {
  assignmentId: number;
};

type StudentRow = {
  studentId: number;
  fullName: string;
  email: string;
  hasSolution: boolean;
  selectedTaskId: number | null;
};

export default function AssignmentProjectSelections({ assignmentId }: Props) {
  const { showNotification } = useNotification();
  const [data, setData] = useState<TeacherProjectSelections | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingStudentId, setSavingStudentId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get<TeacherProjectSelections>(
        `/projects/assignments/${assignmentId}/selections`
      );
      setData(res.data);
    } catch (err) {
      console.error(err);
      showNotification("Nepodarilo sa nacitat vybery projektu.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [assignmentId]);

  const rows = useMemo<StudentRow[]>(() => {
    if (!data) return [];

    const selected = data.topics.flatMap((topic) =>
      topic.students.map((student) => ({
        ...student,
        selectedTaskId: topic.taskId,
      }))
    );

    const unassigned = data.unassignedStudents.map((student) => ({
      ...student,
      selectedTaskId: null,
    }));

    return [...selected, ...unassigned].sort((a, b) =>
      a.fullName.localeCompare(b.fullName)
    );
  }, [data]);

  const assignProject = async (studentId: number, taskId: number | null) => {
    setSavingStudentId(studentId);
    try {
      await api.patch(
        `/projects/assignments/${assignmentId}/students/${studentId}`,
        { taskId }
      );
      showNotification("Vyber projektu bol nastaveny.", "success");
      await load();
    } catch (err: any) {
      showNotification(
        err.response?.data ?? "Nepodarilo sa nastavit vyber projektu.",
        "error"
      );
    } finally {
      setSavingStudentId(null);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (!data) {
    return <Alert severity="error">Projektove vybery sa nepodarilo nacitat.</Alert>;
  }

  return (
    <Stack spacing={2}>
      <Alert severity="info">
        Studentom bez odovzdaneho riesenia mozes projektovu temu priradit alebo
        zmenit. Po odovzdani riesenia je vyber uzamknuty.
      </Alert>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Prehlad tem
        </Typography>
        <Stack spacing={1}>
          {data.topics.map((topic) => (
            <Box
              key={topic.taskId}
              display="flex"
              justifyContent="space-between"
              gap={2}
              flexWrap="wrap"
            >
              <Typography fontWeight={600}>{topic.name}</Typography>
              <Typography color="text.secondary">
                {topic.selectedCount}
                {topic.selectionLimit ? ` / ${topic.selectionLimit}` : " / bez limitu"}
              </Typography>
            </Box>
          ))}
        </Stack>
      </Paper>

      <Paper>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Student</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Projektova tema</TableCell>
              <TableCell>Stav</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.studentId}>
                <TableCell>{row.fullName}</TableCell>
                <TableCell>{row.email}</TableCell>
                <TableCell>
                  <FormControl size="small" sx={{ minWidth: 260 }}>
                    <InputLabel id={`project-selection-${row.studentId}`}>
                      Tema
                    </InputLabel>
                    <Select
                      labelId={`project-selection-${row.studentId}`}
                      label="Tema"
                      value={row.selectedTaskId?.toString() ?? ""}
                      disabled={row.hasSolution || savingStudentId === row.studentId}
                      onChange={(e) =>
                        assignProject(
                          row.studentId,
                          e.target.value ? Number(e.target.value) : null
                        )
                      }
                    >
                      <MenuItem value="">Bez projektu</MenuItem>
                      {data.topics.map((topic) => {
                        const isCurrent = row.selectedTaskId === topic.taskId;
                        const disabled = topic.isFull && !isCurrent;
                        return (
                          <MenuItem
                            key={topic.taskId}
                            value={topic.taskId.toString()}
                            disabled={disabled}
                          >
                            {topic.name}
                            {topic.selectionLimit
                              ? ` (${topic.selectedCount}/${topic.selectionLimit})`
                              : ""}
                          </MenuItem>
                        );
                      })}
                    </Select>
                  </FormControl>
                </TableCell>
                <TableCell>
                  {row.hasSolution ? "Odovzdane riesenie" : "Mozno menit"}
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  V kurze nie su schvaleni studenti.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </Stack>
  );
}
