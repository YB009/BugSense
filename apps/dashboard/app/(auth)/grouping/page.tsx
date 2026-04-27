import { GroupingRunner } from '../../components/GroupingRunner';
import { getDashboardAccessToken, getDashboardApiUrl } from '../../../lib/auth';
import { fetchCurrentGrouping } from '../../../lib/issues';

export default async function GroupingPage() {
  const token = await getDashboardAccessToken();

  if (!token) {
    return null;
  }

  let initialResult = null;
  try {
    initialResult = await fetchCurrentGrouping();
  } catch (error) {
    console.error('Failed to fetch current grouping:', error);
  }

  return (
    <GroupingRunner
      apiUrl={getDashboardApiUrl()}
      initialResult={initialResult}
      token={token}
    />
  );
}
