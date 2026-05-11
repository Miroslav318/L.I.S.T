export type AssignmentTaskRel = {
  assignmentId: number,
  taskId: number,
  pointsTotal: number,
  bonusTask: boolean,
  projectSelectionLimit?: number | null,
  internalComment: string,
};
