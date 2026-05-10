import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
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
  CircularProgress,
  IconButton,
  TextField,
  MenuItem, Tooltip, TablePagination, TableFooter
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import AssignmentIcon  from "@mui/icons-material/Assignment";
import api from "../../../services/api";
import GroupIcon from '@mui/icons-material/Group';
import GroupsIcon from '@mui/icons-material/Groups';
import CopyAllIcon from '@mui/icons-material/CopyAll';
import EditNoteIcon from '@mui/icons-material/EditNote';
import { Course } from "../Types/Course";
import { Period } from "../../Periods/Types/Period";
import CreateCourseDialog from "../Components/CreateCourseDialog";
import EditCourseDialog from "../Components/EditCourseDialog";

import ConfirmDeleteCourseDialog from "../Components/ConfirmDeleteCourseDialog";
import { useNotification } from "../../../shared/components/NotificationContext";
import ConfirmDuplicateCourseDialog from "../Components/ConfirmDuplicateCourseDialog";

const Courses = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [name, setName] = useState("");
  const [selectedPeriodId, setSelectedPeriodId] = useState<number | "">("");
  const [nameError, setNameError] = useState<string | null>(null);
  const { showNotification } = useNotification();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);
  const [capacity, setCapacity] = useState(0);
  const [groupChangeDeadline, setGroupChangeDeadline] = useState<string | null>(
    null
  );
  const [enrollmentLimit, setEnrollmentLimit] = useState<string | null>(null);
  const [hiddenInList, setHiddenInList] = useState(false);
  const [autoAcceptStudents, setAutoAcceptStudents] = useState(false);
  const [capacityError, setCapacityError] = useState<string | null>(null);
  const [periodError, setPeriodError] = useState<string | null>(null);
  const [enrollmentLimitError, setELimitError] = useState<string | null>(null);
  const [groupChangeError, setGChangeError] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [courseToEdit, setCourseToEdit] = useState<Course | null>(null);
  const navigate = useNavigate();
  const [imageFile, setImageFile] = useState<File | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);
  const [periodFilter, setPeriodFilter] = useState<string>("");

  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [courseToDuplicate, setCourseToDuplicate] = useState<Course | null>(null);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);


  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 250);

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);

  const filteredCourses = courses.filter((c) => {
    const q = debouncedSearchQuery.toLowerCase().trim();
    if (q) {
      if (
          !c.name.toLowerCase().includes(q) &&
          !c.teacherName.toLowerCase().includes(q)
      ) {
        return false;
      }
    }
    if (periodFilter) {
      return c.periodName === periodFilter;
    }
    return true;
  });


  const fetchCourses = async () => {
    setLoading(true);
    try {
      const res = await api.get<Course[]>("/courses");
      setCourses(res.data);
    } catch (err) {
      console.error(err);
      showNotification("Nepodarilo sa načítať kurzy.", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchPeriods = async () => {
    try {
      const res = await api.get<Period[]>("/periods");
      setPeriods(res.data);
    } catch (err) {
      console.error(err);
      showNotification("Nepodarilo sa načítať obdobia.", "error");
    }
  };

  useEffect(() => {
    fetchCourses();
    fetchPeriods();
  }, []);

  const resetForm = () => {
    setName("");
    setSelectedPeriodId(periods[0]?.id ?? 0);
    setNameError(null);
    setGChangeError(null);
    setCapacityError(null);
    setPeriodError(null);
    setELimitError(null);
    setOpenDialog(false);
    setCapacity(0);
    setGroupChangeDeadline(null);
    setEnrollmentLimit(null);
    setHiddenInList(false);
    setAutoAcceptStudents(false);
    setCapacityError(null);
    setEditDialogOpen(false);
    setCourseToEdit(null);
    setConfirmOpen(false);
    setImageFile(null);
  };

  const handleCreate = async (name: string, periodId: number | "") => {
    const trimmed = name.trim();
    let hasError = false;

    setNameError(null);
    setCapacityError(null);
    setPeriodError(null);
    setGChangeError(null);
    setELimitError(null);

    if (!trimmed) {
      setNameError("Názov kurzu nemôže byť prázdny.");
      hasError = true;
    }

    if (periodId === "") {
      setPeriodError("Musíš vybrať obdobie");
      hasError = true;
    }

    if (capacity <= 0) {
      setCapacityError("Kapacita nemôže byť 0 alebo menej.");
      hasError = true;
    }

    const now = new Date();

    if (groupChangeDeadline && new Date(groupChangeDeadline) < now) {
      setGChangeError("Termín na zmenu skupiny musí byť v budúcnosti.");
      hasError = true;
    }

    if (enrollmentLimit && new Date(enrollmentLimit) < now) {
      setELimitError("Limit prihlásení musí byť v budúcnosti.");
      hasError = true;
    }

    if (hasError) return;

    try {
      const res = await api.post("/courses", {
        name: trimmed,
        periodId: selectedPeriodId,
        capacity,
        groupChangeDeadline: groupChangeDeadline
            ? new Date(groupChangeDeadline).toISOString()
            : null,
        enrollmentLimit: enrollmentLimit
            ? new Date(enrollmentLimit).toISOString()
            : null,
        hiddenInList,
        autoAcceptStudents,
      });

      const createdCourse = res.data;

      if (imageFile) {
        const formData = new FormData();
        formData.append("file", imageFile);

        await api.post(`/courses/${createdCourse.id}/upload-image`, formData, {
          headers: { "Content-Type": "multipart/form-data" }
        });
      }

      resetForm();
      fetchCourses();
      showNotification("Kurz bol úspešne pridaný.", "success");
    } catch (err) {
      console.error(err);
      showNotification("Nepodarilo sa pridať kurz.", "error");
    }
  };

  const handleUpdate = async (id: number, periodId: number | "") => {
    const trimmed = name.trim();
    setNameError(null);
    setCapacityError(null);
    setPeriodError(null);

    let hasError = false;

    if (!trimmed) {
      setNameError("Názov kurzu nemôže byť prázdny.");
      hasError = true;
    }
    if (selectedPeriodId === "") {
      setPeriodError("Musíš vybrať obdobie.");
      hasError = true;
    }
    if (capacity <= 0) {
      setCapacityError("Kapacita nemôže byť 0 alebo menej.");
      hasError = true;
    }

    if (!trimmed) {
      setNameError("Názov kurzu nemôže byť prázdny.");
      hasError = true;
    }

    if (periodId === "") {
      setPeriodError("Musíš vybrať obdobie");
      hasError = true;
    }

    if (capacity <= 0) {
      setCapacityError("Kapacita nemôže byť 0 alebo menej.");
      hasError = true;
    }

    const now = new Date();

    if (groupChangeDeadline && new Date(groupChangeDeadline) < now) {
      setGChangeError("Termín na zmenu skupiny musí byť v budúcnosti.");
      hasError = true;
    }

    if (enrollmentLimit && new Date(enrollmentLimit) < now) {
      setELimitError("Limit prihlásení musí byť v budúcnosti.");
      hasError = true;
    }

    if (hasError) return;

    try {
      await api.put(`/courses/${id}`, {
        name: trimmed,
        periodId: selectedPeriodId,
        capacity,
        groupChangeDeadline: groupChangeDeadline || null,
        enrollmentLimit,
        hiddenInList,
        autoAcceptStudents,
      });

      if (imageFile) {
        const formData = new FormData();
        formData.append("file", imageFile);

        await api.post(`/courses/${id}/upload-image`, formData, {
          headers: { "Content-Type": "multipart/form-data" }
        });
      }


      setEditDialogOpen(false);
      resetForm();
      fetchCourses();
      showNotification("Kurz bol upravený.", "success");
    } catch (err) {
      console.error(err);
      showNotification("Nepodarilo sa upraviť kurz.", "error");
    }
  };

  const handleDelete = async () => {
    if (!courseToDelete) return;
    try {
      await api.delete(`/courses/${courseToDelete.id}`);
      fetchCourses();
      showNotification("Kurz bol vymazaný.", "success");
    } catch (err) {
      console.error(err);
      showNotification("Nepodarilo sa vymazať kurz.", "error");
    } finally {
      setCourseToDelete(null);
      setConfirmOpen(false);
    }
  };

  const handleDuplicate = async (courseId: number) => {
    try {
      const res = await api.post(`/courses/${courseId}/duplicate`);
      showNotification("Kurz bol duplikovaný.", "success");
      fetchCourses();
    } catch (err) {
      console.error(err);
      showNotification("Nepodarilo sa duplikovať kurz.", "error");
    }
  };

  const paginatedCourses = filteredCourses.slice(
      page * rowsPerPage,
      page * rowsPerPage + rowsPerPage
  );


  return (
    <Container maxWidth="xl" sx={{ mt: 5 }}>
      <Typography variant="h4" gutterBottom>
        Kurzy
      </Typography>

      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={() => setOpenDialog(true)}
        sx={{ mb: 2 }}
      >
        Pridať kurz
      </Button>

      <Box display="flex" gap={2} mb={2}>
        <TextField
            fullWidth
            label="Vyhľadaj kurz alebo učiteľa"
            variant="outlined"
            size="small"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
        />

        <TextField
            select
            label="Obdobie"
            value={periodFilter}
            onChange={(e) => setPeriodFilter(e.target.value)}
            size="small"
            sx={{ minWidth: 200 }}
        >
          <MenuItem value="">Všetky obdobia</MenuItem>
          {periods.map((p) => (
              <MenuItem key={p.id} value={p.name}>
                {p.name}
              </MenuItem>
          ))}
        </TextField>
      </Box>


      <Card>
        <CardContent>
          {loading ? (
            <CircularProgress />
          ) : (
              <Table size = "small">
              <TableHead>
                <TableRow>
                  <TableCell>Názov kurzu</TableCell>
                  <TableCell>Obdobie</TableCell>
                  <TableCell>Učiteľ</TableCell>
                  <TableCell align="right">Akcie</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedCourses.map((course) => (
                  <TableRow key={course.id}>
                    <TableCell>{course.name}</TableCell>
                    <TableCell>
                      {course.periodName || "Kurz nie je zaradený k obdobiu"}
                    </TableCell>
                    <TableCell>{course.teacherName}</TableCell>
                    <TableCell align="right">
                      <Box>
                        <Tooltip title="Upraviť kurz" placement="top">
                          <IconButton
                            onClick={() => {
                              setCourseToEdit(course);
                              setName(course.name);
                              setSelectedPeriodId(
                                periods.find((p) => p.name === course.periodName)
                                  ?.id ?? ""
                              );
                              setCapacity(course.capacity);
                              setGroupChangeDeadline(
                                course.groupChangeDeadline
                                  ? course.groupChangeDeadline.split("T")[0]
                                  : null
                              );
                              setEnrollmentLimit(
                                course.enrollmentLimit
                                  ? course.enrollmentLimit.split("T")[0]
                                  : null
                              );
                              setHiddenInList(course.hiddenInList);
                              setAutoAcceptStudents(course.autoAcceptStudents);
                              setEditDialogOpen(true);
                            }}
                          >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                        <Tooltip title="Zmeniť popisok" placement="top">
                          <IconButton
                              onClick={() =>
                                  navigate(`/dash/courses/${course.id}/description`, {
                                    state: {
                                      courseName: course.name,
                                      periodName: course.periodName,
                                    },
                                  })
                              }
                          >
                          <EditNoteIcon/>
                        </IconButton>
                        </Tooltip>
                        <Tooltip title="Skupiny" placement="top">
                          <IconButton
                              onClick={() =>
                                  navigate(`/dash/courses/${course.id}/groups`, {
                                    state: {
                                      courseName: course.name,
                                      periodName: course.periodName,
                                    },
                                  })
                              }
                          >
                            <GroupsIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Študenti" placement="top">
                          <IconButton
                              onClick={() =>
                                  navigate(`/dash/courses/${course.id}/participants`, {
                                    state: {
                                      courseName: course.name,
                                      periodName: course.periodName,
                                    },
                                  })
                              }
                          >
                            <GroupIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Zostavy úloh" placement="top">
                          <IconButton
                              onClick={() =>
                                  navigate(`/dash/courses/${course.id}/tasksets`, {
                                    state: {
                                      courseName: course.name,
                                      periodName: course.periodName,
                                    },
                                  })
                              }
                          >
                            <AssignmentIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Duplikovať kurz" placement="top">
                          <IconButton
                              onClick={() => {
                                setCourseToDuplicate(course);
                                setDuplicateDialogOpen(true);
                              }}
                          >
                            <CopyAllIcon/>
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Vymazať kurz" placement="top" >
                          <IconButton
                              onClick={() => {
                                setCourseToDelete(course);
                                setConfirmOpen(true);
                              }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
                <TableFooter>
                  <TableRow>
                    <TablePagination
                        count={filteredCourses.length}
                        page={page}
                        onPageChange={(event, newPage) => setPage(newPage)}
                        rowsPerPage={rowsPerPage}
                        onRowsPerPageChange={(e) => {
                          setRowsPerPage(parseInt(e.target.value, 10));
                          setPage(0);
                        }}
                        rowsPerPageOptions={[5, 10, 25]}
                        labelRowsPerPage="Úloh na stránku:"
                    />
                  </TableRow>
                </TableFooter>

            </Table>
          )}
        </CardContent>
      </Card>

      <CreateCourseDialog
        open={openDialog}
        onClose={resetForm}
        onCreate={handleCreate}
        name={name}
        setName={setName}
        selectedPeriodId={selectedPeriodId}
        setSelectedPeriodId={setSelectedPeriodId}
        nameError={nameError}
        periods={periods}
        capacity={capacity}
        setCapacity={setCapacity}
        groupChangeDeadline={groupChangeDeadline}
        setGroupChangeDeadline={setGroupChangeDeadline}
        enrollmentLimit={enrollmentLimit}
        setEnrollmentLimit={setEnrollmentLimit}
        hiddenInList={hiddenInList}
        setHiddenInList={setHiddenInList}
        autoAcceptStudents={autoAcceptStudents}
        setAutoAcceptStudents={setAutoAcceptStudents}
        capacityError={capacityError}
        periodError={periodError}
        groupChangeError={groupChangeError}
        enrollmentLimitError={enrollmentLimitError}
        imageFile={imageFile}
        setImageFile={setImageFile}
      />

      <ConfirmDeleteCourseDialog
        open={confirmOpen}
        onClose={resetForm}
        onConfirm={handleDelete}
        courseName={courseToDelete?.name ?? ""}
      />
      {courseToEdit && (
        <EditCourseDialog
          open={editDialogOpen}
          onClose={resetForm}
          onSubmit={() => {
            if (courseToEdit) handleUpdate(courseToEdit.id, selectedPeriodId);
          }}
          name={name}
          setName={setName}
          selectedPeriodId={selectedPeriodId}
          setSelectedPeriodId={setSelectedPeriodId}
          capacity={capacity}
          setCapacity={setCapacity}
          groupChangeDeadline={groupChangeDeadline}
          setGroupChangeDeadline={setGroupChangeDeadline}
          enrollmentLimit={enrollmentLimit}
          setEnrollmentLimit={setEnrollmentLimit}
          hiddenInList={hiddenInList}
          setHiddenInList={setHiddenInList}
          autoAcceptStudents={autoAcceptStudents}
          setAutoAcceptStudents={setAutoAcceptStudents}
          periods={periods}
          nameError={nameError}
          capacityError={capacityError}
          periodError={periodError}
          groupChangeError={groupChangeError}
          enrollmentLimitError={enrollmentLimitError}
          imageFile={imageFile}
          setImageFile={setImageFile}
        />
      )}

      {courseToDuplicate && (
          <ConfirmDuplicateCourseDialog
              open={duplicateDialogOpen}
              onClose={() => {
                setDuplicateDialogOpen(false);
                setCourseToDuplicate(null);
              }}
              onConfirm={() => {
                if (courseToDuplicate) {
                  handleDuplicate(courseToDuplicate.id);
                }
                setDuplicateDialogOpen(false);
                setCourseToDuplicate(null);
              }}
              courseName={courseToDuplicate.name}
          />
      )}


    </Container>
  );
};

export default Courses;
