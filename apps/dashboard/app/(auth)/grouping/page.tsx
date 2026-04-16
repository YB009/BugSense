import { GroupingRunner } from '../../components/GroupingRunner';
import { getDashboardAccessToken, getDashboardApiUrl } from '../../../lib/auth';
import { fetchCurrentGrouping } from '../../../lib/issues';

export default async function GroupingPage() {
  const token = await getDashboardAccessToken();

  if (!token) {
    return null;
  }

  const initialResult = await fetchCurrentGrouping();

  return (
    <GroupingRunner
      apiUrl={getDashboardApiUrl()}
      initialResult={initialResult}
      token={token}
    />
  );
}
