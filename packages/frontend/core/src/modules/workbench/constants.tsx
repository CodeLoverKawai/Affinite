import {
  AiIcon,
  AllDocsIcon,
  AttachmentIcon,
  CheckBoxCheckSolidIcon,
  DateTimeIcon,
  DeleteIcon,
  EdgelessIcon,
  ExportToPdfIcon,
  FirePanelIcon,
  PageIcon,
  PresentationIcon,
  TagIcon,
  TodayIcon,
  ViewLayersIcon,
} from '@blocksuite/icons/rc';
import type { ReactNode } from 'react';

export const iconNameToIcon = {
  allDocs: <AllDocsIcon />,
  collection: <ViewLayersIcon />,
  boards: <ViewLayersIcon />,
  doc: <PageIcon />,
  page: <PageIcon />,
  edgeless: <EdgelessIcon />,
  journal: <TodayIcon />,
  weeklyReports: <PresentationIcon />,
  habits: <CheckBoxCheckSolidIcon />,
  tag: <TagIcon />,
  trash: <DeleteIcon />,
  attachment: <AttachmentIcon />,
  pdf: <ExportToPdfIcon />,
  ai: <AiIcon />,
  streaks: <FirePanelIcon />,
  calendar: <DateTimeIcon />,
} satisfies Record<string, ReactNode>;

export type ViewIconName = keyof typeof iconNameToIcon | (string & {});
