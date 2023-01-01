import State from '../state';

export interface IStateBody {
  type: 'State' | 'Block';
  target: string;
  stateNode?: State;
  cond?: () => boolean;
  onError?: (() => unknown) | 'retry';
  retryAttempt?: number;
  retryDiff?: number;
  block?: IStateBody[];
}

export interface InitialConstructorPaylod {
  initial: string;
  context?: object;
  transition?: 'Automatic' | 'Manual';
  states: {
    [key: string]: IStateBody;
  };
}
