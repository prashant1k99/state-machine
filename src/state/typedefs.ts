export enum ActionStates {
  Pending = 'Pending',
  Starting = 'Starting',
  Finished = 'Finished',
  Error = 'Error',
  Output = 'Output',
}

export enum Events {
  PreGuard = 'PreGuard',
  Guard = 'Gaurd',
  PostGuard = 'PostGuard',
  PreAction = 'PreAction',
  Action = 'Action',
  PostAction = 'PostAction',
}
