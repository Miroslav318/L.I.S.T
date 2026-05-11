export type StudentProjectListItem = {
  assignmentId: number;
  assignmentName: string;
  taskSetTypeName: string;
  taskSetTypeIdentifier?: string | null;
  selectedTaskId: number | null;
  selectedTaskName: string | null;
  solutionCount: number;
  uploadEndTime: string | null;
  projectSelectionDeadline: string | null;
  points: number | null;
  maxPoints: number | null;
  canUpload: boolean;
};

export type ProjectSelectedStudent = {
  studentId: number;
  fullName: string;
  email: string;
  hasSolution: boolean;
};

export type ProjectTopic = {
  taskId: number;
  name: string;
  text: string | null;
  authorName: string | null;
  pointsTotal: number;
  selectionLimit: number | null;
  selectedCount: number;
  freeSlots: number | null;
  isFull: boolean;
  students: ProjectSelectedStudent[];
};

export type ProjectDetail = {
  assignmentId: number;
  assignmentName: string;
  taskSetTypeName: string;
  instructions: string | null;
  uploadEndTime: string | null;
  projectSelectionDeadline: string | null;
  selectedTaskId: number | null;
  selectedTaskName: string | null;
  canSelect: boolean;
  canUpload: boolean;
  hasSubmittedSolution: boolean;
  topics: ProjectTopic[];
};

export type TeacherProjectSelections = {
  assignmentId: number;
  assignmentName: string;
  topics: ProjectTopic[];
  unassignedStudents: ProjectSelectedStudent[];
};
