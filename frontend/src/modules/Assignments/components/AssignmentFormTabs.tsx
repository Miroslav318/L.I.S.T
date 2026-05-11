import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, Tab, Box } from "@mui/material";
import AssignmentFormInfo from "./AssignmentFormInfo";
import AssignmentFormTasks from "./AssignmentFormTasks";
import AssignmentPreview from "./AssignmentPreview";
import AssignmentProjectSelections from "./AssignmentProjectSelections";
import { Assignment } from "../types/Assignment";
import { useNotification } from "../../../shared/components/NotificationContext";
import api from "../../../services/api";
import { isProjectAssignment } from "../utils/isProjectAssignment";



type Props = {
  assignment?: Assignment;
};

const AssignmentFormTabs = ({ assignment }: Props) => {
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const [activeTab, setActiveTab] = useState(0);
  const [assignmentId, setAssignmentId] = useState<number | null>(
    assignment?.id ?? null
  );
  const [assignmentData, setAssignmentData] = useState<Assignment | null>(
    assignment ?? null
  );

  // keď sa načíta defaultValues (pri editácii), nastavíme ID
  useEffect(() => {
    if (assignment) {
      setAssignmentData(assignment);
    }
  }, [assignment]);

  useEffect(() => {
    if (assignmentData?.id) {
      setAssignmentId(assignmentData.id);
    }
  }, [assignmentData]);

  const handleUpdated = async () => {
    if (!assignmentData?.id) return;

    try {
      const res = await api.get<Assignment>(`/assignments/${assignmentData.id}`);
      setAssignmentData(res.data);
      showNotification("Zadanie sa načítalo po úprave", "success");
    } catch {
      showNotification("Nepodarilo sa načítať aktualizované zadanie.", "error");
    }
  };

  // handler pre vytvorenie nového assignmentu
  const handleCreated = (id: number) => {
    setAssignmentId(id);
    // presmerovanie na edit page, kde máme assignment/:id /dash/assignments/create
    navigate(`/dash/assignments/edit/${id}`);
  };

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    if (assignmentId === null && newValue > 0) {
      showNotification("Najprv ulož základné informácie", "warning");
      return;
    }
    setActiveTab(newValue);
  };

  const isProject = isProjectAssignment(assignmentData);

  return (
    <Box>
      <Tabs value={activeTab} onChange={handleTabChange} centered>
        <Tab label="Info" />
        <Tab label="Úlohy" />
        {isProject && <Tab label="Vybery projektu" />}
        <Tab label="Prehľad" />
      </Tabs>

      <Box mt={3}>
        {activeTab === 0 && (
          <AssignmentFormInfo
            onCreated={handleCreated}
            defaultValues={assignmentData ?? undefined}
            onUpdated={handleUpdated}
          />
        )}
        {activeTab === 1 && assignmentId !== null && (
          <AssignmentFormTasks assignmentId={assignmentId} isProject={isProject} />
        )}
        {isProject && activeTab === 2 && assignmentId !== null && (
          <AssignmentProjectSelections assignmentId={assignmentId} />
        )}
        {activeTab === (isProject ? 3 : 2) && assignmentId !== null && (
          <AssignmentPreview assignmentId={assignmentId} />
        )}
      </Box>
    </Box>
  );
};

export default AssignmentFormTabs;
