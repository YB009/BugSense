'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getDashboardAccessToken, getDashboardApiUrl } from '../../../lib/auth';

export async function createProjectAction(formData: FormData) {
  const token = await getDashboardAccessToken();
  const name = formData.get('name');

  if (!token || typeof name !== 'string' || !name.trim()) {
    return;
  }

  const response = await fetch(`${getDashboardApiUrl()}/projects`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: name.trim(),
    }),
    cache: 'no-store',
  });

  if (!response.ok) {
    return;
  }

  const payload = (await response.json()) as { project?: { id?: string } };
  revalidatePath('/projects');
  revalidatePath('/dashboard');

  if (payload.project?.id) {
    redirect(`/projects?project=${encodeURIComponent(payload.project.id)}`);
  }
}
