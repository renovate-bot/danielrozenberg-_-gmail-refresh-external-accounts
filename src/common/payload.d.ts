interface InitializeAutoRefreshPayload {
  action: 'initializeAutoRefresh';
}

interface RefreshPop3AccountsPayload {
  action: 'refreshPop3Accounts';
}

type Payload = InitializeAutoRefreshPayload | RefreshPop3AccountsPayload;
