interface RegisterVisibleGmailTabMessage {
  action: 'registerVisibleGmailTab';
  account: string;
  href: string;
}

interface HiddenTabIsInitializedMessage {
  action: 'hiddenTabIsInitialized';
}

interface TriggerPop3AccountsRefreshMessage {
  action: 'triggerPop3AccountsRefresh';
  silent: boolean;
}

interface RequestBackgroundRefreshMessage {
  action: 'requestBackgroundRefresh';
  account: string;
}

type UpdateRefreshStatusMessage = {
  action: 'updateRefreshStatus';
  account: string;
} & (
  | {
      pending: number;
      completed: number;
    }
  | {
      failed: true;
    }
);

type MessageToBackground =
  | RegisterVisibleGmailTabMessage
  | RequestBackgroundRefreshMessage
  | UpdateRefreshStatusMessage;

type MessageToContent =
  | HiddenTabIsInitializedMessage
  | TriggerPop3AccountsRefreshMessage
  | UpdateRefreshStatusMessage;
