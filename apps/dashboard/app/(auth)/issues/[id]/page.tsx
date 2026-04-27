import { IssueDetailWorkspace } from '../../../../app/components/issues/IssueDetailWorkspace';
import { getDashboardAccessToken, getDashboardApiUrl } from '../../../../lib/auth';
import { fetchIssueDetail } from '../../../../lib/issues';

interface IssueDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function IssueDetailPage({ params }: IssueDetailPageProps) {
  const { id } = await params;
  const issue = await fetchIssueDetail(id);
  const token = await getDashboardAccessToken();
  const apiUrl = getDashboardApiUrl();

  return (
    <IssueDetailWorkspace
      apiUrl={apiUrl}
      issue={issue}
      issueId={id}
      token={token ?? ''}
    />
  );
}
