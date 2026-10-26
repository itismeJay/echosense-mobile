import { Redirect } from 'expo-router';
import React from 'react';

// Home merged into Alerts. Kept so old links and the initial route still work.
export default function IndexRedirect() {
  return <Redirect href="/alerts" />;
}
