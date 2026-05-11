import {
  Box,
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  TextField,
} from "@mui/material";
import { useEffect, useState } from "react";
import api from "../../../services/api";
import { Course } from "../../Courses/Types/Course";
import type { CourseGroup } from "../../Courses/Types/CourseGroup";
import { TaskSetType } from "../../TaskSets/Types/TaskSetType";
import { useNotification } from "../../../shared/components/NotificationContext";
import { Assignment } from "../types/Assignment";
import { isProjectTaskSetType } from "../utils/isProjectAssignment";
import { Editor } from "@tinymce/tinymce-react";
import "tinymce/tinymce";
import "tinymce/themes/silver/theme";
import "tinymce/icons/default/icons";
import "tinymce/models/dom/model";

import "tinymce/plugins/link";
import "tinymce/plugins/lists";
import "tinymce/plugins/code";
import "tinymce/plugins/image";
import "tinymce/plugins/table";

type GroupSettingState = {
  groupId: number;
  active: boolean;
  publishStartTime: string | null;
  uploadEndTime: string | null;
};

type Props = {
  onCreated: (id: number) => void;
  defaultValues?: Assignment;
  onUpdated?: () => void; 
};

const AssignmentFormInfo = ({ onCreated, defaultValues, onUpdated }: Props) => {
  // inicializácia stavu z defaultValues alebo prázdne
  const [name, setName] = useState(defaultValues?.name ?? "");
  const [courseId, setCourseId] = useState<number | "">("");
  const [taskSetTypeId, setTaskSetTypeId] = useState<number | "">("");
  const [published, setPublished] = useState(defaultValues?.published ?? false);
  const [publishStartTime, setPublishStartTime] = useState<string | null>(
    defaultValues?.publishStartTime
      ? defaultValues.publishStartTime.slice(0, 16)
      : null
  );
  const [uploadEndTime, setUploadEndTime] = useState<string | null>(
    defaultValues?.uploadEndTime
      ? defaultValues.uploadEndTime.slice(0, 16)
      : null
  );
  const [projectSelectionDeadline, setProjectSelectionDeadline] = useState<string | null>(
    defaultValues?.projectSelectionDeadline
      ? defaultValues.projectSelectionDeadline.slice(0, 16)
      : null
  );
  const [pointsOverride, setPointsOverride] = useState<number | null>(
    defaultValues?.pointsOverride ?? null
  );
  const [instructions, setInstructions] = useState(
    defaultValues?.instructions ?? ""
  );
  const [internalComment, setInternalComment] = useState(
    defaultValues?.internalComment ?? ""
  );

  const [courses, setCourses] = useState<Course[]>([]);
  const [taskSetTypes, setTaskSetTypes] = useState<TaskSetType[]>([]);
  const [groups, setGroups] = useState<CourseGroup[]>([]);
  const [groupSettings, setGroupSettings] = useState<GroupSettingState[]>([]);
  const { showNotification } = useNotification();

  useEffect(() => {
    api.get<Course[]>("/courses").then((res) => setCourses(res.data));
  }, []);

  useEffect(() => {
    if (courses.length > 0 && defaultValues?.courseId) {
      setCourseId(defaultValues.courseId);
    }
  }, [courses, defaultValues?.courseId]);

  useEffect(() => {
    if (courseId) {
      api
        .get<TaskSetType[]>(`/course-task-set-rel/${courseId}/types`)
        .then((res) => setTaskSetTypes(res.data));
      api
        .get<CourseGroup[]>(`/groups/course/${courseId}`)
        .then((res) => {
          setGroups(res.data);
          setGroupSettings((prev) =>
            res.data.map((group) => {
              const existing = prev.find((item) => item.groupId === group.id);
              const defaultSetting = defaultValues?.groupSettings?.find((item) => item.groupId === group.id);
              return existing ?? {
                groupId: group.id,
                active: defaultSetting?.active ?? false,
                publishStartTime: defaultSetting?.publishStartTime
                  ? defaultSetting.publishStartTime.slice(0, 16)
                  : null,
                uploadEndTime: defaultSetting?.uploadEndTime
                  ? defaultSetting.uploadEndTime.slice(0, 16)
                  : null,
              };
            })
          );
        });
    } else {
      setTaskSetTypes([]);
      setGroups([]);
      setGroupSettings([]);
    }
  }, [courseId, defaultValues?.groupSettings]);

  useEffect(() => {
    if (taskSetTypes.length > 0 && defaultValues?.taskSetTypeId) {
      setTaskSetTypeId(defaultValues.taskSetTypeId);
    }
  }, [taskSetTypes, defaultValues?.taskSetTypeId]);

  const updateGroupSetting = (
    groupId: number,
    patch: Partial<GroupSettingState>
  ) => {
    setGroupSettings((prev) =>
      prev.map((item) =>
        item.groupId === groupId ? { ...item, ...patch } : item
      )
    );
  };

  const selectedTaskSetType =
    taskSetTypes.find((type) => type.id === taskSetTypeId) ?? null;
  const isProject = isProjectTaskSetType(selectedTaskSetType);

  const handleSubmit = async () => {
    if (!name || !courseId || !taskSetTypeId) {
      showNotification("Vyplň názov, kurz a typ zostavy", "error");
      return;
    }

    let updatedInstructions = instructions;
    const matches = [
      ...instructions.matchAll(
        /<img[^>]+src=["'](data:image\/[^"']+)["'][^>]*>/g
      ),
    ];

    for (const match of matches) {
      const base64Data = match[1];

      const blob = await (await fetch(base64Data)).blob();
      const formData = new FormData();
      formData.append("file", blob, "image.png");

      // Predpokladám, že endpoint na upload obrázkov máš rovnaký:
      const response = await api.post("/assignments/upload-image", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        withCredentials: true,
      });

      const { location } = response.data;
      // nahradíme v celom HTML TinyMCE obsah URL adresou nahratého obrázka
      updatedInstructions = updatedInstructions.replace(base64Data, location);
    }

    const dto = {
      name,
      courseId,
      taskSetTypeId,
      published,
      // Konvertujeme späť na ISO string bez Zulu znaku
      publishStartTime: publishStartTime
        ? new Date(publishStartTime).toISOString()
        : null,
      uploadEndTime: uploadEndTime
        ? new Date(uploadEndTime).toISOString()
        : null,
      projectSelectionDeadline: isProject && projectSelectionDeadline
        ? new Date(projectSelectionDeadline).toISOString()
        : null,
      pointsOverride,
      instructions: instructions.trim() ? instructions : null,
      internalComment: internalComment.trim() ? internalComment : null,
      groupSettings: groupSettings
        .filter((setting) => setting.active)
        .map((setting) => ({
          groupId: setting.groupId,
          active: true,
          publishStartTime: setting.publishStartTime
            ? new Date(setting.publishStartTime).toISOString()
            : null,
          uploadEndTime: setting.uploadEndTime
            ? new Date(setting.uploadEndTime).toISOString()
            : null,
        })),
    };
    console.log(defaultValues?.id);
    if (defaultValues?.id) {
      // PUT pre editáciu
      await api.put(`/assignments/${defaultValues.id}`, dto);
      showNotification("Zostava upravená", "success");
      if (onUpdated) {
        onUpdated();
      }

    } else {
      // POST pre vytvorenie
      const res = await api.post("/assignments", dto);
      showNotification("Zostava vytvorená", "success");
      onCreated(res.data.id);
    }
  };

  return (
    <Box display="flex" flexDirection="column" gap={2} mx="auto" maxWidth={800}>
      <TextField
        label="Názov zadania"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />

      <FormControl fullWidth required>
        <InputLabel>Kurz</InputLabel>
        <Select
          value={courseId ?? ""}
          onChange={(e) => setCourseId(Number(e.target.value))}
          label="Kurz"
        >
          {courses.map((c) => (
            <MenuItem key={c.id} value={c.id}>
              {c.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl fullWidth required disabled={!courseId}>
        <InputLabel>Typ zostavy</InputLabel>
        <Select
          value={taskSetTypeId ?? ""}
          onChange={(e) => setTaskSetTypeId(Number(e.target.value))}
          label="Typ zostavy"
        >
          {taskSetTypes.map((t) => (
            <MenuItem key={t.id} value={t.id}>
              {t.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControlLabel
        control={
          <Checkbox
            checked={published}
            onChange={(e) => setPublished(e.target.checked)}
          />
        }
        label="Zverejniť"
      />

      <TextField
        label="Dátum a čas publikovania"
        type="datetime-local"
        InputLabelProps={{ shrink: true }}
        value={publishStartTime ?? ""}
        onChange={(e) => setPublishStartTime(e.target.value)}
        fullWidth
      />

      <TextField
        label="Termín na odovzdanie"
        type="datetime-local"
        InputLabelProps={{ shrink: true }}
        value={uploadEndTime ?? ""}
        onChange={(e) => setUploadEndTime(e.target.value)}
        fullWidth
      />

      {isProject && (
        <TextField
          label="Termin vyberu projektu"
          type="datetime-local"
          InputLabelProps={{ shrink: true }}
          value={projectSelectionDeadline ?? ""}
          onChange={(e) => setProjectSelectionDeadline(e.target.value || null)}
          fullWidth
        />
      )}

      {groups.length > 0 && (
        <Box>
          <Box mb={1}>
            <strong>Skupinove nastavenia</strong>
          </Box>
          <Box display="flex" flexDirection="column" gap={1}>
            {groups.map((group) => {
              const setting = groupSettings.find((item) => item.groupId === group.id);
              return (
                <Box
                  key={group.id}
                  display="grid"
                  gridTemplateColumns={{ xs: "1fr", md: "220px 1fr 1fr" }}
                  gap={1}
                  alignItems="center"
                >
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={setting?.active ?? false}
                        onChange={(e) =>
                          updateGroupSetting(group.id, { active: e.target.checked })
                        }
                      />
                    }
                    label={`${group.name} (${group.participantCount}/${group.capacity})`}
                  />
                  <TextField
                    label="Publikovanie pre skupinu"
                    type="datetime-local"
                    size="small"
                    InputLabelProps={{ shrink: true }}
                    value={setting?.publishStartTime ?? ""}
                    disabled={!setting?.active}
                    onChange={(e) =>
                      updateGroupSetting(group.id, {
                        publishStartTime: e.target.value || null,
                      })
                    }
                  />
                  <TextField
                    label="Deadline pre skupinu"
                    type="datetime-local"
                    size="small"
                    InputLabelProps={{ shrink: true }}
                    value={setting?.uploadEndTime ?? ""}
                    disabled={!setting?.active}
                    onChange={(e) =>
                      updateGroupSetting(group.id, {
                        uploadEndTime: e.target.value || null,
                      })
                    }
                  />
                </Box>
              );
            })}
          </Box>
        </Box>
      )}

      <TextField
        label="Počet bodov (voliteľné)"
        type="number"
        InputLabelProps={{ shrink: true }}
        value={pointsOverride ?? ""}
        onChange={(e) =>
          setPointsOverride(
            e.target.value === "" ? null : Number(e.target.value)
          )
        }
        fullWidth
      />

      <Box>
        <Editor
          value={instructions}
          onEditorChange={(content) => setInstructions(content)}
          licenseKey="gpl"
          init={{
            height: 400,
            menubar: false,
            plugins: "lists link image table code",
            toolbar:
              "undo redo | fontfamily fontsize | bold italic underline | forecolor backcolor | alignleft aligncenter alignright | bullist numlist outdent indent | link image | table | code ",
            fontsize_formats: "8pt 10pt 12pt 14pt 18pt 24pt 36pt",
            font_formats:
              "Arial=arial,helvetica,sans-serif; Courier New=courier new,courier,monospace; Verdana=verdana,geneva,sans-serif; Times New Roman=times new roman,times,serif;",
            content_style:
              "body { font-family:Roboto,Arial,sans-serif; font-size:14px }",
            skin_url: "/tinymce/skins/ui/oxide",
            content_css: "/tinymce/skins/content/default/content.css",
            model: "dom",

            file_picker_types: "image",
            file_picker_callback: (callback, _value, meta) => {
              if (meta.filetype === "image") {
                const input = document.createElement("input");
                input.setAttribute("type", "file");
                input.setAttribute("accept", "image/*");

                input.onchange = function () {
                  const file = (this as HTMLInputElement).files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = function () {
                      const base64 = reader.result as string;
                      callback(base64, { title: file.name });
                    };
                    reader.readAsDataURL(file);
                  }
                };

                input.click();
              }
            },
          }}
        />
      </Box>

      <TextField
        label="Interný komentár"
        value={internalComment}
        onChange={(e) => setInternalComment(e.target.value)}
        multiline
        rows={2}
        fullWidth
      />

      <Box textAlign="right" mt={2}>
        <Button variant="contained" onClick={handleSubmit}>
          {defaultValues?.id ? "Uložiť zmeny" : "Vytvoriť zadanie"}
        </Button>
      </Box>
    </Box>
  );
};

export default AssignmentFormInfo;
