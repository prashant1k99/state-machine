/**
 * const stateMachine = new StateMachine({
 *  initial: 'Start',
 *  transition: 'Automatic' | 'Manual',
 *  state: {
 *    'initial': {
 *      type: 'State', 'Block', // Block means parallely execute the multiple blocks
 *      stateNode: InitialState,
 *      target: 'Next',
 *      cond: (this.context) => { ... } return trur/false
 *      onError: '' | Function | 'retry' | 5, - retry for 5 times
 *      retryDiff: 2 // meaning will use the exponential time diff - 2, 4, 8, 16 seconds
 *      block: [
 *        {
 *          ...stateBody
 *        }
 *      ] // Only works if the type is Block
 *    }
 *  }
 * })
 */

import { EventEmitter } from 'events';
import { ActionStates, Events } from '../state/typeDefs';
import { InitialConstructorPaylod, IStateBody } from './typeDefs';

/**
 * Set of fixed keywords for context: output, data, status
 */
const sanitizeContextInitialization = (
  ctx: object,
  states: {
    [key: string]: IStateBody;
  },
): object => {
  const usedKeywords = Object.keys(ctx).filter((el) =>
    ['output', 'status'].includes(el.toLowerCase()),
  );
  if (usedKeywords.length) {
    throw new Error(
      `Usage of StateMachine Keywords is prohibited: ${usedKeywords} are StateMachine Keywords in Context`,
    );
  }
  const outputValues = {};
  const statusValues = {};
  Object.keys(states).forEach((el) => {
    Object.defineProperty(outputValues, el, {
      value: undefined,
      writable: true,
    });
    Object.defineProperty(statusValues, el, {
      value: ActionStates.Pending,
      writable: true,
    });
  });
  return {
    ...ctx,
    output: outputValues,
    status: statusValues,
  };
};

export default class StateMachine {
  private initial;
  private context;
  private states: Map<string, IStateBody> = new Map();
  private stateEventEmitter: EventEmitter;
  private currentState?: IStateBody;
  private transition?: 'Automatic' | 'Manual' = 'Automatic';

  constructor(payload: InitialConstructorPaylod) {
    // eslint-disable-next-line no-useless-catch
    try {
      this.initial = payload.initial;
      this.context = sanitizeContextInitialization(
        payload.context || {},
        payload.states,
      );
      payload.states ?? this.processStates(payload.states);
      this.stateEventEmitter = new EventEmitter();
      this.stateEventEmitter.on('StateExecutionEvents', this.eventListener);
      return this;
    } catch (err) {
      throw err;
    }
  }

  private processStates(states: { [key: string]: IStateBody }) {
    Object.keys(states).forEach((el) => {
      this.states.set(el, states[el]);
    });
  }

  private async executeStateNode(currentState: IStateBody) {
    let retryCounter = 0;
    try {
      currentState.stateNode.setEventEmitter(this.stateEventEmitter);
      currentState.stateNode.Context(this.context);
      await currentState.stateNode.execute();
    } catch (err) {
      if (currentState.onError) {
        if (currentState.onError === 'retry') {
          setTimeout(
            async () => {
              await currentState.stateNode.execute();
            },
            typeof currentState.retryDiff === 'number' ? (currentState.retryDiff * 1000) * retryCounter : 1000,
          );
        }
      }
       currentState.onError.call(this);
      else if (
        currentState.retry &&
        currentState.retry !== 'Never' &&
        retryCounter < (currentState.retryTimes || 5)
      ) {
        if (currentState.retry === 'Instant')
          await currentState.stateNode.execute();
        else {
          
        }
        retryCounter++;
      }
    }
  }

  private eventListener(
    event: string,
    payload?: { data?: any; error?: Error },
  ) {
    const [eventName, eventState] = event.split(':') as [Events, ActionStates];

    if (eventState === ActionStates.Output) {
      this.context.output[`${this.currentState}`][eventName].data =
        payload && payload.data;
      this.context.output[`${this.currentState}`][eventName].error =
        payload && payload.error;
    } else {
      this.context.status[`${this.currentState}`] = eventState;
    }
  }

  private async executeStateNodes(stateName: string) {
    const stateData = this.states.get(stateName);
    if (!stateData)
      throw new Error(
        `Unable to find State Definition for ${this.currentState}`,
      );

    this.currentState = stateData;
    // Execute cond if exist, it should return true to execute current state otherwise bypass state
    let executeCurrentState = false;
    if (stateData.cond) {
      const currentStateExecuteCond = await stateData.cond.call(this.context);
      executeCurrentState = currentStateExecuteCond ?? true;
    } else executeCurrentState = true;

    if (executeCurrentState) await this.executeStateNode(stateData);

    if (this.transition === 'Automatic') {
      if (stateData.target) {
        await this.executeStateNodes(stateData.target);
      } else {
        this.finished();
      }
    }
  }

  public async start() {
    if (!this.states.has(this.initial)) {
      throw new Error(`Unable to find Initial State: ${this.initial}`);
    }
    await this.executeStateNodes(this.initial);
    return this.context.output[`${this.currentState}`] as {
      data: unknown;
      error: Error;
    };
  }

  private finished() {
    this.stateEventEmitter.removeAllListeners();
  }

  hasNext(): boolean {
    return this.currentState?.target !== undefined;
  }
  executeNext() {
    if (this.currentState?.target) {
      this.executeStateNodes(this.currentState?.target);
      return this;
    } else {
      this.finished();
      return 'State Machine is Completed';
    }
  }
}

// const stateMachine = new StateMachine({
//   initial: 'Start',
//   transition: 'Manual',
//   states: {
//     Start: {
//       type: 'State',
//       target: 'Next',
//     },
//   },
// });
// stateMachine.start();
// stateMachine.hasNext();
// stateMachine.executeNext();
