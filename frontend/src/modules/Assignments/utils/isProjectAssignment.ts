import { Assignment } from "../types/Assignment";
import { TaskSetType } from "../../TaskSets/Types/TaskSetType";

const isProjectText = (value?: string | null) => {
  const normalized = value?.toLowerCase() ?? "";
  return normalized.includes("project") || normalized.includes("projekt");
};

export const isProjectAssignment = (assignment?: Assignment | null) =>
  !!assignment &&
  (isProjectText(assignment.taskSetType?.identifier) ||
    isProjectText(assignment.taskSetType?.name));

export const isProjectTaskSetType = (type?: TaskSetType | null) =>
  !!type && (isProjectText(type.identifier) || isProjectText(type.name));
