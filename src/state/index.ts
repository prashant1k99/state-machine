import { EventEmitter } from 'events';
import { Events, ActionStates } from './typedefs';

export default class State {
  private action: () => unknown;
  private preAction?: () => unknown;
  private postAction?: () => unknown;
  private Context?: object;
  private CurrentState?: State;
  private StateMachine?: unknown;
  private emitter?: EventEmitter;

  constructor({
    action,
    preAction,
    postAction,
  }: {
    action: () => unknown;
    preAction?: () => unknown;
    postAction?: () => unknown;
  }) {
    this.action = action;
    this.preAction = preAction;
    this.postAction = postAction;
    return this;
  }

  // TODO: Define StateMachine Type
  setExecutionParameters(
    context: object,
    currentState: State,
    stateMachine: unkown,
  ) {
    this.Context = context;
    this.CurrentState = currentState;
    this.StateMachine = stateMachine;
  }

  setEventEmitter(emitter: EventEmitter) {
    this.emitter = emitter;
  }

  private async emitEvent(
    event: string,
    payload?: { data?: unknown; error?: Error | string },
  ) {
    if (this.emitter) this.emitter.emit('StateExecutionEvents', event, payload);
  }

  private async executeFn(
    eventName: Events,
    exeFn: (
      context?: object,
      currentState?: State,
      stateMachine?: unkown,
    ) => unknown,
  ) {
    await this.emitEvent(`${eventName}:${ActionStates.Starting}`);
    try {
      const data = await exeFn(
        this.Context,
        this.CurrentState,
        this.StateMachine,
      );
      await this.emitEvent(`${eventName}:${ActionStates.Output}`, { data });
    } catch (error) {
      if (error instanceof Error) {
        await this.emitEvent(`${eventName}:${ActionStates.Error}`, {
          error: error.message,
        });
      }
      await this.emitEvent(`${eventName}:${ActionStates.Error}`, {
        error: `Unexpected Error: ${error}`,
      });
    }
    await this.emitEvent(`${eventName}:${ActionStates.Finished}`);
  }

  async execute() {
    if (this.preAction) await this.executeFn(Events.PreAction, this.preAction);

    await this.executeFn(Events.Action, this.action);

    if (this.postAction)
      await this.executeFn(Events.PostAction, this.postAction);
  }
}
