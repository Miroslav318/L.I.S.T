export type GroupRoom = {
  id: number;
  groupId: number;
  name: string;
  timeBegin: number;
  timeEnd: number;
  timeDay: number;
  capacity: number;
  teachersPlan?: string | null;
};

export type CourseGroup = {
  id: number;
  courseId: number;
  name: string;
  participantCount: number;
  capacity: number;
  rooms: GroupRoom[];
};

export type GroupSelection = {
  selectedGroupId: number | null;
  groupChangeDeadline: string | null;
  allowed: boolean;
  canChange: boolean;
};
