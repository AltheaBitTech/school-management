'use client';

import { useParams } from 'next/navigation';
import { RoleEditor } from '@/components/rbac/RoleEditor';

export default function EditRolePage() {
  const params = useParams<{ id: string }>();
  return <RoleEditor roleId={params.id} />;
}
