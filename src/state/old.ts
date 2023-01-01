import { EventEmitter } from 'events';
import { Events, ActionStates } from './typeDefs';

export default class State {
  private action: () => unknown;
  private guard?: () => unknown;
  private preAction?: () => unknown;
  private postAction?: () => unknown;
  private preGuard?: () => unknown;
  private postGuard?: () => unknown;
  private emitter?: EventEmitter;

  constructor({
    action,
    guard,
    preAction,
    postAction,
    preGuard,
    postGuard,
  }: {
    action: () => unknown;
    guard?: () => unknown;
    preAction?: () => unknown;
    postAction?: () => unknown;
    preGuard?: () => unknown;
    postGuard?: () => unknown;
  }) {
    this.action = action;
    this.guard = guard;
    this.preAction = preAction;
    this.postAction = postAction;
    this.preGuard = preGuard;
    this.postGuard = postGuard;
    return this;
  }

  setPreGuard(fn: () => unknown) {
    this.preGuard = fn;
    return this;
  }

  setGuard(fn: () => unknown) {
    this.guard = fn;
    return this;
  }

  setPostGuard(fn: () => unknown) {
    this.postGuard = fn;
    return this;
  }

  setPreAction(fn: () => unknown) {
    this.preAction = fn;
    return this;
  }

  setAction(fn: () => unknown) {
    this.action = fn;
    return this;
  }

  setPostAction(fn: () => unknown) {
    this.postAction = fn;
    return this;
  }

  private set Context(data: unknown) {
    this.Context = data;
  }

  private get Context() {
    return this.Context;
  }

  setEventEmitter(emitter: EventEmitter) {
    this.emitter = emitter;
  }

  private async emitEvent(
    event: string,
    payload?: { data?: any; error?: Error },
  ) {
    this.emitter.emit('StateExecutionEvents', event, payload);
  }

  private async executeFn(eventName: Events, exeFn: () => any) {
    await this.emitEvent(`${eventName}:${ActionStates.Starting}`);
    try {
      const data = await exeFn.call(this.Context);
      await this.emitEvent(`${eventName}:${ActionStates.Output}`, { data });
    } catch (error: Error) {
      await this.emitEvent(`${eventName}:${ActionStates.Error}`, { error });
    }
    await this.emitEvent(`${eventName}:${ActionStates.Finished}`);
  }

  async execute() {
    if (this.preGuard) await this.executeFn(Events.PreGuard, this.preGuard);

    if (this.guard) await this.executeFn(Events.Guard, this.guard);

    if (this.postGuard) await this.executeFn(Events.PostGuard, this.postGuard);

    if (this.preAction) await this.executeFn(Events.PreAction, this.preAction);

    await this.executeFn(Events.Action, this.action);

    if (this.postAction)
      await this.executeFn(Events.PostAction, this.postAction);
  }
}
