import {
  Client,
  connect as rawConnect,
  Msg,
  NatsConnectionOptions,
  NatsError,
  ServersChangedEvent,
  SubEvent,
  Subscription as NatsSubscription,
  SubscriptionOptions
  } from 'ts-nats';
import {
  from,
  fromEvent,
  merge,
  Observable,
  of,
  Subject
  } from 'rxjs';
import {
  map,
  mapTo,
  share,
  switchMap,
  switchMapTo,
  take
  } from 'rxjs/operators';

export enum ConnectionStatus {
  Ready = 'Ready',
  Connected = 'Connected',
  Disconnected = 'Disconnected',
  Reconnected = 'Reconnected',
  Reconnecting = 'Reconnecting',
  Closed = 'Closed',
}

export interface RxSubEvent extends SubEvent {
  type: 'subscribe' | 'unsubscribe';
}

export class RxNats {
  private _statusSubject$ = new Subject<ConnectionStatus>();

  constructor(public rawClient: Client) { }

  get status$(): Observable<ConnectionStatus> {
    const connect$ = fromEvent(this.rawClient, 'connect')
      .pipe(mapTo(ConnectionStatus.Connected));

    const disconnect$ = fromEvent(this.rawClient, 'disconnect')
      .pipe(mapTo(ConnectionStatus.Disconnected));

    const reconnect$ = fromEvent(this.rawClient, 'reconnect')
      .pipe(mapTo(ConnectionStatus.Reconnected));

    const reconnecting$ = fromEvent(this.rawClient, 'reconnecting')
      .pipe(mapTo(ConnectionStatus.Reconnecting));

    const close$ = fromEvent(this.rawClient, 'close')
      .pipe(mapTo(ConnectionStatus.Closed));

    return merge(
      connect$,
      disconnect$,
      reconnect$,
      reconnecting$,
      close$,
      this._statusSubject$.asObservable()
    ).pipe(
      share(),
    );
  }

  get subsciptions$(): Observable<RxSubEvent> {
    this.rawClient.drain()
    return merge(
      fromEvent<SubEvent>(this.rawClient, 'subscribe')
        .pipe(
          switchMap(subEvent => of<RxSubEvent>({ ...subEvent, type: 'subscribe' }))
        ),
      fromEvent<SubEvent>(this.rawClient, 'unsubscribe')
        .pipe(
          switchMap(subEvent => of<RxSubEvent>({ ...subEvent, type: 'unsubscribe' }))
        ),
    )
      .pipe(
        share(),
      );
  }

  get error$() {
    return merge(
      fromEvent<NatsError>(this.rawClient, 'error'),
      fromEvent<NatsError>(this.rawClient, 'permissionError'),
    ).pipe(
      share(),
    );
  }

  get serversChanged$(): Observable<ServersChangedEvent> {
    return merge(
      fromEvent<ServersChangedEvent>(this.rawClient, 'serversChanged'),
    ).pipe(
      share(),
    );
  }

  get yield$(): Observable<any> {
    return merge(
      fromEvent<any>(this.rawClient, 'yield'),
    ).pipe(
      share(),
    );
  }

  get numSubscriptions(): number {
    return this.rawClient.numSubscriptions();
  }

  from(subject: string, options?: SubscriptionOptions): Observable<Msg> {
    return new Observable<Msg>((subscriber) => {
      let natsSubsciption: NatsSubscription;
      const cb = (error: NatsError | null, msg: Msg) => {
        if (error) {
          subscriber.error(error);
        }
        subscriber.next(msg);
      };
      this.rawClient.subscribe(subject, cb, options)
        .then(subscription => {
          natsSubsciption = subscription;
        })
        .catch(error => {
          subscriber.error(error);
          subscriber.complete();
        })

      return () => {
        if (natsSubsciption) {
          natsSubsciption.unsubscribe();
        }
      }
    });
  }

  request(subject: string, data: any): Observable<Msg> {
    const reply = this.rawClient.createInbox();
    return this.publish(subject, data, reply)
      .pipe(
        switchMapTo(this.from(reply).pipe(take(1)))
      );
  }

  publish(subject: string, data: any, reply?: string): Observable<void> {
    return of(this.rawClient.publish(subject, data, reply))
  }

  drain(): Observable<any> {
    return from(this.rawClient.drain());
  }

  close(): Observable<void> {
    return of(this.rawClient.close());
  }
}

export const connect = (options: string | number | NatsConnectionOptions): Observable<RxNats> => {
  return from(rawConnect(options))
    .pipe(
      map(client => new RxNats(client))
    )
}