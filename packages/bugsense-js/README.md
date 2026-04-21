# @bugsense/bugsense-js

BugSense JavaScript SDK for browser, React, Axios, and Node error capture.

BugSense collects runtime errors from your application, sends them to the
BugSense API Gateway, and lets you monitor each project from the hosted
dashboard.

## Hosted BugSense

- Dashboard: https://bugsensedashboard-production.up.railway.app
- API Gateway: https://bugsenseapi-gateway-production.up.railway.app
- Ingest endpoint: https://bugsenseapi-gateway-production.up.railway.app/ingest
- Sourcemap endpoint: https://bugsenseapi-gateway-production.up.railway.app/sourcemaps

## 1. Create Or Access Your Dashboard Workspace

1. Open the hosted dashboard:

   ```text
   https://bugsensedashboard-production.up.railway.app
   ```

2. Click **Create account** if this is your first time.
3. Sign up with Google.
4. After signup, BugSense creates a private workspace for your user account.
5. Open **Projects** from the dashboard sidebar.

Each project has its own:

- Project name
- Project ID
- API key
- Isolated error stream

Only projects attached to your logged-in account are shown in the dashboard.
This keeps your errors separate from other users' errors.

## 2. Create A Project

1. Go to:

   ```text
   https://bugsensedashboard-production.up.railway.app/projects
   ```

2. Use the **New project name** field.
3. Click **Create**.
4. Select the project tab.
5. Copy the generated **Project ID** and **API key**.

The project tab also shows a ready-to-use SDK snippet.

## 3. Install The SDK

```bash
npm install @bugsense/bugsense-js
```

or:

```bash
pnpm add @bugsense/bugsense-js
```

## 4. Add BugSense To A Browser App

Create a small BugSense client file in your app, for example
`src/bugsense.ts`.

```ts
import { BugSense } from '@bugsense/bugsense-js';

export const bugsense = new BugSense({
  projectId: 'proj_your_project_id',
  apiKey: 'key_your_project_api_key',
  endpoint: 'https://bugsenseapi-gateway-production.up.railway.app/ingest',
  environment: 'production',
  release: '1.0.0',
});
```

Replace:

- `proj_your_project_id` with the Project ID from the dashboard.
- `key_your_project_api_key` with the API key from the dashboard.
- `release` with your app version, commit SHA, or deployment version.

When this client is created in a browser, BugSense automatically captures:

- `window.onerror`
- unhandled promise rejections
- failed `fetch` requests

## 5. Send A Smoke Test Event

After creating the client, send a test message once to confirm the connection.

```ts
import { bugsense } from './bugsense';

void bugsense.captureMessage('BugSense smoke test is connected', {
  tags: {
    source: 'manual-test',
  },
  metadata: {
    page: window.location.pathname,
  },
});
```

Open the dashboard and check:

```text
Projects -> your project tab -> Scoped Errors
```

The event should appear under that project only.

## 6. Capture Manual Exceptions

Use `captureException` when you catch an error yourself.

```ts
import { bugsense } from './bugsense';

try {
  await riskyOperation();
} catch (error) {
  await bugsense.captureException(error, {
    tags: {
      feature: 'checkout',
    },
    metadata: {
      cartSize: 3,
    },
  });

  throw error;
}
```

## 7. React Setup

Wrap your React app with the BugSense error boundary.

```tsx
import { BugSense, BugSenseErrorBoundary } from '@bugsense/bugsense-js';

const bugsense = new BugSense({
  projectId: 'proj_your_project_id',
  apiKey: 'key_your_project_api_key',
  endpoint: 'https://bugsenseapi-gateway-production.up.railway.app/ingest',
  environment: 'production',
  release: '1.0.0',
});

export function App() {
  return (
    <BugSenseErrorBoundary bugsense={bugsense}>
      <YourApp />
    </BugSenseErrorBoundary>
  );
}
```

This captures render-time errors caught by the boundary, while the base client
also captures browser-level runtime errors.

## 8. Axios Setup

If your app uses Axios, instrument it so rejected Axios responses are reported.

```ts
import axios from 'axios';
import { BugSense, instrumentAxios } from '@bugsense/bugsense-js';

const bugsense = new BugSense({
  projectId: 'proj_your_project_id',
  apiKey: 'key_your_project_api_key',
  endpoint: 'https://bugsenseapi-gateway-production.up.railway.app/ingest',
  environment: 'production',
  release: '1.0.0',
});

instrumentAxios(axios, bugsense);
```

## 9. Node Setup

For a Node service, register process-level handlers.

```ts
import { BugSense } from '@bugsense/bugsense-js';
import { registerNodeHandlers } from '@bugsense/bugsense-js/node';

const bugsense = new BugSense({
  projectId: process.env.BUGSENSE_PROJECT_ID!,
  apiKey: process.env.BUGSENSE_API_KEY!,
  endpoint: 'https://bugsenseapi-gateway-production.up.railway.app/ingest',
  environment: process.env.NODE_ENV ?? 'production',
  release: process.env.APP_VERSION ?? 'local',
  autoCapture: false,
});

registerNodeHandlers(bugsense);
```

Recommended environment variables:

```bash
BUGSENSE_PROJECT_ID=proj_your_project_id
BUGSENSE_API_KEY=key_your_project_api_key
APP_VERSION=1.0.0
```

## 10. Upload Source Maps

Source maps help connect minified production stack traces back to original
source files.

Build your app with source maps enabled, then upload them:

```bash
npx bugsense upload-sourcemaps \
  --project-id proj_your_project_id \
  --api-key key_your_project_api_key \
  --release 1.0.0 \
  --dir dist \
  --endpoint https://bugsenseapi-gateway-production.up.railway.app/sourcemaps
```

The `--release` value should match the `release` value used by the SDK.

You can also use environment variables:

```bash
BUGSENSE_PROJECT_ID=proj_your_project_id
BUGSENSE_API_KEY=key_your_project_api_key
npx bugsense upload-sourcemaps \
  --release 1.0.0 \
  --dir dist \
  --endpoint https://bugsenseapi-gateway-production.up.railway.app/sourcemaps
```

For Vite, your build output is usually `dist`.
For Next.js, upload the directory where your generated `.map` files are emitted.

## 11. Monitor Activity In The Dashboard

Open:

```text
https://bugsensedashboard-production.up.railway.app/dashboard
```

Use these dashboard sections:

- **Dashboard**: workspace overview and recent activity.
- **Projects**: project tabs, project credentials, and project-scoped errors.
- **Live Feed**: recent live errors for projects attached to your account.
- **Issues**: grouped errors for triage.

To confirm a project is isolated:

1. Open **Projects**.
2. Select one project tab.
3. Trigger an error with that project's Project ID and API key.
4. Confirm the event appears only inside that selected project.

## 12. Production Checklist

Before installing BugSense in a production app:

1. Create a separate BugSense project for each application or environment.
2. Store the Project ID and API key in your deployment environment variables.
3. Set a stable `release` value for every deploy.
4. Upload source maps for the same release.
5. Trigger a smoke test event after deployment.
6. Confirm the event appears in the correct project tab.
7. Keep project API keys out of public repositories.

## 13. Troubleshooting

### No events appear in the dashboard

Check that:

- The SDK endpoint is exactly:

  ```text
  https://bugsenseapi-gateway-production.up.railway.app/ingest
  ```

- `projectId` matches the selected dashboard project.
- `apiKey` belongs to the same project.
- Your browser network tab shows a successful request to `/ingest`.
- The event is being viewed under the matching project tab.

### API returns 401 Unauthorized

The API key is missing, incorrect, or does not belong to the supplied
`projectId`. Copy both values again from the dashboard project tab.

### API returns 400 Bad Request

The payload is missing a required field. Confirm that the SDK is initialized
with `projectId`, `apiKey`, and `endpoint`.

### Source map upload fails

Check that:

- The `--dir` path contains `.map` files.
- The `--release` value matches the SDK `release`.
- The sourcemap endpoint is:

  ```text
  https://bugsenseapi-gateway-production.up.railway.app/sourcemaps
  ```

## License

MIT
