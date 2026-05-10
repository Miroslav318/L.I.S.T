export type AssignmentDto = {
  name: string;
  courseId: number;
  taskSetTypeId: number;
  published: boolean;
  publishStartTime: string | null;
  uploadEndTime: string | null;
  pointsOverride: number | null;
  instructions: string | null;
  internalComment: string | null;
  groupSettings: AssignmentGroupSettingDto[];
};

export type AssignmentGroupSettingDto = {
  id?: number | null;
  groupId: number;
  publishStartTime: string | null;
  uploadEndTime: string | null;
  active: boolean;
};
