import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  TextField,
  Checkbox,
  FormControlLabel,
  Button
} from "@mui/material";
import TaskPreview from "../../Tasks/Components/TaskPreview";
import { TaskPreviewData } from "../../Tasks/Types/TaskPreviewData";
type AddTaskDialogProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: (data: {
    pointsTotal: number;
    bonusTask: boolean;
    projectSelectionLimit?: number | null;
    internalComment: string;
  }) => void;
  data: TaskPreviewData | null;
  isProject?: boolean;
};

const AddTaskDialog = ({ open, onClose, onConfirm, data, isProject = false }: AddTaskDialogProps) => {
  const [pointsTotal, setPointsTotal] = useState(0);
  const [bonusTask, setBonusTask] = useState(false);
  const [projectSelectionLimit, setProjectSelectionLimit] = useState<number | null>(3);
  const [internalComment, setInternalComment] = useState("");

  const handleConfirm = () => {
    onConfirm({
      pointsTotal,
      bonusTask,
      projectSelectionLimit: isProject ? projectSelectionLimit : null,
      internalComment,
    });
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Pridať úlohu do zostavy</DialogTitle>
      <DialogContent dividers>
        <Box display="flex" flexDirection="column" gap={2} mt={1}>
          <TextField
            label="Body za túto úlohu"
            type="number"
            value={pointsTotal}
            onChange={(e) => setPointsTotal(Number(e.target.value))}
            fullWidth
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={bonusTask}
                onChange={(e) => setBonusTask(e.target.checked)}
              />
            }
            label="Je to bonusová úloha?"
          />
          {isProject && (
            <TextField
              label="Maximum studentov pre tuto temu"
              type="number"
              value={projectSelectionLimit ?? ""}
              onChange={(e) =>
                setProjectSelectionLimit(
                  e.target.value === "" ? null : Number(e.target.value)
                )
              }
              inputProps={{ min: 1 }}
              fullWidth
            />
          )}
          <TextField
            label="Interný komentár"
            value={internalComment}
            onChange={(e) => setInternalComment(e.target.value)}
            multiline
            rows={3}
            fullWidth
          />
        </Box>
      <DialogActions>
        <Button onClick={onClose}>Zrušiť</Button>
        <Button variant="contained" onClick={handleConfirm}>
          Pridať
        </Button>
      </DialogActions>
      {data && (
        <Box mt={4}>
        <TaskPreview
          name={data.name}
          text={data.text}
          comment={data.comment}
          authorName={data.authorName}
        />
        </Box>
      )}
    </DialogContent>
    </Dialog>
  );
};

export default AddTaskDialog;
