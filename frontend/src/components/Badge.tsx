const LABELS: Record<string, string> = {
  TODO: 'To do',
  IN_PROGRESS: 'In progress',
  DONE: 'Done',
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  ACTIVE: 'Active',
  COMPLETED: 'Completed',
  ARCHIVED: 'Archived',
};

/** Tinted status / priority / project-status pill. */
export function Badge({ value }: { value: string }) {
  return <span className={`badge badge-${value}`}>{LABELS[value] ?? value}</span>;
}
