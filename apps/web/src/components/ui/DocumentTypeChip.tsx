'use client';

import BadgeOutlined from '@mui/icons-material/BadgeOutlined';
import EmojiEventsOutlined from '@mui/icons-material/EmojiEventsOutlined';
import PaymentsOutlined from '@mui/icons-material/PaymentsOutlined';
import SchoolOutlined from '@mui/icons-material/SchoolOutlined';
import WorkOutlineOutlined from '@mui/icons-material/WorkOutlineOutlined';
import Chip from '@mui/material/Chip';
import {
  formatDocumentType,
  getDocumentTypeChipColor,
  type DocumentType,
} from '@/lib/documents/documents-client';

const chipIconSx = { fontSize: 16, '&&': { marginLeft: '8px' } } as const;

function getDocumentTypeIcon(documentType: DocumentType): React.ReactElement | undefined {
  switch (documentType) {
    case 'BONAFIDE_CERTIFICATE':
      return <SchoolOutlined sx={chipIconSx} />;
    case 'CHARACTER_CERTIFICATE':
      return <EmojiEventsOutlined sx={chipIconSx} />;
    case 'EXPERIENCE_LETTER':
      return <WorkOutlineOutlined sx={chipIconSx} />;
    case 'SALARY_CERTIFICATE':
      return <PaymentsOutlined sx={chipIconSx} />;
    case 'VISITOR_PASS':
    case 'STUDENT_ID_CARD':
    case 'STAFF_ID_CARD':
      return <BadgeOutlined sx={chipIconSx} />;
    default:
      return undefined;
  }
}

interface DocumentTypeChipProps {
  documentType: DocumentType;
}

export function DocumentTypeChip({ documentType }: DocumentTypeChipProps) {
  const icon = getDocumentTypeIcon(documentType);

  return (
    <Chip
      size="small"
      {...(icon ? { icon } : {})}
      label={formatDocumentType(documentType)}
      color={getDocumentTypeChipColor(documentType)}
    />
  );
}
