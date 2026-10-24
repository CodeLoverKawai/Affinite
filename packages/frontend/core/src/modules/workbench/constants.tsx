import {
  AiIcon,
  AllDocsIcon,
  AttachmentIcon,
  BookPanelIcon,
  DateTimeIcon,
  DeleteIcon,
  EdgelessIcon,
  ExportToPdfIcon,
  FirePanelIcon,
  PageIcon,
  TagIcon,
  TodayIcon,
  ViewLayersIcon,
} from '@blocksuite/icons/rc';
import type { ReactNode } from 'react';

export const iconNameToIcon = {
  allDocs: <AllDocsIcon />,
  collection: <ViewLayersIcon />,
  doc: <PageIcon />,
  page: <PageIcon />,
  edgeless: <EdgelessIcon />,
  journal: <TodayIcon />,
  tag: <TagIcon />,
  trash: <DeleteIcon />,
  attachment: <AttachmentIcon />,
  pdf: <ExportToPdfIcon />,
  ai: <AiIcon />,
  library: <BookPanelIcon />,
  streaks: <FirePanelIcon />,
  calendar: <DateTimeIcon />,
} satisfies Record<string, ReactNode>;

export type ViewIconName = keyof typeof iconNameToIcon | (string & {});
