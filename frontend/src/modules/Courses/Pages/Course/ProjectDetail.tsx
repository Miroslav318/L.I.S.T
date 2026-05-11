import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import api from "../../../../services/api";
import { useNotification } from "../../../../shared/components/NotificationContext";
import EmptyState from "../../../../shared/components/EmptyState";
import UploadSolutionForm from "../../../Assignments/components/UploadSolutionForm";
import type { ProjectDetail as ProjectDetailType, ProjectTopic } from "../../../Assignments/types/Project";

const formatDateTime = (value: string | null) =>
  value ? new Date(value).toLocaleString("sk-SK") : "Bez terminu";

const formatSlots = (topic: ProjectTopic) => {
  if (topic.selectionLimit == null) return "Bez limitu";
  return `${topic.freeSlots ?? 0} z ${topic.selectionLimit}`;
};

export default function ProjectDetail() {
  const { id, assignmentId } = useParams();
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const assignmentIdNumber = Number(assignmentId);

  const [detail, setDetail] = useState<ProjectDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingTaskId, setSavingTaskId] = useState<number | null>(null);
  const [previewTaskId, setPreviewTaskId] = useState<number | null>(null);

  const previewTopic = useMemo(() => {
    if (!detail) return null;

    return (
      detail.topics.find((topic) => topic.taskId === previewTaskId) ??
      detail.topics.find((topic) => topic.taskId === detail.selectedTaskId) ??
      detail.topics[0] ??
      null
    );
  }, [detail, previewTaskId]);

  const load = async () => {
    if (!assignmentIdNumber) return;
    setLoading(true);
    try {
      const res = await api.get<ProjectDetailType>(`/projects/${assignmentIdNumber}`);
      const nextDetail = res.data;
      setDetail(nextDetail);
      setPreviewTaskId((currentTaskId) =>
        currentTaskId && nextDetail.topics.some((topic) => topic.taskId === currentTaskId)
          ? currentTaskId
          : nextDetail.selectedTaskId ?? nextDetail.topics[0]?.taskId ?? null
      );
    } catch (err) {
      console.error(err);
      showNotification("Projekt sa nepodarilo nacitat.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [assignmentIdNumber]);

  const selectTopic = async (taskId: number | null) => {
    if (!detail) return;
    setSavingTaskId(taskId ?? detail.selectedTaskId ?? -1);
    if (taskId) {
      setPreviewTaskId(taskId);
    }
    try {
      await api.patch(`/projects/${detail.assignmentId}/selection`, { taskId });
      await load();
      showNotification(taskId ? "Tema projektu bola vybrana." : "Vyber temy bol zruseny.", "success");
    } catch (err: any) {
      showNotification(err.response?.data ?? "Vyber projektu sa nepodarilo ulozit.", "error");
    } finally {
      setSavingTaskId(null);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (!detail) {
    return <EmptyState message="Projekt sa nepodarilo nacitat." />;
  }

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <Button
          variant="text"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(`/student/courses/${id}/projects`)}
        >
          Spat
        </Button>
        <Typography variant="h5" fontWeight="bold">
          {detail.assignmentName}
        </Typography>
      </Stack>

      <Stack spacing={2}>
        <Paper sx={{ p: 2 }}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between">
            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                Termin vyberu temy
              </Typography>
              <Typography>{formatDateTime(detail.projectSelectionDeadline)}</Typography>
            </Box>
            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                Termin odovzdania
              </Typography>
              <Typography>{formatDateTime(detail.uploadEndTime)}</Typography>
            </Box>
            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                Stav
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                {detail.selectedTaskId ? (
                  <Chip icon={<CheckCircleIcon />} label="Tema vybrana" color="success" size="small" />
                ) : (
                  <Chip label="Bez vyberu" size="small" />
                )}
                {detail.canUpload ? (
                  <Chip icon={<UploadFileIcon />} label="Odovzdanie otvorene" color="primary" size="small" />
                ) : (
                  <Chip label="Odovzdanie zatvorene" size="small" />
                )}
              </Stack>
            </Box>
          </Stack>
        </Paper>

        {detail.instructions && (
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Pravidla projektu
            </Typography>
            <Box
              sx={{
                "& img": { maxWidth: "100%" },
                "& p": { mb: 1.5 },
              }}
              dangerouslySetInnerHTML={{ __html: detail.instructions }}
            />
          </Paper>
        )}

        <Paper sx={{ p: 2 }}>
          <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1} sx={{ mb: 2 }}>
            <Box>
              <Typography variant="h6">Vyber temy</Typography>
              <Typography variant="body2" color="text.secondary">
                Zadanie temy si mozes pozriet bez vyberu. Odovzdanie sa otvori az po vybere temy.
              </Typography>
            </Box>
            {detail.selectedTaskId && detail.canSelect && (
              <Button
                variant="outlined"
                color="inherit"
                onClick={() => selectTopic(null)}
                disabled={savingTaskId !== null}
              >
                Zrusit vyber
              </Button>
            )}
          </Stack>

          {!detail.canSelect && !detail.hasSubmittedSolution && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Vyber temy uz nie je otvoreny.
            </Alert>
          )}

          {detail.hasSubmittedSolution && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Riesenie uz bolo odovzdane, preto sa tema projektu neda menit.
            </Alert>
          )}

          {detail.topics.length === 0 ? (
            <EmptyState message="Projekt nema ziadne temy." />
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: "#f0f4ff" }}>
                  <TableCell>Nazov temy</TableCell>
                  <TableCell>Volne miesta</TableCell>
                  <TableCell>Studenti</TableCell>
                  <TableCell align="right">Akcia</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {detail.topics.map((topic) => {
                  const selected = topic.taskId === detail.selectedTaskId;
                  const previewed = topic.taskId === previewTopic?.taskId;
                  const disabled = !detail.canSelect || selected || topic.isFull || savingTaskId !== null;

                  return (
                    <TableRow
                      key={topic.taskId}
                      hover
                      selected={selected}
                      sx={previewed && !selected ? { backgroundColor: "action.hover" } : undefined}
                    >
                      <TableCell>
                        <Stack spacing={0.5}>
                          <Button
                            variant="text"
                            size="small"
                            onClick={() => setPreviewTaskId(topic.taskId)}
                            sx={{
                              justifyContent: "flex-start",
                              minWidth: 0,
                              p: 0,
                              textAlign: "left",
                              textTransform: "none",
                              fontWeight: selected || previewed ? "bold" : undefined,
                            }}
                          >
                            {topic.name}
                          </Button>
                          <Typography variant="body2" color="text.secondary">
                            {topic.pointsTotal} bodov
                            {topic.authorName ? `, autor ${topic.authorName}` : ""}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>{formatSlots(topic)}</TableCell>
                      <TableCell>
                        {topic.students.length > 0
                          ? topic.students.map((student) => student.fullName).join(", ")
                          : "Nikto zatial nepracuje na tejto teme."}
                      </TableCell>
                      <TableCell align="right">
                        <Button
                          variant={selected ? "outlined" : "contained"}
                          size="small"
                          disabled={disabled}
                          onClick={() => selectTopic(topic.taskId)}
                        >
                          {selected ? "Vybrana" : topic.isFull ? "Plna" : "Vybrat"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </Paper>

        {previewTopic && (
          <Paper sx={{ p: 2 }}>
            <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1} sx={{ mb: 1 }}>
              <Box>
                <Typography variant="h6" gutterBottom>
                  Zadanie projektu
                </Typography>
                <Typography variant="h5" fontWeight="bold">
                  {previewTopic.name}
                </Typography>
              </Box>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                {previewTopic.taskId === detail.selectedTaskId && (
                  <Chip icon={<CheckCircleIcon />} label="Tema vybrana" color="success" size="small" />
                )}
                {previewTopic.taskId !== detail.selectedTaskId && previewTopic.isFull && (
                  <Chip label="Tema je plna" size="small" />
                )}
                {previewTopic.taskId !== detail.selectedTaskId && (
                  <Button
                    variant="contained"
                    size="small"
                    disabled={!detail.canSelect || previewTopic.isFull || savingTaskId !== null}
                    onClick={() => selectTopic(previewTopic.taskId)}
                  >
                    Vybrat tuto temu
                  </Button>
                )}
              </Stack>
            </Stack>
            <Divider sx={{ mb: 2 }} />
            {previewTopic.text ? (
              <Box
                sx={{
                  "& img": { maxWidth: "100%" },
                  "& p": { mb: 1.5 },
                }}
                dangerouslySetInnerHTML={{ __html: previewTopic.text }}
              />
            ) : (
              <Typography color="text.secondary">Tema nema vyplneny text zadania.</Typography>
            )}
            <Divider sx={{ mt: 2, mb: 1 }} />
            <Typography variant="subtitle2" color="text.secondary">
              Autor: {previewTopic.authorName ?? "Neznamy autor"} | {previewTopic.pointsTotal} bodov
            </Typography>
          </Paper>
        )}

        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Odovzdanie riesenia
          </Typography>
          {!detail.selectedTaskId ? (
            <Typography color="text.secondary">Pred odovzdanim si najprv vyber temu projektu.</Typography>
          ) : detail.canUpload ? (
            <UploadSolutionForm assignmentId={detail.assignmentId} />
          ) : (
            <Typography color="text.secondary">Tento projekt teraz nie je mozne odovzdat.</Typography>
          )}
        </Paper>
      </Stack>
    </Box>
  );
}
