import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import GroupsIcon from "@mui/icons-material/Groups";
import api from "../../../../services/api";
import { useNotification } from "../../../../shared/components/NotificationContext";
import EmptyState from "../../../../shared/components/EmptyState";
import type { CourseGroup, GroupSelection, GroupRoom } from "../../Types/CourseGroup";

const days = ["", "Pondelok", "Utorok", "Streda", "Stvrtok", "Piatok", "Sobota", "Nedela"];

const toTimeValue = (minutes: number) => {
  const hours = Math.floor(minutes / 60).toString().padStart(2, "0");
  const mins = (minutes % 60).toString().padStart(2, "0");
  return `${hours}:${mins}`;
};

const formatRoom = (room: GroupRoom) =>
  `${days[room.timeDay] ?? room.timeDay}, ${toTimeValue(room.timeBegin)} - ${toTimeValue(room.timeEnd)}, kapacita ${room.capacity}`;

export default function Groups() {
  const { id } = useParams();
  const { showNotification } = useNotification();
  const [groups, setGroups] = useState<CourseGroup[]>([]);
  const [selection, setSelection] = useState<GroupSelection | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingGroupId, setSavingGroupId] = useState<number | null>(null);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [groupsRes, selectionRes] = await Promise.all([
        api.get<CourseGroup[]>(`/groups/course/${id}`),
        api.get<GroupSelection>(`/groups/course/${id}/selection`),
      ]);
      setGroups(groupsRes.data);
      setSelection(selectionRes.data);
    } catch (err) {
      console.error(err);
      showNotification("Nepodarilo sa nacitat skupiny.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const selectGroup = async (groupId: number) => {
    if (!id) return;
    setSavingGroupId(groupId);
    try {
      await api.patch(`/groups/course/${id}/selection`, { groupId });
      setSelection((prev) => prev ? { ...prev, selectedGroupId: groupId } : prev);
      await load();
      showNotification("Skupina bola zmenena.", "success");
    } catch (err: any) {
      showNotification(err.response?.data ?? "Skupinu sa nepodarilo zmenit.", "error");
    } finally {
      setSavingGroupId(null);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <GroupsIcon />
        <Typography variant="h5">Skupiny</Typography>
      </Stack>

      {selection?.groupChangeDeadline && (
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Zmena skupiny je povolena do{" "}
          {new Date(selection.groupChangeDeadline).toLocaleDateString("sk-SK")}.
        </Typography>
      )}

      {!selection?.allowed && (
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Skupinu si mozes vybrat az po schvaleni v kurze.
        </Typography>
      )}

      {groups.length === 0 ? (
        <EmptyState message="V kurze zatial nie su skupiny." />
      ) : (
        <Stack spacing={2}>
          {groups.map((group) => {
            const selected = selection?.selectedGroupId === group.id;
            const full = group.capacity > 0 && group.participantCount >= group.capacity && !selected;
            const disabled = !selection?.canChange || selected || full;

            return (
              <Paper key={group.id} sx={{ p: 2 }}>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  justifyContent="space-between"
                  alignItems={{ xs: "flex-start", sm: "center" }}
                  spacing={2}
                >
                  <Box>
                    <Typography variant="h6">{group.name}</Typography>
                    <Typography color="text.secondary">
                      Obsadenost: {group.participantCount}
                      {group.capacity > 0 ? ` / ${group.capacity}` : " / bez limitu"}
                    </Typography>
                    {group.rooms.length > 0 && (
                      <Stack spacing={0.5} sx={{ mt: 1 }}>
                        {group.rooms.map((room) => (
                          <Typography key={room.id} variant="body2" color="text.secondary">
                            {room.name}: {formatRoom(room)}
                            {room.teachersPlan ? `, ${room.teachersPlan}` : ""}
                          </Typography>
                        ))}
                      </Stack>
                    )}
                  </Box>

                  <Button
                    variant={selected ? "outlined" : "contained"}
                    disabled={disabled || savingGroupId === group.id}
                    onClick={() => selectGroup(group.id)}
                  >
                    {selected ? "Vybrana" : full ? "Plna" : "Vybrat"}
                  </Button>
                </Stack>
              </Paper>
            );
          })}
        </Stack>
      )}
    </Box>
  );
}
