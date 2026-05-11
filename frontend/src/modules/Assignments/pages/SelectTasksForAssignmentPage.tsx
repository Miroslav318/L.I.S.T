import React, { useEffect, useState } from "react";
import {
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton,
  CircularProgress,
} from "@mui/material";
import axios from "axios";
import PreviewIcon from "@mui/icons-material/Visibility";
import AddIcon from "@mui/icons-material/Add";
import { Task } from "../../Tasks/Types/Task";
import api from "../../../services/api";
import { useNotification } from "../../../shared/components/NotificationContext";
import { useNavigate, useParams } from "react-router-dom";
import TaskFilterBar from "../../Tasks/Components/TaskFilterBar";
import { CategoryFilterBlock } from "../../Tasks/Types/CategoryFilterBlock";
import AddTaskDialog from "../components/AddTaskDialog";
import PreviewDialog from "../components/PreviewDialog";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import { Collapse } from "@mui/material";
import { Assignment } from "../types/Assignment";
import { isProjectAssignment } from "../utils/isProjectAssignment";

const SelectTasksForAssignmentPage = () => {
  const { id: assignmentId } = useParams<{ id: string }>();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const { showNotification } = useNotification();
  const [filters, setFilters] = useState({
    name: "",
    author: "",
    categoryBlocks: [] as CategoryFilterBlock[],
  });
  const [expandedGroups, setExpandedGroups] = useState<number[]>([]);
  const [assignment, setAssignment] = useState<Assignment | null>(null);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<{
    name: string;
    text: string;
    comment: string;
    authorName: string;
  } | null>(null);

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addTaskId, setAddTaskId] = useState<number | null>(null);

  const navigate = useNavigate();

  const toggleGroup = (groupId: number) => {
    setExpandedGroups((prev) =>
        prev.includes(groupId)
            ? prev.filter((id) => id !== groupId)
            : [...prev, groupId]
    );
  };

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const params: Record<string, string | undefined> = {
        name: filters.name,
        author: filters.author,
      };

      if (filters.categoryBlocks.length > 0) {
        params.categoryFilter = filters.categoryBlocks
          .map((b) => {
            const hasInclude = b.include.length > 0;
            const hasExclude = b.exclude.length > 0;

            if (!hasInclude && !hasExclude) return null;

            let part = hasInclude ? b.include.join(",") : "";
            if (hasExclude) part += `;!${b.exclude.join(",")}`;
            return part;
          })
          .filter(Boolean)
          .join("|");
      }

      const response = await api.get("/tasks/filter", { params });
      setTasks(response.data);
    } catch {
      showNotification("Nepodarilo sa načítať úlohy.", "error");
    } finally {
      setLoading(false);
    }
  };

  // otvorenie dialógu na pridanie
  const handleOpenAdd = async (taskId: number) => {
    setAddTaskId(taskId);
    try {
      const res = await api.get(`/tasks/${taskId}`);
      const t = res.data;
      setPreviewData({
        name: t.name,
        text: t.text,
        comment: t.internalComment,
        authorName: t.authorFullname,
      });
      setAddDialogOpen(true);
    } catch {
      showNotification("Chyba pri načítaní detailu úlohy.", "error");
    }
  };

  // potvrdenie pridania s parametrami z formulára
  const handleConfirmAdd = async (data: {
  pointsTotal: number;
  bonusTask: boolean;
  projectSelectionLimit?: number | null;
  internalComment: string;
}) => {
  if (!assignmentId || addTaskId == null) return;
  try {
    await api.post("/assignment-task-rel", {
      assignmentId: Number(assignmentId),
      taskId: addTaskId,
      pointsTotal: data.pointsTotal,
      bonusTask: data.bonusTask,
      projectSelectionLimit: isProjectAssignment(assignment)
        ? data.projectSelectionLimit ?? null
        : null,
      internalComment: data.internalComment,
    });
    showNotification("Úloha pridaná do zostavy", "success");
    setAddDialogOpen(false);
    // prípadne refetch…
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      if (status === 409) {
        // server nám povedal „Conflict“ – už existuje
        showNotification("Táto úloha je už v tejto zostave", "error");
      } else {
        showNotification(
          `Nepodarilo sa pridať úlohu (${status || "?"})`,
          "error"
        );
      }
    } else {
      showNotification("Neznáma chyba pri pridávaní úlohy", "error");
    }
  }
};

  const handleCloseAdd = () => {
    setAddDialogOpen(false);
    setAddTaskId(null);
  };

  const handlePreview = async (taskId: number) => {
    try {
      const res = await api.get(`/tasks/${taskId}`);
      const t = res.data;
      setPreviewData({
        name: t.name,
        text: t.text,
        comment: t.internalComment,
        authorName: t.authorFullname,
      });
      setPreviewOpen(true);
    } catch {
      showNotification("Chyba pri načítaní detailu úlohy.", "error");
    }
  };
  const closePreview = () => setPreviewOpen(false);

  useEffect(() => {
    fetchTasks();
  }, [filters]);

  useEffect(() => {
    if (!assignmentId) return;
    api
      .get<Assignment>(`/assignments/${assignmentId}`)
      .then((res) => setAssignment(res.data))
      .catch(() => setAssignment(null));
  }, [assignmentId]);

  const groupedTasks = tasks.reduce((acc, task) => {
    const rootId = task.parentTaskId ?? task.id;
    if (!acc[rootId]) acc[rootId] = [];
    acc[rootId].push(task);
    return acc;
  }, {} as Record<number, Task[]>);

  const rootTaskIds = Object.keys(groupedTasks)
      .map((id) => parseInt(id))
      .filter((id) => groupedTasks[id].some((t) => t.id === id || !t.parentTaskId));


  return (
    <Container maxWidth="md" sx={{ mt: 5 }}>
      <Typography variant="h4" gutterBottom>
        Úlohy
      </Typography>
      <Button variant="outlined" sx={{ mb: 2 }} onClick={() => navigate(-1)}>
        Späť
      </Button>
      <TaskFilterBar onFilterChange={(f) => setFilters(f)} />
      <Card>
        <CardContent>
          {loading ? (
            <CircularProgress />
          ) : (
              <Table size = "small">
              <TableHead>
                <TableRow>
                  <TableCell>Názov</TableCell>
                  <TableCell>Autor</TableCell>
                  <TableCell>Vnútorný komentár</TableCell>
                  <TableCell>Akcie</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rootTaskIds.map((rootId) => {
                  const group = groupedTasks[rootId];
                  const root = group.find((t) => t.id === rootId) ?? group[0];
                  const variants = group.filter((t) => t.id !== root.id);

                  return (
                      <React.Fragment key={root.id}>
                        <TableRow>
                          <TableCell>
                            {root.name}
                            {variants.length > 0 && (
                                <IconButton size="small" onClick={() => toggleGroup(root.id)}>
                                  {expandedGroups.includes(root.id) ? (
                                      <ExpandLessIcon />
                                  ) : (
                                      <ExpandMoreIcon />
                                  )}
                                </IconButton>
                            )}
                          </TableCell>
                          <TableCell>{root.authorFullname}</TableCell>
                          <TableCell>{root.internalComment}</TableCell>
                          <TableCell align="right">
                            <IconButton onClick={() => handlePreview(root.id)}>
                              <PreviewIcon />
                            </IconButton>
                            <IconButton onClick={() => handleOpenAdd(root.id)}>
                              <AddIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>

                        {variants.length > 0 && (
                            <TableRow>
                              <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={4}>
                                <Collapse in={expandedGroups.includes(root.id)} timeout="auto" unmountOnExit>
                                  <Table size="small">
                                    <TableBody>
                                      {variants.map((variant) => (
                                          <TableRow key={variant.id}>
                                            <TableCell sx={{ pl: 4 }}>{variant.name}</TableCell>
                                            <TableCell>{variant.authorFullname}</TableCell>
                                            <TableCell>{variant.internalComment}</TableCell>
                                            <TableCell align="right">
                                              <IconButton onClick={() => handlePreview(variant.id)}>
                                                <PreviewIcon />
                                              </IconButton>
                                              <IconButton onClick={() => handleOpenAdd(variant.id)}>
                                                <AddIcon />
                                              </IconButton>
                                            </TableCell>
                                          </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </Collapse>
                              </TableCell>
                            </TableRow>
                        )}
                      </React.Fragment>
                  );
                })}
              </TableBody>


            </Table>
          )}
        </CardContent>
      </Card>

      <AddTaskDialog
        open={addDialogOpen}
        onClose={handleCloseAdd}
        onConfirm={handleConfirmAdd}
        data={previewData}
        isProject={isProjectAssignment(assignment)}
      />

      {/* preview dialog */}
      <PreviewDialog
      open={previewOpen}
      onClose={() => closePreview()}
      data={previewData}
    />
    </Container>
  );
};

export default SelectTasksForAssignmentPage;
