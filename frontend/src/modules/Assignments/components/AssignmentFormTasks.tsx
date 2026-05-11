// src/modules/Assignments/components/AssignmentFormTasks.tsx

import {
  Box,
  Button,
  Checkbox,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Collapse,
  Typography,
  Alert,
} from "@mui/material";
import React from "react";
import { FC, useEffect, useState } from "react";
import { AssignmentTaskRelSlim } from "../types/AssignmentTaskRelSlim";
import { useNavigate } from "react-router-dom";
import PreviewIcon from "@mui/icons-material/Visibility";
import SaveIcon from "@mui/icons-material/Save";
import DeleteIcon from "@mui/icons-material/Delete";
import api from "../../../services/api";
import TaskPreview from "../../Tasks/Components/TaskPreview";
import { useNotification } from "../../../shared/components/NotificationContext";
import ConfirmDialog from "../../../shared/components/ConfirmDialog";
import EmptyState from "../../../shared/components/EmptyState.tsx";

type Props = {
  assignmentId: number;
  isProject?: boolean;
};

const AssignmentFormTasks: FC<Props> = ({ assignmentId, isProject = false }) => {
  const { showNotification } = useNotification();
  const [rows, setRows] = useState<AssignmentTaskRelSlim[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [toDeleteIdx, setToDeleteIdx] = useState<number | null>(null);
  const navigate = useNavigate();

  // načítaj existujúce vzťahy
  useEffect(() => {
    setLoading(true);
    api
      .get<AssignmentTaskRelSlim[]>(
        `/assignment-task-rel/by-assignment-slim/${assignmentId}`
      )
      .then((res) =>
        setRows(
          res.data.map((r) => ({ ...r, isSaving: false, previewOpen: false }))
        )
      )
      .catch(() => setError("Nepodarilo sa načítať priradené úlohy."))
      .finally(() => setLoading(false));
  }, [assignmentId]);

  const updateRow = (idx: number, data: Partial<AssignmentTaskRelSlim>) => {
    setRows((rows) => rows.map((r, i) => (i === idx ? { ...r, ...data } : r)));
  };

  // uloženie jedného řadka
  const handleSave = async (idx: number) => {
    const r = rows[idx];
    updateRow(idx, { isSaving: true });
    try {
      await api.put(`/assignment-task-rel`, {
        assignmentId: r.assignmentId,
        taskId: r.taskId,
        pointsTotal: r.pointsTotal,
        bonusTask: r.bonusTask,
        projectSelectionLimit: isProject ? r.projectSelectionLimit ?? null : null,
        internalComment: r.internalComment,
      });
      showNotification("Zmeny uložené", "success");
    } catch {
      showNotification("Chyba pri ukladaní", "error");
    } finally {
      updateRow(idx, { isSaving: false });
    }
  };

  // vymazanie vzťahu
  const handleDeleteClick = (idx: number) => {
    setToDeleteIdx(idx);
    setDeleteDialogOpen(true);
  };

  // potvrd delete
  const handleConfirmDelete = async () => {
    if (toDeleteIdx == null) return;
    const r = rows[toDeleteIdx];
    try {
      await api.delete(
        `/assignment-task-rel?assignmentId=${r.assignmentId}&taskId=${r.taskId}`
      );
      setRows((rows) => rows.filter((_, i) => i !== toDeleteIdx));
      showNotification("Úloha odstránená", "success");
    } catch {
      showNotification("Chyba pri mazaní", "error");
    } finally {
      setDeleteDialogOpen(false);
      setToDeleteIdx(null);
    }
  };

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setToDeleteIdx(null);
  };

  // preview toggle
  const togglePreview = (idx: number) =>
    updateRow(idx, { previewOpen: !rows[idx].previewOpen });

  if (loading) return <Typography>Načítavam...</Typography>;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (rows.length === 0)
    return (
        <Box
            display="flex"
            flexDirection="column"
            alignItems="center"
            mt={4}
            gap={2} // odsadenie medzi ikonou a tlačidlom
        >
          <EmptyState message="V tomto zadaní nie sú žiadne úlohy" />

          <Button
              variant="contained"
              onClick={() => navigate(`/dash/assignments/${assignmentId}/tasks`)}
          >
            Pridať ďalšie úlohy
          </Button>
        </Box>
    );

  return (
    <Box>
      <Table size = "small">
        <TableHead>
          <TableRow>
            <TableCell>Úloha</TableCell>
            <TableCell>Body</TableCell>
            {isProject && <TableCell>Limit vyberov</TableCell>}
            <TableCell>Bonus</TableCell>
            <TableCell>Interný komentár</TableCell>
            <TableCell align="center">Akcie</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((r, idx) => (
            <React.Fragment key={r.taskId}>
              <TableRow>
                <TableCell>{r.task.name}</TableCell>
                <TableCell>
                  <TextField
                    type="number"
                    size="small"
                    value={r.pointsTotal}
                    onChange={(e) =>
                      updateRow(idx, { pointsTotal: +e.target.value })
                    }
                    inputProps={{ min: 0 }}
                  />
                </TableCell>
                {isProject && (
                  <TableCell>
                    <TextField
                      type="number"
                      size="small"
                      value={r.projectSelectionLimit ?? ""}
                      onChange={(e) =>
                        updateRow(idx, {
                          projectSelectionLimit:
                            e.target.value === "" ? null : Number(e.target.value),
                        })
                      }
                      inputProps={{ min: 1 }}
                      sx={{ width: 120 }}
                    />
                  </TableCell>
                )}
                <TableCell>
                  <Checkbox
                    checked={r.bonusTask}
                    onChange={(e) =>
                      updateRow(idx, { bonusTask: e.target.checked })
                    }
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    size="small"
                    value={r.internalComment}
                    onChange={(e) =>
                      updateRow(idx, { internalComment: e.target.value })
                    }
                  />
                </TableCell>
                <TableCell align="center">
                  <IconButton onClick={() => togglePreview(idx)}>
                    <PreviewIcon />
                  </IconButton>
                  <IconButton
                    disabled={r.isSaving}
                    onClick={() => handleSave(idx)}
                  >
                    <SaveIcon />
                  </IconButton>
                  <IconButton onClick={() => handleDeleteClick(idx)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>

              {/* preview radenie */}
              <TableRow>
                <TableCell colSpan={isProject ? 6 : 5} style={{ padding: 0, border: 0 }}>
                  <Collapse in={r.previewOpen}>
                    <Box margin={2}>
                      <TaskPreview
                        name={r.task.name}
                        text={r.task.text}
                        comment={r.task.internalComment}
                        authorName={r.task.authorName ?? r.task.fullname ?? ""}
                      />
                    </Box>
                  </Collapse>
                </TableCell>
              </TableRow>
            </React.Fragment>
          ))}
        </TableBody>
      </Table>
      <Box display="flex" mt={3}>
        <Button
          variant="contained"
          onClick={() => navigate(`/dash/assignments/${assignmentId}/tasks`)}
        >
          Pridať ďalšie úlohy
        </Button>
      </Box>
      <ConfirmDialog
        open={deleteDialogOpen}
        title="Potvrď vymazanie úlohy"
        message="Naozaj chceš túto úlohu odstrániť zo zadania?"
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
      />
    </Box>
  );
};

export default AssignmentFormTasks;
