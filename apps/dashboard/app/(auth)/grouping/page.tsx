import { GroupingRunner } from '../../components/GroupingRunner';
import { getDashboardAccessToken, getDashboardApiUrl } from '../../../lib/auth';

export default function GroupingPage() {
  const token = getDashboardAccessToken();

  if (!token) {
    return null;
  }

  return (
    <GroupingRunner apiUrl={getDashboardApiUrl()} token={token} />
  );
}
