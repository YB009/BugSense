import { IssueDetailWorkspace } from '../../../../app/components/issues/IssueDetailWorkspace';
import { fetchIssueDetail } from '../../../../lib/issues';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface IssueDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function IssueDetailPage({ params }: IssueDetailPageProps) {
  const { id } = await params;
  const issue = await fetchIssueDetail(id);
  const renderedAt = new Date().toISOString();

  return (
    <IssueDetailWorkspace
      issue={issue}
      issueId={id}
      renderedAt={renderedAt}
    />
  );
}
