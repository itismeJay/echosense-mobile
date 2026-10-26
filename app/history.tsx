import { Redirect } from 'expo-router';
import React from 'react';

// History is now the "All" tab on Alerts. Kept for existing links.
export default function HistoryRedirect() {
  return <Redirect href={{ pathname: '/alerts', params: { tab: 'all' } }} />;
}
